/**
 * Costs & Safety: No external API calls - demonstrates MCP server with multiple tools using mock customer support data.
 * Module reference: [Tool Design & Implementation](https://aitutorial.dev/agents/tool-design-and-implementation#practical-example-building-a-customer-support-tool-set)
 * Why: Demonstrates how to build a complete MCP server with multiple related tools, showing best practices for tool organization and consistent response formats.
 */

import 'dotenv/config';
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from 'express';
import { z } from 'zod';

// Client should connect to: http://localhost:8003/mcp
const PORT = process.env.PORT || 8003;

// Create Express app
const app = express();
app.use(express.json());

// Create MCP Server
const mcp = new McpServer({
    name: 'CustomerSupportToolServer',
    version: '1.0.0',
    description: 'Provides customer support tools for knowledge base search, customer lookup, ticketing, and order tracking',
});

// Define schemas for tools
const searchKnowledgeBaseSchema = {
    query: z.string().describe('Search keywords (e.g., "reset password", "shipping costs")'),
    category: z.enum(['billing', 'technical', 'shipping']).optional().describe('Optional filter for article category'),
};

const getCustomerInfoSchema = {
    email: z.string().email().describe('Customer email address'),
};

const createSupportTicketSchema = {
    customer_email: z.string().email().describe('Customer\'s email address'),
    subject: z.string().max(100).describe('Brief ticket summary (under 100 chars)'),
    description: z.string().describe('Detailed problem description'),
    priority: z.enum(['low', 'medium', 'high']).optional().describe('Ticket priority level. Defaults to "medium".'),
};

const checkOrderStatusSchema = {
    order_id: z.string().describe('Order ID in format ORD-##### (e.g., "ORD-12345")'),
};

// Register tool: search_knowledge_base
mcp.registerTool(
    'search_knowledge_base',
    {
        title: 'Search Knowledge Base',
        description: `Search support articles and documentation.
    
Use when:
- Customer has a question about product features
- Need troubleshooting steps
- Looking for how-to information

Do NOT use for:
- Customer-specific data (use get_customer_info)
- Order status (use check_order_status)`,
        inputSchema: searchKnowledgeBaseSchema
    },
    async (args) => {
        const { query, category } = args;

        // Mock knowledge base search
        const mockArticles = [
            {
                title: "How to Reset Your Password",
                summary: "Step-by-step guide to reset your account password",
                url: "https://support.example.com/reset-password",
                relevance_score: 0.95
            },
            {
                title: "Shipping Costs and Delivery Times",
                summary: "Information about shipping options and estimated delivery",
                url: "https://support.example.com/shipping-info",
                relevance_score: 0.87
            },
            {
                title: "Billing FAQ",
                summary: "Common questions about billing and payments",
                url: "https://support.example.com/billing-faq",
                relevance_score: 0.82
            }
        ];

        const filteredArticles = category
            ? mockArticles.filter(a => a.title.toLowerCase().includes(category))
            : mockArticles;

        return {
            content: [{
                type: "text",
                text: JSON.stringify({
                    success: true,
                    data: {
                        articles: filteredArticles.slice(0, 3)
                    },
                    error: null,
                    message: `Found ${filteredArticles.length} articles`
                }, null, 2),
            }],
        };
    }
);

// Register tool: get_customer_info
mcp.registerTool(
    'get_customer_info',
    {
        title: 'Get Customer Info',
        description: `Get customer account details and history.

Use when:
- Need to look up customer account
- Checking customer status/tier
- Understanding customer context before helping`,
        inputSchema: getCustomerInfoSchema
    },
    async (args) => {
        const { email } = args;

        // Mock customer database
        const mockCustomers: Record<string, any> = {
            'alice@example.com': {
                name: 'Alice Johnson',
                email: 'alice@example.com',
                account_status: 'active',
                total_orders: 15,
                lifetime_value: 1250.50,
                vip_status: true
            },
            'bob@example.com': {
                name: 'Bob Smith',
                email: 'bob@example.com',
                account_status: 'active',
                total_orders: 3,
                lifetime_value: 89.99,
                vip_status: false
            }
        };

        const customer = mockCustomers[email];

        if (!customer) {
            return {
                content: [{
                    type: "text",
                    text: JSON.stringify({
                        success: false,
                        data: null,
                        error: 'not_found',
                        message: `No account found for ${email}`
                    }, null, 2),
                }],
            };
        }

        return {
            content: [{
                type: "text",
                text: JSON.stringify({
                    success: true,
                    data: customer,
                    error: null,
                    message: 'Customer found'
                }, null, 2),
            }],
        };
    }
);

// Register tool: create_support_ticket
mcp.registerTool(
    'create_support_ticket',
    {
        title: 'Create Support Ticket',
        description: `Create a support ticket for issues requiring human follow-up.

Use when:
- Issue cannot be resolved immediately
- Customer requests human assistance
- Complex problem requiring investigation`,
        inputSchema: createSupportTicketSchema
    },
    async (args) => {
        const { customer_email, subject, description, priority = 'medium' } = args;

        // Mock ticket creation
        const ticketId = `TKT-${Math.floor(Math.random() * 100000)}`;
        const etaHours: Record<string, number> = { low: 48, medium: 24, high: 4 };

        return {
            content: [{
                type: "text",
                text: JSON.stringify({
                    success: true,
                    data: {
                        ticket_id: ticketId,
                        ticket_url: `https://support.example.com/tickets/${ticketId}`,
                        estimated_response_hours: etaHours[priority]
                    },
                    error: null,
                    message: `Ticket ${ticketId} created`
                }, null, 2),
            }],
        };
    }
);

// Register tool: check_order_status
mcp.registerTool(
    'check_order_status',
    {
        title: 'Check Order Status',
        description: `Get current status and tracking for an order.

Use when:
- Customer asks "where is my order"
- Checking delivery status
- Getting tracking information`,
        inputSchema: checkOrderStatusSchema
    },
    async (args) => {
        const { order_id } = args;

        // Mock order database
        const mockOrders: Record<string, any> = {
            'ORD-12345': {
                order_id: 'ORD-12345',
                status: 'shipped',
                tracking_number: '1Z999AA10123456784',
                carrier: 'UPS',
                estimated_delivery: new Date('2024-12-30').toISOString(),
                items: [
                    { name: 'Wireless Mouse', quantity: 1 },
                    { name: 'USB-C Cable', quantity: 2 }
                ]
            },
            'ORD-67890': {
                order_id: 'ORD-67890',
                status: 'processing',
                tracking_number: null,
                carrier: null,
                estimated_delivery: new Date('2024-12-28').toISOString(),
                items: [
                    { name: 'Laptop Stand', quantity: 1 }
                ]
            }
        };

        const order = mockOrders[order_id];

        if (!order) {
            return {
                content: [{
                    type: "text",
                    text: JSON.stringify({
                        success: false,
                        data: null,
                        error: 'not_found',
                        message: 'Could not retrieve order - check order ID'
                    }, null, 2),
                }],
            };
        }

        return {
            content: [{
                type: "text",
                text: JSON.stringify({
                    success: true,
                    data: order,
                    error: null,
                    message: `Order status: ${order.status}`
                }, null, 2),
            }],
        };
    }
);

// Add health check endpoint
app.get('/health', async (_req, res) => {
    res.json({
        status: "ok",
        mcp_server: "running",
        tools: ["search_knowledge_base", "get_customer_info", "create_support_ticket", "check_order_status"]
    });
});

// Add MCP endpoint
app.post('/mcp', async (req, res) => {
    const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
        enableJsonResponse: true
    });

    await mcp.connect(transport);

    res.on('close', () => {
        transport.close();
    });

    await transport.handleRequest(req, res, req.body);
});

/**
 * Main function that starts the Customer Support MCP HTTP server
 * 
 * This example demonstrates:
 * - Multiple related tools in one MCP server
 * - Consistent response format across all tools
 * - Proper error handling and validation
 * - Tool descriptions that guide agent behavior
 */
async function main() {
    app.listen(PORT, () => {
        console.error('🚀 Customer Support MCP HTTP Server Started');
        console.error(`Server: http://localhost:${PORT}`);
        console.error(`Endpoint: POST http://localhost:${PORT}/mcp (JSON-RPC)`);
        console.error(`Health: GET http://localhost:${PORT}/health`);
        console.error('');
        console.error('Available tools:');
        console.error('  - search_knowledge_base');
        console.error('  - get_customer_info');
        console.error('  - create_support_ticket');
        console.error('  - check_order_status');
        console.error('');
        console.error('💡 Test with:');
        console.error(`   curl -X POST http://localhost:${PORT}/mcp -H "Content-Type: application/json" -H "Accept: application/json, text/event-stream" -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'`);
        console.error('');
        console.error('Ready to accept connections...');
    });
}

main();
