/**
 * Structured Outputs with JSON Schema - Approach 1: Schema in Prompt
 * 
 * This approach includes the JSON schema in the prompt itself,
 * instructing the model to follow the schema structure.
 * 
 * Costs & Safety: Real API calls; keep inputs small. Requires API key(s).
 * Module reference: `Modules/module-1.md` — Section 8.1 Structured Outputs with JSON Schemas.
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

async function main(): Promise<void> {
    // Step 1: Load schema and create client
    const CONTRACT_SCHEMA = await JSONUtils.loadJsonSchema('contract-schema.json');
    const client = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    });

    // Sample contract text for extraction
    const contractText = `
This Services Agreement is effective January 15, 2025.
Provider delivers monthly support; Client pays $5,000 net 30.
Liability limited to last 3 months fees.`;

    // Step 2: Create prompt with schema included
    // This approach includes the JSON schema in the prompt itself,
    // instructing the model to follow the schema structure.
    const prompt = `Extract contract information from the following text. Return a JSON object matching this schema:
${JSON.stringify(CONTRACT_SCHEMA, null, 2)}

Contract text:
${contractText}

Return only valid JSON matching the schema above.`;

    // Step 3: Call LLM API
    const response = await client.chat.completions.create({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' }, // Force JSON output
    });

    // Step 4: Parse and validate response
    const content = response.choices[0].message.content!;
    const parsed = JSON.parse(content);
    const validated = JSONUtils.validateJson<Contract>(parsed, CONTRACT_SCHEMA);

    // Step 5: Output results
    console.log('\nSchema validation: OK');
    console.log(JSON.stringify(validated, null, 2));
}

main().catch(console.error);

