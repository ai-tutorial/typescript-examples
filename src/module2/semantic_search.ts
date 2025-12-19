import { pipeline } from "@xenova/transformers";
import { ChromaClient } from "chromadb";

/**
 * 
 * Module: Semantic Search (RAG)
 * Ref: https://aitutorial.dev/RAG/Search%20Strategy%20Selection
 * 
 * Why:
 * Demonstrates how to implement semantic search using local embeddings and 
 * a vector database (ChromaDB), based on the single-stage RAG pattern 
 * from the Colab example.
 */

async function main() {
    // Essay snippet from Colab example
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

    // 1. Chunking logic (simplified from Colab's fixed_size_chunk)
    const chunkSize = 200;
    const documents: string[] = [];
    for (let i = 0; i < essayText.length; i += chunkSize) {
        documents.push(essayText.slice(i, i + chunkSize).trim());
    }

    console.log(`Created ${documents.length} chunks from essay.`);

    console.log("Initializing SemanticRetriever...");
    const retriever = new SemanticRetriever(documents);

    try {
        await retriever.init();
    } catch (e: any) {
        if (e.message?.includes("Failed to connect") || e.code === "ECONNREFUSED") {
            console.log("⚠️  ChromaDB not running. Skipping actual search execution.");
            return;
        }
        throw e;
    }

    // Interactive query from Colab
    const query = "Why did he switch from philosophy to AI?";
    console.log(`\nQuery: "${query}"`);
    console.log("Searching...");

    const results = await retriever.search(query);

    console.log("\nResults (Top 3):");
    results.forEach(r => {
        console.log(`[Rank ${r.rank}]Score: ${r.score.toFixed(4)} \n"${r.document.slice(0, 100)}..."`);
    });
}

class SemanticRetriever {
    private model: any;
    private client: ChromaClient;
    private collection: any;
    private documents: string[];

    constructor(documents: string[]) {
        this.documents = documents;
        this.client = new ChromaClient();
    }

    async init(modelName: string = "Xenova/all-MiniLM-L6-v2") {
        this.model = await pipeline("feature-extraction", modelName);

        try {
            await this.client.deleteCollection({ name: "semantic_search_pg" });
        } catch (e) {
            // Ignore
        }

        this.collection = await this.client.createCollection({
            name: "semantic_search_pg",
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

    async search(query: string, topK: number = 3): Promise<Array<{ document: string; score: number; rank: number }>> {
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

await main();
