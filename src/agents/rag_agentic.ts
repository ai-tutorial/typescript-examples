/**
 * Agentic RAG: LLM-Driven Retrieval
 *
 * Costs & Safety: Real API calls; keep inputs small. Requires API key(s).
 * Module reference: [Advanced RAG Patterns](https://aitutorial.dev/rag/advanced-rag-patterns#pattern-3-agentic-rag-llm-driven-retrieval)
 * Why: The LLM analyzes the user's question to decide how to search (filters, strategy, etc.) instead of just embedding the raw string.
 */

import { generateText } from 'ai';
import { createModel } from './utils.js';
import { SemanticRetriever } from '../rag/utils/semantic_retriever';

/**
 * Use the LLM to analyze a query and determine the best retrieval strategy
 */
async function analyzeQuery(model: ReturnType<typeof createModel>, question: string): Promise<any> {
    const analysisPrompt = `
        Analyze this query and determine the best retrieval strategy:
        Query: ${question}

        Respond in JSON:
        {
            "query_type": "factual | conceptual | multi_hop | temporal",
            "key_entities": ["str"],
            "time_range": "optional year like 2025",
            "search_strategy": "keyword | semantic",
            "metadata_filters": {"key": "value"},
            "reasoning": "brief explanation"
        }
        `;

    const { text } = await generateText({
        model,
        messages: [{ role: 'user', content: analysisPrompt }],
    });

    return JSON.parse(text || '{}');
}

/**
 * Run the agentic RAG pipeline: analyze query, apply filters, retrieve, generate
 */
async function agenticQuery(
    model: ReturnType<typeof createModel>,
    retriever: SemanticRetriever,
    question: string
): Promise<string> {
    // Step 1: Analyze query
    const analysis = await analyzeQuery(model, question);
    console.log(`  -> Analysis: ${analysis.reasoning}`);
    console.log(`  -> Strategy: ${JSON.stringify(analysis)}`);

    // Step 2: Construct optimized query
    const searchQuery = analysis.key_entities ? analysis.key_entities.join(' ') : question;
    console.log(`  -> Search Query: "${searchQuery}"`);

    // Step 3: Retrieve
    let results = await retriever.searchRanked(searchQuery, 10);

    // Mock filtering logic
    if (analysis.time_range) {
        console.log(`  -> Applying temporal filter: Year >= ${analysis.time_range}`);
        results = results.filter(r => r.document.includes(String(analysis.time_range)));
    }
    if (analysis.metadata_filters) {
        for (const [key, val] of Object.entries(analysis.metadata_filters)) {
            console.log(`  -> Applying metadata filter: ${key} = ${val}`);
            results = results.filter(r => r.document.toLowerCase().includes(String(val).toLowerCase()));
        }
    }

    // Step 4: Generate answer
    const context = results.slice(0, 3).map(r => r.document).join('\n\n');
    if (!context) {
        console.log('  -> No matching documents found after filtering.');
        return 'No information found.';
    }

    const { text } = await generateText({
        model,
        messages: [{
            role: 'user',
            content: `Context:\n${context}\n\nQuestion: ${question}`,
        }],
    });

    console.log(`  -> Answer: ${text}`);
    return text;
}

/**
 * Main function demonstrating Agentic RAG
 *
 * This example shows how the LLM analyzes the user's question to decide
 * retrieval strategy, filters, and search approach instead of embedding the raw string.
 *
 * The agentic approach enables more intelligent retrieval by understanding query intent.
 */
async function main(): Promise<void> {
    const model = createModel();

    console.log('--- Agentic RAG Example ---');

    // Step 1: Setup Data with Metadata
    const documents = [
        'Policy: PTO is 20 days per year. (Type: HR, Year: 2024)',
        'Update: Dental benefits added coverage for implants starting Jan 2025. (Type: HR, Year: 2025)',
        'Engineering: Python is the primary language for data team. (Type: Tech, Team: Data)',
        'Engineering: The platform team uses Go. (Type: Tech, Team: Platform)',
    ];

    console.log('Initializing Retriever...');
    const retriever = await SemanticRetriever.create(documents);

    // Step 2: Query 1 — Temporal
    console.log('\nQuery 1: "What changed in benefits since last year?"');
    await agenticQuery(model, retriever, 'What changed in benefits since last year (2024)?');

    // Step 3: Query 2 — Specific
    console.log('\nQuery 2: "Which engineers use Python?"');
    await agenticQuery(model, retriever, 'Which engineers use Python?');
}

await main();
