/**
 * Costs & Safety: Uses OpenAI GPT-4o Vision API. Moderate cost per image.
 * Module reference: [Working with PDF and Images](https://aitutorial.dev/rag/working-with-unstructured-data#when-to-caption-describe-images)
 * Why: Generates descriptive captions for images (charts, photos) to make them searchable and understandable in RAG.
 */

import OpenAI from "openai";
import { config } from 'dotenv';
import { join } from 'path';
import { readFileSync, existsSync } from 'fs';

// Load environment variables
config({ path: join(process.cwd(), 'env', '.env') });

const openai = new OpenAI();

async function main() {
    console.log("--- Image Captioning ---");

    // Example image path
    // Users should place a file here or we warn.
    const imagePath = join(process.cwd(), 'src', 'module2', 'data', 'sample_chart.png');

    if (!existsSync(imagePath)) {
        console.error(`\n[Warn] Image not found at: ${imagePath}`);
        console.error("To test captioning, add a chart or photo to the data directory.");
        // We do NOT mock output here as per previous instructions to rely on real files or errors.
        return;
    }

    try {
        console.log(`Generating caption for: ${imagePath}...`);
        const caption = await generateImageCaption(imagePath);
        console.log("\nGenerated Caption:");
        console.log(caption);
    } catch (error) {
        console.error("Captioning failed:", error);
    }
}

/**
 * Generate descriptive caption using vision model.
 * Better for images where visual information matters (charts, diagrams).
 */
export async function generateImageCaption(imagePath: string): Promise<string> {
    const imageBuffer = readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');
    const dataUrl = `data:image/png;base64,${base64Image}`;

    const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
            {
                role: "user",
                content: [
                    {
                        type: "text",
                        text: "Describe this image in detail. Focus on key information someone would need to understand its content and context."
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
        max_tokens: 300
    });

    return response.choices[0].message.content || "";
}

// Execute main
await main();
