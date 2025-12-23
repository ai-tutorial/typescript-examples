export interface Metadata {
    source: string;
    chunk_id: string;
    created_at: string;
    chunk_index?: number;
    total_chunks?: number;
    document_type?: string;
    author?: string;
    last_modified?: string;
    section?: string;
    language?: string;
    word_count?: number;
    char_count?: number;
}

export class DocumentChunk {
    content: string;
    metadata: Metadata;

    /**
     * Production-grade chunk with comprehensive metadata.
     */
    constructor(content: string, metadata: Metadata) {
        this.content = content;
        this.metadata = metadata;
        this.validateMetadata();
    }

    validateMetadata(): void {
        // Ensure required metadata is present
        const required = ['source', 'chunk_id', 'created_at'];
        const missing = required.filter(f => !(f in this.metadata));
        if (missing.length > 0) {
            throw new Error(`Missing metadata: ${missing.join(', ')}`);
        }
    }

    static fromDocument(
        content: string,
        source: string,
        chunkIndex: number,
        totalChunks: number,
        extraMetadata: Record<string, any> = {}
    ): DocumentChunk {
        // Factory method with standard metadata
        const metadata: Metadata = {
            // Required metadata
            source: source,  // e.g., "docs/api-guide.md"
            chunk_id: `${source}_${chunkIndex}`,
            created_at: new Date().toISOString(),

            // Chunk context
            chunk_index: chunkIndex,
            total_chunks: totalChunks,

            // Domain-specific (examples)
            document_type: extraMetadata.document_type,
            author: extraMetadata.author,
            last_modified: extraMetadata.last_modified,
            section: extraMetadata.section,
            language: extraMetadata.language || 'en',

            // Quality signals
            word_count: content.split(/\s+/).length,
            char_count: content.length
        };

        return new DocumentChunk(content, metadata);
    }
}
