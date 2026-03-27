/**
 * Costs & Safety: Uses LLM API via LangChain for agent execution. Each query may involve multiple LLM calls.
 * Env: AI_PROVIDER (openai|gemini), OPENAI_API_KEY, OPENAI_MODEL, GOOGLE_GENERATIVE_AI_API_KEY, GEMINI_MODEL
 * Module reference: [Introduction to AI Agents](https://aitutorial.dev/agents/intro#your-first-agent-simple-tool-use)
 * Why: Demonstrates a proper ReAct agent using LangGraph — the agent autonomously decides when to call tools, handles multi-step reasoning, and loops until it has a final answer.
 */

import { createAgent, tool } from "langchain";
import { z } from "zod";
import { fileURLToPath } from 'url';
import { createModel } from './langchain_utils.js';

/**
 * Demonstrates a ReAct agent that autonomously reasons and uses tools
 *
 * This example shows a proper agent loop powered by LangGraph's createReactAgent:
 * the LLM decides whether to call a tool, observes the result, and keeps
 * reasoning until it can produce a final answer — no manual orchestration needed.
 *
 * Unlike manual tool-calling, this handles multi-step reasoning and multiple
 * tool calls automatically.
 */
async function main(): Promise<void> {
    console.log("--- Weather Agent (LangGraph ReAct) ---");

    // Step 1: Define the weather tool
    const weatherTool = tool(
        async ({ city, units }: { city: string; units?: string }) => {
            console.log(`  -> Tool called: get_weather(city="${city}", units="${units || 'celsius'}")`);

            // In production, call a real weather API
            const weatherData = {
                city,
                temperature: 22,
                condition: "Sunny",
                humidity: 45,
                units: units || 'celsius'
            };

            return JSON.stringify(weatherData);
        },
        {
            name: "get_weather",
            description: "Get current weather conditions for a specific location.",
            schema: z.object({
                city: z.string().describe("City name (e.g., 'Buenos Aires', 'San Francisco', 'Tokyo')"),
                units: z.enum(["celsius", "fahrenheit", "kelvin"]).optional().describe("Temperature units. Defaults to 'celsius'."),
            }),
        }
    );

    // Step 2: Create the ReAct agent
    const model = await createModel();
    const agent = createAgent({ model, tools: [weatherTool] });

    // Step 3: Run the agent
    const userQuery = "What's the weather in Buenos Aires?";
    console.log(`User: ${userQuery}`);
    console.log('');

    const result = await agent.invoke({
        messages: [{ role: "user", content: userQuery }],
    });

    // Step 4: Extract the final response
    const lastMessage = result.messages[result.messages.length - 1];
    console.log('');
    console.log(`Agent: ${lastMessage.content}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    main().catch(console.error);
}
