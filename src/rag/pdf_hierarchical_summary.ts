/**
 * Costs & Safety: Uses OpenAI API repeatedly (one call per chunk + one final call). 
 * Module reference: [Working with PDF and Images](https://aitutorial.dev/rag/working-with-unstructured-data#pattern-2-variable-output-tasks)
 * Why: Demonstrates Map-Reduce summarization for managing long documents that exceed context windows.
 */

import OpenAI from "openai";
import { config } from 'dotenv';
import { join } from 'path';

// Load environment variables
config({ path: join(process.cwd(), 'env', '.env') });

const openai = new OpenAI();

async function main() {
    console.log("--- Map-Reduce Summarization ---");

    const longDocumentChunks = [
        "Chapter 1: The Early Years. The company was founded in a garage...",
        "Chapter 2: Expansion. We opened 50 stores in 2010...",
        "Chapter 3: Challenges. The 2020 crisis hit hard...",
        "Chapter 4: Future Outlook. AI will drive our growth..."
    ];

    console.log(`Processing ${longDocumentChunks.length} chunks...`);

    const finalSummary = await hierarchicalSummary(longDocumentChunks, "comprehensive");

    console.log("\nFinal Summary:");
    console.log(finalSummary);
}

/**
 * For variable-output tasks (summarization).
 * Uses map-reduce pattern: chunk summaries -> final summary.
 */
export async function hierarchicalSummary(
    documentChunks: string[],
    summaryType: string = "comprehensive"
): Promise<string> {

    // Step 1: Summarize each chunk independently (MAP phase)
    console.log("Phase 1: Summarizing chunks...");
    const chunkSummaries: string[] = [];

    for (const [i, chunk] of documentChunks.entries()) {
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini", // Lower cost model for map phase
            messages: [
                { role: "system", content: "Summarize this section concisely." },
                { role: "user", content: chunk }
            ],
            max_tokens: 150
        });
        const summary = response.choices[0].message.content || "";
        console.log(`  - Chunk ${i + 1} summarized.`);
        chunkSummaries.push(summary);
    }

    // Step 2: Combine chunk summaries into final summary (REDUCE phase)
    console.log("Phase 2: Combining summaries...");
    const combined = chunkSummaries.join("\n\n");

    const finalResponse = await openai.chat.completions.create({
        model: "gpt-4o", // Stronger model for final synthesis
        messages: [
            {
                role: "system",
                content: `Create a ${summaryType} summary from these section summaries.`
            },
            {
                role: "user",
                content: combined
            }
        ],
        max_tokens: 500
    });

    return finalResponse.choices[0].message.content || "";
}

// Execute main
await main();
