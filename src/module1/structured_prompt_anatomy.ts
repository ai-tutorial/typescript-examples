/**
 * Structured Prompt Anatomy (Module 1)
 * 
 * Costs & Safety: Real API calls; keep inputs small. Requires API key(s).
 * Module reference: [The Anatomy of a Production Prompt](https://aitutorial.dev/context-engineering-prompt-design/structured-prompt-engineering#the-anatomy-of-a-production-prompt)
 * Why: Structured prompts with explicit Role, Context, Instructions, Constraints, Examples, and Input
 *      tend to reduce hallucinations and parsing errors while improving reliability in production.
 */

import OpenAI from 'openai';
import { config } from 'dotenv';
import { join } from 'path';

// Load environment variables from env/.env
config({ path: join(process.cwd(), 'env', '.env') });

// Setup
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Main function that demonstrates structured prompt engineering
 * 
 * This example shows how to build production-ready prompts with explicit components.
 * 
 * This structured approach reduces hallucinations and parsing errors while improving reliability.
 */
async function main(): Promise<void> {
    const customerMessage = "Hi my order arrived late by 6 days. Can I get a refund?";

    // Step 1: Define the Role: Who the AI is acting as
    // Step 2: Provide Context: Background information needed
    // Step 3: Specify Instructions: Clear step-by-step guidance
    // Step 4: Set Constraints: Boundaries and limitations
    // Step 5: Include Examples: Few-shot learning examples (optional)
    // Step 6: Separate Input: The actual user input to process
    const prompt = `Role: You are a customer service representative for an e-commerce company.

    Context: 
    - Our company policy allows refunds for orders that arrive more than 5 days late
    - We prioritize customer satisfaction and aim to resolve issues quickly
    - Standard refund processing takes 3-5 business days

    Instructions:
    1. Acknowledge the customer's concern empathetically
    2. Verify if the order qualifies for a refund based on the delay
    3. If eligible, explain the refund process and timeline
    4. If not eligible, offer alternative solutions (partial refund, store credit, etc.)
    5. End with a clear next step

    Constraints:
    - Do not make promises about specific refund amounts without checking the order details
    - Do not offer refunds for orders that arrived within the expected timeframe
    - Always be polite and professional
    - Keep responses concise (2-3 sentences)

    Examples:
    Customer: "My package is 7 days late"
    Response: "I'm sorry to hear about the delay. Since your order arrived more than 5 days late, you're eligible for a full refund. I'll process this for you now, and you should see the refund in your account within 3-5 business days. Would you like me to proceed?"

    Customer: "My package is 3 days late"
    Response: "I understand your concern about the delay. While your order is slightly delayed, it's still within our standard delivery window. However, I'd be happy to offer you a 20% store credit as a gesture of goodwill. Would that work for you?"

    Input:
    ${customerMessage}

    Response:`;

    const response = await client.chat.completions.create({
        model: MODEL,
        messages: [
            { role: 'user', content: prompt }
        ],
        temperature: 0.7,
    });

    const content = response.choices[0].message.content || '';
    
    console.log('--- Structured Prompt Example ---');
    console.log('Customer Message:', customerMessage);
    console.log('\nAI Response:');
    console.log(content);
}

/**
 * Production notes:
 * 
 * 1. Structured prompts improve reliability by making expectations explicit
 * 2. Always include Role, Context, Instructions, and Constraints for production use
 * 3. Examples (few-shot learning) can significantly improve output quality
 * 4. Separate Input clearly to avoid confusion between instructions and data
 * 5. Build prompts with explicit structure for maintainability in production
 * 6. Test different prompt structures to find what works best for your use case
 * 7. Monitor prompt performance and iterate based on real-world results
 * 8. Consider using prompt templates or configuration files for complex systems
 * 9. Document your prompt structure decisions for team knowledge sharing
 * 10. Version control your prompts to track changes and their impact
 */

await main();
