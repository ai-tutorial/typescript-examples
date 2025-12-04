/**
 * Structured Outputs with JSON Schema - Approach 1: Schema in Prompt
 * 
 * Costs & Safety: Real API calls; keep inputs small. Requires API key(s).
 * Module reference: `Modules/module-1.md` — Section 8.1 Structured Outputs with JSON Schemas.
 * Why: Includes the JSON schema in the prompt itself, instructing the model to follow
 *      the schema structure. Simpler than using structured outputs API but less reliable.
 */

import OpenAI from 'openai';
import { config } from 'dotenv';
import { join } from 'path';
import { JSONUtils } from '../utils/JSONUtils';

// Load environment variables from env/.env
config({ path: join(process.cwd(), 'env', '.env') });

// Setup
const MODEL = process.env.OPENAI_MODEL!;

/**
 * Contract type definition
 */
type Contract = {
    parties: string[];
    key_dates: string[];
    obligations: string[];
    risk_flags: string[];
    summary: string;
};

/**
 * Main function that demonstrates structured outputs with schema in prompt
 * 
 * This example shows how to include the JSON schema directly in the prompt:
 * 1. Load a JSON schema for reference
 * 2. Create a prompt that includes the schema
 * 3. Call the API with response_format: json_object
 * 4. Parse and validate the response against the schema
 * 
 * This approach is simpler but less reliable than using structured outputs API alone.
 */
async function main(): Promise<void> {
    const CONTRACT_SCHEMA = await JSONUtils.loadJsonSchema('contract-schema.json');
    const client = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    });

    const contractText = `
    This Services Agreement is effective January 15, 2025.
    Provider delivers monthly support; Client pays $5,000 net 30.
    Liability limited to last 3 months fees.`;

    const prompt = `Extract contract information from the following text. Return a JSON object matching this schema:
    ${JSON.stringify(CONTRACT_SCHEMA, null, 2)}

    Contract text:
    ${contractText}

    Return only valid JSON matching the schema above.`;

    const response = await client.chat.completions.create({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
    });

    const content = response.choices[0].message.content!;
    const parsed = JSON.parse(content);
    const validated = JSONUtils.validateJson<Contract>(parsed, CONTRACT_SCHEMA);

    console.log('--- Schema validation: OK ---');
    console.log(JSON.stringify(validated, null, 2));
}

await main();
