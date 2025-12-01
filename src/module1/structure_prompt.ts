/**
 * Structured Outputs with JSON Schema (Module 1)
 * 
 * Costs & Safety: Real API calls; keep inputs small. Requires API key(s).
 * Module reference: `Modules/module-1.md` — Section 8.1 Structured Outputs with JSON Schemas.
 * Why: Schema-constrained outputs reduce parsing errors and improve reliability; easy to validate.
 */

import OpenAI from 'openai';
import { config } from 'dotenv';
import { join } from 'path';
import { z } from 'zod';
import * as readline from 'readline';

// Load environment variables from env/.env
config({ path: join(process.cwd(), 'env', '.env') });

// Setup
const MODEL = 'gpt-4o-mini';

/**
 * Define Contract schema using Zod (TypeScript equivalent of Pydantic)
 * This schema enforces the structure of contract extraction output
 */
const ContractSchema = z.object({
    parties: z.array(z.string()),
    key_dates: z.array(z.string()),
    obligations: z.array(z.string()),
    risk_flags: z.array(z.string()),
    summary: z.string(),
}).strict(); // equivalent to Pydantic's extra="forbid"

/**
 * Generate JSON Schema for downstream prompt/validation
 * Zod can convert to JSON Schema format
 */
function getContractJsonSchema() {
    // Convert Zod schema to JSON Schema
    const jsonSchema = {
        type: 'object',
        properties: {
            parties: {
                type: 'array',
                items: { type: 'string' },
            },
            key_dates: {
                type: 'array',
                items: { type: 'string' },
            },
            obligations: {
                type: 'array',
                items: { type: 'string' },
            },
            risk_flags: {
                type: 'array',
                items: { type: 'string' },
            },
            summary: {
                type: 'string',
            },
        },
        required: ['parties', 'key_dates', 'obligations', 'risk_flags', 'summary'],
        additionalProperties: false, // equivalent to extra="forbid"
    };
    return jsonSchema;
}

const CONTRACT_SCHEMA = getContractJsonSchema();
console.log('contract_schema', JSON.stringify(CONTRACT_SCHEMA, null, 2));

// Sample contract text for extraction
const contractText = `
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
async function enforceSchemaInPrompt() {
    const client = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    });

    const prompt = `Extract contract information from the following text. Return a JSON object matching this schema:
${JSON.stringify(CONTRACT_SCHEMA, null, 2)}

Contract text:
${contractText}

Return only valid JSON matching the schema above.`;

    try {
        const response = await client.chat.completions.create({
            model: MODEL,
            messages: [{ role: 'user', content: prompt }],
            response_format: { type: 'json_object' }, // Force JSON output
        });

        const content = response.choices[0].message.content;
        if (!content) {
            throw new Error('No content in response');
        }

        const parsed = JSON.parse(content);

        // Validate using Zod
        const validated = ContractSchema.parse(parsed);

        console.log('\nSchema validation: OK');
        console.log(JSON.stringify(validated, null, 2));

        return validated;
    } catch (error) {
        console.log('\nSchema validation: Failed');
        console.error(error);
        throw error;
    }
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
async function useStructuredOutputs() {
    const client = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    });

    const prompt = `Extract contract information from the following text.
Return a JSON object with the following structure:
- parties: array of party names
- key_dates: array of important dates
- obligations: array of obligations
- risk_flags: array of risk flags or concerning clauses
- summary: brief summary of the contract

Contract text:
${contractText}`;

    try {
        const response = await client.chat.completions.create({
            model: MODEL,
            messages: [{ role: 'user', content: prompt }],
            response_format: { type: 'json_object' }, // Structured output mode
        });

        const content = response.choices[0].message.content;
        if (!content) {
            throw new Error('No content in response');
        }

        const parsed = JSON.parse(content);

        // Validate using Zod
        const validated = ContractSchema.parse(parsed);

        console.log('\nSchema validation: OK');
        console.log(JSON.stringify(validated, null, 2));

        return validated;
    } catch (error) {
        console.log('\nSchema validation: Failed');
        console.error(error);
        throw error;
    }
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

async function main() {
    console.log('=== Approach 1: Enforcing schema in prompt ===\n');
    await enforceSchemaInPrompt();

    await waitForEnter('\nPress Enter to continue to the next approach...');

    console.log('\n\n=== Approach 2: Using structured outputs (JSON mode) ===\n');
    await useStructuredOutputs();

    await waitForEnter('\nPress Enter to exit...');
}

main().catch(console.error);

