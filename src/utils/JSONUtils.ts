import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import Ajv from 'ajv';

/**
 * JSON Schema type definition
 */
export type JsonSchema = {
    type: 'object';
    properties: Record<string, { type: string; items?: { type: string } }>;
    required: string[];
    additionalProperties: boolean;
};

/**
 * Utility class for JSON operations
 */
export class JSONUtils {
    /**
     * Load JSON Schema from file name, resolving relative to the caller's directory
     * @param filename - Name of the JSON schema file (e.g., 'contract-schema.json')
     * @returns Promise that resolves to the parsed JSON schema
     */
    static async loadJsonSchema(filename: string): Promise<JsonSchema> {
        // Get caller's file path from stack trace
        const stack = new Error().stack;
        const callerMatch = stack?.match(/at .* \((.+):\d+:\d+\)/);
        if (!callerMatch) {
            throw new Error('Could not determine caller file path');
        }
        const callerPath = callerMatch[1];
        const __dirname = dirname(callerPath);
        const schemaPath = join(__dirname, filename);
        const schemaContent = await readFile(schemaPath, 'utf-8');
        return JSON.parse(schemaContent) as JsonSchema;
    }

    /**
     * Validate data against JSON schema using Ajv
     * @param data - Data to validate (unknown type)
     * @param schema - JSON schema to validate against
     * @returns Validated data as type T
     * @throws Error if validation fails
     */
    static validateJson<T>(data: unknown, schema: JsonSchema): T {
        const ajv = new Ajv();
        const validate = ajv.compile(schema);
        if (validate(data)) {
            return data as T;
        } else {
            throw new Error(`Schema validation failed: ${JSON.stringify(validate.errors, null, 2)}`);
        }
    }
}

