/**
 * Costs & Safety: Uses LLM API via LangChain. Each query may involve multiple LLM calls.
 * Env: AI_PROVIDER (openai|gemini), OPENAI_API_KEY, OPENAI_MODEL, GOOGLE_GENERATIVE_AI_API_KEY, GEMINI_MODEL
 * Module reference: [Model Context Protocol (MCP)](https://aitutorial.dev/agents/model-context-protocol#build-your-own-mcp-server)
 * Why: Demonstrates a multi-turn agent connected to 3 MCP servers, with thread-based session memory and stateful tools.
 */

import 'dotenv/config';
import { KnowledgeBaseServer } from './KnowledgeBaseServer.js';
import { CustomerInfoServer } from './CustomerInfoServer.js';
import { IncidentTicketServer } from './IncidentTicketServer.js';
import { CustomerSupportAgent } from './CustomerSupportAgent.js';

/**
 * Multi-server customer support demo with thread-based sessions.
 *
 * Three MCP servers run independently:
 * - KnowledgeBaseServer (8001): FAQ search
 * - CustomerInfoServer (8002): account, orders, preferences
 * - IncidentTicketServer (8003): ticket creation and tracking
 *
 * The agent uses LangGraph's MemorySaver with thread_id + user_id
 * for session persistence. Session context (who the customer is)
 * is passed with each request via configurable.
 */
async function main(): Promise<void> {
    // Step 1: Start all 3 MCP servers
    const kb = new KnowledgeBaseServer(8001);
    const customer = new CustomerInfoServer(8002);
    const tickets = new IncidentTicketServer(8003);

    await Promise.all([kb.start(), customer.start(), tickets.start()]);
    console.log('MCP Servers started:');
    console.log(`  Knowledge Base: ${kb.url}`);
    console.log(`  Customer Info:  ${customer.url}`);
    console.log(`  Tickets:        ${tickets.url}`);
    console.log('');

    // Step 2: Create agent for alice, connected to all servers
    const servers = {
        "knowledge-base": `${kb.url}/mcp`,
        "customer-info": `${customer.url}/mcp`,
        "incident-tickets": `${tickets.url}/mcp`,
    };
    const agent = new CustomerSupportAgent("alice", servers);
    const tools = await agent.connect();
    console.log(`Discovered ${tools.length} tools: ${tools.join(', ')}`);
    console.log('');

    const threadId = "session-001";
    const ask = (query: string) => agent.ask(threadId, query);

    // Step 3: Multi-turn conversation
    await ask("I was charged twice for order ORD-12345. Please create a high priority ticket.");

    await ask("What's the status of that ticket?");

    await ask("Show me my recent purchases.");

    // Cleanup
    await agent.close();
    await Promise.all([kb.stop(), customer.stop(), tickets.stop()]);
}

await main();
