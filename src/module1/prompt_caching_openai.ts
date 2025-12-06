/**
 * Prompt Caching with OpenAI
 * 
 * Costs & Safety: Real API calls; keep inputs small. Requires API key(s).
 * Module reference: [Prompt Caching: 50-90% Cost Reduction](https://aitutorial.dev/model-selection-cost-optimization#prompt-caching-50-90-cost-reduction)
 * Why: Demonstrates how to use OpenAI's prompt caching to reduce costs by 50% on cached portions when system prompts are above 1024 tokens.
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

const MODEL = process.env.OPENAI_MODEL || 'gpt-4-turbo';

/**
 * Main function that demonstrates prompt caching with OpenAI
 * 
 * This example shows how to use OpenAI's automated prompt caching feature
 * to reduce costs by caching system prompts that are above 1024 tokens.
 * 
 * Automated caching occurs when system prompts exceed 1024 tokens, providing
 * approximately 50% cost reduction on cached portions for subsequent calls within 5-10 minutes.
 */
async function main(): Promise<void> {
    // Step 1: Create a large knowledge base (simulated - would be your actual knowledge base)
    const knowledgeBase = `Acme Corporation Product Knowledge Base

    Product Categories:
    - Electronics: Smartphones, laptops, tablets, accessories
    - Home & Garden: Furniture, appliances, tools, decor
    - Clothing: Men's, women's, children's apparel and accessories
    - Sports & Outdoors: Equipment, apparel, camping gear
    - Books & Media: Physical books, e-books, audiobooks, movies
    
    Return Policy:
    - 30-day money-back guarantee for unopened items
    - Electronics must be in original packaging with all accessories
    - Clothing must have tags attached and be unworn
    - Software and digital products are non-refundable after download
    
    Shipping Information:
    - Standard shipping: 5-7 business days, $5.99
    - Express shipping: 2-3 business days, $12.99
    - Overnight shipping: Next business day, $24.99
    - Free shipping on orders over $50
    
    Customer Service:
    - Phone support: Monday-Friday 9am-6pm EST
    - Email support: 24/7 response within 24 hours
    - Live chat: Monday-Sunday 8am-10pm EST
    - Support email: support@acme.com
    - Support phone: 1-800-ACME-HELP
    
    Warranty Information:
    - Electronics: 1-year manufacturer warranty
    - Extended warranties available for purchase
    - Warranty claims processed within 5-7 business days
    
    Payment Options:
    - Credit cards: Visa, MasterCard, American Express, Discover
    - PayPal, Apple Pay, Google Pay
    - Buy now, pay later options available
    - Gift cards accepted
    
    Account Management:
    - Create account for order tracking and faster checkout
    - Save payment methods for quick checkout
    - Order history available for 2 years
    - Wishlist feature available
    - Subscribe to newsletter for exclusive deals`;

    // Step 2: Demonstrate caching with system message
    // System messages above 1024 tokens are automatically cached
    const query1 = "What is your return policy for electronics?";
    await queryWithCaching(query1, knowledgeBase);

    // Step 3: Subsequent queries use cached system message (50% cost reduction)
    const query2 = "How long does standard shipping take?";
    await queryWithCaching(query2, knowledgeBase);

    const query3 = "What payment methods do you accept?";
    await queryWithCaching(query3, knowledgeBase);
}

/**
 * Query the model with prompt caching enabled
 * @param query - User query
 * @param knowledgeBase - Large knowledge base to cache
 * @returns Response from the model
 */
async function queryWithCaching(query: string, knowledgeBase: string): Promise<string> {
    console.log(`Query: ${query}`);
    console.log('---');

    const response = await client.chat.completions.create({
        model: MODEL,
        messages: [
            {
                role: "system",
                content: knowledgeBase  // This gets cached automatically (if >1024 tokens)
            },
            {
                role: "user",
                content: query  // This changes with each request
            }
        ],
        temperature: 0.7,
    });

    const content = response.choices[0].message.content || '';
    console.log(`Response: ${content}`);
    console.log('');
    console.log('Note: First call pays full cost. Subsequent calls (within 5-10 min) get ~50% reduction on cached portion.');
    console.log('---');
    console.log('');

    return content;
}

await main();




