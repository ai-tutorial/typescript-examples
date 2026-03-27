import okapiBM25 from 'okapibm25';

// Fix for okapibm25 ESM interop issue
const BM25 = (okapiBM25 as any).default || okapiBM25;

export type RankedLexicalResult = { document: string; score: number; rank: number; docIdx: number };

/**
 * In-memory BM25 lexical (keyword) retrieval.
 *
 * NOTE: This is an in-memory abstraction designed for educational examples.
 * In production, use Elasticsearch, Algolia, or a database with full-text search.
 */
export class LexicalRetriever {
    private documents: string[];
    private defaultTopK: number;

    private constructor(documents: string[], defaultTopK: number) {
        this.documents = documents;
        this.defaultTopK = defaultTopK;
    }

    static async create(documents: string[], defaultTopK = 5): Promise<LexicalRetriever> {
        return new LexicalRetriever(documents, defaultTopK);
    }

    async searchRanked(query: string, topK?: number): Promise<RankedLexicalResult[]> {
        const limit = topK ?? this.defaultTopK;
        const scores = BM25(this.documents, query.toLowerCase().split(/\s+/));

        const scored = this.documents.map((doc, idx) => ({
            document: doc,
            score: scores[idx] || 0,
            docIdx: idx,
        }));

        scored.sort((a, b) => b.score - a.score);

        return scored.slice(0, limit).map((item, rank) => ({
            ...item,
            rank: rank + 1,
        }));
    }

    async searchIndexes(query: string, topK?: number): Promise<number[]> {
        const ranked = await this.searchRanked(query, topK);
        return ranked.map(r => r.docIdx);
    }
}
