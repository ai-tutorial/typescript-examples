/**
 * Iterative RAG with Query Refinement
 *
 * Costs & Safety: Real API calls; multiple calls per query. Requires API key(s).
 * Module reference: [Advanced RAG Patterns](https://aitutorial.dev/rag/advanced-rag-patterns#pattern-2-iterative-rag-query-refinement)
 * Why: Helps when user queries are vague. Uses the LLM to refine the search query based on initial results.
 */

import { generateText } from 'ai';
import { createModel } from './utils.js';
import { SemanticRetriever } from './utils/semantic_retriever';

/**
 * Use the LLM to refine a vague query based on initial retrieval results
 */
async function refineQuery(
    model: ReturnType<typeof createModel>,
    originalQuery: string,
    retrievedDocs: string[]
): Promise<string> {
    const refinementPrompt = `
        Original query: ${originalQuery}

        Initial search returned these documents:
        ${retrievedDocs.slice(0, 2).map(d => `- ${d}`).join('\n')}

        The documents might provide clues. Generate a refined,
        more specific query to find more details.

        Refined query:
        `;

    const { text } = await generateText({
        model,
        messages: [{ role: 'user', content: refinementPrompt }],
    });

    return text || originalQuery;
}

/**
 * Generate a final answer from accumulated retrieved documents
 */
async function generateAnswer(
    model: ReturnType<typeof createModel>,
    question: string,
    context: string
): Promise<string> {
    const { text } = await generateText({
        model,
        messages: [{
            role: 'user',
            content: `Context:\n${context}\n\nQuestion: ${question}`,
        }],
    });

    return text;
}

/**
 * Run the iterative RAG loop: retrieve, check confidence, refine query, repeat
 */
async function iterativeQuery(
    model: ReturnType<typeof createModel>,
    retriever: SemanticRetriever,
    question: string,
    maxIterations: number = 2
): Promise<{ answer: string; iterations: number; finalQuery: string }> {
    let currentQuery = question;
    const allDocs: string[] = [];

    let iteration = 0;
    for (iteration = 0; iteration < maxIterations; iteration++) {
        console.log(`\n[Iteration ${iteration + 1}] Searching for: "${currentQuery}"`);

        const results = await retriever.searchRanked(currentQuery, 3);
        const docs = results.map(r => r.document);
        allDocs.push(...docs);

        if (results.length > 0 && results[0].score > 0.88) {
            console.log('  -> Found high confidence match, stopping.');
            break;
        }

        if (iteration < maxIterations - 1) {
            console.log('  -> Results insufficient, refining query...');
            const refinedQuery = await refineQuery(model, question, docs);
            currentQuery = refinedQuery.replace(/"/g, '');
            console.log(`  -> Refined to: '${currentQuery}'`);
        }
    }

    const uniqueDocs = Array.from(new Set(allDocs)).join('\n\n');
    const answer = await generateAnswer(model, question, uniqueDocs);

    return {
        answer,
        iterations: iteration + 1,
        finalQuery: currentQuery,
    };
}

/**
 * Main function demonstrating Iterative RAG
 *
 * This example shows how to iteratively refine vague queries using the LLM
 * to improve retrieval results before generating a final answer.
 *
 * Each iteration retrieves documents, checks confidence, and refines the query if needed.
 */
async function main(): Promise<void> {
    const model = createModel();

    console.log('--- Iterative RAG Example ---');

    // Step 1: Setup Data
    const essayText = `
        The January 2025 outage was caused by a configuration error in the primary database cluster.
        It started at 14:00 UTC and was resolved by 16:30 UTC.
        The root cause was a typo in the replication configuration file.
        This prevented the standby nodes from syncing, causing a failover failure.
        Users experienced 503 errors during this period.
        The engineering team has since implemented automated config validation.
    `;
    const documents = essayText.split('.').map(s => s.trim()).filter(s => s.length > 0);

    console.log('Initializing Retriever...');
    const retriever = await SemanticRetriever.create(documents);

    // Step 2: Run Vague Query
    const vagueQuery = 'Tell me about the outage';
    console.log(`\nOriginal Query: "${vagueQuery}"`);

    const result = await iterativeQuery(model, retriever, vagueQuery);

    console.log('\n--- Final Result ---');
    console.log(`Iterations: ${result.iterations}`);
    console.log(`Final Refined Query: "${result.finalQuery}"`);
    console.log(`Answer: ${result.answer}`);
}

await main();
