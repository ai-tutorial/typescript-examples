/**
 * Needle-in-a-Haystack Search
 *
 * Costs & Safety: Real API calls; cost proportional to context size. Requires API key(s).
 * Module reference: [Working with PDF and Images](https://aitutorial.dev/rag/working-with-unstructured-data#pattern-1-constant-output-tasks)
 * Why: Demonstrates the "Needle in a Haystack" pattern for finding specific facts in long documents.
 */

import { generateText } from 'ai';
import { createModel } from './utils.js';

/**
 * For constant-output tasks (finding a specific fact).
 * Retrieve most relevant chunks, then generate an answer.
 */
export async function needleInHaystackSearch(
    model: ReturnType<typeof createModel>,
    documentChunks: string[],
    query: string
): Promise<string> {
    // Step 1: Retrieve relevant chunks (simple keyword match for self-containment)
    const relevantChunks = documentChunks.filter(chunk =>
        chunk.toLowerCase().includes('return') ||
        chunk.toLowerCase().includes('policy')
    ).slice(0, 3);

    if (relevantChunks.length === 0) {
        return 'I couldn\'t find any relevant information in the documents.';
    }

    // Step 2: Generate Answer
    const context = relevantChunks.join('\n\n');
    const { text } = await generateText({
        model,
        messages: [
            {
                role: 'system',
                content: 'Answer the question based only on the provided context.',
            },
            {
                role: 'user',
                content: `Context:\n${context}\n\nQuestion: ${query}`,
            },
        ],
    });

    return text;
}

/**
 * Main function that demonstrates Needle-in-a-Haystack search
 *
 * This example shows how to find specific facts in long documents by retrieving
 * the most relevant chunks and generating a focused answer.
 *
 * In production, you would use a vector DB for retrieval instead of keyword matching.
 */
async function main(): Promise<void> {
    const model = createModel();

    console.log('--- Needle-in-a-Haystack Search ---');

    // Step 1: Simulated chunks from a long document
    const documentChunks = [
        'Section 1: Introduction to Employee Benefits...',
        'Section 2: Health Insurance Plans. Plan A covers...',
        'Section 3: Retirement Savings. 401(k) matching is 5%...',
        'Section 4: Return Policy. Items can be returned within 30 days of purchase if original packaging is intact. Refunds are processed within 5 business days.',
        'Section 5: Code of Conduct...',
    ];

    // Step 2: Query
    const query = 'What is the return policy timeframe?';
    console.log(`Query: "${query}"`);

    const answer = await needleInHaystackSearch(model, documentChunks, query);
    console.log('\nGenerated Answer:');
    console.log(`${answer}`);
}

await main();
