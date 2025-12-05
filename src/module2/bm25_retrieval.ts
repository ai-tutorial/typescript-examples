import OpenAI from "openai";
import { config } from 'dotenv';
import { join } from 'path';
import { readFileSync } from 'fs';

// Load environment variables
config({ path: join(process.cwd(), 'env', '.env') });

const openai = new OpenAI();
const essay = readFileSync(join(__dirname, 'data', 'paul_graham_essay.txt'), 'utf-8');

/**
 * Main function that demonstrates BM25 Retrieval + LLM Generation (RAG)
 * 
 * Logic matches the notebook:
 * 1. Load and chunk essay
 * 2. Retrieve relevant chunks using BM25 (keyword matching)
 * 3. Generate answer using LLM with retrieved context
 */
async function main() {
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
}

/**
 * Simple implementation of BM25 (Okapi BM25) algorithm
 * Reference: https://en.wikipedia.org/wiki/Okapi_BM25
 */
class BM25Retriever {
    private corpus: string[];
    private tokenizedCorpus: string[][];
    private docLengths: number[];
    private avgdl: number;
    private idf: Map<string, number>;

    // Standard BM25 hyperparameters
    private k1: number = 1.5;
    private b: number = 0.75;

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

    search(query: string, topK: number = 5): Array<{ document: string; score: number; rank: number }> {
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

await main();
