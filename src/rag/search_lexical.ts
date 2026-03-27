/**
 * Lexical (Keyword) Search with BM25
 *
 * Costs & Safety: Real API calls; keep inputs small. Requires API key(s).
 * Module reference: [Full-Text Search (BM25)](https://aitutorial.dev/rag/search-strategy-selection#full-text-search-bm25)
 * Why: Lexical (keyword) search (BM25) is the industry standard for exact matches and handles specialized terminology better than simple vector search.
 */

import { generateText } from 'ai';
import { createModel } from './utils.js';
import { join } from 'path';
import { readFileSync } from 'fs';
import { LexicalRetriever } from './utils/lexical_retriever';

const essay = readFileSync(join(process.cwd(), 'assets', 'paul_graham_essay.txt'), 'utf-8');

/**
 * Main function that demonstrates lexical (keyword) search strategy
 *
 * This example shows how to implement keyword-based retrieval using the BM25 algorithm.
 *
 * This approach is essential for finding exact terms and rare identifiers that semantic search might miss.
 */
async function main(): Promise<void> {
    const model = createModel();

    // Step 1: Prepare Data — simple paragraph-based chunking
    const documents = essay
        .split('\n\n')
        .map(chunk => chunk.trim())
        .filter(chunk => chunk.length > 0);

    console.log(`Loaded ${documents.length} chunks from essay.`);

    // Step 2: Define Query
    const query = 'Why did he switch from philosophy to AI?';
    console.log('');
    console.log(`Query: "${query}"`);

    // Step 3: Initialize Lexical Search
    const topK = 3;
    const retriever = await LexicalRetriever.create(documents, topK);

    // Step 4: Retrieve Context
    const results = await retriever.searchRanked(query, topK);

    console.log('');
    console.log('Top Retrieved Chunks:');
    results.forEach((r: any) => {
        console.log(`[Rank ${r.rank}] Score: ${r.score.toFixed(4)}`);
        console.log(`Text: ${r.document.substring(0, 100)}...`);
    });

    const context = results.map((r: any) => r.document).join('\n\n');

    // Step 5: Generate Answer
    console.log('');
    console.log('Generating answer...');

    const { text } = await generateText({
        model,
        messages: [
            {
                role: 'system',
                content: 'Answer based only on the provided context. If insufficient, say you don\'t know.',
            },
            {
                role: 'user',
                content: `Context: \n${context} \n\nQuestion: ${query}`,
            },
        ],
    });

    console.log('');
    console.log('Answer:');
    console.log(`${text}`);
}

await main();
