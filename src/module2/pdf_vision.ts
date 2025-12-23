/**
 * Costs & Safety: Uses OpenAI GPT-4o Vision API. Each call costs tokens based on image size.
 * Module reference: [Working with PDF and Images](https://aitutorial.dev/rag/working-with-unstructured-data#vision-language-models-for-tables)
 * Why: Vision models can "see" table structures (merged cells, multi-level headers) that OCR often messes up.
 */

import OpenAI from "openai";
import { config } from 'dotenv';
import { join } from 'path';
import { readFileSync, existsSync } from 'fs';

// Load environment variables
config({ path: join(process.cwd(), 'env', '.env') });

const openai = new OpenAI();

async function main() {
    console.log("--- Vision Table Extraction ---");

    // Example image path (ensure you have this file or use a placeholder)
    const imagePath = join(process.cwd(), 'src/module2/data', 'complex_table.png');

    if (!existsSync(imagePath)) {
        console.error(`\n[Error] Example image not found at: ${imagePath}`);
        console.error("Please add a table image file to path to test extraction.");
        return;
    }

    console.log(`Processing image: ${imagePath}...`);
    const markdownTable = await extractTableWithVision(imagePath);
    console.log("\nExtracted Table (Markdown):");
    console.log(markdownTable);
}

/**
 * Use GPT-4 Vision/Omni to extract table structure and content.
 * Robust against: complex layouts, handwriting, merged cells.
 */
export async function extractTableWithVision(imagePath: string): Promise<string> {
    // 1. Encode image to Base64
    const imageBuffer = readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');
    const dataUrl = `data:image/png;base64,${base64Image}`;

    // 2. Call Vision Model
    const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
            {
                role: "user",
                content: [
                    {
                        type: "text",
                        text: "Extract this table into markdown format. Preserve all data, structure, and headers precisely."
                    },
                    {
                        type: "image_url",
                        image_url: {
                            url: dataUrl
                        }
                    }
                ]
            }
        ],
        max_tokens: 1000
    });

    return response.choices[0].message.content || "";
}

// Execute main
await main();
