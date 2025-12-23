/**
 * Ambiguous Output Parsing Problem and Solution
 * 
 * Costs & Safety: Real API calls; keep inputs small. Requires API key(s).
 * Module reference: [Pattern 3: Ambiguous Output Parsing](https://aitutorial.dev/prompt-optimization-testing#pattern-3-ambiguous-output-parsing)
 * Why: Demonstrates how ambiguous prompts lead to unpredictable output formats and how specifying output structure ensures consistent, parseable responses.
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

const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

/**
 * Main function that demonstrates ambiguous output parsing problem and solution
 * 
 * This example shows how prompts without explicit output format specifications
 * lead to unpredictable response formats that are difficult to parse programmatically.
 * 
 * By specifying the exact output format in the prompt, we ensure consistent,
 * parseable responses that can be reliably processed by code.
 */
async function main(): Promise<void> {
    const customerMessage = "Hi, I need help with my order. You can reach me at john@example.com or call 555-1234.";

    // Step 1: Demonstrate ambiguous prompt (unpredictable format)
    await demonstrateAmbiguousPrompt(customerMessage);
    
    // Step 2: Demonstrate structured prompt (consistent format)
    await demonstrateStructuredPrompt(customerMessage);
}

/**
 * Extract email from response using simple pattern matching
 * @param response - Model response text
 * @returns Extracted email or null if not found
 */
function extractEmail(response: string): string | null {
    const emailPattern = /[\w.-]+@[\w.-]+\.\w+/;
    const match = response.match(emailPattern);
    let result: string | null;
    if (match) {
        result = match[0];
    } else {
        result = null;
    }
    return result;
}

/**
 * Parse structured response with format "email: [email address]"
 * @param response - Model response text
 * @returns Extracted email or null if format doesn't match
 */
function parseStructuredEmail(response: string): string | null {
    const match = response.match(/email:\s*([\w.-]+@[\w.-]+\.\w+)/i);
    let result: string | null;
    if (match) {
        result = match[1];
    } else {
        result = null;
    }
    return result;
}

/**
 * Demonstrate a prompt that leads to unpredictable output format
 * @param customerMessage - Customer message containing email
 * @returns Response from the model
 */
async function demonstrateAmbiguousPrompt(customerMessage: string): Promise<string> {
    // Bad: No output format specification - response format is unpredictable
    const prompt = `Extract the customer's email from this message: ${customerMessage}`;

    console.log('=== Ambiguous Prompt Example ===');
    console.log(`Customer Message: ${customerMessage}`);
    console.log(`Prompt: ${prompt}`);
    console.log('---');

    const response = await client.chat.completions.create({
        model: MODEL,
        messages: [
            { role: 'user', content: prompt }
        ],
        temperature: 0.7,
    });

    const content = response.choices[0].message.content || '';
    console.log(`Model Response: ${content}`);
    
    const extracted = extractEmail(content);
    console.log(`Extracted Email: ${extracted || 'Could not extract reliably'}`);
    console.log('Note: Response format is unpredictable - could be "The email is...", "john@example.com", "Email: ...", etc.');
    console.log('---');
    
    return content;
}

/**
 * Demonstrate a prompt with explicit output format specification
 * @param customerMessage - Customer message containing email
 * @returns Response from the model
 */
async function demonstrateStructuredPrompt(customerMessage: string): Promise<string> {
    // Good: Explicit output format specification ensures consistent parsing
    const prompt = `Extract customer email from the following message.

    Output format:
    email: [email address]

    Customer message: ${customerMessage}`;

    console.log('=== Structured Prompt Example ===');
    console.log(`Customer Message: ${customerMessage}`);
    console.log(`Prompt: ${prompt}`);
    console.log('---');

    const response = await client.chat.completions.create({
        model: MODEL,
        messages: [
            { role: 'user', content: prompt }
        ],
        temperature: 0.7,
    });

    const content = response.choices[0].message.content || '';
    console.log(`Model Response: ${content}`);
    
    const extracted = parseStructuredEmail(content);
    console.log(`Extracted Email: ${extracted || 'Could not extract'}`);
    console.log('Note: Response format is consistent and easily parseable');
    console.log('---');
    
    return content;
}

await main();

