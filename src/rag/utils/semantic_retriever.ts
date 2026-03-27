import { embed, embedMany } from 'ai';
import { createEmbeddingModel } from '../utils.js';

export type RankedSemanticResult = {
    document: string;
    score: number;
    rank: number;
    docIdx: number;
};

/**
 * In-memory semantic (vector) search using the Vercel AI SDK.
 * Supports OpenAI and Gemini embeddings via createEmbeddingModel().
 *
 * NOTE: This is an in-memory abstraction designed for educational examples.
 * In production, swap this for a persistent vector store like Pinecone,
 * Milvus, Weaviate, Qdrant, or ChromaDB.
 */
export class SemanticRetriever {
    private documents: string[];
    private embeddings: number[][];
    private defaultTopK: number;

    private constructor(documents: string[], embeddings: number[][], defaultTopK: number) {
        this.documents = documents;
        this.embeddings = embeddings;
        this.defaultTopK = defaultTopK;
    }

    /**
     * Creates a new SemanticRetriever by embedding all documents.
     */
    static async create(documents: string[], defaultTopK = 5): Promise<SemanticRetriever> {
        const model = createEmbeddingModel();
        const { embeddings } = await embedMany({ model, values: documents });
        return new SemanticRetriever(documents, embeddings, defaultTopK);
    }

    /**
     * Performs a ranked vector search.
     */
    async searchRanked(query: string, topK?: number): Promise<RankedSemanticResult[]> {
        const limit = topK ?? this.defaultTopK;
        const model = createEmbeddingModel();
        const { embedding: queryEmbedding } = await embed({ model, value: query });

        const scored = this.embeddings.map((docEmbedding, idx) => ({
            docIdx: idx,
            score: cosineSimilarity(queryEmbedding, docEmbedding),
        }));

        scored.sort((a, b) => b.score - a.score);

        return scored.slice(0, limit).map((item, rank) => ({
            document: this.documents[item.docIdx],
            score: item.score,
            rank: rank + 1,
            docIdx: item.docIdx,
        }));
    }

    /**
     * Performs a vector search and returns only the indices of the matches.
     */
    async searchIndexes(query: string, topK?: number): Promise<number[]> {
        const ranked = await this.searchRanked(query, topK);
        return ranked.map(r => r.docIdx);
    }
}

function cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0;
    let magA = 0;
    let magB = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        magA += a[i] * a[i];
        magB += b[i] * b[i];
    }
    return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}
