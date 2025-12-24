/**
 * Costs & Safety: Real OpenAI API calls; keep inputs small. Requires OPENAI_API_KEY.
 * Module reference: [Semantic Search (Embeddings)](https://aitutorial.dev/rag/search-strategy-selection#semantic-search-embeddings)
 * Why: Semantic (vector) search captures the meaning and context of a query, allowing for flexible retrieval even when exact keywords don't match.
 */

import { fileURLToPath } from 'url';
import { join } from 'path';
import { config } from 'dotenv';
import { SemanticRetriever } from './utils/semantic_retriever';

// Load environment variables
config({ path: join(process.cwd(), 'env', '.env') });

/**
 * Main function that demonstrates semantic (vector) search strategy
 * 
 * This example shows how to implement vector-based retrieval using embeddings.
 * 
 * Semantic (vector) search is powerful for handling natural language queries and finding conceptually related content.
 */
async function main(): Promise<void> {
    const essayText = `
        What I Worked On
        February 2021
        Before college the two main things I worked on, outside of school, were writing and programming...
        The first programs I tried writing were on the IBM 1401 that our school district used for data processing.
    `;

    // Step 1: Prepare Data
    // Simple window-based chunking
    const chunkSize = 200;
    const documents: string[] = [];
    for (let i = 0; i < essayText.length; i += chunkSize) {
        documents.push(essayText.slice(i, i + chunkSize).trim());
    }

    console.log(`Created ${documents.length} chunks from essay.`);

    // Step 2: Initialize Semantic Search
    const retriever = await SemanticRetriever.create(documents);

    // Step 3: Define Query
    const query = `What kind of writing did he do before college?`;
    console.log('');
    console.log(`Query: "${query}"`);

    // Step 4: Perform Search
    console.log(`Searching...`);
    const results = await retriever.searchRanked(query);

    console.log('');
    console.log(`Results (Top 3):`);
    results.forEach(r => {
        console.log(`[Rank ${r.rank}] Score: ${r.score.toFixed(4)}`);
        console.log(`Document: "${r.document.slice(0, 100)}..."`);
        console.log('');
    });
}


if (process.argv[1] === fileURLToPath(import.meta.url)) {
    main().catch(console.error);
}
