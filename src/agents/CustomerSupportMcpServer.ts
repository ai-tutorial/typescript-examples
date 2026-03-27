/**
 * Costs & Safety: No external API calls. Mock data.
 * Module reference: [Model Context Protocol](https://aitutorial.dev/agents/model-context-protocol)
 * Why: Legacy single-server MCP example (see split servers for production pattern).
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from 'express';
import { z } from 'zod';

/**
 * Customer Support MCP Server
 *
 * An MCP server that exposes five customer support tools over HTTP:
 * - search_knowledge_base: FAQ and article search
 * - get_customer_info: account lookup by email
 * - create_support_ticket: escalation to human agents (stores in memory)
 * - get_ticket_status: check ticket status by ID
 * - check_order_status: order tracking and delivery info
 *
 * Tickets created via create_support_ticket persist in memory for
 * the lifetime of the server, so subsequent get_ticket_status calls
 * can retrieve them — demonstrating stateful MCP tools.
 *
 * All tools are served through a single POST /mcp endpoint using
 * JSON-RPC. Clients discover available tools via `tools/list` and
 * call them via `tools/call` — standard MCP protocol.
 *
 * Usage:
 *   const server = new CustomerSupportMcpServer(8003);
 *   await server.start();
 *   // Connect any MCP client to http://localhost:8003/mcp
 *   await server.stop();
 */
export class CustomerSupportMcpServer {
    private app = express();
    private mcp: McpServer;
    private httpServer: any = null;
    private port: number;
    private tickets: Map<string, any> = new Map();

    constructor(port = 8003) {
        this.port = port;
        this.app.use(express.json());

        this.mcp = new McpServer({
            name: 'CustomerSupportToolServer',
            version: '1.0.0',
        });

        this.registerTools();

        this.app.post('/mcp', async (req, res) => {
            const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
            await this.mcp.connect(transport);
            res.on('close', () => transport.close());
            await transport.handleRequest(req, res, req.body);
        });
    }

    get url(): string { return `http://localhost:${this.port}`; }

    async start(): Promise<void> {
        this.httpServer = await new Promise<any>(resolve => {
            const s = this.app.listen(this.port, () => resolve(s));
        });
    }

    async stop(): Promise<void> {
        this.httpServer?.close();
    }

    private registerTools(): void {
        this.mcp.registerTool('search_knowledge_base', {
            title: 'Search Knowledge Base',
            description: `Search support articles. Use for: general questions, how-to, troubleshooting. NOT for: customer data or orders.`,
            inputSchema: {
                query: z.string().describe('Search keywords'),
                category: z.enum(['billing', 'technical', 'shipping']).optional().describe('Category filter'),
            }
        }, async (args) => {
            const articles = [
                { title: "How to Reset Your Password", summary: "Password reset guide", relevance: 0.95 },
                { title: "Shipping Costs", summary: "Shipping options and estimates", relevance: 0.87 },
                { title: "Billing FAQ", summary: "Common billing questions", relevance: 0.82 },
            ];
            const filtered = args.category ? articles.filter(a => a.title.toLowerCase().includes(args.category!)) : articles;
            return this.ok({ articles: filtered });
        });

        this.mcp.registerTool('get_customer_info', {
            title: 'Get Customer Info',
            description: `Look up customer account details by email.`,
            inputSchema: { email: z.string().describe('Customer email') }
        }, async (args) => {
            const customers: Record<string, any> = {
                'alice@example.com': { name: 'Alice Johnson', status: 'active', orders: 15, vip: true },
                'bob@example.com': { name: 'Bob Smith', status: 'active', orders: 3, vip: false },
            };
            return customers[args.email] ? this.ok(customers[args.email]) : this.fail(`No account for ${args.email}`);
        });

        this.mcp.registerTool('create_support_ticket', {
            title: 'Create Support Ticket',
            description: `Escalate to human support. Use when issue can't be resolved automatically. Returns a ticket ID that can be checked later with get_ticket_status.`,
            inputSchema: {
                customer_email: z.string().describe('Customer email'),
                subject: z.string().describe('Brief summary'),
                description: z.string().describe('Problem description'),
                priority: z.enum(['low', 'medium', 'high']).optional().describe('Priority (default: medium)'),
            }
        }, async (args) => {
            const ticketId = `TKT-${Math.floor(Math.random() * 100000)}`;
            const priority = args.priority || 'medium';
            const ticket = {
                ticket_id: ticketId,
                customer_email: args.customer_email,
                subject: args.subject,
                description: args.description,
                priority,
                status: 'open',
                created_at: new Date().toISOString(),
                eta_hours: { low: 48, medium: 24, high: 4 }[priority],
            };
            this.tickets.set(ticketId, ticket);
            return this.ok(ticket);
        });

        this.mcp.registerTool('get_ticket_status', {
            title: 'Get Ticket Status',
            description: `Check the status of a previously created support ticket. Use when customer asks about a ticket they filed.`,
            inputSchema: { ticket_id: z.string().describe('Ticket ID (e.g., "TKT-12345")') }
        }, async (args) => {
            const ticket = this.tickets.get(args.ticket_id);
            if (!ticket) return this.fail(`Ticket ${args.ticket_id} not found`);
            return this.ok(ticket);
        });

        this.mcp.registerTool('check_order_status', {
            title: 'Check Order Status',
            description: `Get order status and tracking. Use when customer asks about delivery.`,
            inputSchema: { order_id: z.string().describe('Order ID (e.g., "ORD-12345")') }
        }, async (args) => {
            const orders: Record<string, any> = {
                'ORD-12345': { status: 'shipped', tracking: '1Z999AA10123456784', carrier: 'UPS', delivery: '2024-12-30' },
                'ORD-67890': { status: 'processing', tracking: null, delivery: '2024-12-28' },
            };
            return orders[args.order_id] ? this.ok(orders[args.order_id]) : this.fail('Order not found');
        });
    }

    private ok(data: any) {
        return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
    private fail(message: string) {
        return { content: [{ type: "text" as const, text: JSON.stringify({ error: message }) }] };
    }
}
