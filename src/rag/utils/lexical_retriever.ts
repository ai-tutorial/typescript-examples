import { BaseRetriever, MetadataMode, TextNode, KVDocumentStore, SimpleKVStore } from 'llamaindex';
import okapiBM25 from 'okapibm25';

// Fix for okapibm25 ESM interop issue
const BM25 = (okapiBM25 as any).default || okapiBM25;

export type RankedLexicalResult = { document: string; score: number; rank: number; docIdx: number };

/**
 * A custom BM25 Retriever that fixes the ESM interop issue in the official LlamaIndex package.
 * It extends the LlamaIndex BaseRetriever to remain compatible with the ecosystem.
 */
class BM25Retriever extends BaseRetriever {
    private docStore: KVDocumentStore;
    private topK: number;

    constructor(options: { docStore: KVDocumentStore; topK?: number }) {
        super();
        this.docStore = options.docStore;
        this.topK = options.topK || 10;
    }

    async _retrieve(query: any): Promise<any[]> {
        const queryStr = typeof query === 'string' ? query : query.query;
        const nodes = Object.values(await this.docStore.docs()) as TextNode[];

        const contents = nodes.map((node) => node.getContent(MetadataMode.NONE) || "");
        const scores = BM25(contents, queryStr.toLowerCase().split(/\s+/));

        const scoredNodes = nodes.map((node, i) => ({
            node,
            score: scores[i] || 0
        }));

        scoredNodes.sort((a, b) => b.score - a.score);
        return scoredNodes.slice(0, this.topK);
    }
}

/**
 * Utility class to reuse lexical (keyword) retrieval across examples using LlamaIndex.
 * 
 * NOTE: This is an in-memory abstraction designed for educational examples. 
 * In a production environment, you should use a persistent Lexical Search 
 * implementation such as Elasticsearch, Algolia, or a dedicated database 
 * with full-text search capabilities.
 */
export class LexicalRetriever {
    private retriever: BM25Retriever;
    private defaultTopK: number;

    private constructor(retriever: BM25Retriever, defaultTopK: number) {
        this.retriever = retriever;
        this.defaultTopK = defaultTopK;
    }

    static async create(documents: string[], defaultTopK = 5): Promise<LexicalRetriever> {
        const kvStore = new SimpleKVStore();
        const docStore = new KVDocumentStore(kvStore);

        const nodes = documents.map((doc, idx) => new TextNode({
            text: doc,
            metadata: { docIdx: idx },
            id_: `doc-${idx}`
        }));

        await docStore.addDocuments(nodes);

        const retriever = new BM25Retriever({ docStore, topK: defaultTopK });

        return new LexicalRetriever(retriever, defaultTopK);
    }

    async searchRanked(query: string, topK?: number): Promise<RankedLexicalResult[]> {
        // Handle topK override if needed by creating a temporary retriever or just slicing
        // For simplicity, we use the retrieve method and then slice/map
        const results = await this.retriever.retrieve({ query });

        const limit = topK ?? this.defaultTopK;

        return results.slice(0, limit).map((result, index) => {
            const node = result.node as TextNode;
            const docIdx = node.metadata.docIdx;

            return {
                document: node.text,
                score: result.score ?? 0,
                rank: index + 1,
                docIdx: docIdx
            };
        });
    }

    async searchIndexes(query: string, topK?: number): Promise<number[]> {
        const ranked = await this.searchRanked(query, topK);
        return ranked.map(r => r.docIdx);
    }
}
