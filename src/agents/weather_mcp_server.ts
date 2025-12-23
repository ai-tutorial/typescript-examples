/**
 * Costs & Safety: No external API calls - demonstrates MCP server structure with mock weather data.
 * Module reference: [Tool Design & Implementation](https://aitutorial.dev/agents/tool-design-and-implementation#model-context-protocol-mcp-introduction)
 * Why: MCP provides a standardized protocol for AI agents to discover and use tools, making integrations reusable across different AI systems.
 */

import 'dotenv/config';
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from 'express';
import { z } from 'zod';

// Client should connect to: http://localhost:8002/mcp
const PORT = process.env.PORT || 8002;

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
    location: z.string().describe('City name or location to get weather for (e.g., \'San Francisco\', \'London, UK\', \'Tokyo\')'),
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
    app.listen(PORT, () => {
        console.error('🚀 Weather MCP HTTP Server Started');
        console.error(`Server: http://localhost:${PORT}`);
        console.error(`Endpoint: POST http://localhost:${PORT}/mcp (JSON-RPC)`);
        console.error(`Health: GET http://localhost:${PORT}/health`);
        console.error('');
        console.error('Available tools:');
        console.error('  - get_weather');
        console.error('');
        console.error('💡 Test with:');
        console.error(`   curl -X POST http://localhost:${PORT}/mcp -H "Content-Type: application/json" -H "Accept: application/json, text/event-stream" -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'`);
        console.error('');
        console.error('Ready to accept connections...');
    });
}

main();
