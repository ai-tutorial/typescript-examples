/**
 * Hybrid Data RAG: Structured + Unstructured
 *
 * Costs & Safety: Real API calls; keep inputs small. Requires API key(s).
 * Module reference: [Advanced RAG Patterns](https://aitutorial.dev/rag/advanced-rag-patterns#pattern-4-hybrid-rag-structured-unstructured)
 * Why: Routes queries to either a SQL database (structured) or Vector Search (unstructured) or both, depending on the user's need.
 */

import { generateText } from 'ai';
import { createModel } from './utils.js';
import { SemanticRetriever } from './utils/semantic_retriever';
import alasql from 'alasql';

/**
 * In-memory SQL Database using AlaSQL
 */
class InMemorySQLDB {
    constructor() {
        alasql('CREATE TABLE financials (quarter STRING, year INT, revenue INT, profit INT)');
        alasql('INSERT INTO financials VALUES ("Q4", 2024, 1500000, 300000)');
        alasql('INSERT INTO financials VALUES ("Q3", 2024, 1200000, 200000)');
    }

    async execute(query: string): Promise<string> {
        console.log(`  -> Executing SQL: ${query}`);
        try {
            const res = alasql(query);
            return JSON.stringify(res);
        } catch (e: any) {
            return `Error executing SQL: ${e.message}`;
        }
    }
}

/**
 * Classify a query to determine if it needs SQL, documents, or both
 */
async function classifyQuery(model: ReturnType<typeof createModel>, question: string): Promise<any> {
    const classificationPrompt = `
        Does this query require:
        - structured data (database) like revenue, numbers, dates?
        - unstructured data (documents) like reports, text, summaries?
        - both?

        Query: ${question}

        Respond in JSON:
        {
            "needs_sql": true/false,
            "needs_documents": true/false,
            "sql_query": "SELECT * FROM financials WHERE... (if needed)",
            "document_keywords": ["keyword1", "keyword2"]
        }
        `;

    const { text } = await generateText({
        model,
        messages: [{ role: 'user', content: classificationPrompt }],
    });

    return JSON.parse(text || '{}');
}

/**
 * Query the hybrid RAG system: classify, retrieve from both sources, generate answer
 */
async function hybridQuery(
    model: ReturnType<typeof createModel>,
    sqlDb: InMemorySQLDB,
    retriever: SemanticRetriever,
    question: string
): Promise<string> {
    console.log('  -> Classifying query needs...');
    const classification = await classifyQuery(model, question);
    console.log(`  -> Needs SQL: ${classification.needs_sql}, Needs Docs: ${classification.needs_documents}`);

    const contextParts: string[] = [];

    if (classification.needs_sql) {
        const sqlResults = await sqlDb.execute(classification.sql_query || 'SELECT *');
        contextParts.push(`Database results:\n${sqlResults}`);
    }

    if (classification.needs_documents) {
        const keywords = classification.document_keywords
            ? classification.document_keywords.join(' ')
            : question;

        console.log(`  -> Searching docs for: "${keywords}"`);
        const results = await retriever.searchRanked(keywords, 3);
        const docs = results.map(r => r.document).join('\n');
        contextParts.push(`Documents:\n${docs}`);
    }

    const combinedContext = contextParts.join('\n\n');
    const { text } = await generateText({
        model,
        messages: [{
            role: 'user',
            content: `Context:\n${combinedContext}\n\nQuestion: ${question}`,
        }],
    });

    return text;
}

/**
 * Main function demonstrating Hybrid Data RAG
 *
 * This example shows how to route queries to either a SQL database, vector search,
 * or both, depending on the query's needs.
 *
 * The LLM classifies the query first, then the system fetches from the appropriate sources.
 */
async function main(): Promise<void> {
    const model = createModel();

    console.log('--- Hybrid Data RAG Example ---');

    // Step 1: Setup DataSources
    const sqlDb = new InMemorySQLDB();
    const documents = [
        'Analyst Report Q4 2024: Market conditions were favorable.',
        'Competitor analysis: Competitor X launched a new product causing headwinds.',
        'Q4 Summary: We exceeded revenue targets due to strong enterprise sales.',
    ];

    console.log('Initializing Retriever...');
    const retriever = await SemanticRetriever.create(documents);

    // Step 2: Query requiring both SQL and text
    const query = 'What was our Q4 2024 revenue and what did analysts say about the market?';
    console.log(`\nQuestion: "${query}"`);

    const answer = await hybridQuery(model, sqlDb, retriever, query);
    console.log(`\nAnswer:\n${answer}`);
}

await main();
