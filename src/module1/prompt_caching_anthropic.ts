/**
 * Prompt Caching with Anthropic Claude
 * 
 * Costs & Safety: Real API calls; keep inputs small. Requires API key(s).
 * Module reference: [Prompt Caching: 50-90% Cost Reduction](https://aitutorial.dev/model-selection-cost-optimization#prompt-caching-50-90-cost-reduction)
 * Why: Demonstrates how to use Anthropic's prompt caching with explicit cache control to reduce costs by up to 90% on cached tokens.
 */

import Anthropic from '@anthropic-ai/sdk';
import { config } from 'dotenv';
import { join } from 'path';

// Load environment variables from env/.env file
config({ path: join(process.cwd(), 'env', '.env') });

// Create an Anthropic client instance
const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

const MODEL = 'claude-sonnet-4-20250514';

/**
 * Main function that demonstrates prompt caching with Anthropic Claude
 * 
 * This example shows how to use Anthropic's prompt caching feature with explicit
 * cache control to reduce costs by up to 90% on cached tokens.
 * 
 * Cache control must be explicitly specified using cache_control with type "ephemeral",
 * providing up to 90% cost reduction on cached tokens with a TTL of 5 minutes (extendable to 1 hour).
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

    // Step 2: Demonstrate caching with explicit cache control
    const query1 = "What is your return policy for electronics?";
    await queryWithCaching(query1, knowledgeBase);

    // Step 3: Subsequent queries use cached system content (90% cost reduction)
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

    const response = await client.messages.create({
        model: MODEL,
        system: [
            {
                type: "text",
                text: knowledgeBase,
                cache_control: { type: "ephemeral" }  // Cache this explicitly
            }
        ],
        messages: [
            { role: "user", content: query }  // This changes with each request
        ],
        max_tokens: 1024,
    });

    const content = response.content[0].type === 'text' ? response.content[0].text : '';
    console.log(`Response: ${content}`);
    console.log('');
    console.log('Note: Cache hit provides ~90% reduction on cached tokens. TTL: 5 minutes (extendable to 1 hour).');
    console.log('---');
    console.log('');

    return content;
}

await main();


