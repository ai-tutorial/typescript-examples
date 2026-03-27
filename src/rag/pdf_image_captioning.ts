/**
 * Image Captioning for RAG
 *
 * Costs & Safety: Real API calls; moderate cost per image. Requires API key(s).
 * Module reference: [Working with PDF and Images](https://aitutorial.dev/rag/working-with-unstructured-data#when-to-caption-describe-images)
 * Why: Generates descriptive captions for images (charts, photos) to make them searchable and understandable in RAG.
 */

import { generateText } from 'ai';
import { createModel } from './utils.js';
import { join } from 'path';
import { readFileSync, existsSync } from 'fs';

/**
 * Generate a descriptive caption using a vision model.
 * Better for images where visual information matters (charts, diagrams).
 */
export async function generateImageCaption(
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
                        text: 'Describe this image in detail. Focus on key information someone would need to understand its content and context.',
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
 * Main function that demonstrates image captioning for RAG
 *
 * This example shows how to generate descriptive captions for images
 * to make them searchable and understandable in a RAG system.
 *
 * Captioning converts visual information into text that can be indexed and retrieved.
 */
async function main(): Promise<void> {
    const model = createModel();

    console.log('--- Image Captioning ---');

    // Step 1: Locate image
    const imagePath = join(process.cwd(), 'src', 'module2', 'data', 'monthly_revenue_chart.png');

    if (!existsSync(imagePath)) {
        console.error(`\n[Warn] Image not found at: ${imagePath}`);
        console.error('To test captioning, add a chart or photo to the data directory.');
        return;
    }

    // Step 2: Generate caption
    console.log(`Generating caption for: ${imagePath}...`);
    const caption = await generateImageCaption(model, imagePath);
    console.log('\nGenerated Caption:');
    console.log(`${caption}`);
}

await main();
