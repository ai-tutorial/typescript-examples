/**
 * Structured Prompt Anatomy (Module 1)
 * 
 * Costs & Safety: Real API calls; keep inputs small. Requires API key(s).
 * Module reference: `Modules/module-1.md` — Section 2.1 The Anatomy of a Production Prompt.
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
 * This example shows two approaches to structured prompts:
 * 1. Manual construction: Build prompts with explicit sections (Role, Context, Instructions, etc.)
 * 2. Programmatic construction: Build prompts dynamically from components
 * 
 * Both approaches demonstrate the anatomy of production-ready prompts with:
 * - Role: Defines who the AI is acting as
 * - Context: Provides background information
 * - Instructions: Clear step-by-step guidance
 * - Constraints: Boundaries and limitations
 * - Examples: Few-shot learning examples
 * - Input: The actual user input to process
 */
async function main(): Promise<void> {
    console.log('=== Structured Prompt Anatomy Demo ===\n');
    
    await structuredPromptExample(client);
        
    await programmaticStructuredPrompt(client);
}

/**
 * Structured prompt with Role, Context, Instructions, Constraints, Examples, and Input
 * 
 * This demonstrates the anatomy of a production-ready prompt that includes:
 * - Role: Defines who the AI is acting as
 * - Context: Provides background information
 * - Instructions: Clear step-by-step guidance
 * - Constraints: Boundaries and limitations
 * - Examples: Few-shot examples (optional but helpful)
 * - Input: The actual user input to process
 */
async function structuredPromptExample(client: OpenAI): Promise<void> {
    const customerMessage = "Hi my order arrived late by 6 days. Can I get a refund?";

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
 * Alternative: Building structured prompts programmatically
 * 
 * This approach allows you to build prompts dynamically while maintaining
 * the structured format. Useful for production systems where prompts need
 * to be assembled from templates or configurations.
 */
interface PromptComponents {
    role: string;
    context: string;
    instructions: string[];
    constraints: string[];
    examples?: Array<{ input: string; output: string }>;
    input: string;
}

function buildStructuredPrompt(components: PromptComponents): string {
    let prompt = `Role: ${components.role}\n\n`;
    
    prompt += `Context:\n${components.context}\n\n`;
    
    prompt += `Instructions:\n`;
    components.instructions.forEach((instruction, index) => {
        prompt += `${index + 1}. ${instruction}\n`;
    });
    prompt += '\n';
    
    prompt += `Constraints:\n`;
    components.constraints.forEach((constraint) => {
        prompt += `- ${constraint}\n`;
    });
    prompt += '\n';
    
    if (components.examples && components.examples.length > 0) {
        prompt += `Examples:\n`;
        components.examples.forEach((example) => {
            prompt += `Customer: "${example.input}"\n`;
            prompt += `Response: "${example.output}"\n\n`;
        });
    }
    
    prompt += `Input:\n${components.input}\n\nResponse:`;
    
    return prompt;
}

async function programmaticStructuredPrompt(client: OpenAI): Promise<void> {
    const customerMessage = "I received the wrong item. What should I do?";
    
    const promptComponents: PromptComponents = {
        role: "You are a customer service representative for an e-commerce company.",
        context: `Our company policy:
    - Wrong items can be returned for a full refund or exchange
    - We provide prepaid return labels for wrong items
    - Exchanges are processed within 2-3 business days of receiving the return`,
        instructions: [
            "Apologize for the mistake",
            "Confirm the return/exchange process",
            "Offer to send a prepaid return label",
            "Explain the timeline for refund or exchange",
            "Ask if they prefer refund or exchange"
        ],
        constraints: [
            "Do not charge the customer for return shipping",
            "Do not promise specific delivery dates for exchanges",
            "Always apologize for the inconvenience",
            "Keep responses under 150 words"
        ],
        examples: [
            {
                input: "I got the wrong size",
                output: "I sincerely apologize for the mix-up. I'll send you a prepaid return label right away. Once we receive the item, we can process a full refund or send you the correct size - whichever you prefer. The refund typically takes 3-5 business days, or we can ship the correct size within 2-3 business days. Would you like a refund or exchange?"
            }
        ],
        input: customerMessage
    };
    
    const prompt = buildStructuredPrompt(promptComponents);
    
    const response = await client.chat.completions.create({
        model: MODEL,
        messages: [
            { role: 'user', content: prompt }
        ],
        temperature: 0.7,
    });

    const content = response.choices[0].message.content || '';
    
    console.log('--- Programmatic Structured Prompt ---');
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
 * 5. Use programmatic prompt building for maintainability in production
 * 6. Test different prompt structures to find what works best for your use case
 * 7. Monitor prompt performance and iterate based on real-world results
 * 8. Consider using prompt templates or configuration files for complex systems
 * 9. Document your prompt structure decisions for team knowledge sharing
 * 10. Version control your prompts to track changes and their impact
 */

await main();
