import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from 'express';
import { z } from 'zod';

/**
 * Knowledge Base MCP Server
 *
 * Exposes a single tool for searching support articles and documentation.
 * Runs on its own port — agents discover it independently from other servers.
 *
 * Observability: The server reads `x-user-uuid` from request headers
 * to log which user triggered each tool call. In production, this
 * would typically use OAuth 2.0 Bearer tokens via the MCP auth
 * provider for proper authentication and authorization.
 */
export class KnowledgeBaseServer {
    private app = express();
    private mcp: McpServer;
    private httpServer: any = null;
    private port: number;

    constructor(port = 8001) {
        this.port = port;
        this.app.use(express.json());
        this.mcp = new McpServer({ name: 'KnowledgeBaseServer', version: '1.0.0' });

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
            return { content: [{ type: "text" as const, text: JSON.stringify({ articles: filtered }, null, 2) }] };
        });

        this.app.post('/mcp', async (req, res) => {
            const userUuid = req.headers['x-user-uuid'];
            const toolName = req.body?.params?.name;
            if (toolName) console.log(`[KnowledgeBaseServer] user=${userUuid} tool=${toolName}`);

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
