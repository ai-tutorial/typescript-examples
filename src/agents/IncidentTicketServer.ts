import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from 'express';
import { z } from 'zod';

/**
 * Incident Ticket MCP Server
 *
 * Exposes tools for creating and tracking support tickets.
 * Tickets persist in memory for the lifetime of the server,
 * so a ticket created in one call can be queried in a later call.
 *
 * The user_uuid is extracted from the `x-user-uuid` HTTP header
 * (set by the agent) and injected into tool calls automatically —
 * the LLM never needs to pass it as a parameter.
 *
 * In production, this would use OAuth 2.0 Bearer tokens via
 * the MCP auth provider for proper authentication.
 */
export class IncidentTicketServer {
    private app = express();
    private mcp: McpServer;
    private httpServer: any = null;
    private port: number;
    private tickets: Map<string, any> = new Map();
    private currentUserUuid: string = 'unknown';

    constructor(port = 8003) {
        this.port = port;
        this.app.use(express.json());
        this.mcp = new McpServer({ name: 'IncidentTicketServer', version: '1.0.0' });

        this.mcp.registerTool('create_ticket', {
            title: 'Create Ticket',
            description: `Create a support ticket for issues requiring human follow-up. The customer is identified automatically from the session — no need to pass user ID.`,
            inputSchema: {
                subject: z.string().describe('Brief summary'),
                description: z.string().describe('Problem description'),
                priority: z.enum(['low', 'medium', 'high']).optional().describe('Priority (default: medium)'),
            }
        }, async (args) => {
            const ticketId = `TKT-${Math.floor(Math.random() * 100000)}`;
            const priority = args.priority || 'medium';
            const ticket = {
                ticket_id: ticketId,
                user_uuid: this.currentUserUuid,
                subject: args.subject,
                description: args.description,
                priority,
                status: 'open',
                created_at: new Date().toISOString(),
                eta_hours: { low: 48, medium: 24, high: 4 }[priority],
            };
            this.tickets.set(ticketId, ticket);
            return { content: [{ type: "text" as const, text: JSON.stringify(ticket, null, 2) }] };
        });

        this.mcp.registerTool('get_ticket_status', {
            title: 'Get Ticket Status',
            description: `Check the status of a previously created support ticket.`,
            inputSchema: { ticket_id: z.string().describe('Ticket ID (e.g., "TKT-12345")') }
        }, async (args) => {
            const ticket = this.tickets.get(args.ticket_id);
            return ticket
                ? { content: [{ type: "text" as const, text: JSON.stringify(ticket, null, 2) }] }
                : { content: [{ type: "text" as const, text: JSON.stringify({ error: `Ticket ${args.ticket_id} not found` }) }] };
        });

        this.app.post('/mcp', async (req, res) => {
            // Extract user from header — available to tool handlers via this.currentUserUuid
            this.currentUserUuid = (req.headers['x-user-uuid'] as string) || 'unknown';
            const toolName = req.body?.params?.name;
            if (toolName) console.log(`[IncidentTicketServer] user=${this.currentUserUuid} tool=${toolName}`);

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
}
