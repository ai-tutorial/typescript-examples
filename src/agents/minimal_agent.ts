/**
 * Costs & Safety: Single LLM API call. Minimal cost.
 * Env: AI_PROVIDER (openai|gemini), OPENAI_API_KEY, OPENAI_MODEL, GOOGLE_GENERATIVE_AI_API_KEY, GEMINI_MODEL
 * Module reference: [What is an AI Agent?](https://aitutorial.dev/agents/intro#what-is-an-ai-agent)
 * Why: Shows the simplest possible LLM call — one question, one answer — as a baseline before introducing agents.
 */

import { generateText } from 'ai';
import { createModel } from './utils.js';

/**
 * The simplest LLM interaction: ask a question, get an answer
 *
 * This example shows a basic one-shot LLM call with no tools, no memory,
 * and no reasoning loop. This is the starting point — agents build on top
 * of this by adding tool use, state, and multi-step reasoning.
 */
async function main(): Promise<void> {
    const model = createModel();

    const { text } = await generateText({
        model,
        prompt: "What's the capital of France?",
    });

    console.log(text);
}

await main();
