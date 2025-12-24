/**
 * Costs & Safety: Real OpenAI API calls; keep inputs small. Requires OPENAI_API_KEY.
 * Module reference: [Full-Text Search (BM25)](https://aitutorial.dev/rag/search-strategy-selection#full-text-search-bm25)
 * Why: Lexical (keyword) search (BM25) is the industry standard for exact matches and handles specialized terminology better than simple vector search.
 */

import OpenAI from "openai";
import { config } from 'dotenv';
import { join, dirname } from 'path';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { LexicalRetriever } from './utils/lexical_retriever';

// Load environment variables
config({ path: join(process.cwd(), 'env', '.env') });

const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

/**
 * Main function that demonstrates lexical (keyword) search strategy
 * 
 * This example shows how to implement keyword-based retrieval using the BM25 algorithm.
 * 
 * This approach is essential for finding exact terms and rare identifiers that semantic search might miss.
 */
async function main(): Promise<void> {
    const openai = new OpenAI();
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const essayPath = join(process.cwd(), 'assets', 'paul_graham_essay.txt');
    const essay = readFileSync(essayPath, 'utf-8');

    // Step 1: Prepare Data
    // Simple paragraph-based chunking
    const documents = essay
        .split('\n\n')
        .map(chunk => chunk.trim())
        .filter(chunk => chunk.length > 0);

    console.log(`Loaded ${documents.length} chunks from essay.`);

    // Step 2: Define Query
    const query = `Why did he switch from philosophy to AI?`;
    console.log('');
    console.log(`Query: "${query}"`);

    // Step 3: Initialize Lexical Search
    const topK = 3;
    const retriever = await LexicalRetriever.create(documents, topK);

    // Step 4: Retrieve Context
    const results = await retriever.searchRanked(query, topK);

    console.log('');
    console.log(`Top Retrieved Chunks:`);
    results.forEach((r: any) => {
        console.log(`[Rank ${r.rank}] Score: ${r.score.toFixed(4)}`);
        console.log(`Text: ${r.document.substring(0, 100)}...`);
    });

    const context = results.map((r: any) => r.document).join(`\n\n`);

    // Step 5: Generate Answer
    console.log('');
    console.log(`Generating answer...`);

    const completion = await openai.chat.completions.create({
        model: MODEL,
        messages: [
            {
                role: `system`,
                content: `Answer based only on the provided context. If insufficient, say you don't know.`
            },
            {
                role: `user`,
                content: `Context: \n${context} \n\nQuestion: ${query}`
            }
        ]
    });

    console.log('');
    console.log(`Answer:`);
    console.log(`${completion.choices[0].message.content}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    main().catch(console.error);
}
