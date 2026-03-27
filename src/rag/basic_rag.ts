/**
 * Basic RAG Implementation
 *
 * Costs & Safety: Real API calls; keep inputs small. Requires API key(s).
 * Module reference: [Basic RAG Implementation](https://aitutorial.dev/rag/rag-fundamentals#basic-rag-implementation)
 * Why: Demonstrates the fundamental RAG pattern in its simplest form: load documents from a file, retrieve relevant ones, generate an answer.
 */

import { generateText } from 'ai';
import { createModel } from './utils.js';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Load company documents from a JSON file.
 * This data could come from anywhere — a database, an API, a CMS, a web scraper.
 * Here we load it from a local file to keep the example self-contained.
 */
function loadDocuments(): string[] {
    const raw = readFileSync(join(process.cwd(), 'assets', 'company_docs.json'), 'utf-8');
    const docs: Array<{ content: string }> = JSON.parse(raw);
    return docs.map(d => d.content);
}

/**
 * Simple keyword search — find documents that match the query terms
 */
function retrieve(documents: string[], query: string, topK = 2): string[] {
    const queryWords = query.toLowerCase().split(/\s+/);
    const scored = documents.map(doc => ({
        doc,
        score: queryWords.filter(w => doc.toLowerCase().includes(w)).length,
    }));
    return scored
        .sort((a, b) => b.score - a.score)
        .slice(0, topK)
        .map(s => s.doc);
}

/**
 * Main function that demonstrates the simplest possible RAG
 *
 * This example shows RAG in three steps:
 * 1. RETRIEVE — load documents from a JSON file and find relevant ones
 * 2. AUGMENT — insert the documents into the prompt as context
 * 3. GENERATE — have the LLM answer using only that context
 *
 * The documents are loaded from assets/company_docs.json — but in production,
 * this could be a database query, an API call, or any other data source.
 * Without RAG, the model would say "I don't have access to MySecretCompany's data."
 */
async function main(): Promise<void> {
    const model = createModel();

    // Load documents from file (could be a database, API, or any data source)
    const documents = loadDocuments();
    console.log(`Loaded ${documents.length} documents from company knowledge base`);

    const question = 'What was MySecretCompany Q4 2024 revenue?';
    console.log(`Question: ${question}`);

    // Step 1: RETRIEVE — find relevant documents for the question
    const relevantDocs = retrieve(documents, question);
    console.log(`Retrieved ${relevantDocs.length} relevant documents`);
    relevantDocs.forEach((doc, i) => console.log(`  [${i + 1}] ${doc.slice(0, 80)}...`));

    // Step 2: AUGMENT — insert the retrieved documents into the prompt as context
    const context = relevantDocs.join('\n\n');
    const messages = [
        {
            role: 'system' as const,
            content: 'Answer based only on the provided context. If the context does not contain the answer, say so.',
        },
        {
            role: 'user' as const,
            content: `Context:\n${context}\n\nQuestion: ${question}`,
        },
    ];

    // Step 3: GENERATE — have the LLM answer using only the provided context
    const { text } = await generateText({ model, messages });

    console.log('');
    console.log('Answer:');
    console.log(`${text}`);
}

await main();
