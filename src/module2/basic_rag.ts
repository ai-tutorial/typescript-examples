/**
 * Costs & Safety: Real API calls; keep inputs small. Requires OpenAI API key. Local ChromaDB instance required.
 * Module reference: [Basic RAG Implementation](https://aitutorial.dev/rag/rag-fundamentals#basic-rag-implementation)
 * Why: Demonstrates the fundamental Retrieval-Augmented Generation pattern: retrieve context first, then generate answer.
 */

import OpenAI from "openai";
import { ChromaClient } from "chromadb";
import { config } from 'dotenv';
import { join } from 'path';

// Load environment variables
config({ path: join(process.cwd(), 'env', '.env') });

const openai = new OpenAI();
const chroma = new ChromaClient();

import { readFileSync } from 'fs';
const essay = readFileSync(join(__dirname, 'data', 'paul_graham_essay.txt'), 'utf-8');

/**
 * Main function that demonstrates a simple RAG implementation
 * 
 * This example shows how to:
 * 1. Create a vector collection and index documents
 * 2. Retrieve relevant documents for a query
 * 3. Use the retrieved context to generate an answer
 * 
 * This is a single-stage RAG approach suitable for prototypes and simple use cases.
 */
async function main() {
    // Step 1: Initialize the RAG system with knowledge base documents
    // In this example, we split the essay by double newlines to create chunks (paragraphs)
    const documents = essay
        .split('\n\n')
        .map(chunk => chunk.trim())
        .filter(chunk => chunk.length > 0);

    console.log(`Loaded ${documents.length} chunks from the essay.`);

    // Note: In a real app, you would persist the client/collection
    const rag = new SimpleRAG(chroma, openai);
    // Initialize with data
    await rag.initialize(documents);

    // Step 2: Define a query
    const question = "What did the author work on before college?";
    console.log(`Question: ${question}`);

    // Step 3: Run the RAG pipeline
    const answer = await rag.query(question);

    console.log('');
    console.log('Answer:');
    console.log(answer);
}

class SimpleRAG {
    private client: ChromaClient;
    private collection: any;
    private openai: OpenAI;

    constructor(client: ChromaClient, openai: OpenAI) {
        this.client = client;
        this.openai = openai;
    }

    async initialize(documents: string[]): Promise<void> {
        // Create a unique collection for this run to avoid collisions
        const name = `rag_demo_${Date.now()}`;
        this.collection = await this.client.createCollection({ name });

        // Store documents. Chroma handles the embeddings by default if no embeddings are provided.
        // We handle batches of 100 to stay within limits
        const batchSize = 100;
        for (let i = 0; i < documents.length; i += batchSize) {
            const batch = documents.slice(i, i + batchSize);
            const ids = batch.map((_, idx) => `doc_${i + idx}`);

            await this.collection.add({
                documents: batch,
                ids: ids
            });
        }
    }

    async query(question: string, topK: number = 3): Promise<string> {
        // Step 1: Retrieve relevant documents
        const results = await this.collection.query({
            queryTexts: [question],
            nResults: topK
        });

        const retrievedDocs = results.documents[0] || [];
        const context = retrievedDocs.join("\n\n");

        // Log retrieved context for visibility
        console.log('');
        console.log(`Retrieved Context (${retrievedDocs.length} docs):`);
        console.log('---');
        console.log(context);
        console.log('---');

        // Step 2: Generate answer using retrieved context
        const response = await this.openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "system",
                    content: "Answer based only on the provided context. If the context doesn't contain the answer, say so."
                },
                {
                    role: "user",
                    content: `Context:\n${context}\n\nQuestion: ${question}`
                }
            ],
            temperature: 0  // Deterministic for consistency
        });

        return response.choices[0].message.content || "";
    }
}

await main();
