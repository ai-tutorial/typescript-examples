/**
 * Structured Outputs with JSON Schema - Approach 1: Schema in Prompt
 * 
 * Costs & Safety: Real API calls; keep inputs small. Requires API key(s).
 * Module reference: [Example 1: Schema in Prompt](https://aitutorial.dev/context-engineering-prompt-design/structured-prompt-engineering#example-1-schema-in-prompt)
 * Why: Includes the JSON schema in the prompt itself, instructing the model to follow
 *      the schema structure. Simpler than using structured outputs API but less reliable.
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
 * Main function that demonstrates structured outputs with schema in prompt
 * 
 * This example shows how to include the JSON schema directly in the prompt.
 * 
 * This approach is simpler but less reliable than using structured outputs API alone.
 */
async function main(): Promise<void> {
    const contractText = `
    This Services Agreement is effective January 15, 2025.
    Provider delivers monthly support; Client pays $5,000 net 30.
    Liability limited to last 3 months fees.`;

    // Step 1: Load a JSON schema for reference
    const CONTRACT_SCHEMA = await JSONUtils.loadJsonSchema('contract-schema.json');
    
    // Step 2: Create a prompt that includes the schema
    const prompt = `Extract contract information from the following text. Return a JSON object matching this schema:
    ${JSON.stringify(CONTRACT_SCHEMA, null, 2)}

    Contract text:
    ${contractText}

    Return only valid JSON matching the schema above.`;

    // Step 3: Call the API
    const response = await generateText({
        model,
        messages: [
            { role: 'user', content: prompt },
        ],
    });

    // Step 4: Parse and validate the response against the schema
    const content = response.text;
    const parsed = JSON.parse(content);
    const validated = JSONUtils.validateJson<Contract>(parsed, CONTRACT_SCHEMA);

    console.log('--- Schema validation: OK ---');
    console.log(JSON.stringify(validated, null, 2));
}

await main();
