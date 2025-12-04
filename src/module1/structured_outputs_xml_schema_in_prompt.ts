/**
 * Structured Outputs with XML Schema - Approach 1: Schema in Prompt
 * 
 * Costs & Safety: Real API calls; keep inputs small. Requires API key(s).
 * Module reference: [Example 1: Schema in Prompt](https://aitutorial.dev/context-engineering-prompt-design/structured-prompt-engineering#example-1-schema-in-prompt)
 * Why: Includes the XML schema and example in the prompt itself, instructing the model
 *      to follow the XML structure. Simpler but less reliable than programmatic validation.
 */

import OpenAI from 'openai';
import { config } from 'dotenv';
import { join } from 'path';
import { XMLUtils } from '../utils/XMLUtils';

// Load environment variables from env/.env
config({ path: join(process.cwd(), 'env', '.env') });

// Setup
const MODEL = process.env.OPENAI_MODEL!;

/**
 * Example XML structure for reference
 */
const EXAMPLE_XML = `<?xml version="1.0" encoding="UTF-8"?>
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

/**
 * Main function that demonstrates structured outputs with XML schema in prompt
 * 
 * This example shows how to include the XML schema directly in the prompt.
 * 
 * This approach is simpler but less reliable than programmatic validation.
 */
async function extractContractInfo(client: OpenAI, contractText: string): Promise<void> {
    const CONTRACT_XML_SCHEMA = await XMLUtils.loadXmlSchema('contract-schema.xml');
    
    const prompt = `Extract contract information from the following text. Return a valid XML document matching this structure:

    ${EXAMPLE_XML}

    The XML must follow this schema:
    ${CONTRACT_XML_SCHEMA}

    Contract text:
    ${contractText}

    Return only valid XML matching the schema above. Do not include any text outside the XML tags.`;

    const response = await client.chat.completions.create({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
    });

    const content = response.choices[0].message.content!;
    const xmlContent = XMLUtils.extractXmlFromMarkdown(content);
    const parsed = XMLUtils.parseContractXml(xmlContent);
    const validated = XMLUtils.validateContract(parsed);

    console.log('--- XML validation: OK ---');
    console.log('Parsed contract:', JSON.stringify(validated, null, 2));
    console.log('\nRaw XML response:');
    console.log(xmlContent);
}

async function main(): Promise<void> {
    const client = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    });

    const contractText = `
    This Services Agreement is effective January 15, 2025.
    Provider delivers monthly support; Client pays $5,000 net 30.
    Liability limited to last 3 months fees.
    `;

    // Step 1: Load an XML schema for reference
    // Step 2: Create a prompt that includes the schema and example
    // Step 3: Call the API
    // Step 4: Extract XML from response, parse and validate
    await extractContractInfo(client, contractText);
}

await main();
