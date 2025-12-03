/**
 * Structured Outputs with XML Schema - Approach 2: Structured Outputs (XML Mode)
 * 
 * This approach uses prompt instructions to request XML output
 * combined with XML parsing and validation. Note that OpenAI's API
 * doesn't have a native XML response format like json_object, so we
 * rely on prompt engineering and parsing.
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
    // Step 1: Create client
    const client = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    });

    // Sample contract text for extraction
    const contractText = `
This Services Agreement is effective January 15, 2025.
Provider delivers monthly support; Client pays $5,000 net 30.
Liability limited to last 3 months fees.`;

    // Step 2: Create prompt with structure description
    // This approach uses prompt instructions to request XML output
    // combined with XML parsing and validation. Note that OpenAI's API
    // doesn't have a native XML response format like json_object, so we
    // rely on prompt engineering and parsing.
    const prompt = `Extract contract information from the following text.
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

    // Step 3: Call LLM API with structured output mode
    const response = await client.chat.completions.create({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3, // Lower temperature for more consistent structured output
    });

    // Step 4: Extract, parse and validate response
    const content = response.choices[0].message.content!;
    const xmlContent = XMLUtils.extractXmlFromMarkdown(content);
    const parsed = XMLUtils.parseContractXml(xmlContent);
    const result = XMLUtils.validateContract(parsed);

    // Step 5: Output results
    console.log('\nXML validation: OK');
    console.log('Parsed contract:', JSON.stringify(result, null, 2));
    console.log('\nRaw XML response:');
    console.log(xmlContent);
}

main().catch(console.error);

