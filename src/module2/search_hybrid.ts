/**
 * Costs & Safety: Real OpenAI API calls; keep inputs small. Requires OPENAI_API_KEY.
 * Module reference: [Hybrid Search: Best of Both Worlds](https://aitutorial.dev/rag/search-strategy-selection#hybrid-search-best-of-both-worlds)
 * Why: Hybrid search combines the precision of lexical (keyword) search with the conceptual recall of semantic (vector) search, providing the most robust retrieval for production RAG systems.
 */

import { fileURLToPath } from 'url';
import { join } from 'path';
import { config } from 'dotenv';
import { LexicalRetriever } from './utils/lexical_retriever';
import { SemanticRetriever } from './utils/semantic_retriever';

// Load environment variables
config({ path: join(process.cwd(), 'env', '.env') });

/**
 * Main function that demonstrates hybrid search strategy
 * 
 * This example shows how to combine lexical (keyword) and semantic (vector) retrieval using Reciprocal Rank Fusion (RRF).
 * 
 * By merging different search signals, hybrid retrieval significantly improves overall accuracy and robustness.
 */
async function main(): Promise<void> {
    const essayText = `
        What I Worked On
        February 2021
        Before college the two main things I worked on, outside of school, were writing and programming...
        The first programs I tried writing were on the IBM 1401 that our school district used for data processing.
    `.trim();

    // Step 1: Prepare Data
    const documents = essayText.split(`\n`).filter(line => line.trim().length > 0);
    console.log(`Loaded ${documents.length} chunks.`);

    // Step 2: Initialize Retrievers
    console.log(`Initializing Lexical and Semantic Retrievers...`);
    const lexical = await LexicalRetriever.create(documents, 5);
    const semantic = await SemanticRetriever.create(documents);

    // Step 3: Search Query
    const query = `What kind of writing did he do before college?`;
    console.log('');
    console.log(`Query: "${query}"`);

    // Step 4: Run Individual Searches
    console.log(`Running BM25 (lexical)...`);
    const bm25Results = await lexical.searchRanked(query, 5);

    console.log(`Running Semantic Search (vector)...`);
    const semanticResults = await semantic.searchRanked(query, 5);

    // Step 5: Apply Reciprocal Rank Fusion
    console.log(`Applying RRF Fusion...`);
    const fusedResults = rrfFuse(bm25Results, semanticResults);

    console.log('');
    console.log(`Top Hybrid Results:`);
    fusedResults.slice(0, 3).forEach((r, i) => {
        console.log(`[Rank ${i + 1}] Score: ${r.score.toFixed(4)} - "${r.document.slice(0, 80)}..."`);
    });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    main().catch(console.error);
}

/**
 * Reciprocal Rank Fusion helper function.
 */
export function rrfFuse(
    listA: Array<{ document: string; rank: number }>,
    listB: Array<{ document: string; rank: number }>,
    k = 60
): Array<{ document: string; score: number }> {
    const scores: Record<string, number> = {};

    const addScores = (list: Array<{ document: string; rank: number }>) => {
        list.forEach(item => {
            if (!scores[item.document]) {
                scores[item.document] = 0;
            }
            scores[item.document] += 1 / (k + item.rank);
        });
    };

    addScores(listA);
    addScores(listB);

    return Object.entries(scores)
        .map(([doc, score]) => ({ document: doc, score }))
        .sort((a, b) => b.score - a.score);
}
