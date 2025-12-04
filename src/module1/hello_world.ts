/**
 * Hello World (Module 1)
 * 
 * Costs & Safety: Real API call; keep inputs small. Requires API key.
 * Module reference: `Modules/module-1.md` — Introduction.
 * Why: Basic example showing how to make a simple API call to OpenAI.
 */

import OpenAI from 'openai';
import { config } from 'dotenv';
import { join } from 'path';

// Load environment variables from env/.env file
config({ path: join(process.cwd(), 'env', '.env') });

// Create an OpenAI client instance
const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Main function that demonstrates a basic OpenAI API call
 * 
 * This example shows the simplest way to interact with OpenAI's API:
 * 1. Create a client with your API key
 * 2. Send a message using chat.completions.create
 * 3. Extract and display the response
 */
async function main(): Promise<void> {
    const response = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
            {
                role: 'user',
                content: 'Say hello in 4 words.'
            }
        ],
    });

    console.log(response.choices[0].message.content);
}

await main();
