/**
 * Structured Outputs with JSON Schema - Approach 2: Structured Outputs (JSON Mode)
 * 
 * This approach uses OpenAI's structured outputs feature (response_format: json_object)
 * combined with schema validation. This is more reliable than just including
 * the schema in the prompt.
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

    // Step 2: Create prompt with structure description
    // This approach uses OpenAI's structured outputs feature (response_format: json_object)
    // combined with schema validation. This is more reliable than just including
    // the schema in the prompt.
    const prompt = `Extract contract information from the following text.
Return a JSON object with the following structure:
- parties: array of party names
- key_dates: array of important dates
- obligations: array of obligations
- risk_flags: array of risk flags or concerning clauses
- summary: brief summary of the contract

Contract text:
${contractText}`;

    // Step 3: Call LLM API with structured output mode
    const response = await client.chat.completions.create({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' }, // Structured output mode
    });

    // Step 4: Parse and validate response
    const content = response.choices[0].message.content!;
    const parsed = JSON.parse(content);
    const result = JSONUtils.validateJson<Contract>(parsed, CONTRACT_SCHEMA);

    // Step 5: Output results
    console.log('\nSchema validation: OK');
    console.log(JSON.stringify(result, null, 2));
}

main().catch(console.error);

