/**
 * Hello World
 * 
 * Costs & Safety: Real API call; keep inputs small. Requires API key.
 * Module reference: [Hello World](https://aitutorial.dev/context-engineering-prompt-design/llm-fundamentals#hello-world)
 * Why: Basic example showing how to make a simple API call using the Vercel AI SDK.
 */

import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { google } from '@ai-sdk/google';
import { config } from 'dotenv';
import { join } from 'path';

// Load environment variables from env/.env file
config({ path: join(process.cwd(), 'env', '.env') });

const models = {
    openai: openai('gpt-4o-mini'),
    gemini: google('gemini-2.0-flash'),
};

/**
 * Main function that demonstrates a basic Vercel AI SDK call
 *
 * This example shows how to interact with multiple LLM providers
 * using the Vercel AI SDK. Switch providers by changing the model key.
 *
 * This is the foundation for all other LLM interactions.
 */
async function main(): Promise<void> {
    const provider = (process.env.AI_PROVIDER ?? 'openai') as keyof typeof models;
    const model = models[provider];

    const { text } = await generateText({
        model,
        prompt: 'Say hello in 4 words.',
    });

    console.log(`Response (${provider}):`, text);
}

await main();
