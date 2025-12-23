/**
 * Costs & Safety: Uses OpenAI API via LangChain for agent execution. Each query may involve multiple LLM calls.
 * Module reference: [Introduction to AI Agents](https://aitutorial.dev/agents/intro#your-first-agent-simple-tool-use)
 * Why: Demonstrates the fundamental agent loop using LangChain - how an LLM can decide to use tools, execute them, and incorporate results into its response.
 */

import { ChatOpenAI } from "@langchain/openai";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { config } from 'dotenv';
import { join } from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
config({ path: join(process.cwd(), 'env', '.env') });

/**
 * Main function demonstrating a simple weather agent using LangChain
 * 
 * This example shows the basic agent loop:
 * 1. User asks a question
 * 2. Agent decides it needs a tool
 * 3. Tool is executed
 * 4. Agent uses the result to answer
 */
async function main() {
    console.log("--- Simple Weather Agent (LangChain) ---");

    const userQuery = "What's the weather in San Francisco?";
    console.log(`User: ${userQuery}`);
    console.log('');

    const response = await runWeatherAgent(userQuery);

    console.log('');
    console.log(`Agent: ${response}`);
}

/**
 * Run the weather agent with tool calling
 */
async function runWeatherAgent(userQuery: string): Promise<string> {
    // Step 1: Initialize the LLM with tool calling support
    const model = new ChatOpenAI({
        openAIApiKey: process.env.OPENAI_API_KEY!,
        modelName: process.env.OPENAI_MODEL!,
    });

    // Step 2: Define the weather tool
    const weatherTool = tool(
        async ({ city }: { city: string }) => {
            console.log(`  -> Tool called: get_weather(city="${city}")`);

            // In production, call a real weather API
            // For demo, return fake data
            const weatherData = {
                city: city,
                temperature: 72,
                condition: "Sunny",
                humidity: 45
            };

            return JSON.stringify(weatherData);
        },
        {
            name: "get_weather",
            description: "Get current weather for a city. Use this when user asks about weather.",
            schema: z.object({
                city: z.string().describe("City name, e.g. 'San Francisco'"),
            }),
        }
    );

    // Step 3: Bind the tool to the model
    const modelWithTools = model.bindTools([weatherTool]);

    // Step 4: Invoke the model
    const response = await modelWithTools.invoke(userQuery);

    // Step 5: Check if the model wants to use a tool
    if (response.tool_calls && response.tool_calls.length > 0) {
        console.log("  -> Agent decided to use a tool");

        // Execute the tool
        const toolCall = response.tool_calls[0];
        const toolResult = await weatherTool.invoke(toolCall.args);

        // Step 6: Send the tool result back to the model
        const finalResponse = await model.invoke([
            { role: "user", content: userQuery },
            { role: "assistant", content: response.content, tool_calls: response.tool_calls },
            { role: "tool", content: toolResult, tool_call_id: toolCall.id }
        ]);

        return finalResponse.content as string;
    }

    // No tool needed, return direct response
    return response.content as string;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    main().catch(console.error);
}
