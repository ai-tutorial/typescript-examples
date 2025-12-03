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
        // Look for the first file that's not this utility file
        const stack = new Error().stack;
        if (!stack) {
            throw new Error('Could not access stack trace');
        }
        
        const stackLines = stack.split('\n');
        let callerPath: string | null = null;
        
        // Find the first stack frame that's not this file (JSONUtils.ts)
        for (const line of stackLines) {
            const match = line.match(/at .* \((.+):\d+:\d+\)/) || line.match(/at (.+):\d+:\d+/);
            if (match && match[1] && !match[1].includes('JSONUtils.ts') && !match[1].includes('blitz.')) {
                callerPath = match[1];
                break;
            }
        }
        
        if (!callerPath) {
            throw new Error('Could not determine caller file path from stack trace');
        }
        
        // Handle file:// or file: protocol prefix (common in browser/Node.js environments)
        if (callerPath.startsWith('file://')) {
            callerPath = fileURLToPath(callerPath);
        } else if (callerPath.startsWith('file:')) {
            // Handle malformed file: URLs (e.g., file:/path instead of file:///path)
            callerPath = callerPath.replace(/^file:/, '');
        }
        
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

