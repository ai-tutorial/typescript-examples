import { MultiServerMCPClient } from "@langchain/mcp-adapters";
import { createAgent } from 'langchain';
import { MemorySaver } from '@langchain/langgraph';
import { createModel } from './langchain_utils.js';

/**
 * Customer Support Agent
 *
 * Connects to multiple MCP servers, discovers tools, and runs a
 * LangChain agent with thread-based memory. userId is set at
 * construction (one agent per user), threadId is passed per call
 * to support multiple conversations.
 *
 * The agent itself is stateless — all conversation state lives in
 * the MemorySaver, keyed by threadId. This means:
 * - No need to re-create the agent per conversation
 * - Different threadIds = different conversations, same agent
 *
 * Usage:
 *   const agent = new CustomerSupportAgent("alice", { ... });
 *   await agent.connect();
 *   await agent.ask("session-1", "Create a ticket");
 *   await agent.ask("session-1", "What's the ticket status?");
 *   await agent.close();
 */
export class CustomerSupportAgent {
    private mcpClient: MultiServerMCPClient;
    private agent: any = null;
    private userId: string;

    constructor(userId: string, servers: Record<string, string>) {
        this.userId = userId;
        const config: Record<string, any> = {};
        for (const [name, url] of Object.entries(servers)) {
            config[name] = {
                transport: "http",
                url,
                headers: { "x-user-uuid": userId },
            };
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
- Customer Info: look up accounts by user_uuid, check order status, view purchase history, update preferences
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

    async ask(threadId: string, query: string): Promise<string> {
        console.log(`User: ${query}`);

        const result = await this.agent.invoke(
            { messages: [{ role: "user", content: query }] },
            { configurable: { thread_id: threadId, user_uuid: this.userId } }
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
