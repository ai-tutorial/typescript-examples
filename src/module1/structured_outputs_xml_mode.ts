/**
 * Structured Outputs with XML Schema - Approach 2: Structured Outputs (XML Mode)
 * 
 * Costs & Safety: Real API calls; keep inputs small. Requires API key(s).
 * Module reference: `Modules/module-1.md` — Section 8.1 Structured Outputs with XML Schemas.
 * Why: Uses prompt instructions to request XML output combined with XML parsing and validation.
 *      Note that OpenAI's API doesn't have a native XML response format like json_object.
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
 * Main function that demonstrates structured outputs with XML mode
 * 
 * This example shows how to request XML output using prompt engineering:
 * 1. Create a prompt with XML structure description and example
 * 2. Call the API (no native XML format, so we rely on prompt engineering)
 * 3. Extract XML from the response (may be wrapped in markdown)
 * 4. Parse and validate the XML structure
 * 
 * This approach requires more parsing than JSON but provides structured output.
 */
async function main(): Promise<void> {
    const client = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    });

    const contractText = `
    This Services Agreement is effective January 15, 2025.
    Provider delivers monthly support; Client pays $5,000 net 30.
    Liability limited to last 3 months fees.`;

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

    const response = await client.chat.completions.create({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
    });

    const content = response.choices[0].message.content!;
    const xmlContent = XMLUtils.extractXmlFromMarkdown(content);
    const parsed = XMLUtils.parseContractXml(xmlContent);
    const result = XMLUtils.validateContract(parsed);

    console.log('--- XML validation: OK ---');
    console.log('Parsed contract:', JSON.stringify(result, null, 2));
    console.log('\nRaw XML response:');
    console.log(xmlContent);
}

await main();
