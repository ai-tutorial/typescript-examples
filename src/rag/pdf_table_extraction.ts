/**
 * Costs & Safety: Uses local processing via pdf-parse. No external API costs.
 * Module reference: [Working with PDF and Images](https://aitutorial.dev/rag/working-with-unstructured-data#specialized-table-extractors)
 * Why: Demonstrates how to extract tabular data from PDFs and convert it to Markdown for optimal LLM consumption.
 */

import * as fs from "fs";
import * as path from "path";
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');


/**
 * Interface for extracted table data
 */
interface ExtractedTable {
    page: number;
    data: string[][]; // Row-major 2D array
    markdown: string;
    text: string;
}

/**
 * Main execution function
 */
async function main() {
    console.log("--- Starting Table Extraction ---");

    // Point to the real PDF we generated
    const pdfPath = path.join(process.cwd(), 'assets', 'financial_report.pdf');

    if (!fs.existsSync(pdfPath)) {
        console.error(`Error: PDF not found at ${pdfPath}`);
        console.error("Run 'npx ts-node src/module2/generate_assets.ts' first.");
        return;
    }

    try {
        const tables = await extractTablesFromPdf(pdfPath);

        if (tables.length === 0) {
            console.log("No structured tables found matching criteria.");
        }

        tables.forEach((t, i) => {
            console.log(`\nFound Table #${i + 1} on Page ${t.page}`);
            console.log("Markdown Representation (for LLM):");
            console.log(t.markdown);
            console.log("-----------------------------------");
        });
    } catch (e) {
        console.error("Extraction failed:", e);
    }
}

/**
 * Extracts tables from PDF text using heuristic parsing.
 * Real-world note: For complex PDFs, use 'tabula-js' (requires Java) or Python's 'camelot'.
 * This implementation simulates a "Specialized Extractor" by parsing text patterns.
 */
export async function extractTablesFromPdf(pdfPath: string): Promise<ExtractedTable[]> {
    const dataBuffer = fs.readFileSync(pdfPath);
    const data = await pdfParse(dataBuffer);

    // Naive heuristic: Look for lines that look like table rows
    // In our sample PDF, rows are text lines separated by newlines
    const lines: string[] = data.text.split('\n').filter((line: string) => line.trim().length > 0);

    // Find the header row (Quarter/Revenue...)
    const headerIndex = lines.findIndex((l: string) => l.includes("Quarter") && l.includes("Revenue"));

    if (headerIndex === -1) {
        return [];
    }

    // Extract table rows (assume contiguous lines after header)
    const tableLines = lines.slice(headerIndex);
    const rows = tableLines.map((line: string) => {
        // Our sample PDF generator separated columns with implicit spacing/tabs
        // We'll split by likely separators (tab or multiple spaces)
        // Adjust regex based on your PDF's text layout
        return line.trim().split(/\s{2,}|\t/).map((cell: string) => cell.trim());
    });

    const headers = rows[0];
    const body = rows.slice(1).filter((r: string[]) => r.length === headers.length); // Basic validation

    if (body.length === 0) return [];

    const markdown = arrayToMarkdown(headers, body);

    return [{
        page: 1, // pdf-parse text is often continuous, accurate page numbering requires per-page logic
        data: [headers, ...body],
        markdown: markdown,
        text: JSON.stringify({ headers, body })
    }];
}

/**
 * Helper to convert 2D array to Markdown table
 */
function arrayToMarkdown(headers: string[], rows: string[][]): string {
    const formatRow = (row: string[]) => `| ${row.join(' | ')} |`;

    // Create separator row: |---|---|
    const separator = headers.map(() => '---');

    return [
        formatRow(headers),
        formatRow(separator),
        ...rows.map(r => formatRow(r))
    ].join('\n');
}

// Execute main
await main();
