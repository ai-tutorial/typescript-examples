/**
 * Vision Table Extraction
 *
 * Costs & Safety: Real API calls; cost depends on image size. Requires API key(s).
 * Module reference: [Working with PDF and Images](https://aitutorial.dev/rag/working-with-unstructured-data#vision-language-models-for-tables)
 * Why: Vision models can "see" table structures (merged cells, multi-level headers) that OCR often messes up.
 */

import { generateText } from 'ai';
import { createModel } from './utils.js';
import { join } from 'path';
import { readFileSync, existsSync } from 'fs';

/**
 * Use a vision model to extract table structure and content from an image.
 * Robust against: complex layouts, handwriting, merged cells.
 */
export async function extractTableWithVision(
    model: ReturnType<typeof createModel>,
    imagePath: string
): Promise<string> {
    const imageBuffer = readFileSync(imagePath);

    const { text } = await generateText({
        model,
        messages: [
            {
                role: 'user',
                content: [
                    {
                        type: 'text',
                        text: 'Extract this table into markdown format. Preserve all data, structure, and headers precisely.',
                    },
                    {
                        type: 'image',
                        image: imageBuffer,
                        mediaType: 'image/png',
                    },
                ],
            },
        ],
    });

    return text;
}

/**
 * Main function that demonstrates vision-based table extraction
 *
 * This example shows how to use a vision model to extract structured data
 * from table images, handling complex layouts that OCR often fails on.
 *
 * The vision approach preserves merged cells, multi-level headers, and formatting.
 */
async function main(): Promise<void> {
    const model = createModel();

    console.log('--- Vision Table Extraction ---');

    // Step 1: Locate image
    const imagePath = join(process.cwd(), 'assets', 'complex_table.png');

    if (!existsSync(imagePath)) {
        console.error(`\n[Error] Example image not found at: ${imagePath}`);
        console.error('Please add a table image file to path to test extraction.');
        return;
    }

    // Step 2: Extract table
    console.log(`Processing image: ${imagePath}...`);
    const markdownTable = await extractTableWithVision(model, imagePath);
    console.log('\nExtracted Table (Markdown):');
    console.log(`${markdownTable}`);
}

await main();
