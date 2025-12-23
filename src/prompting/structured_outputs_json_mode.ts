/**
 * Structured Outputs with JSON Schema - Approach 2: Structured Outputs (JSON Mode)
 * 
 * Costs & Safety: Real API calls; keep inputs small. Requires API key(s).
 * Module reference: [Example 2: Structured Outputs (JSON Mode)](https://aitutorial.dev/context-engineering-prompt-design/structured-prompt-engineering#example-2-structured-outputs-json-mode)
 * Why: Uses OpenAI's structured outputs feature (response_format: json_object) combined with
 *      schema validation. This is more reliable than just including the schema in the prompt.
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
 * Main function that demonstrates structured outputs with JSON mode
 * 
 * This example shows how to use OpenAI's structured outputs feature with JSON mode and schema validation.
 * 
 * This approach is more reliable than including the schema in the prompt alone.
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

    const prompt = `Extract contract information from the following text.
    Return a JSON object with the following structure:
    - parties: array of party names
    - key_dates: array of important dates
    - obligations: array of obligations
    - risk_flags: array of risk flags or concerning clauses
    - summary: brief summary of the contract

    Contract text:
    ${contractText}`;

    const response = await client.chat.completions.create({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
    });

    const content = response.choices[0].message.content!;
    const parsed = JSON.parse(content);
    const result = JSONUtils.validateJson<Contract>(parsed, CONTRACT_SCHEMA);

    console.log('--- Schema validation: OK ---');
    console.log(JSON.stringify(result, null, 2));
}

await main();
