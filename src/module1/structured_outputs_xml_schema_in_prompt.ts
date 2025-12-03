/**
 * Structured Outputs with XML Schema - Approach 1: Schema in Prompt
 * 
 * This approach includes the XML schema and example in the prompt itself,
 * instructing the model to follow the XML structure.
 * 
 * Costs & Safety: Real API calls; keep inputs small. Requires API key(s).
 * Module reference: `Modules/module-1.md` — Section 8.1 Structured Outputs with XML Schemas.
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

async function main(): Promise<void> {
    // Step 1: Load schema and create client
    const CONTRACT_XML_SCHEMA = await XMLUtils.loadXmlSchema('contract-schema.xml');
    const client = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    });

    // Sample contract text for extraction
    const contractText = `
This Services Agreement is effective January 15, 2025.
Provider delivers monthly support; Client pays $5,000 net 30.
Liability limited to last 3 months fees.
`;

    // Step 2: Create prompt with schema included
    // This approach includes the XML schema and example in the prompt itself,
    // instructing the model to follow the XML structure.
    const prompt = `Extract contract information from the following text. Return a valid XML document matching this structure:

${EXAMPLE_XML}

The XML must follow this schema:
${CONTRACT_XML_SCHEMA}

Contract text:
${contractText}

Return only valid XML matching the schema above. Do not include any text outside the XML tags.`;

    // Step 3: Call LLM API
    const response = await client.chat.completions.create({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
    });

    // Step 4: Extract, parse and validate response
    const content = response.choices[0].message.content!;
    const xmlContent = XMLUtils.extractXmlFromMarkdown(content);
    const parsed = XMLUtils.parseContractXml(xmlContent);
    const validated = XMLUtils.validateContract(parsed);

    // Step 5: Output results
    console.log('\nXML validation: OK');
    console.log('Parsed contract:', JSON.stringify(validated, null, 2));
    console.log('\nRaw XML response:');
    console.log(xmlContent);
}

main().catch(console.error);

