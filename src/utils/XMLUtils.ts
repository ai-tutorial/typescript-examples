import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { XMLParser } from 'fast-xml-parser';

/**
 * Contract type definition
 */
export type Contract = {
    parties: string[];
    key_dates: string[];
    obligations: string[];
    risk_flags: string[];
    summary: string;
};

/**
 * Utility class for XML operations
 */
export class XMLUtils {
    /**
     * Load XML Schema from file name, resolving relative to the caller's directory
     * @param filename - Name of the XML schema file (e.g., 'contract-schema.xml')
     * @returns Promise that resolves to the XML schema content as string
     */
    static async loadXmlSchema(filename: string): Promise<string> {
        // Get caller's file path from stack trace
        const stack = new Error().stack;
        const callerMatch = stack?.match(/at .* \((.+):\d+:\d+\)/);
        if (!callerMatch) {
            throw new Error('Could not determine caller file path');
        }
        let callerPath = callerMatch[1];
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
        return schemaContent;
    }

    /**
     * Extract XML content from markdown code blocks
     * @param content - Content that may contain XML wrapped in markdown code blocks
     * @returns Clean XML string
     */
    static extractXmlFromMarkdown(content: string): string {
        let xmlContent = content;
        if (xmlContent.startsWith('```xml')) {
            xmlContent = xmlContent.replace(/^```xml\s*/, '').replace(/\s*```$/, '');
        } else if (xmlContent.startsWith('```')) {
            xmlContent = xmlContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }
        return xmlContent;
    }

    /**
     * Parse XML string and extract contract data
     * @param xmlString - XML string to parse
     * @returns Parsed contract data
     * @throws Error if XML parsing fails or required fields are missing
     */
    static parseContractXml(xmlString: string): Contract {
        const parser = new XMLParser({
            ignoreAttributes: true,
            trimValues: true,
            isArray: (name) => ['party', 'date', 'obligation', 'risk_flag'].includes(name),
        });

        let parsed: any;
        try {
            parsed = parser.parse(xmlString);
        } catch (error) {
            throw new Error(`XML parsing failed: ${error instanceof Error ? error.message : String(error)}`);
        }

        const contract = parsed?.contract;
        if (!contract) {
            throw new Error('No contract element found in XML');
        }

        // Extract arrays - fast-xml-parser will return arrays for configured tags
        const normalizeArray = (value: any): string[] => {
            if (!value) return [];
            if (Array.isArray(value)) {
                return value.map((v) => String(v)).filter(Boolean);
            }
            return [String(value)].filter(Boolean);
        };

        const parties = normalizeArray(contract.parties?.party);
        const key_dates = normalizeArray(contract.key_dates?.date);
        const obligations = normalizeArray(contract.obligations?.obligation);
        const risk_flags = normalizeArray(contract.risk_flags?.risk_flag);
        const summary = String(contract.summary || '');

        return {
            parties,
            key_dates,
            obligations,
            risk_flags,
            summary,
        };
    }

    /**
     * Validate contract data structure
     * @param data - Contract data to validate
     * @returns Validated contract data
     * @throws Error if validation fails
     */
    static validateContract(data: Contract): Contract {
        if (!Array.isArray(data.parties) || data.parties.length === 0) {
            throw new Error('parties must be a non-empty array');
        }
        if (!Array.isArray(data.key_dates) || data.key_dates.length === 0) {
            throw new Error('key_dates must be a non-empty array');
        }
        if (!Array.isArray(data.obligations) || data.obligations.length === 0) {
            throw new Error('obligations must be a non-empty array');
        }
        if (!Array.isArray(data.risk_flags) || data.risk_flags.length === 0) {
            throw new Error('risk_flags must be a non-empty array');
        }
        if (typeof data.summary !== 'string' || data.summary.length === 0) {
            throw new Error('summary must be a non-empty string');
        }
        return data;
    }
}

