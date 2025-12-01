/**
 * Structured Outputs with JSON Schema (Module 1)
 * 
 * Costs & Safety: Real API calls; keep inputs small. Requires API key(s).
 * Module reference: `Modules/module-1.md` — Section 8.1 Structured Outputs with JSON Schemas.
 * Why: Schema-constrained outputs reduce parsing errors and improve reliability; easy to validate.
 */

import OpenAI from 'openai';
import { config } from 'dotenv';
import { join, dirname } from 'path';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import Ajv from 'ajv';
import * as readline from 'readline';

// Load environment variables from env/.env
config({ path: join(process.cwd(), 'env', '.env') });

// Setup
const MODEL: string = process.env.OPENAI_MODEL!;

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
 * JSON Schema type definition
 */
type JsonSchema = {
    type: 'object';
    properties: Record<string, { type: string; items?: { type: string } }>;
    required: string[];
    additionalProperties: boolean;
};

/**
 * Load JSON Schema from file
 */
async function loadContractJsonSchema(): Promise<JsonSchema> {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const schemaPath = join(__dirname, 'contract-schema.json');
    const schemaContent = await readFile(schemaPath, 'utf-8');
    return JSON.parse(schemaContent) as JsonSchema;
}

/**
 * Validate contract data against JSON schema using Ajv
 */
function validateContract(data: unknown, schema: JsonSchema): Contract {
    const ajv = new Ajv();
    const validate = ajv.compile(schema);
    if (validate(data)) {
        return data as Contract;
    } else {
        throw new Error(`Schema validation failed: ${JSON.stringify(validate.errors, null, 2)}`);
    }
}

// Sample contract text for extraction
const contractText: string = `
This Services Agreement is effective January 15, 2025.
Provider delivers monthly support; Client pays $5,000 net 30.
Liability limited to last 3 months fees.
`.trim();

/**
 * Enforcing json schema in prompt
 * 
 * This approach includes the JSON schema in the prompt itself,
 * instructing the model to follow the schema structure.
 */
async function enforceSchemaInPrompt(client: OpenAI, schema: JsonSchema): Promise<Contract> {
    const prompt: string = `Extract contract information from the following text. Return a JSON object matching this schema:
${JSON.stringify(schema, null, 2)}

Contract text:
${contractText}

Return only valid JSON matching the schema above.`;

    const response = await client.chat.completions.create({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' }, // Force JSON output
    });

    const content: string = response.choices[0].message.content!;
    const parsed: unknown = JSON.parse(content);
    const validated: Contract = validateContract(parsed, schema);

    console.log('\nSchema validation: OK');
    console.log(JSON.stringify(validated, null, 2));

    return validated;
}

/**
 * Forcing it with Structured outputs (Json mode)
 * 
 * This approach uses OpenAI's structured outputs feature (response_format: json_object)
 * combined with schema validation. This is more reliable than just including
 * the schema in the prompt.
 * 
 * Try changing the model to see how different models handle structured outputs.
 */
async function useStructuredOutputs(client: OpenAI, schema: JsonSchema): Promise<Contract> {
    const prompt: string =
        `Extract contract information from the following text.
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
        response_format: { type: 'json_object' }, // Structured output mode
    });

    const content: string = response.choices[0].message.content!;
    const parsed: unknown = JSON.parse(content);
    const result: Contract = validateContract(parsed, schema);

    console.log('\nSchema validation: OK');
    console.log(JSON.stringify(result, null, 2));

    return result;
}

/**
 * Alternative validation using Ajv (JSON Schema validator)
 * This provides more detailed error messages for schema violations
 * 
 * Example usage:
 * ```typescript
 * const ajv = new Ajv();
 * const validate = ajv.compile(CONTRACT_SCHEMA);
 * if (validate(data)) {
 *   return data as Contract;
 * } else {
 *   throw new Error(`Schema validation failed: ${JSON.stringify(validate.errors, null, 2)}`);
 * }
 * ```
 */

/**
 * Production notes:
 * 
 * 1. Always validate LLM outputs - never trust them blindly
 * 2. Use structured outputs (response_format: json_object) when available
 * 3. Combine prompt instructions with schema validation for best results
 * 4. Consider retry logic for validation failures
 * 5. Log validation errors for monitoring and improvement
 * 6. Different models may have different compliance rates with schemas
 * 7. For production, consider using OpenAI's function calling or structured outputs API
 *    when available for your use case
 */

/**
 * Pause execution and wait for user to press Enter
 */
function waitForEnter(message: string = 'Press Enter to continue...'): Promise<void> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise((resolve) => {
        rl.question(message, () => {
            rl.close();
            resolve();
        });
    });
}

async function main(): Promise<void> {
    const CONTRACT_SCHEMA: JsonSchema = await loadContractJsonSchema();
    console.log('contract_schema', JSON.stringify(CONTRACT_SCHEMA, null, 2));

    const client: OpenAI = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    });

    console.log('=== Approach 1: Enforcing schema in prompt ===\n');
    await enforceSchemaInPrompt(client, CONTRACT_SCHEMA);

    await waitForEnter('\nPress Enter to continue to the next approach...');

    console.log('\n\n=== Approach 2: Using structured outputs (JSON mode) ===\n');
    await useStructuredOutputs(client, CONTRACT_SCHEMA);

    await waitForEnter('\nPress Enter to exit...');
}

main().catch(console.error);

