/**
 * Costs & Safety: Uses OpenAI API for answer generation (Costs apply). Requires OPENAI_API_KEY. Keep input text small to minimize costs.
 * Module reference: [Search Strategy Selection](https://aitutorial.dev/rag/search-strategy-selection#bm25-retrieval)
 * Why: Compares BM25 (keyword), Semantic (vector), and Hybrid (RRF) retrieval methods to demonstrate trade-offs in accuracy and cost.
 */

import OpenAI from "openai";
import { config } from 'dotenv';
import { pipeline } from "@xenova/transformers";
import { ChromaClient } from "chromadb";
import { join } from 'path';
import { readFileSync } from 'fs';

// Load environment variables if .env exists
try {
    config({ path: join(process.cwd(), 'env', '.env') });
} catch (e) {
    // Ignore if env file missing
}

// ==========================================
// Part 0: Main Execution
// ==========================================

/**
 * Main function that demonstrates BM25, Semantic, and Hybrid search strategies
 * 
 * This example shows how to implement and compare different retrieval algorithms using a sample text.
 * 
 * Understanding these strategies helps in selecting the right retrieval approach for specific RAG use cases.
 */
async function main() {
    // Step 1: Run BM25 Keyword Search
    await runBM25Example();
    console.log('');

    // Step 2: Run Semantic Vector Search
    await runSemanticExample();
    console.log('');

    // Step 3: Run Hybrid (RRF) Search
    await runHybridExample();
}

import { fileURLToPath } from 'url';

// Main execution moved to end of file

// ==========================================
// Part 1: Definitions (Classes & Core Functions)
// ==========================================

/**
 * Simple implementation of BM25 (Okapi BM25) algorithm
 * Reference: https://en.wikipedia.org/wiki/Okapi_BM25
 */
export class BM25Retriever {
    private corpus: string[];
    private tokenizedCorpus: string[][];
    private docLengths: number[];
    private avgdl: number;
    private idf: Map<string, number>;

    // Standard BM25 hyperparameters
    private k1 = 1.5;
    private b = 0.75;

    constructor(documents: string[]) {
        this.corpus = documents;
        this.tokenizedCorpus = documents.map(doc => this.tokenize(doc));
        this.docLengths = this.tokenizedCorpus.map(doc => doc.length);
        this.avgdl = this.docLengths.reduce((a, b) => a + b, 0) / documents.length;

        this.idf = this.calculateIDF();
    }

    private tokenize(text: string): string[] {
        return text.toLowerCase()
            .replace(/[^\w\s]/g, '') // Remove punctuation
            .split(/\s+/)
            .filter(token => token.length > 0);
    }

    private calculateIDF(): Map<string, number> {
        const idf = new Map<string, number>();
        const N = this.corpus.length;
        const allTokens = new Set(this.tokenizedCorpus.flat());

        for (const token of allTokens) {
            let n_q = 0; // Number of docs containing token
            for (const docTokens of this.tokenizedCorpus) {
                if (docTokens.includes(token)) {
                    n_q++;
                }
            }
            // Standard IDF formula: log((N - n(q) + 0.5) / (n(q) + 0.5) + 1)
            const value = Math.log((N - n_q + 0.5) / (n_q + 0.5) + 1);
            idf.set(token, value);
        }
        return idf;
    }

    search(query: string, topK = 5): Array<{ document: string; score: number; rank: number }> {
        const tokenizedQuery = this.tokenize(query);
        const scores = this.corpus.map(() => 0);

        // Calculate score for each document
        for (let i = 0; i < this.corpus.length; i++) {
            const docTokens = this.tokenizedCorpus[i];
            const docLen = this.docLengths[i];

            for (const token of tokenizedQuery) {
                if (!this.idf.has(token)) continue;

                const tf = docTokens.filter(t => t === token).length;
                const idf = this.idf.get(token) || 0;

                // BM25 score formula for this term
                const numerator = idf * tf * (this.k1 + 1);
                const denominator = tf + this.k1 * (1 - this.b + this.b * (docLen / this.avgdl));

                scores[i] += numerator / denominator;
            }
        }

        // Sort and format results
        return scores
            .map((score, index) => ({
                document: this.corpus[index],
                score: score,
                originalIndex: index
            }))
            .sort((a, b) => b.score - a.score)
            .slice(0, topK)
            .map((result, rank) => ({
                document: result.document,
                score: result.score,
                rank: rank + 1
            }));
    }
}

export class SemanticRetriever {
    private model: any;
    private client: ChromaClient;
    private collection: any;
    private documents: string[];
    private collectionName: string;

    constructor(documents: string[], collectionName = "semantic_search_demo") {
        this.documents = documents;
        this.client = new ChromaClient();
        this.collectionName = collectionName;
    }

    async init(modelName = "Xenova/all-MiniLM-L6-v2") {
        this.model = await pipeline("feature-extraction", modelName);

        try {
            await this.client.deleteCollection({ name: this.collectionName });
        } catch (e) {
            // Ignore
        }

        this.collection = await this.client.createCollection({
            name: this.collectionName,
            metadata: { "hnsw:space": "cosine" },
            embeddingFunction: undefined
        });

        console.log("Embedding documents...");
        const embeddings = await this.model(this.documents, { pooling: "mean", normalize: true });

        await this.collection.add({
            documents: this.documents,
            embeddings: embeddings.tolist(),
            ids: this.documents.map((_, i) => `doc_${i} `)
        });
    }

    async search(query: string, topK = 3): Promise<Array<{ document: string; score: number; rank: number }>> {
        if (!this.collection || !this.model) return [];
        const queryEmbedding = await this.model(query, { pooling: "mean", normalize: true });

        const results = await this.collection.query({
            queryEmbeddings: [queryEmbedding.tolist()],
            nResults: topK
        });

        if (!results.documents || !results.distances) return [];

        return results.documents[0].map((doc: string | null, i: number) => ({
            document: doc || "",
            score: 1 - (results.distances?.[0]?.[i] ?? 1),
            rank: i + 1
        }));
    }
}

/**
 * Reciprocal Rank Fusion
 */
export function rrfFuse(
    listA: Array<{ document: string; rank: number }>,
    listB: Array<{ document: string; rank: number }>,
    k = 60
): Array<{ document: string; score: number }> {
    const scores: Record<string, number> = {};

    // Helper to add scores
    const addScores = (list: Array<{ document: string; rank: number }>) => {
        list.forEach(item => {
            if (!scores[item.document]) scores[item.document] = 0;
            scores[item.document] += 1 / (k + item.rank);
        });
    };

    addScores(listA);
    addScores(listB);

    return Object.entries(scores)
        .map(([doc, score]) => ({ document: doc, score }))
        .sort((a, b) => b.score - a.score);
}


// ==========================================
// Part 2: Example Runners
// ==========================================

export async function runBM25Example() {
    console.log("--- BM25 Example ---");
    const openai = new OpenAI();
    let essay = "";
    try {
        essay = readFileSync(join(__dirname, 'data', 'paul_graham_essay.txt'), 'utf-8');
    } catch {
        essay = "Sample text for fallback if file missing.\n\nAnother paragraph.";
    }

    // Step 1: Prepare Data
    // Simple paragraph-based chunking
    const documents = essay
        .split('\n\n')
        .map(chunk => chunk.trim())
        .filter(chunk => chunk.length > 0);

    console.log(`Loaded ${documents.length} chunks from essay.`);

    // Step 2: Initialize Retriever
    const retriever = new BM25Retriever(documents);

    // Step 3: Define Query
    const query = "Why did he switch from philosophy to AI?";
    console.log(`\nQuery: "${query}"`);

    // Step 4: Retrieve Context
    const topK = 3;
    const results = retriever.search(query, topK);

    console.log("\nTop Retrieved Chunks:");
    results.forEach(r => {
        console.log(`[Rank ${r.rank}]Score: ${r.score.toFixed(4)} `);
        console.log(`Text: ${r.document.substring(0, 100)}...`); // snippet
    });

    const context = results.map(r => r.document).join("\n\n");

    // Step 5: Generate Answer
    console.log("\nGenerating answer...");
    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: "Answer based only on the provided context. If insufficient, say you don't know."
                },
                {
                    role: "user",
                    content: `Context: \n${context} \n\nQuestion: ${query} `
                }
            ],
            temperature: 0
        });

        console.log("\nAnswer:");
        console.log(completion.choices[0].message.content);
    } catch (e) {
        console.log("Skipping LLM generation (API key missing or error)");
    }
}

export async function runSemanticExample() {
    console.log("--- Semantic Search Example ---");
    const essayText = `
        What I Worked On
        February 2021
        Before college the two main things I worked on, outside of school, were writing and programming...
        I didn't write essays. I wrote what beginning writers were supposed to write then, and probably still are: short stories.
        My stories were awful.They had hardly any plot, just characters with strong feelings, which I imagined made them deep.
        The first programs I tried writing were on the IBM 1401 that our school district used for data processing.
        This was in 9th grade, so I was 13 or 14. The school district's 1401 happened to be in the basement of our junior high school, 
        and my friend Rich Draves and I got permission to use it.It was like a mini Bond villain's lair.
    `;

    // Chunking logic
    const chunkSize = 200;
    const documents = [];
    for (let i = 0; i < essayText.length; i += chunkSize) {
        documents.push(essayText.slice(i, i + chunkSize).trim());
    }

    console.log(`Created ${documents.length} chunks from essay.`);

    console.log("Initializing SemanticRetriever...");
    const retriever = new SemanticRetriever(documents, "semantic_search_example");

    try {
        await retriever.init();
    } catch (e: any) {
        if (e.message?.includes("Failed to connect") || e.code === "ECONNREFUSED") {
            console.log("⚠️  ChromaDB not running. Skipping actual search execution.");
            return;
        }
        throw e;
    }

    const query = "Why did he switch from philosophy to AI?";
    console.log(`\nQuery: "${query}"`);
    console.log("Searching...");

    const results = await retriever.search(query);

    console.log("\nResults (Top 3):");
    results.forEach(r => {
        console.log(`[Rank ${r.rank}]Score: ${r.score.toFixed(4)} \n"${r.document.slice(0, 100)}..."`);
    });
}

export async function runHybridExample() {
    console.log("--- Hybrid Search Example ---");
    // 1. Prepare Data (Paul Graham Essay snippet)
    const essayText = `
        What I Worked On
        February 2021
        Before college the two main things I worked on, outside of school, were writing and programming...
        I didn't write essays. I wrote what beginning writers were supposed to write then, and probably still are: short stories.
        My stories were awful. They had hardly any plot, just characters with strong feelings, which I imagined made them deep.
        The first programs I tried writing were on the IBM 1401 that our school district used for data processing.
        This was in 9th grade, so I was 13 or 14. The school district's 1401 happened to be in the basement of our junior high school, 
        and my friend Rich Draves and I got permission to use it. It was like a mini Bond villain's lair.
    `.trim();

    const documents = essayText.split('\n').filter(line => line.trim().length > 0);
    console.log(`Loaded ${documents.length} lines/chunks.`);

    // 2. Initialize Retrievers
    console.log("Initializing BM25 and Semantic Retrievers...");
    const bm25 = new BM25Retriever(documents);
    const semantic = new SemanticRetriever(documents, "hybrid_search_demo");

    try {
        await semantic.init();
    } catch (e: any) {
        if (e.message?.includes("Failed to connect") || e.code === "ECONNREFUSED") {
            console.log("⚠️  ChromaDB not running. Skipping Semantic/Hybrid search part.");
            return;
        }
        throw e;
    }

    // 3. Search Query
    const query = "What kind of writing did he do before college?";
    console.log(`Query: "${query}"`);

    // 4. Run Individual Searches
    console.log("Running BM25...");
    const bm25Results = bm25.search(query, 5);

    console.log("Running Semantic Search...");
    const semanticResults = await semantic.search(query, 5);

    // 5. Apply Reciprocal Rank Fusion
    console.log("Applying RRF Fusion...");
    const fusedResults = rrfFuse(bm25Results, semanticResults);

    console.log("Top Hybrid Results:");
    fusedResults.slice(0, 3).forEach((r, i) => {
        console.log(`[Rank ${i + 1}] Score: ${r.score.toFixed(4)} - "${r.document.slice(0, 80)}..."`);
    });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    main().catch(console.error);
}
