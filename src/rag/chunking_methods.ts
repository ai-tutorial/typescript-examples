/**
 * Chunking Methods
 *
 * Costs & Safety: Local processing only. No API calls required. Safe to run repeatedly.
 * Module reference: [Chunking Strategies](https://aitutorial.dev/rag/chunking#chunking-strategies)
 * Why: Shows the three core chunking approaches (fixed-size, semantic, structure-aware) so you can pick the right trade-off between retrieval precision and context preservation.
 */

import { parse } from "node-html-parser";
import { fileURLToPath } from "url";

export interface Chunk {
    content: string;
    metadata: {
        section_path: string;
        element_type: string;
    };
}

/**
 * Demonstrates three chunking strategies on sample text and HTML
 *
 * This example shows how fixed-size, semantic, and structure-aware chunking
 * produce different results from the same input, illustrating the trade-offs
 * between simplicity, boundary respect, and structural awareness.
 *
 * Each strategy fits different document types — fixed-size for prototyping,
 * semantic for general-purpose RAG, and structure-aware for hierarchical docs.
 */
async function main(): Promise<void> {
    // Step 1: Fixed-size chunking
    const sampleText = "RAG is a powerful technique. It combines retrieval with generation. ".repeat(50);
    const fixedChunks = fixedSizeChunking(sampleText, 200, 50);
    console.log(`Fixed-size: ${fixedChunks.length} chunks from ${sampleText.length} characters`);

    console.log('');

    // Step 2: Semantic chunking
    const essayText = `# Introduction
RAG combines retrieval and generation.

## How It Works
First, relevant documents are retrieved.
Then, an LLM generates based on retrieved context.

## Benefits
- Grounds responses in source documents
- Reduces hallucinations
- Enables source citation`;

    const semanticChunks = semanticChunking(essayText, 100, 20);
    for (let i = 0; i < semanticChunks.length; i++) {
        console.log(`Semantic chunk ${i + 1}: ${semanticChunks[i].trim().slice(0, 60)}...`);
    }

    console.log('');

    // Step 3: Structure-aware chunking
    const html = `<h1>API Reference</h1>
<h2>Authentication</h2>
<p>Use Bearer token in Authorization header.</p>
<h2>Endpoints</h2>
<h3>GET /users</h3>
<p>Returns list of users. Requires admin role.</p>
<h3>POST /users</h3>
<p>Creates new user. Request body must include email and name.</p>`;

    const structureChunks = structureAwareChunking(html);
    for (const chunk of structureChunks) {
        console.log(`[${chunk.metadata.section_path}] ${chunk.metadata.element_type}`);
    }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    main().catch(console.error);
}

export function fixedSizeChunking(
    text: string,
    chunkSize = 500,
    overlap = 50
): string[] {
    const chunks: string[] = [];
    let start = 0;

    while (start < text.length) {
        const end = start + chunkSize;
        chunks.push(text.slice(start, end));
        start += chunkSize - overlap;
    }

    return chunks;
}

export function semanticChunking(
    text: string,
    chunkSize = 1000,
    chunkOverlap = 200
): string[] {
    const separators = [
        "\n\n",  // Paragraph breaks (preferred)
        "\n",    // Line breaks
        ". ",    // Sentences
        " ",     // Words
        ""       // Characters (fallback)
    ];

    const chunks: string[] = [];
    let currentPos = 0;

    while (currentPos < text.length) {
        let bestSplit = currentPos + chunkSize;

        // Try to find best split point using separators
        for (const sep of separators) {
            const searchPos = text.lastIndexOf(sep, currentPos + chunkSize);
            if (searchPos > currentPos) {
                bestSplit = sep === "" ? currentPos + chunkSize : searchPos + sep.length;
                break;
            }
        }

        const chunk = text.slice(currentPos, bestSplit);
        if (chunk) {
            chunks.push(chunk);
        }

        // Move forward with overlap, but ensure we always advance
        const nextPos = bestSplit - chunkOverlap;
        if (nextPos <= currentPos) {
            currentPos = bestSplit;
        } else {
            currentPos = nextPos;
        }
    }

    return chunks;
}

export function structureAwareChunking(
    html: string,
    _maxChunkSize = 800
): Chunk[] {
    const root = parse(html);
    const chunks: Chunk[] = [];
    let currentContext: string[] = [];

    const elements = root.querySelectorAll("h1, h2, h3, p, li");

    for (const element of elements) {
        const tagName = element.tagName.toLowerCase();

        if (["h1", "h2", "h3"].includes(tagName)) {
            const level = parseInt(tagName[1]);
            currentContext = currentContext.slice(0, level - 1);
            currentContext.push(element.textContent);
        } else if (["p", "li"].includes(tagName)) {
            const chunkText = currentContext.join(" > ") + "\n\n" + element.textContent;

            chunks.push({
                content: chunkText,
                metadata: {
                    section_path: currentContext.join(" > "),
                    element_type: tagName
                }
            });
        }
    }

    return chunks;
}
