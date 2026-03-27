/**
 * Costs & Safety: Uses LLM API. Each demo involves multiple LLM calls.
 * Env: AI_PROVIDER (openai|gemini), OPENAI_API_KEY, OPENAI_MODEL, GOOGLE_GENERATIVE_AI_API_KEY, GEMINI_MODEL
 * Module reference: [Agent Memory](https://aitutorial.dev/agents/memory)
 * Why: Demonstrates both working memory (within-session persistence via MemorySaver) and long-term memory (cross-session persistence via a simple store).
 */

import 'dotenv/config';
import { createAgent, tool } from 'langchain';
import { MemorySaver } from '@langchain/langgraph';
import { z } from 'zod';
import { createModel } from './langchain_utils.js';

// ============================================================
// Long-Term Memory Store
// ============================================================

/**
 * Simple in-memory long-term store.
 *
 * In production, replace with Redis, a vector DB, or a managed
 * service like Mem0/Zep. The interface stays the same:
 * save(userId, fact) and search(userId, query).
 */
class LongTermMemory {
    private memories: Map<string, string[]> = new Map();

    save(userId: string, fact: string): void {
        const existing = this.memories.get(userId) || [];
        existing.push(fact);
        this.memories.set(userId, existing);
        console.log(`  [Memory saved] ${fact}`);
    }

    search(userId: string, _query: string): string[] {
        return this.memories.get(userId) || [];
    }
}

// ============================================================
// Demo 1: Working Memory (within session)
// ============================================================

/**
 * Working memory demo: MemorySaver persists the conversation
 * per thread_id. The agent looks up an order once — subsequent
 * questions about the same order use cached tool results from
 * the thread history. No redundant API calls.
 */
async function demoWorkingMemory(): Promise<void> {
    console.log('========================================');
    console.log('Demo 1: Working Memory (within session)');
    console.log('========================================');
    console.log('');

    const model = await createModel();

    const lookupOrder = tool(
        async ({ orderId }: { orderId: string }) => {
            const orders: Record<string, any> = {
                'ORD-12345': { status: 'shipped', tracking: '1Z999AA1', delivery: '2024-12-30', items: ['Laptop', 'Mouse'] },
            };
            console.log(`  [API call] Looking up order ${orderId}`);
            return JSON.stringify(orders[orderId] || { error: 'Not found' });
        },
        {
            name: 'lookup_order',
            description: 'Look up order details by order ID.',
            schema: z.object({ orderId: z.string().describe('Order ID') }),
        }
    );

    const agent = createAgent({
        model,
        tools: [lookupOrder],
        checkpointer: new MemorySaver(),
        systemPrompt: 'You are a helpful assistant. Use tools when needed. Be concise.',
    });

    const ask = async (query: string) => {
        const result = await agent.invoke(
            { messages: [{ role: 'user', content: query }] },
            { configurable: { thread_id: 'demo-working-memory' } }
        );
        return result.messages[result.messages.length - 1].text || '(no response)';
    };

    // Turn 1: Agent calls the tool
    console.log('User: What is the status of order ORD-12345?');
    console.log(`Agent: ${await ask('What is the status of order ORD-12345?')}`);
    console.log('');

    // Turn 2: Agent already has the info — no redundant tool call
    console.log('User: What items were in that order?');
    console.log(`Agent: ${await ask('What items were in that order?')}`);
    console.log('');

    // Turn 3: Still no re-lookup
    console.log('User: When will it arrive?');
    console.log(`Agent: ${await ask('When will it arrive?')}`);
}

// ============================================================
// Demo 2: Long-Term Memory (across sessions)
// ============================================================

/**
 * Long-term memory demo: preferences saved in session 1
 * persist and are recalled in session 2 (different thread_id).
 *
 * Working memory (MemorySaver) handles within-session state.
 * The LongTermMemory store handles cross-session persistence
 * via save_preference and recall_preferences tools.
 */
async function demoLongTermMemory(): Promise<void> {
    console.log('');
    console.log('=========================================');
    console.log('Demo 2: Long-Term Memory (across sessions)');
    console.log('=========================================');
    console.log('');

    const longTermMemory = new LongTermMemory();
    const model = await createModel();

    const savePreference = tool(
        async ({ userId, preference }: { userId: string; preference: string }) => {
            longTermMemory.save(userId, preference);
            return `Saved: "${preference}"`;
        },
        {
            name: 'save_preference',
            description: 'Save a user preference to long-term memory. Use when the user expresses a preference.',
            schema: z.object({
                userId: z.string().describe('User identifier'),
                preference: z.string().describe('The preference to remember'),
            }),
        }
    );

    const recallPreferences = tool(
        async ({ userId }: { userId: string }) => {
            const memories = longTermMemory.search(userId, '');
            return memories.length > 0
                ? `Known preferences: ${memories.join('; ')}`
                : 'No preferences stored for this user.';
        },
        {
            name: 'recall_preferences',
            description: 'Recall saved preferences about a user. Use at the start of a conversation to personalize.',
            schema: z.object({ userId: z.string().describe('User identifier') }),
        }
    );

    const agent = createAgent({
        model,
        tools: [savePreference, recallPreferences],
        checkpointer: new MemorySaver(),
        systemPrompt: `You are a helpful assistant with long-term memory.
When users tell you preferences, save them with save_preference.
At the start of new conversations, use recall_preferences to personalize.
The user's ID will be provided as [user_uuid: ...]. Be concise.`,
    });

    const ask = async (threadId: string, query: string) => {
        const result = await agent.invoke(
            { messages: [{ role: 'user', content: query }] },
            { configurable: { thread_id: threadId } }
        );
        return result.messages[result.messages.length - 1].text || '(no response)';
    };

    // Session 1: User shares preferences
    console.log('--- Session 1 ---');
    console.log('User: I prefer email for notifications.');
    console.log(`Agent: ${await ask('session-1', '[user_uuid: alice] I prefer email for notifications.')}`);
    console.log('');

    console.log('User: Also, I like dark mode.');
    console.log(`Agent: ${await ask('session-1', 'Also, I like dark mode.')}`);
    console.log('');

    // Session 2: New thread, but long-term memory persists
    console.log('--- Session 2 (new thread, same user) ---');
    console.log('User: What do you know about me?');
    console.log(`Agent: ${await ask('session-2', '[user_uuid: alice] What do you know about me?')}`);
}

// ============================================================
// Main
// ============================================================

async function main(): Promise<void> {
    await demoWorkingMemory();
    await demoLongTermMemory();
}

await main();
