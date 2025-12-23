/**
 * Costs & Safety: Uses OpenAI API for query analysis and answer generation.
 * Module reference: [Advanced RAG Patterns](https://aitutorial.dev/rag/advanced-rag-patterns#pattern-3-agentic-rag-llm-driven-retrieval)
 * Why: The LLM analyzes the user's question to decide how to search (filters, strategy, etc.) instead of just embedding the raw string.
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
 * Main function demonstrating Agentic RAG
 */
async function main() {
    console.log("--- Agentic RAG Example ---");

    // 1. Setup Data with Metadata (Mocking what a real retrieval system would have)
    // SemanticRetriever in this example is simple and doesn't support extensive metadata filtering 
    // out of the box, but we will mock the logic to show the PATTERN.
    const documents = [
        "Policy: PTO is 20 days per year. (Type: HR, Year: 2024)",
        "Update: Dental benefits added coverage for implants starting Jan 2025. (Type: HR, Year: 2025)",
        "Engineering: Python is the primary language for data team. (Type: Tech, Team: Data)",
        "Engineering: The platform team uses Go. (Type: Tech, Team: Platform)"
    ];

    console.log("Initializing Retriever...");
    const retriever = await SemanticRetriever.create(documents);

    const agentic = new AgenticRAG(retriever); // Pass docs to mock filtering

    // Query 1: Temporal
    console.log("\nQuery 1: 'What changed in benefits since last year?'");
    await agentic.query("What changed in benefits since last year (2024)?");

    // Query 2: Specific
    console.log("\nQuery 2: 'Which engineers use Python?'");
    await agentic.query("Which engineers use Python?");
}

class AgenticRAG {
    private retriever: SemanticRetriever;

    constructor(retriever: SemanticRetriever) {
        this.retriever = retriever;
    }

    async analyzeQuery(question: string): Promise<any> {
        // LLM analyzes query and decides retrieval strategy
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

        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [{ role: "user", content: analysisPrompt }],
            response_format: { type: "json_object" }
        });

        return JSON.parse(response.choices[0].message.content || "{}");
    }

    async query(question: string): Promise<string> {
        // Step 1: Analyze query
        const analysis = await this.analyzeQuery(question);
        console.log(`  -> Analysis: ${analysis.reasoning}`);
        console.log(`  -> Strategy: ${JSON.stringify(analysis)}`);

        // Step 2: Construct optimized query
        const searchQuery = analysis.key_entities ? analysis.key_entities.join(" ") : question;
        console.log(`  -> Search Query: "${searchQuery}"`);

        // Step 3: Retrieve 
        // In a real system, you'd pass filters to the Vector DB.
        // Here we'll search first, then manually filter for the demo.
        let results = await this.retriever.searchRanked(searchQuery, 10);

        // Mock filtering logic
        if (analysis.time_range) {
            console.log(`  -> Applying temporal filter: Year >= ${analysis.time_range}`);
            results = results.filter(r => r.document.includes(String(analysis.time_range)));
        }
        if (analysis.metadata_filters) {
            // Check if document contains the filter values (simple string match for demo)
            for (const [key, val] of Object.entries(analysis.metadata_filters)) {
                console.log(`  -> Applying metadata filter: ${key} = ${val}`);
                // Simple hack for demo: check if value exists in text
                results = results.filter(r => r.document.toLowerCase().includes(String(val).toLowerCase()));
            }
        }

        // Step 4: Generate answer
        const context = results.slice(0, 3).map(r => r.document).join("\n\n");
        if (!context) {
            console.log("  -> No matching documents found after filtering.");
            return "No information found.";
        }

        const response = await openai.chat.completions.create({
            model: MODEL,
            messages: [{
                role: "user",
                content: `Context:\n${context}\n\nQuestion: ${question}`
            }]
        });

        const answer = response.choices[0].message.content || "";
        console.log(`  -> Answer: ${answer}`);
        return answer;
    }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    main().catch(console.error);
}
