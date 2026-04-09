/**
 * Costs & Safety: Uses LLM API via LangChain for agent execution. Each query may involve multiple LLM calls.
 * Env: AI_PROVIDER (openai|gemini), OPENAI_API_KEY, OPENAI_MODEL, GOOGLE_GENERATIVE_AI_API_KEY, GEMINI_MODEL
 * Module reference: [What is an AI Agent?](https://aitutorial.dev/agents/intro#what-is-an-ai-agent)
 * Why: Shows the simplest possible agent — one tool, one question — as a baseline before introducing more complex agents.
 */

import { createAgent } from "langchain";
import { createModel } from './langchain_utils.js';

/**
 * The simplest agent: one question, one answer
 *
 * This example shows the minimal agent loop powered by LangGraph's createReactAgent:
 * a model is wrapped in an agent and invoked with a user message, producing a final answer.
 *
 * This is the starting point — more complex agents build on this by adding tools,
 * memory, and multi-step reasoning.
 */
async function main(): Promise<void> {
    console.log("--- Minimal Agent ---");

    // Step 1: Create the agent
    const model = await createModel();
    const agent = createAgent({ model, tools: [] });

    // Step 2: Run the agent
    const userQuery = "What's the capital of France?";
    console.log(`User: ${userQuery}`);
    console.log('');

    const result = await agent.invoke({
        messages: [{ role: "user", content: userQuery }],
    });

    // Step 3: Extract the final response
    const lastMessage = result.messages[result.messages.length - 1];
    console.log('');
    console.log(`Agent: ${lastMessage.content}`);
}

await main();
