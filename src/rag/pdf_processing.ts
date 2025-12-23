/**
 * Costs & Safety: Uses local OCR (Tesseract.js). computationally intensive. No external API costs.
 * Module reference: [Working with PDF and Images](https://aitutorial.dev/rag/working-with-unstructured-data#combined-pdf-processing-pipeline)
 * Why: Demonstrates a robust pipeline for handling mixed PDF types (digital vs scanned) using fallbacks.
 */

import * as fs from "fs";
import { PDFDocument } from "pdf-lib";
import * as pdfPoppler from "pdf-poppler";
import { createWorker } from "tesseract.js";
import * as winston from "winston";
import * as path from "path";


// ==========================================
// Part 1: Helper Functions
// ==========================================

export async function extractDigitalPdf(pdfPath: string): Promise<string> {
    // Extract text from digital (text-based) PDF
    try {
        const pdfBytes = fs.readFileSync(pdfPath);
        const pdfDoc = await PDFDocument.load(pdfBytes);

        let text = "";
        const pageCount = pdfDoc.getPageCount();

        // Note: pdf-lib doesn't extract text directly. 
        // In a real scenario, use 'pdf-parse' here.
        // For this example, we simulate extraction or return basic info.
        text = `[Mock Digital Text from ${pageCount} pages]`;

        return text;
    } catch (e) {
        throw new Error(`Failed to read digital PDF: ${e}`);
    }
}

export async function extractScannedPdf(pdfPath: string): Promise<string> {
    /**
     * Extract text from scanned PDF using OCR.
     * Warning: Slow (5-10 sec per page) and error-prone.
     */
    // Convert PDF pages to images
    const outputDir = path.join(path.dirname(pdfPath), "temp_images");
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const options = {
        format: "png",
        out_dir: outputDir,
        out_prefix: path.basename(pdfPath, ".pdf"),
        page: null  // Convert all pages
    };

    // Convert PDF to images
    // Note: requires Poppler installed on system
    await pdfPoppler.convert(pdfPath, options);

    // Find generated images
    const images = fs.readdirSync(outputDir)
        .filter(f => f.startsWith(options.out_prefix) && f.endsWith(".png"))
        .map(f => path.join(outputDir, f));

    const worker = await createWorker("eng");
    let text = "";

    for (let i = 0; i < images.length; i++) {
        // Apply OCR to each page
        const { data: { text: pageText } } = await worker.recognize(images[i]);
        text += `Page ${i + 1}:\n${pageText}\n\n`;

        // Cleanup image
        fs.unlinkSync(images[i]);
    }

    await worker.terminate();
    fs.rmdirSync(outputDir);

    return text;
}


// ==========================================
// Part 2: Pipeline Class
// ==========================================

export class PDFProcessor {
    private logger: winston.Logger;

    constructor() {
        this.logger = winston.createLogger({
            level: 'info',
            transports: [
                new winston.transports.Console({
                    format: winston.format.simple(),
                }),
            ],
        });
    }

    async isDigitalPdf(pdfPath: string): Promise<boolean> {
        // Heuristic: Check if PDF has extractable text
        try {
            const sample = await extractDigitalPdf(pdfPath);
            // If we extracted meaningful text (> 100 chars), likely digital
            return sample.length > 20; // Lowered threshold for mock
        } catch {
            return false;
        }
    }

    async processPdf(pdfPath: string): Promise<{
        text: string;
        method: string;
        confidence: number;
        warnings: string[];
    }> {
        /**
         * Process PDF with appropriate method.
         * Returns: {text: string, method: string, confidence: number}
         */
        const result = {
            text: "",
            method: "unknown",
            confidence: 0.0,
            warnings: [] as string[]
        };

        // Try digital extraction first (fast path)
        if (await this.isDigitalPdf(pdfPath)) {
            result.text = await extractDigitalPdf(pdfPath);
            result.method = "digital";
            result.confidence = 0.95;
            this.logger.info(`Digital extraction successful: ${pdfPath}`);
        } else {
            // Fall back to OCR (slow path)
            this.logger.warn(`Using OCR for: ${pdfPath}`);
            result.text = await extractScannedPdf(pdfPath);
            result.method = "ocr";
            result.confidence = 0.70;  // OCR less reliable
            result.warnings.push("OCR used - may contain errors");
        }

        // Quality checks
        if (result.text.length < 50) {
            result.warnings.push("Very short text extracted - possible failure");
            result.confidence *= 0.5;
        }

        return result;
    }
}

// ==========================================
// Main Execution
// ==========================================

import { fileURLToPath } from 'url';

async function main() {
    const processor = new PDFProcessor();

    // Example 1: Digital PDF (Mock path)
    console.log("--- Processing Digital PDF ---");
    try {
        const result1 = await processor.processPdf("digital_report.pdf");
        console.log("Result:", result1);
    } catch (e) {
        console.log("Example file not found, skipping digital execution.");
    }
    console.log('');

    // Example 2: Scanned PDF (Mock path)
    console.log("--- Processing Scanned PDF ---");
    try {
        const result2 = await processor.processPdf("scanned_form.pdf");
        console.log("Result:", result2);
    } catch (e) {
        console.log("Example file not found, skipping scanned execution.");
    }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    main().catch(console.error);
}
