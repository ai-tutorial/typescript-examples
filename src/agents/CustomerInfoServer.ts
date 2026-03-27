import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from 'express';
import { z } from 'zod';

/**
 * Customer Info MCP Server
 *
 * Exposes tools for customer account management:
 * - get_customer_info: account lookup (user identified by header)
 * - check_order_status: order tracking and delivery info
 * - get_purchase_history: recent purchases
 * - update_customer_preferences: communication preferences
 *
 * The user_uuid is extracted from the `x-user-uuid` HTTP header
 * (set by the agent) — the LLM never needs to pass it as a parameter.
 * Tools that need the customer's identity read it from the request context.
 *
 * In production, this would use OAuth 2.0 Bearer tokens via
 * the MCP auth provider for proper authentication.
 */
export class CustomerInfoServer {
    private app = express();
    private mcp: McpServer;
    private httpServer: any = null;
    private port: number;
    private preferences: Map<string, any> = new Map();
    private currentUserUuid: string = 'unknown';

    private customers: Record<string, any> = {
        'alice': { user_uuid: 'alice', name: 'Alice Johnson', email: 'alice@example.com', status: 'active', orders: 15, vip: true, member_since: '2022-03-15' },
        'bob': { user_uuid: 'bob', name: 'Bob Smith', email: 'bob@example.com', status: 'active', orders: 3, vip: false, member_since: '2024-01-10' },
    };

    private ordersByUser: Record<string, any[]> = {
        'alice': [
            { order_id: 'ORD-12345', date: '2024-12-15', total: 89.97, items: 3, status: 'shipped', tracking: '1Z999AA10123456784', carrier: 'UPS', delivery: '2024-12-30' },
            { order_id: 'ORD-11111', date: '2024-11-20', total: 249.99, items: 1, status: 'delivered', tracking: null, carrier: null, delivery: '2024-11-25' },
            { order_id: 'ORD-10000', date: '2024-10-05', total: 34.50, items: 2, status: 'delivered', tracking: null, carrier: null, delivery: '2024-10-10' },
        ],
        'bob': [
            { order_id: 'ORD-67890', date: '2024-12-20', total: 45.00, items: 1, status: 'processing', tracking: null, carrier: null, delivery: '2024-12-28' },
        ],
    };

    constructor(port = 8002) {
        this.port = port;
        this.app.use(express.json());
        this.mcp = new McpServer({ name: 'CustomerInfoServer', version: '1.0.0' });

        this.registerTools();

        this.app.post('/mcp', async (req, res) => {
            this.currentUserUuid = (req.headers['x-user-uuid'] as string) || 'unknown';
            const toolName = req.body?.params?.name;
            if (toolName) console.log(`[CustomerInfoServer] user=${this.currentUserUuid} tool=${toolName}`);

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

    async stop(): Promise<void> { this.httpServer?.close(); }

    private registerTools(): void {
        this.mcp.registerTool('get_customer_info', {
            title: 'Get Customer Info',
            description: `Look up the current customer's account. Returns name, email, status, order count, and VIP tier. Customer is identified automatically from the session.`,
            inputSchema: {}
        }, async () => {
            const customer = this.customers[this.currentUserUuid];
            if (!customer) return this.fail(`No account for user: ${this.currentUserUuid}`);
            const result = { ...customer };
            if (this.preferences.has(this.currentUserUuid)) {
                result.preferences = this.preferences.get(this.currentUserUuid);
            }
            return this.ok(result);
        });

        this.mcp.registerTool('check_order_status', {
            title: 'Check Order Status',
            description: `Get order status and tracking by order ID for the current customer.`,
            inputSchema: { order_id: z.string().describe('Order ID (e.g., "ORD-12345")') }
        }, async (args) => {
            const orders = this.ordersByUser[this.currentUserUuid] || [];
            const order = orders.find(o => o.order_id === args.order_id);
            return order ? this.ok(order) : this.fail('Order not found for this customer');
        });

        this.mcp.registerTool('get_purchase_history', {
            title: 'Get Purchase History',
            description: `Get recent purchases for the current customer.`,
            inputSchema: { limit: z.number().optional().describe('Max results (default: 5)') }
        }, async (args) => {
            const orders = (this.ordersByUser[this.currentUserUuid] || []).slice(0, args.limit || 5);
            if (orders.length === 0) return this.fail('No purchase history');
            return this.ok({ purchases: orders, total_spent: orders.reduce((s: number, o: any) => s + o.total, 0) });
        });

        this.mcp.registerTool('update_customer_preferences', {
            title: 'Update Customer Preferences',
            description: `Set customer communication preferences for the current customer.`,
            inputSchema: {
                contact_method: z.enum(['email', 'phone', 'sms']).optional().describe('Preferred contact method'),
                notifications: z.enum(['all', 'important', 'none']).optional().describe('Notification level'),
            }
        }, async (args) => {
            const prefs = this.preferences.get(this.currentUserUuid) || {};
            if (args.contact_method) prefs.contact_method = args.contact_method;
            if (args.notifications) prefs.notifications = args.notifications;
            this.preferences.set(this.currentUserUuid, prefs);
            return this.ok({ user_uuid: this.currentUserUuid, preferences: prefs });
        });
    }

    private ok(data: any) {
        return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
    private fail(message: string) {
        return { content: [{ type: "text" as const, text: JSON.stringify({ error: message }) }] };
    }
}
