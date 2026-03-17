/**
 * Structured Outputs with JSON Schema - Approach 2: Structured Outputs (JSON Mode)
 * 
 * Costs & Safety: Real API calls; keep inputs small. Requires API key(s).
 * Module reference: [Example 2: Structured Outputs (JSON Mode)](https://aitutorial.dev/context-engineering-prompt-design/structured-prompt-engineering#example-2-structured-outputs-json-mode)
 * Why: Uses OpenAI's structured outputs feature (response_format: json_object) combined with
 *      schema validation. This is more reliable than just including the schema in the prompt.
 */

import { generateText } from 'ai';
import { createModel } from './utils.js';
import { JSONUtils } from '../utils/JSONUtils';

const model = createModel();

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

    const response = await generateText({
        model,
        messages: [
            { role: 'user', content: prompt },
        ],
    });

    const content = response.text;
    const parsed = JSON.parse(content);
    const result = JSONUtils.validateJson<Contract>(parsed, CONTRACT_SCHEMA);

    console.log('--- Schema validation: OK ---');
    console.log(JSON.stringify(result, null, 2));
}

await main();
