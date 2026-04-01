/**
 * Costs & Safety: No external API calls - demonstrates MCP server structure with mock weather data.
 * Module reference: [Model Context Protocol (MCP)](https://aitutorial.dev/agents/model-context-protocol#model-context-protocol-mcp-introduction)
 * Why: MCP provides a standardized protocol for AI agents to discover and use tools, making integrations reusable across different AI systems.
 */

import 'dotenv/config';
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from 'express';
import https from 'https';
import { execSync } from 'child_process';
import { z } from 'zod';

// Client should connect to: http://localhost:8002/mcp or https://localhost:8443/mcp
const HTTP_PORT = process.env.PORT || 8002;
const HTTPS_PORT = process.env.HTTPS_PORT || 8443;
const KEEP_ALIVE = process.argv.includes('--keep-alive');

// Create Express app
const app = express();
app.use(express.json());

// Create MCP Server
const mcp = new McpServer({
    name: 'WeatherToolServer',
    version: '1.0.0',
    description: 'Provides weather information for locations',
});

// Define schema for weather tool
const weatherSchema = {
    location: z.string().describe('City name or location to get weather for (e.g., \'Buenos Aires\', \'San Francisco\', \'London, UK\', \'Tokyo\')'),
    units: z.enum(['celsius', 'fahrenheit', 'kelvin']).optional().describe('Temperature units to use. Valid values: \'celsius\', \'fahrenheit\', \'kelvin\'. Defaults to \'celsius\'.'),
};

// Register weather tool using the MCP pattern
mcp.registerTool(
    'get_weather',
    {
        title: 'Get Weather',
        description: 'Get current weather conditions for a specific location. Use this when users ask about weather, temperature, or atmospheric conditions.',
        inputSchema: weatherSchema
    },
    async (args) => {
        const { location, units = 'celsius' } = args;

        // In production, call a real weather API
        // For demo, return mock data
        const weatherData = {
            location: location,
            temperature: 72,
            condition: "Sunny",
            humidity: 45,
            units: units,
            timestamp: new Date().toISOString()
        };

        return {
            content: [{
                type: "text",
                text: JSON.stringify(weatherData, null, 2),
            }],
        };
    }
);

// Add health check endpoint
app.get('/health', async (_req, res) => {
    res.json({
        status: "ok",
        mcp_server: "running",
        weather_service: "mock_data"
    });
});

// Add MCP endpoint following the correct pattern
app.post('/mcp', async (req, res) => {
    const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
        enableJsonResponse: true
    });

    // Connect server with transport
    await mcp.connect(transport);

    res.on('close', () => {
        transport.close();
    });

    await transport.handleRequest(req, res, req.body);
});

/**
 * Main function that starts the MCP HTTP server
 * 
 * This example shows how to create an MCP server that:
 * - Exposes tools via HTTP instead of stdio
 * - Provides a health check endpoint
 * - Uses Zod schemas for input validation
 * 
 * MCP servers can be accessed by any AI agent that supports the protocol.
 */
async function main() {
    // --- START HTTP SERVER ---
    const httpServer = await new Promise<any>((resolve) => {
        const s = app.listen(HTTP_PORT, () => resolve(s));
    });

    // --- START HTTPS SERVER (self-signed cert) ---
    const certOutput = execSync(
        'openssl req -x509 -newkey rsa:2048 -keyout /dev/stdout -out /dev/stdout -days 1 -nodes -subj "/CN=localhost" 2>/dev/null',
        { encoding: 'utf-8' }
    );
    const key = certOutput.match(/-----BEGIN PRIVATE KEY-----[\s\S]+?-----END PRIVATE KEY-----/)![0];
    const cert = certOutput.match(/-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/)![0];

    const httpsServer = await new Promise<any>((resolve) => {
        const s = https.createServer({ key, cert }, app).listen(HTTPS_PORT, () => resolve(s));
    });

    console.log(`Weather MCP Server running on:`);
    console.log(`  HTTP:  http://localhost:${HTTP_PORT}`);
    console.log(`  HTTPS: https://localhost:${HTTPS_PORT}`);
    console.log(`Endpoint: POST /mcp`);
    console.log(`Health:   GET  /health`);
    console.log('');

    // --- SELF-TEST: call the server as a client would ---
    const baseUrl = `http://localhost:${HTTP_PORT}/mcp`;
    const headers = { 'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream' };

    // Step 1: Discover tools (tools/list)
    const listRes = await fetch(baseUrl, {
        method: 'POST', headers,
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
    });
    const tools: any = await listRes.json();
    console.log('tools/list response:', JSON.stringify(tools, null, 2));
    console.log('');

    // Step 2: Call a tool (tools/call)
    const callRes = await fetch(baseUrl, {
        method: 'POST', headers,
        body: JSON.stringify({
            jsonrpc: '2.0', id: 2, method: 'tools/call',
            params: { name: 'get_weather', arguments: { location: 'Buenos Aires', units: 'celsius' } },
        }),
    });
    const result: any = await callRes.json();
    console.log('get_weather("Buenos Aires"):', result.result?.content?.[0]?.text || JSON.stringify(result));

    // --- STOP SERVER (unless --keep-alive) ---
    if (KEEP_ALIVE) {
        console.log('');
        console.log('Server kept alive. Press Ctrl+C to stop.');
    } else {
        httpServer.close();
        httpsServer.close();
    }
}

await main();
