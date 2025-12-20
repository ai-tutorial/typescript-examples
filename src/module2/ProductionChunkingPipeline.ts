import * as crypto from "crypto";
import { DocumentChunk } from "./DocumentChunk";
import { semanticChunking, structureAwareChunking, fixedSizeChunking } from "./chunking_methods";

export class ProductionChunkingPipeline {
    private strategy: string;
    private chunkCache: Record<string, DocumentChunk[]> = {};

    /**
     * End-to-end chunking with optimization.
     */
    constructor(strategy = "semantic") {
        this.strategy = strategy;
    }

    processDocument(
        content: string,
        source: string,
        metadata: Record<string, any> = {}
    ): DocumentChunk[] {
        // Process a single document into optimized chunks

        // Step 1: Check cache (avoid reprocessing identical docs)
        const docHash = crypto.createHash('md5').update(content).digest('hex');
        if (docHash in this.chunkCache) {
            return this.chunkCache[docHash];
        }

        // Step 2: Apply chunking strategy
        let rawChunks: string[];
        if (this.strategy === "semantic") {
            rawChunks = semanticChunking(content);
        } else if (this.strategy === "structure_aware") {
            // structureAwareChunking returns Chunk[] with metadata, we extract content for this simplified example 
            rawChunks = structureAwareChunking(content).map(c => c.content);
        } else {
            rawChunks = fixedSizeChunking(content);
        }

        // Step 3: Create DocumentChunk objects with metadata
        const chunks = rawChunks.map((chunk, i) =>
            DocumentChunk.fromDocument(
                chunk,
                source,
                i,
                rawChunks.length,
                metadata
            )
        );

        // Step 4: Quality filtering (remove tiny/empty chunks)
        const filteredChunks = chunks.filter(c => (c.metadata.word_count || 0) >= 20);

        // Step 5: Cache for reuse
        this.chunkCache[docHash] = filteredChunks;

        return filteredChunks;
    }

    *processBatch(
        documents: Generator<[string, string]>,  // (content, source)
        batchSize = 100
    ): Generator<DocumentChunk[]> {
        // Process documents in batches for efficiency
        const batch: DocumentChunk[] = [];

        for (const [content, source] of documents) {
            const chunks = this.processDocument(content, source);
            batch.push(...chunks);

            // Yield batch when size reached
            if (batch.length >= batchSize) {
                yield batch;
                batch.length = 0;
            }
        }

        // Yield remaining
        if (batch.length > 0) {
            yield batch;
        }
    }
}
