/**
 * Structured Outputs with XML Schema (Module 1)
 * 
 * Costs & Safety: Real API calls; keep inputs small. Requires API key(s).
 * Module reference: `Modules/module-1.md` — Section 8.1 Structured Outputs with XML Schemas.
 * Why: XML-constrained outputs provide structured, hierarchical data; easy to validate and parse.
 */

import OpenAI from 'openai';
import { config } from 'dotenv';
import { join, dirname } from 'path';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { DOMParser } from '@xmldom/xmldom';
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
 * Load XML Schema from file
 */
async function loadContractXmlSchema(): Promise<string> {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const schemaPath = join(__dirname, 'contract-schema.xml');
    const schemaContent = await readFile(schemaPath, 'utf-8');
    return schemaContent;
}

/**
 * Example XML structure for reference
 */
const EXAMPLE_XML: string = `<?xml version="1.0" encoding="UTF-8"?>
<contract>
  <parties>
    <party>Provider</party>
    <party>Client</party>
  </parties>
  <key_dates>
    <date>January 15, 2025</date>
  </key_dates>
  <obligations>
    <obligation>Provider delivers monthly support</obligation>
    <obligation>Client pays $5,000 net 30</obligation>
  </obligations>
  <risk_flags>
    <risk_flag>Liability limited to last 3 months fees</risk_flag>
  </risk_flags>
  <summary>Services Agreement for monthly support with payment terms</summary>
</contract>`;

// Sample contract text for extraction
const contractText: string = `
This Services Agreement is effective January 15, 2025.
Provider delivers monthly support; Client pays $5,000 net 30.
Liability limited to last 3 months fees.
`.trim();

/**
 * Parse XML string and extract contract data
 */
function parseContractXml(xmlString: string): Contract {
    const parser: DOMParser = new DOMParser();
    const doc: Document = parser.parseFromString(xmlString, 'text/xml');
    
    // Check for parsing errors
    const parserError: Element | null = doc.getElementsByTagName('parsererror')[0] as Element | null;
    if (parserError) {
        const errorText: string = parserError.textContent || parserError.toString();
        throw new Error(`XML parsing failed: ${errorText}`);
    }

    const contract: Element | null = doc.getElementsByTagName('contract')[0] as Element | null;
    if (!contract) {
        throw new Error('No contract element found in XML');
    }

    // Extract parties
    const parties: string[] = [];
    const partyElements: HTMLCollectionOf<Element> = contract.getElementsByTagName('party');
    for (let i = 0; i < partyElements.length; i++) {
        const partyText: string | null = partyElements[i].textContent;
        if (partyText) {
            parties.push(partyText.trim());
        }
    }

    // Extract key dates
    const key_dates: string[] = [];
    const dateElements: HTMLCollectionOf<Element> = contract.getElementsByTagName('date');
    for (let i = 0; i < dateElements.length; i++) {
        const dateText: string | null = dateElements[i].textContent;
        if (dateText) {
            key_dates.push(dateText.trim());
        }
    }

    // Extract obligations
    const obligations: string[] = [];
    const obligationElements: HTMLCollectionOf<Element> = contract.getElementsByTagName('obligation');
    for (let i = 0; i < obligationElements.length; i++) {
        const obligationText: string | null = obligationElements[i].textContent;
        if (obligationText) {
            obligations.push(obligationText.trim());
        }
    }

    // Extract risk flags
    const risk_flags: string[] = [];
    const riskFlagElements: HTMLCollectionOf<Element> = contract.getElementsByTagName('risk_flag');
    for (let i = 0; i < riskFlagElements.length; i++) {
        const riskFlagText: string | null = riskFlagElements[i].textContent;
        if (riskFlagText) {
            risk_flags.push(riskFlagText.trim());
        }
    }

    // Extract summary
    const summaryElements: HTMLCollectionOf<Element> = contract.getElementsByTagName('summary');
    const summary: string = summaryElements[0]?.textContent?.trim() || '';

    // Validate required fields
    if (parties.length === 0 || key_dates.length === 0 || obligations.length === 0 || risk_flags.length === 0 || !summary) {
        throw new Error('Missing required fields in XML contract');
    }

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
 */
function validateContract(data: Contract): Contract {
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
    if (typeof data.summary !== 'string' || data.summary.trim().length === 0) {
        throw new Error('summary must be a non-empty string');
    }
    return data;
}

/**
 * Enforcing XML schema in prompt
 * 
 * This approach includes the XML schema and example in the prompt itself,
 * instructing the model to follow the XML structure.
 */
async function enforceSchemaInPrompt(client: OpenAI, schema: string): Promise<Contract> {
    const prompt: string = `Extract contract information from the following text. Return a valid XML document matching this structure:

${EXAMPLE_XML}

The XML must follow this schema:
${schema}

Contract text:
${contractText}

Return only valid XML matching the schema above. Do not include any text outside the XML tags.`;

    const response = await client.chat.completions.create({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
    });

    const content: string = response.choices[0].message.content!;
    
    // Extract XML from response (might have markdown code blocks)
    let xmlContent: string = content.trim();
    if (xmlContent.startsWith('```xml')) {
        xmlContent = xmlContent.replace(/^```xml\s*/, '').replace(/\s*```$/, '');
    } else if (xmlContent.startsWith('```')) {
        xmlContent = xmlContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    
    const parsed: Contract = parseContractXml(xmlContent);
    const validated: Contract = validateContract(parsed);

    console.log('\nXML validation: OK');
    console.log('Parsed contract:', JSON.stringify(validated, null, 2));
    console.log('\nRaw XML response:');
    console.log(xmlContent);

    return validated;
}

/**
 * Using structured outputs with XML format
 * 
 * This approach uses prompt instructions to request XML output
 * combined with XML parsing and validation. Note that OpenAI's API
 * doesn't have a native XML response format like json_object, so we
 * rely on prompt engineering and parsing.
 * 
 * Try changing the model to see how different models handle XML outputs.
 */
async function useStructuredOutputs(client: OpenAI): Promise<Contract> {
    const prompt: string = `Extract contract information from the following text.
Return a valid XML document with the following structure:
- parties: contains party elements with party names
- key_dates: contains date elements with important dates
- obligations: contains obligation elements with obligations
- risk_flags: contains risk_flag elements with risk flags or concerning clauses
- summary: brief summary of the contract

Example XML structure:
${EXAMPLE_XML}

Contract text:
${contractText}

Return only valid XML. Start with <?xml version="1.0" encoding="UTF-8"?> and wrap everything in a <contract> root element.`;

    const response = await client.chat.completions.create({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3, // Lower temperature for more consistent structured output
    });

    const content: string = response.choices[0].message.content!;
    
    // Extract XML from response (might have markdown code blocks)
    let xmlContent: string = content.trim();
    if (xmlContent.startsWith('```xml')) {
        xmlContent = xmlContent.replace(/^```xml\s*/, '').replace(/\s*```$/, '');
    } else if (xmlContent.startsWith('```')) {
        xmlContent = xmlContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    
    const parsed: Contract = parseContractXml(xmlContent);
    const result: Contract = validateContract(parsed);

    console.log('\nXML validation: OK');
    console.log('Parsed contract:', JSON.stringify(result, null, 2));
    console.log('\nRaw XML response:');
    console.log(xmlContent);

    return result;
}

/**
 * Production notes:
 * 
 * 1. Always validate LLM outputs - never trust them blindly
 * 2. XML parsing can fail if the model doesn't produce well-formed XML
 * 3. Consider retry logic for parsing failures
 * 4. Log parsing errors for monitoring and improvement
 * 5. Different models may have different compliance rates with XML schemas
 * 6. XML provides hierarchical structure that can be useful for complex data
 * 7. Consider using XML Schema validators for production use
 * 8. Note: OpenAI API doesn't have native XML response format like json_object,
 *    so prompt engineering is crucial for reliable XML output
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
    const CONTRACT_XML_SCHEMA: string = await loadContractXmlSchema();
    console.log('contract_schema', CONTRACT_XML_SCHEMA);

    const client: OpenAI = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    });

    console.log('=== Approach 1: Enforcing XML schema in prompt ===\n');
    await enforceSchemaInPrompt(client, CONTRACT_XML_SCHEMA);

    await waitForEnter('\nPress Enter to continue to the next approach...');

    console.log('\n\n=== Approach 2: Using structured outputs (XML format) ===\n');
    await useStructuredOutputs(client);

    await waitForEnter('\nPress Enter to exit...');
}

main().catch(console.error);

