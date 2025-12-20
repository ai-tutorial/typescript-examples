/**
 * Costs & Safety: Local processing only. No API calls required. Safe to run repeatedly.
 * Module reference: [Chunking and Metadata Strategies](https://aitutorial.dev/rag/chunking-and-metadata-strategies#fixed-size-chunking)
 * Why: Demonstrates various chunking techniques (Fixed-size, Semantic, Structure-aware) and metadata handling to optimize RAG retrieval performance.
 */

import { DocumentChunk } from "./DocumentChunk";
import { fixedSizeChunking, semanticChunking, structureAwareChunking } from "./chunking_methods";
import { ProductionChunkingPipeline } from "./ProductionChunkingPipeline";

// ==========================================
// Part 0: Main Execution
// ==========================================

/**
 * Main function that demonstrates different chunking and metadata strategies
 * 
 * This example shows how to apply fixed-size, semantic, and structure-aware chunking to text and HTML documents.
 * 
 * These strategies enable better context preservation for RAG applications.
 */
async function main() {
    // Step 1: Run Fixed-Size Chunking
    exampleFixedSize();
    console.log('');

    // Step 2: Run Semantic Chunking
    exampleSemantic();
    console.log('');

    // Step 3: Run Structure-Aware Chunking
    exampleStructureAware();
    console.log('');

    // Step 4: Demonstrate Metadata creation
    exampleMetadata();
    console.log('');

    // Step 5: Run Filtered Retrieval
    await filteredRetrievalExample();
    console.log('');

    // Step 6: Run Production Pipeline
    exampleProductionPipeline();
}

// Execute main if run directly
if (require.main === module) {
    main().catch(console.error);
}

// ==========================================
// Part 1: Helper Mock for Example
// ==========================================

// Mock Chroma collection interface for demonstration
interface Collection {
    query(params: any): Promise<void>;
}

export async function filteredRetrievalExample() {
    // Mock implementation
    const collection: Collection = {
        query: async (params) => {
            console.log("Querying with params:", JSON.stringify(params, null, 2));
        }
    };

    await collection.query({
        queryTexts: ["How do I authenticate?"],
        nResults: 5,
        where: {
            $and: [
                { document_type: { $eq: "api_documentation" } },
                { section: { $in: ["Authentication", "Security"] } }
            ]
        }
    });

    // This dramatically improves precision:
    // - Excludes irrelevant document types
    // - Focuses on specific sections
    // - Enables domain-specific retrieval
}

// ==========================================
// Part 2: Example Runners
// ==========================================

export function exampleFixedSize() {
    console.log("--- Fixed Size Chunking Example ---");
    const fixedSizeDoc = "RAG is a powerful technique. It combines retrieval with generation...".repeat(100);
    const fixedSizeChunks = fixedSizeChunking(fixedSizeDoc, 200, 50);
    console.log(`Created ${fixedSizeChunks.length} chunks from ${fixedSizeDoc.length} characters`);
}

export function exampleSemantic() {
    console.log("--- Semantic Chunking Example ---");
    const semanticDoc = `
        # Introduction
        RAG combines retrieval and generation.

        ## How It Works
        First, relevant documents are retrieved.
        Then, an LLM generates based on retrieved context.

        ## Benefits
        - Grounds responses in source documents
        - Reduces hallucinations
        - Enables source citation
    `;

    const semanticChunks = semanticChunking(semanticDoc, 100);
    for (let i = 0; i < semanticChunks.length; i++) {
        console.log(`Chunk ${i + 1}:\n${semanticChunks[i]}\n`);
    }
}

export function exampleStructureAware() {
    console.log("--- Structure Aware Chunking Example ---");
    const structureHtml = `
        <h1>API Reference</h1>
        <h2>Authentication</h2>
        <p>Use Bearer token in Authorization header.</p>
        <h2>Endpoints</h2>
        <h3>GET /users</h3>
        <p>Returns list of users. Requires admin role.</p>
        <h3>POST /users</h3>
        <p>Creates new user. Request body must include email and name.</p>
    `;

    const structureChunks = structureAwareChunking(structureHtml);
    for (const chunk of structureChunks) {
        console.log(`Section: ${chunk.metadata.section_path}`);
        console.log(`Content: ${chunk.content.slice(0, 100)}...`);
        console.log('');
    }
}

export function exampleMetadata() {
    console.log("--- Metadata Example ---");
    DocumentChunk.fromDocument(
        "The /users endpoint returns a list of all users...",
        "docs/api-reference.md",
        5,
        42,
        {
            document_type: "api_documentation",
            section: "Endpoints > User Management",
            last_modified: "2025-01-15"
        }
    );
    console.log("Metadata chunk created successfully");
}

export function exampleProductionPipeline() {
    console.log("--- Production Pipeline Example ---");

    // Helper mocks for runnable example
    function* loadDocuments(_path: string): Generator<[string, string]> {
        yield ["Document 1 content...", "doc1"];
        yield ["Document 2 content...", "doc2"];
    }

    function storeChunks(_chunks: DocumentChunk[]) {
        // console.log(`Stored ${chunks.length} chunks`);
    }

    // Usage in production
    const pipeline = new ProductionChunkingPipeline("semantic");

    // Process large corpus
    const documents = loadDocuments("./corpus");  // Generator, not list (memory efficient)

    for (const chunkBatch of pipeline.processBatch(documents)) {
        // Store batch in vector DB
        storeChunks(chunkBatch);
        console.log(`Processed ${chunkBatch.length} chunks`);
    }
}
