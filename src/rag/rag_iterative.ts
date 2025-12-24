/**
 * Costs & Safety: Uses OpenAI API for query refinement and generation. Multiple calls per query.
 * Module reference: [Advanced RAG Patterns](https://aitutorial.dev/rag/advanced-rag-patterns#pattern-2-iterative-rag-query-refinement)
 * Why: Helps when user queries are vague. Uses the LLM to refine the search query based on initial results.
 */

import OpenAI from "openai";
import { config } from 'dotenv';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { SemanticRetriever } from './utils/semantic_retriever';

// Load environment variables
config({ path: join(process.cwd(), 'env', '.env') });

const openai = new OpenAI();
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o';

/**
 * Main function demonstrating Iterative RAG
 */
async function main() {
    console.log("--- Iterative RAG Example ---");

    // 1. Setup Data
    const essayText = `
        The January 2025 outage was caused by a configuration error in the primary database cluster.
        It started at 14:00 UTC and was resolved by 16:30 UTC.
        The root cause was a typo in the replication configuration file.
        This prevented the standby nodes from syncing, causing a failover failure.
        Users experienced 503 errors during this period.
        The engineering team has since implemented automated config validation.
    `;
    // Chunking
    const documents = essayText.split('.').map(s => s.trim()).filter(s => s.length > 0);

    console.log("Initializing Retriever...");
    const retriever = await SemanticRetriever.create(documents);

    const iterativeRag = new IterativeRAG(retriever);

    // 2. Run Vague Query
    const vagueQuery = "Tell me about the outage";
    console.log(`\nOriginal Query: "${vagueQuery}"`);

    const result = await iterativeRag.query(vagueQuery);

    console.log("\n--- Final Result ---");
    console.log(`Iterations: ${result.iterations}`);
    console.log(`Final Refined Query: "${result.finalQuery}"`);
    console.log(`Answer: ${result.answer}`);
}

class IterativeRAG {
    private retriever: SemanticRetriever;
    private maxIterations: number = 2; // Keep low for demo speed

    constructor(retriever: SemanticRetriever) {
        this.retriever = retriever;
    }

    async refineQuery(
        originalQuery: string,
        retrievedDocs: string[]
    ): Promise<string> {
        // Use LLM to refine query based on initial results
        const refinementPrompt = `
        Original query: ${originalQuery}
        
        Initial search returned these documents:
        ${retrievedDocs.slice(0, 2).map(d => `- ${d}`).join('\n')}
        
        The documents might provide clues. Generate a refined,
        more specific query to find more details.
        
        Refined query:
        `;

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",  // Cheap model fine for query refinement
            messages: [{ role: "user", content: refinementPrompt }],
            temperature: 0.3,
            max_tokens: 100
        });

        return response.choices[0].message.content || originalQuery;
    }

    async query(question: string): Promise<{
        answer: string;
        iterations: number;
        finalQuery: string;
    }> {
        let currentQuery = question;
        const allDocs: string[] = [];

        let iteration = 0;
        for (iteration = 0; iteration < this.maxIterations; iteration++) {
            console.log(`\n[Iteration ${iteration + 1}] Searching for: "${currentQuery}"`);

            // Retrieve with current query
            const results = await this.retriever.searchRanked(currentQuery, 3);
            const docs = results.map(r => r.document);
            allDocs.push(...docs);

            // Check if we have good results (simple heuristic: score threshold)
            // In a real app, you might check if the LLM thinks the context is sufficient.
            // For now, we just iterate to demonstrate the pattern or stop if score is very high.
            if (results.length > 0 && results[0].score > 0.88) {
                console.log("  -> Found high confidence match, stopping.");
                break;
            }

            // Refine query for next iteration if needed
            if (iteration < this.maxIterations - 1) {
                console.log("  -> Results insufficient, refining query...");
                const refinedQuery = await this.refineQuery(question, docs);
                currentQuery = refinedQuery.replace(/"/g, ''); // cleanup
                console.log(`  -> Refined to: '${currentQuery}'`);
            }
        }

        // Generate final answer from all retrieved docs
        const uniqueDocs = Array.from(new Set(allDocs)).join("\n\n");
        const answer = await this.generateAnswer(question, uniqueDocs);

        return {
            answer,
            iterations: iteration + 1,
            finalQuery: currentQuery
        };
    }

    async generateAnswer(question: string, context: string): Promise<string> {
        const response = await openai.chat.completions.create({
            model: MODEL,
            messages: [{
                role: "user",
                content: `Context:\n${context}\n\nQuestion: ${question}`
            }]
        });
        return response.choices[0].message.content || "";
    }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    main().catch(console.error);
}
