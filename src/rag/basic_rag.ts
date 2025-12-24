/**
 * Costs & Safety: Real API calls; keep inputs small. Requires OpenAI API key. 
 * Module reference: [Basic RAG Implementation](https://aitutorial.dev/rag/rag-fundamentals#basic-rag-implementation)
 * Why: Demonstrates the fundamental Retrieval-Augmented Generation pattern: retrieve context first, then generate answer.
 */

import OpenAI from "openai";
import { config } from 'dotenv';
import { join, dirname } from 'path';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { SemanticRetriever } from './utils/semantic_retriever';

// Load environment variables
config({ path: join(process.cwd(), 'env', '.env') });

const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

const openai = new OpenAI();

// ESM-compatible file path resolution
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const essay = readFileSync(join(process.cwd(), 'assets', 'paul_graham_essay.txt'), 'utf-8');

/**
 * Main function that demonstrates a simple RAG implementation
 * 
 * This example shows how to:
 * 1. Create a semantic (vector) index for documents
 * 2. Retrieve relevant documents for a query
 * 3. Use the retrieved context to generate an answer
 * 
 * This is a single-stage RAG approach suitable for prototypes and simple use cases.
 */
async function main(): Promise<void> {
    // Step 1: Initialize the RAG system with knowledge base documents
    // In this example, we split the essay by double newlines to create chunks (paragraphs)
    const documents = essay
        .split('\n\n')
        .map(chunk => chunk.trim())
        .filter(chunk => chunk.length > 0);

    console.log(`Loaded ${documents.length} chunks from the essay.`);

    const rag = new SimpleRAG(openai);
    // Step 2: Initialize with data
    await rag.initialize(documents);

    // Step 3: Define a query
    const question = `What did the author work on before college?`;
    console.log(`Question: ${question}`);

    // Step 4: Run the RAG pipeline
    const answer = await rag.query(question);

    console.log(``);
    console.log(`Answer:`);
    console.log(`${answer}`);
}

class SimpleRAG {
    private retriever: SemanticRetriever | null = null;
    private openai: OpenAI;

    constructor(openai: OpenAI) {
        this.openai = openai;
    }

    async initialize(documents: string[]): Promise<void> {
        // Use the SemanticRetriever (LlamaIndex in-memory)
        this.retriever = await SemanticRetriever.create(documents);
    }

    async query(question: string, topK = 3): Promise<string> {
        if (!this.retriever) {
            throw new Error(`RAG system not initialized`);
        }

        // Step 1: Retrieve relevant documents
        const results = await this.retriever.searchRanked(question, topK);
        const retrievedDocs = results.map(r => r.document);
        const context = retrievedDocs.join(`\n\n`);

        // Log retrieved context for visibility
        console.log(``);
        console.log(`Retrieved Context (${retrievedDocs.length} docs):`);
        console.log(`---`);
        console.log(`${context}`);
        console.log(`---`);

        // Step 2: Generate answer using retrieved context
        const response = await this.openai.chat.completions.create({
            model: MODEL,
            messages: [
                {
                    role: `system`,
                    content: `Answer based only on the provided context. If the context doesn't contain the answer, say so.`
                },
                {
                    role: `user`,
                    content: `Context:\n${context}\n\nQuestion: ${question}`
                }
            ],
        });

        return response.choices[0].message.content || ``;
    }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    main().catch(console.error);
}
