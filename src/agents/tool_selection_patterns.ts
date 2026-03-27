/**
 * Costs & Safety: Uses LLM API for agent execution. Multiple LLM calls per demo.
 * Env: AI_PROVIDER (openai|gemini), OPENAI_API_KEY, OPENAI_MODEL, GOOGLE_GENERATIVE_AI_API_KEY, GEMINI_MODEL
 * Module reference: [Tool Selection & Optimization](https://aitutorial.dev/agent-reliability-and-optimization/tool-selection-and-optimization)
 * Why: Demonstrates patterns to improve tool selection accuracy — hierarchical routing, context-based filtering, and clear differentiation.
 */

import 'dotenv/config';
import { createAgent, tool } from 'langchain';
import { MemorySaver } from '@langchain/langgraph';
import { z } from 'zod';
import { createModel } from './langchain_utils.js';

// ============================================================
// Anti-Pattern: Flat Tool List (58% accuracy with 20+ tools)
// ============================================================

/**
 * When agents see too many tools at once, accuracy drops.
 * Research shows: 1-5 tools = 92%, 20+ tools = 58%.
 */
const flatToolList = [
    'searchCustomers', 'searchProducts', 'searchOrders', 'searchTickets',
    'getCustomer', 'getProduct', 'getOrder', 'getTicket',
    'updateCustomer', 'updateProduct', 'updateOrder', 'updateTicket',
    'createCustomer', 'createProduct', 'createOrder', 'createTicket',
    'deleteCustomer', 'deleteProduct', 'deleteOrder', 'deleteTicket',
];

// ============================================================
// Solution 1: Hierarchical Routing
// ============================================================

/**
 * Two-step routing: first pick domain + action, then call the specific tool.
 * Agent sees 1 tool instead of 20 → accuracy jumps to 90%+.
 */
function createHierarchicalRouter() {
    const routing: Record<string, string> = {
        'customers,search': 'search_customers',
        'customers,get': 'get_customer',
        'products,search': 'search_products',
        'products,get': 'get_product',
        'orders,search': 'search_orders',
        'orders,get': 'get_order',
    };

    return tool(
        async ({ domain, action }: { domain: string; action: string }) => {
            const toolName = routing[`${domain},${action}`] || 'unknown';
            console.log(`  [Router] ${domain}.${action} → ${toolName}`);
            return JSON.stringify({ next_tool: toolName, instructions: `Now call ${toolName} with your parameters` });
        },
        {
            name: 'route_to_domain',
            description: `Route to the correct handler. Step 1 of 2.
Domains: customers, products, orders, tickets
Actions: search, get, update, create, delete`,
            schema: z.object({
                domain: z.enum(['customers', 'products', 'orders', 'tickets']).describe('Which domain'),
                action: z.enum(['search', 'get', 'update', 'create', 'delete']).describe('What action'),
            }),
        }
    );
}

// ============================================================
// Solution 2: Context-Based Tool Groups
// ============================================================

/**
 * Return only relevant tools for the current conversation phase.
 * Agent sees 2-4 tools instead of 20.
 */
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

/**
 * Three product tools with distinct purposes and clear
 * "Use when" / "Do NOT use" guidance. No ambiguity.
 */
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

async function main(): Promise<void> {
    const model = await createModel();

    console.log('=== Demo: Clear Tool Differentiation ===');
    console.log('3 product tools with distinct purposes');
    console.log('');

    const productTools = createDifferentiatedProductTools();
    const agent = createAgent({
        model,
        tools: productTools,
        checkpointer: new MemorySaver(),
        systemPrompt: 'You are a product search assistant. Use the right tool for each query. Be concise.',
    });

    const ask = async (query: string) => {
        console.log(`User: ${query}`);
        const result = await agent.invoke(
            { messages: [{ role: 'user', content: query }] },
            { configurable: { thread_id: `demo-${Date.now()}` } }
        );
        console.log(`Agent: ${result.messages[result.messages.length - 1].text}`);
        console.log('');
    };

    // Should use search_products_by_text
    await ask('I need a wireless mouse');

    // Should use get_product_by_sku
    await ask('Look up product PROD-001');

    // Should use filter_products_by_attributes
    await ask('Show me mice under $20');
}

await main();
