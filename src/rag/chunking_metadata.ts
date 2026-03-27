/**
 * Metadata-Enriched Chunking
 *
 * Costs & Safety: Local processing only. No API calls required. Safe to run repeatedly.
 * Module reference: [Metadata: The Secret Weapon](https://aitutorial.dev/rag/chunking#metadata-the-secret-weapon)
 * Why: Metadata turns raw text chunks into filterable, traceable units — dramatically improving retrieval precision by letting you narrow results by source, type, section, or date before semantic matching.
 */

import { fileURLToPath } from "url";

interface ChunkMetadata {
    source: string;
    chunk_id: string;
    created_at: string;
    chunk_index: number;
    total_chunks: number;
    document_type?: string;
    section?: string;
    last_modified?: string;
    language: string;
    word_count: number;
    char_count: number;
}

interface EnrichedChunk {
    content: string;
    metadata: ChunkMetadata;
}

/**
 * Demonstrates how metadata enrichment and filtered retrieval improve RAG precision
 *
 * This example shows how to attach structured metadata to chunks and use it
 * to filter retrieval results — so the LLM only sees relevant documents.
 *
 * Without metadata, retrieval relies solely on text similarity. With metadata,
 * you can filter by document type, section, date, or any domain-specific field
 * before ranking by relevance.
 */
async function main(): Promise<void> {
    // Step 1: Create enriched chunks from different document types
    const apiChunks = chunkWithMetadata(
        "Use Bearer token in the Authorization header. Tokens expire after 24 hours. Refresh tokens via POST /auth/refresh.",
        "docs/api-reference.md",
        { document_type: "api_documentation", section: "Authentication" }
    );

    const guideChunks = chunkWithMetadata(
        "Welcome to the platform. This guide walks you through setting up your first project and deploying to production.",
        "docs/getting-started.md",
        { document_type: "user_guide", section: "Onboarding" }
    );

    console.log(`Created ${apiChunks.length} API doc chunks and ${guideChunks.length} guide chunks`);

    console.log('');

    // Step 2: Show metadata attached to a chunk
    const sample = apiChunks[0];
    console.log("Sample chunk metadata:");
    console.log(`  source: ${sample.metadata.source}`);
    console.log(`  document_type: ${sample.metadata.document_type}`);
    console.log(`  section: ${sample.metadata.section}`);
    console.log(`  word_count: ${sample.metadata.word_count}`);

    console.log('');

    // Step 3: Filtered retrieval — only search API docs
    const allChunks = [...apiChunks, ...guideChunks];
    const results = filteredRetrieval(allChunks, "How do I authenticate?", {
        document_type: "api_documentation"
    });

    console.log(`Query: "How do I authenticate?"`);
    console.log(`Filter: document_type = "api_documentation"`);
    console.log(`Results: ${results.length} chunks (filtered from ${allChunks.length} total)`);
    for (const r of results) {
        console.log(`  [${r.metadata.section}] ${r.content.slice(0, 60)}...`);
    }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    main().catch(console.error);
}

function chunkWithMetadata(
    content: string,
    source: string,
    extra: { document_type?: string; section?: string; last_modified?: string } = {}
): EnrichedChunk[] {
    // Split into sentence-level chunks for this demo
    const sentences = content.split(". ").map(s => s.endsWith(".") ? s : s + ".");
    const totalChunks = sentences.length;

    return sentences.map((sentence, i) => ({
        content: sentence,
        metadata: {
            source,
            chunk_id: `${source}_${i}`,
            created_at: new Date().toISOString(),
            chunk_index: i,
            total_chunks: totalChunks,
            document_type: extra.document_type,
            section: extra.section,
            last_modified: extra.last_modified,
            language: "en",
            word_count: sentence.split(/\s+/).length,
            char_count: sentence.length
        }
    }));
}

function filteredRetrieval(
    chunks: EnrichedChunk[],
    _query: string,
    filters: { document_type?: string; section?: string }
): EnrichedChunk[] {
    // Pre-filter by metadata before semantic search
    const filtered = chunks.filter(chunk => {
        if (filters.document_type && chunk.metadata.document_type !== filters.document_type) {
            return false;
        }
        if (filters.section && chunk.metadata.section !== filters.section) {
            return false;
        }
        return true;
    });

    // In production, you'd run vector similarity on the filtered set
    // Here we return all filtered chunks to show the narrowing effect
    return filtered;
}
