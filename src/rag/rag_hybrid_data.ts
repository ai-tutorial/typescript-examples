/**
 * Costs & Safety: Uses OpenAI API for router/classifier and final answer.
 * Module reference: [Advanced RAG Patterns](https://aitutorial.dev/rag/advanced-rag-patterns#pattern-4-hybrid-rag-structured-unstructured)
 * Why: Routes queries to either a SQL database (structured) or Vector Search (unstructured) or both, depending on the user's need.
 */

import OpenAI from "openai";
import { config } from 'dotenv';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { SemanticRetriever } from './utils/semantic_retriever';

// Load environment variables
config({ path: join(process.cwd(), 'env', '.env') });

const openai = new OpenAI();

import alasql from 'alasql';

/**
 * In-memory SQL Database using AlaSQL
 */
class InMemorySQLDB {
    constructor() {
        // Initialize Database and Tables
        alasql('CREATE TABLE financials (quarter STRING, year INT, revenue INT, profit INT)');
        alasql('INSERT INTO financials VALUES ("Q4", 2024, 1500000, 300000)');
        alasql('INSERT INTO financials VALUES ("Q3", 2024, 1200000, 200000)');
    }

    async execute(query: string) {
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
 * Main function demonstrating Hybrid Data RAG
 */
async function main() {
    console.log("--- Hybrid Data RAG Example ---");

    // 1. Setup DataSources
    const sqlDb = new InMemorySQLDB();
    const documents = [
        "Analyst Report Q4 2024: Market conditions were favorable.",
        "Competitor analysis: Competitor X launched a new product causing headwinds.",
        "Q4 Summary: We exceeded revenue targets due to strong enterprise sales."
    ];

    console.log("Initializing Retriever...");
    const retriever = await SemanticRetriever.create(documents);

    const hybridRag = new HybridDataRAG(sqlDb, retriever);

    // Query: Requires both SQL (revenue number) and Text (market context)
    const query = "What was our Q4 2024 revenue and what did analysts say about the market?";
    console.log(`\nQuestion: "${query}"`);

    const answer = await hybridRag.query(query);
    console.log(`\nAnswer:\n${answer}`);
}

class HybridDataRAG {
    private sqlDb: InMemorySQLDB;
    private docs: SemanticRetriever;

    constructor(sqlDb: InMemorySQLDB, documentRetriever: SemanticRetriever) {
        this.sqlDb = sqlDb;
        this.docs = documentRetriever;
    }

    async classifyQuery(question: string): Promise<any> {
        // Determine if query needs SQL, docs, or both
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
            "sql_query": "SELECT * FROM revenues WHERE... (if needed)",
            "document_keywords": ["keyword1", "keyword2"]
        }
        `;

        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [{ role: "user", content: classificationPrompt }],
            response_format: { type: "json_object" }
        });

        return JSON.parse(response.choices[0].message.content || "{}");
    }

    async query(question: string): Promise<string> {
        console.log("  -> Classifying query needs...");
        // Step 1: Classify query needs
        const classification = await this.classifyQuery(question);
        console.log(`  -> Needs SQL: ${classification.needs_sql}, Needs Docs: ${classification.needs_documents}`);

        const contextParts: string[] = [];

        // Step 2a: Execute SQL if needed
        if (classification.needs_sql) {
            const sqlResults = await this.sqlDb.execute(classification.sql_query || "SELECT *");
            contextParts.push(`Database results:\n${sqlResults}`);
        }

        // Step 2b: Retrieve documents if needed
        if (classification.needs_documents) {
            const keywords = classification.document_keywords
                ? classification.document_keywords.join(" ")
                : question;

            console.log(`  -> Searching docs for: "${keywords}"`);
            const results = await this.docs.searchRanked(keywords, 3);
            const docs = results.map(r => r.document).join("\n");
            contextParts.push(`Documents:\n${docs}`);
        }

        // Step 3: Generate answer from combined context
        const combinedContext = contextParts.join("\n\n");
        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [{
                role: "user",
                content: `Context:\n${combinedContext}\n\nQuestion: ${question}`
            }]
        });

        return response.choices[0].message.content || "";
    }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    main().catch(console.error);
}
