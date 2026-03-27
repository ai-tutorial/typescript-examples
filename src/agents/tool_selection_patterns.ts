/**
 * Costs & Safety: Uses LLM API for agent execution. Multiple LLM calls per demo.
 * Env: AI_PROVIDER (openai|gemini), OPENAI_API_KEY, OPENAI_MODEL, GOOGLE_GENERATIVE_AI_API_KEY, GEMINI_MODEL
 * Module reference: [Tool Selection & Optimization](https://aitutorial.dev/agents/tool-selection-and-optimization)
 * Why: Demonstrates patterns to improve tool selection accuracy — hierarchical routing, context-based filtering, and clear differentiation.
 */

import 'dotenv/config';
import { createAgent, tool } from 'langchain';
import { MemorySaver } from '@langchain/langgraph';
import { z } from 'zod';
import { createModel } from './langchain_utils.js';

// ============================================================
// Solution 1: Context-Based Tool Groups
// ============================================================

function getToolsForPhase(phase: string) {
    const greeting = [
        tool(async () => 'Customer verified', { name: 'authenticate_customer', description: 'Verify customer identity', schema: z.object({}) }),
    ];
    const diagnosis = [
        tool(async ({ query }: { query: string }) => `Results for: ${query}`, { name: 'search_knowledge_base', description: 'Search help articles', schema: z.object({ query: z.string() }) }),
        tool(async () => 'All systems operational', { name: 'check_system_status', description: 'Check if systems are up', schema: z.object({}) }),
    ];
    const resolution = [
        tool(async ({ subject }: { subject: string }) => `Ticket created: ${subject}`, { name: 'create_ticket', description: 'Create support ticket', schema: z.object({ subject: z.string() }) }),
    ];

    const groups: Record<string, any[]> = { greeting, diagnosis, resolution };
    return groups[phase] || diagnosis;
}

// ============================================================
// Solution 3: Clear Tool Differentiation
// ============================================================
//
// Fix: Give each tool a distinct name and explicit guidance
// on WHEN to use it and when NOT to. The descriptions act as
// a decision tree the LLM follows:
// - Customer says "wireless mouse" → search_products_by_text
// - Customer gives "PROD-001" → get_product_by_sku
// - Customer says "under $20" → filter_products_by_attributes

function createDifferentiatedProductTools() {
    const searchByText = tool(
        async ({ query }: { query: string }) => {
            console.log(`  [search_by_text] "${query}"`);
            return JSON.stringify([{ name: 'Wireless Mouse', sku: 'PROD-001', price: 29.99 }]);
        },
        {
            name: 'search_products_by_text',
            description: `Full-text search across product catalog.
Use when: customer describes product ("red shoes", "laptop under $1000").
Do NOT use when: you have exact SKU (use get_product_by_sku).`,
            schema: z.object({ query: z.string().describe('Search text') }),
        }
    );

    const getBySku = tool(
        async ({ sku }: { sku: string }) => {
            console.log(`  [get_by_sku] ${sku}`);
            return JSON.stringify({ name: 'Wireless Mouse', sku, price: 29.99, stock: 42 });
        },
        {
            name: 'get_product_by_sku',
            description: `Get product by exact SKU.
Use when: customer provides SKU directly or you extracted it from an order.
Do NOT use for search (use search_products_by_text).`,
            schema: z.object({ sku: z.string().describe('Product SKU (e.g., "PROD-001")') }),
        }
    );

    const filterByAttributes = tool(
        async ({ category, priceMax }: { category?: string; priceMax?: number }) => {
            console.log(`  [filter] category=${category} priceMax=${priceMax}`);
            return JSON.stringify([{ name: 'Budget Mouse', sku: 'PROD-002', price: 14.99 }]);
        },
        {
            name: 'filter_products_by_attributes',
            description: `Filter products by structured criteria.
Use when: customer specifies category, price range, or brand.
Do NOT use for text search (use search_products_by_text).`,
            schema: z.object({
                category: z.string().optional().describe('Product category'),
                priceMax: z.number().optional().describe('Maximum price'),
            }),
        }
    );

    return [searchByText, getBySku, filterByAttributes];
}

// ============================================================
// Demo
// ============================================================

/**
 * Shows all three solutions in action:
 * 1. Phase-based grouping reduces visible tools per phase
 * 2. Differentiated tools let the agent pick correctly based on query type
 */
async function main(): Promise<void> {
    const model = await createModel();

    // Phase-based grouping: agent sees fewer tools per phase
    console.log('Tool count by conversation phase:');
    for (const phase of ['greeting', 'diagnosis', 'resolution']) {
        const tools = getToolsForPhase(phase);
        console.log(`  ${phase}: ${tools.map(t => t.name).join(', ')}`);
    }
    console.log('');

    // Differentiated tools: agent picks the right one per query
    const productTools = createDifferentiatedProductTools();
    const agent = createAgent({
        model,
        tools: productTools,
        checkpointer: new MemorySaver(),
        systemPrompt: 'You are a product search assistant. Pick the right tool for each query. Be concise.',
    });

    const ask = async (query: string) => {
        console.log(`User: ${query}`);
        const result = await agent.invoke(
            { messages: [{ role: 'user', content: query }] },
            { configurable: { thread_id: `q-${Date.now()}` } }
        );
        console.log(`Agent: ${result.messages[result.messages.length - 1].text}`);
        console.log('');
    };

    await ask('I need a wireless mouse');       // → search_products_by_text
    await ask('Look up product PROD-001');      // → get_product_by_sku
    await ask('Show me mice under $20');        // → filter_products_by_attributes
}

await main();
