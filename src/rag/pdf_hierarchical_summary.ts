/**
 * Map-Reduce Hierarchical Summarization
 *
 * Costs & Safety: Real API calls; one call per chunk + one final call. Requires API key(s).
 * Module reference: [Working with PDF and Images](https://aitutorial.dev/rag/working-with-unstructured-data#pattern-2-variable-output-tasks)
 * Why: Demonstrates Map-Reduce summarization for managing long documents that exceed context windows.
 */

import { generateText } from 'ai';
import { createModel } from './utils.js';

/**
 * Map-Reduce summarization: summarize each chunk independently, then combine into a final summary
 */
export async function hierarchicalSummary(
    model: ReturnType<typeof createModel>,
    documentChunks: string[],
    summaryType: string = 'comprehensive'
): Promise<string> {
    // Phase 1: Summarize each chunk independently (MAP)
    console.log('Phase 1: Summarizing chunks...');
    const chunkSummaries: string[] = [];

    for (const [i, chunk] of documentChunks.entries()) {
        const { text } = await generateText({
            model,
            messages: [
                { role: 'system', content: 'Summarize this section concisely.' },
                { role: 'user', content: chunk },
            ],
        });
        console.log(`  - Chunk ${i + 1} summarized.`);
        chunkSummaries.push(text);
    }

    // Phase 2: Combine chunk summaries into final summary (REDUCE)
    console.log('Phase 2: Combining summaries...');
    const combined = chunkSummaries.join('\n\n');

    const { text: finalSummary } = await generateText({
        model,
        messages: [
            {
                role: 'system',
                content: `Create a ${summaryType} summary from these section summaries.`,
            },
            {
                role: 'user',
                content: combined,
            },
        ],
    });

    return finalSummary;
}

/**
 * Main function that demonstrates Map-Reduce summarization
 *
 * This example shows how to process long documents that exceed context windows
 * by summarizing each chunk independently, then combining the summaries.
 *
 * This two-phase approach scales to documents of any length.
 */
async function main(): Promise<void> {
    const model = createModel();

    console.log('--- Map-Reduce Summarization ---');

    // Step 1: Define document chunks
    const longDocumentChunks = [
        'Chapter 1: The Early Years. The company was founded in a garage...',
        'Chapter 2: Expansion. We opened 50 stores in 2010...',
        'Chapter 3: Challenges. The 2020 crisis hit hard...',
        'Chapter 4: Future Outlook. AI will drive our growth...',
    ];

    console.log(`Processing ${longDocumentChunks.length} chunks...`);

    // Step 2: Run hierarchical summarization
    const finalSummary = await hierarchicalSummary(model, longDocumentChunks, 'comprehensive');

    console.log('\nFinal Summary:');
    console.log(`${finalSummary}`);
}

await main();
