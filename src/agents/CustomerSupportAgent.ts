/**
 * Costs & Safety: No API calls. Stateless class.
 * Module reference: [Agent Memory](https://aitutorial.dev/agents/memory)
 * Why: Stateless agent with thread-based memory and multi-server MCP tool discovery.
 */

import { MultiServerMCPClient } from "@langchain/mcp-adapters";
import { createAgent } from 'langchain';
import { MemorySaver } from '@langchain/langgraph';
import { createModel } from './langchain_utils.js';

/**
 * Customer Support Agent
 *
 * Stateless LangChain agent that connects to multiple MCP servers
 * and uses MemorySaver for thread-based conversation persistence.
 *
 * - user_uuid and thread_id are passed per call, not at construction
 * - One instance serves all users concurrently
 * - Conversation state lives in the checkpointer, not the agent
 */
export class CustomerSupportAgent {
    private mcpClient: MultiServerMCPClient;
    private agent: any = null;

    constructor(servers: Record<string, string>) {
        const config: Record<string, any> = {};
        for (const [name, url] of Object.entries(servers)) {
            config[name] = { transport: "http", url };
        }
        this.mcpClient = new MultiServerMCPClient(config);
    }

    async connect(): Promise<string[]> {
        const tools = await this.mcpClient.getTools();
        const model = await createModel();
        this.agent = createAgent({
            model,
            tools,
            checkpointer: new MemorySaver(),
            systemPrompt: `You are a customer support agent for an e-commerce company.

You have access to tools across three systems:
- Knowledge Base: search help articles for FAQs, troubleshooting, and how-to guides
- Customer Info: look up accounts, check order status, view purchase history, update preferences
- Incident Tickets: create support tickets and check their status

On first interaction, call get_customer_info to learn the customer's name, email, tier, and status. The customer is identified automatically from the session — no need to pass any ID. Use this information for all subsequent interactions.

Rules:
- Always use tools to answer — never guess or make up data
- After calling a tool, summarize the result in plain language — never return raw JSON
- If a tool returns an error, explain what went wrong and suggest next steps
- When creating tickets, confirm the ticket ID to the customer
- Address the customer by name once you know it
- Reference previous conversation context when relevant (e.g., ticket IDs, order numbers)
- Be direct and concise — customers want answers, not filler`,
        });
        return tools.map(t => t.name);
    }

    async ask(userId: string, threadId: string, query: string): Promise<string> {
        console.log(`User: ${query}`);

        const result = await this.agent.invoke(
            { messages: [{ role: "user", content: query }] },
            { configurable: { thread_id: threadId, user_uuid: userId } }
        );

        this.logToolCalls(result.messages);

        const answer = result.messages[result.messages.length - 1].text || '(no response)';
        console.log(`Agent: ${answer}`);
        console.log('');
        return answer;
    }

    private logToolCalls(messages: any[]): void {
        for (const msg of messages) {
            if (msg.tool_calls?.length > 0) {
                for (const tc of msg.tool_calls) {
                    console.log(`  -> Tool: ${tc.name}(${JSON.stringify(tc.args)})`);
                }
            }
        }
    }

    async close(): Promise<void> {
        await this.mcpClient.close();
    }
}
