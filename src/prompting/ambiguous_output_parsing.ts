/**
 * Ambiguous Output Parsing Problem and Solution
 *
 * Costs & Safety: Real API calls; keep inputs small. Requires API key(s).
 * Module reference: [Pattern 3: Ambiguous Output Parsing](https://aitutorial.dev/prompt-optimization-testing#pattern-3-ambiguous-output-parsing)
 * Why: Demonstrates how ambiguous prompts lead to unpredictable output formats and how specifying output structure ensures consistent, parseable responses.
 */

import { generateText } from 'ai';
import { createModel } from './utils.js';

/**
 * Extract email from response using simple pattern matching
 */
function extractEmail(response: string): string | null {
    const match = response.match(/[\w.-]+@[\w.-]+\.\w+/);
    return match ? match[0] : null;
}

/**
 * Parse structured response with format "email: [email address]"
 */
function parseStructuredEmail(response: string): string | null {
    const match = response.match(/email:\s*([\w.-]+@[\w.-]+\.\w+)/i);
    return match ? match[1] : null;
}

/**
 * Demonstrate a prompt that leads to unpredictable output format
 */
async function demonstrateAmbiguousPrompt(model: ReturnType<typeof createModel>, customerMessage: string): Promise<void> {
    const prompt = `Extract the customer's email from this message: ${customerMessage}`;

    console.log('=== Ambiguous Prompt Example ===');
    console.log(`Customer Message: ${customerMessage}`);
    console.log(`Prompt: ${prompt}`);
    console.log('---');

    const { text } = await generateText({
        model,
        messages: [
            { role: 'user', content: prompt },
        ],
    });

    console.log(`Model Response: ${text}`);
    console.log(`Extracted Email: ${extractEmail(text) || 'Could not extract reliably'}`);
    console.log('Note: Response format is unpredictable - could be "The email is...", "john@example.com", "Email: ...", etc.');
    console.log('---');
}

/**
 * Demonstrate a prompt with explicit output format specification
 */
async function demonstrateStructuredPrompt(model: ReturnType<typeof createModel>, customerMessage: string): Promise<void> {
    const prompt = `Extract customer email from the following message.

    Output format:
    email: [email address]

    Customer message: ${customerMessage}`;

    console.log('=== Structured Prompt Example ===');
    console.log(`Customer Message: ${customerMessage}`);
    console.log(`Prompt: ${prompt}`);
    console.log('---');

    const { text } = await generateText({
        model,
        messages: [
            { role: 'user', content: prompt },
        ],
    });

    console.log(`Model Response: ${text}`);
    console.log(`Extracted Email: ${parseStructuredEmail(text) || 'Could not extract'}`);
    console.log('Note: Response format is consistent and easily parseable');
    console.log('---');
}

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
    const model = createModel();
    const customerMessage = "Hi, I need help with my order. You can reach me at john@example.com or call 555-1234.";

    // Step 1: Demonstrate ambiguous prompt (unpredictable format)
    await demonstrateAmbiguousPrompt(model, customerMessage);

    // Step 2: Demonstrate structured prompt (consistent format)
    await demonstrateStructuredPrompt(model, customerMessage);
}

await main();
