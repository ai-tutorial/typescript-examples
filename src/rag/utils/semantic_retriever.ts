import { VectorStoreIndex, TextNode, Settings, MetadataMode } from 'llamaindex';
import { OpenAIEmbedding } from '@llamaindex/openai';

export type RankedSemanticResult = {
    document: string;
    score: number;
    rank: number;
    docIdx: number;
};

/**
 * Utility helper for semantic (vector) search using LlamaIndex.
 * Encapsulates index creation and retrieval logic.
 * 
 * NOTE: This is an in-memory abstraction designed for educational examples.
 * In a production environment, you should swap this for a persistent Vector Store 
 * like Pinecone, Milvus, Weaviate, Qdrant, or ChromaDB to ensure scalability 
 * and data persistence.
 */
export class SemanticRetriever {
    private index: VectorStoreIndex;
    private defaultTopK: number;

    private constructor(index: VectorStoreIndex, defaultTopK: number) {
        this.index = index;
        this.defaultTopK = defaultTopK;
    }

    /**
     * Creates a new SemanticRetriever from a set of documents.
     */
    static async create(documents: string[], defaultTopK = 5): Promise<SemanticRetriever> {
        // Configure default embedding model for LlamaIndex
        Settings.embedModel = new OpenAIEmbedding({
            model: 'text-embedding-3-small',
        });

        const nodes = documents.map((text, idx) => new TextNode({
            text,
            id_: `doc-vec-${idx}`,
            metadata: { docIdx: idx }
        }));

        const index = await VectorStoreIndex.init({ nodes });
        return new SemanticRetriever(index, defaultTopK);
    }

    /**
     * Performs a ranked vector search.
     */
    async searchRanked(query: string, topK?: number): Promise<RankedSemanticResult[]> {
        const limit = topK ?? this.defaultTopK;
        const retriever = this.index.asRetriever({ similarityTopK: limit });
        const results = await retriever.retrieve({ query });

        return results.map((result, index) => {
            const node = result.node as TextNode;
            const docIdx = node.metadata.docIdx ?? Number.parseInt(node.id_.replace('doc-vec-', ''), 10);

            return {
                document: node.getContent(MetadataMode.NONE),
                score: result.score ?? 0,
                rank: index + 1,
                docIdx
            };
        });
    }

    /**
     * Performs a vector search and returns only the indices of the matches.
     */
    async searchIndexes(query: string, topK?: number): Promise<number[]> {
        const ranked = await this.searchRanked(query, topK);
        return ranked.map(r => r.docIdx);
    }
}
