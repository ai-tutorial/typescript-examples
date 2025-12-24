/**
 * Costs & Safety: Uses local OCR via Tesseract.js. Computationally intensive but free.
 * Module reference: [Working with PDF and Images](https://aitutorial.dev/rag/working-with-unstructured-data#when-to-extract-text-from-images)
 * Why: Demonstrates how to extract text from images (e.g., scanned docs, screenshots) for RAG keywording.
 */

import { createWorker } from "tesseract.js";
import { Jimp } from "jimp";
import * as path from "path";
import * as fs from "fs";

async function main() {
    console.log("--- Image OCR Extraction ---");

    // Sample image path
    // We expect the user or a generation script to provide this.
    // Specifying a plausible path.
    const imagePath = path.join(process.cwd(), 'src', 'module2', 'data', 'sample_text.png');

    if (!fs.existsSync(imagePath)) {
        console.error(`\n[Error] Image not found at: ${imagePath}`);
        console.error("Please add an image with text to test OCR.");
        return;
    }

    try {
        console.log(`Processing image: ${imagePath}...`);
        const text = await extractImageText(imagePath);
        console.log("\nExtracted Text:");
        console.log(text);
    } catch (error) {
        console.error("OCR failed:", error);
    }
}

/**
 * Extracts text from an image using Tesseract.js with basic preprocessing.
 */
export async function extractImageText(imagePath: string): Promise<string> {
    // 1. Preprocessing with Jimp
    // Read image
    const image = await Jimp.read(imagePath);

    // Greyscale and contrast can improve OCR accuracy
    image.greyscale();
    // image.contrast(0.1); 

    // Get buffer for Tesseract
    const mime = "image/png"; // Assuming safe mime type for buffer
    const buffer = await image.getBuffer(mime);

    // 2. OCR with Tesseract
    const worker = await createWorker("eng");
    const result = await worker.recognize(buffer);

    await worker.terminate();

    return result.data.text.trim();
}

// Execute main
await main();
