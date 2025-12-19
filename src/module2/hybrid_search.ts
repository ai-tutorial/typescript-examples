import { pipeline } from "@xenova/transformers";
import { ChromaClient } from "chromadb";

/**
 * Costs:
 * - Embedding Model (Xenova/all-MiniLM-L6-v2): Free (local)
 * - ChromaDB: Free (local)
 * - BM25: Free (cpu)
 * 
 * Safety:
 * - No data sent to external APIs.
 * 
 * Module: Hybrid Search (RAG)
 * Ref: https://aitutorial.dev/RAG/Search%20Strategy%20Selection
 * 
 * Why:
 * Demonstrates Hybrid Search by combining BM25 (Keyword) and 
 * Semantic Search (Vector) results using Reciprocal Rank Fusion (RRF).
 */

async function main() {
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
    const semantic = new SemanticRetriever(documents);

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

/**
 * Reciprocal Rank Fusion
 */
function rrfFuse(
    listA: Array<{ document: string; rank: number }>,
    listB: Array<{ document: string; rank: number }>,
    k: number = 60
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

/**
 * Simple BM25 Implementation
 */
class BM25Retriever {
    private documents: string[];
    // Simplified for demo: In production use a real library like 'natural' or 'bm25-js'
    // This mock just does basic keyword matching score for demonstration purposes
    constructor(documents: string[]) {
        this.documents = documents;
    }

    search(query: string, topK: number = 5) {
        const queryTerms = query.toLowerCase().split(/\s+/);
        const scores = this.documents.map((doc, index) => {
            let score = 0;
            const docTerms = doc.toLowerCase().split(/\s+/);
            queryTerms.forEach(term => {
                // Simple term frequency
                score += docTerms.filter(t => t.includes(term)).length;
            });
            return { document: doc, score, originalIndex: index };
        });

        return scores
            .sort((a, b) => b.score - a.score)
            .slice(0, topK)
            .map((r, i) => ({
                document: r.document,
                score: r.score,
                rank: i + 1
            }));
    }
}

/**
 * Semantic Retriever (Xenova + Chroma)
 */
class SemanticRetriever {
    private model: any;
    private client: ChromaClient;
    private collection: any;
    private documents: string[];

    constructor(documents: string[]) {
        this.documents = documents;
        this.client = new ChromaClient();
    }

    async init() {
        this.model = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");

        try {
            await this.client.deleteCollection({ name: "hybrid_search_demo" });
        } catch (e) { /* ignore */ }

        this.collection = await this.client.createCollection({
            name: "hybrid_search_demo",
            metadata: { "hnsw:space": "cosine" },
            embeddingFunction: undefined
        });

        const embeddings = await this.model(this.documents, { pooling: "mean", normalize: true });

        await this.collection.add({
            documents: this.documents,
            embeddings: embeddings.tolist(),
            ids: this.documents.map((_, i) => `doc_${i}`)
        });
    }

    async search(query: string, topK: number = 5) {
        if (!this.collection || !this.model) return [];
        const qEmb = await this.model(query, { pooling: "mean", normalize: true });
        const res = await this.collection.query({
            queryEmbeddings: [qEmb.tolist()],
            nResults: topK
        });

        if (!res.documents || !res.distances) return [];

        return res.documents[0].map((doc: string | null, i: number) => ({
            document: doc || "",
            rank: i + 1,
            score: 1 - (res.distances?.[0]?.[i] ?? 1)
        }));
    }
}

await main();
