/**
 * Costs & Safety: Uses OpenAI for generation. Cost proportional to context size.
 * Module reference: [Working with PDF and Images](https://aitutorial.dev/rag/working-with-unstructured-data#pattern-1-constant-output-tasks)
 * Why: Demonstrates the "Needle in a Haystack" pattern for finding specific facts in long documents.
 */

import OpenAI from "openai";
import { config } from 'dotenv';
import { join } from 'path';

// Load environment variables
config({ path: join(process.cwd(), 'env', '.env') });

const openai = new OpenAI();

async function main() {
    console.log("--- Need-in-a-Haystack Search ---");

    // Simulated chunks from a long document (e.g., 100-page manual)
    const documentChunks = [
        "Section 1: Introduction to Employee Benefits...",
        "Section 2: Health Insurance Plans. Plan A covers...",
        "Section 3: Retirement Savings. 401(k) matching is 5%...",
        "Section 4: Return Policy. Items can be returned within 30 days of purchase if original packaging is intact. Refunds are processed within 5 business days.",
        "Section 5: Code of Conduct..."
    ];

    const query = "What is the return policy timeframe?";
    console.log(`Query: "${query}"`);

    const answer = await needleInHaystackSearch(documentChunks, query);
    console.log("\nGenerated Answer:");
    console.log(answer);
}

/**
 * For constant-output tasks (finding specific fact).
 * Retrieve most relevant chunks, generate answer.
 */
export async function needleInHaystackSearch(
    documentChunks: string[],
    query: string
): Promise<string> {

    // Step 1: Retrieve relevant chunks
    // In a real app, this would use a Vector DB (like in basic_rag.ts).
    // Here we use a simple keyword match simulation for self-containment.
    const relevantChunks = documentChunks.filter(chunk =>
        chunk.toLowerCase().includes("return") ||
        chunk.toLowerCase().includes("policy")
    ).slice(0, 3); // Top 3

    if (relevantChunks.length === 0) {
        return "I couldn't find any relevant information in the documents.";
    }

    // Step 2: Generate Answer
    const context = relevantChunks.join("\n\n");
    const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
            {
                role: "system",
                content: "Answer the question based only on the provided context."
            },
            {
                role: "user",
                content: `Context:\n${context}\n\nQuestion: ${query}`
            }
        ],
        temperature: 0
    });

    return response.choices[0].message.content || "";
}

// Execute main
await main();
