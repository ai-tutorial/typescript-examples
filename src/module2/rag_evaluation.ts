
/**
 * RAG Evaluation Example
 * 
 * Costs & Safety:
 * - Uses OpenAI GPT-4o (or similar) for evaluation and generation.
 * - Costs apply for embeddings and LLM calls.
 * - Ensure OPENAI_API_KEY is set in .env
 * 
 * Module: RAG > RAG Evaluation (Lesson 2.6)
 * Reference: https://aitutorial.dev
 * 
 * Why:
 * Demonstrates how to evaluate RAG systems using:
 * 1. Retrieval Metrics (Hit Rate, MRR) - Did we find the right chunks?
 * 2. Generation Metrics (Faithfulness, Relevancy) - Did the LLM answer correctly?
 */

import {
    VectorStoreIndex,
    Settings,
    MetadataMode,
    Document
} from "llamaindex";
import { OpenAI, OpenAIEmbedding } from "@llamaindex/openai";
import {
    FaithfulnessEvaluator,
    RelevancyEvaluator
} from "llamaindex";

import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";


dotenv.config({ path: path.resolve(process.cwd(), "env/.env"), override: true });

export async function main() {
    console.log("Initializing RAG Evaluation...");


    const apiKey = process.env.OPENAI_API_KEY;
    console.log("Loaded API Key:", apiKey ? apiKey.substring(0, 10) + "..." : "undefined");

    // Setup LLM
    const model = process.env.OPENAI_MODEL || "gpt-4o";
    Settings.llm = new OpenAI({
        model: model,
        apiKey: apiKey,
        temperature: 1
    });
    Settings.embedModel = new OpenAIEmbedding({
        apiKey: apiKey
    });

    // --- 1. Data Setup (Retrieval) ---
    // Load data from file using fs for robust referencing, then create Document
    const filePath = path.join(process.cwd(), "src/module2/paul_graham_essay.txt");
    const text = fs.readFileSync(filePath, "utf-8");
    const documents = [new Document({ text: text, id_: "doc_1" })];

    // Create Index
    const index = await VectorStoreIndex.fromDocuments(documents);
    const retriever = index.asRetriever({ similarityTopK: 3 });

    // Define Queries and Ground Truth
    const queries = [
        {
            query: "Why did the author switch from philosophy to AI?",
            expectedIds: ["doc_1"],
        },
        {
            query: "What was the first computer the author owned?",
            expectedIds: ["doc_1"],
        }
    ];

    console.log("\n--- Part 1: Retrieval Evaluation ---");

    for (const item of queries) {
        const nodes = await retriever.retrieve(item.query);
        console.log(`\nQuery: "${item.query}"`);
        console.log(`Retrieved ${nodes.length} nodes.`);

        const hit = nodes.some(node => item.expectedIds.includes(node.node.id_));
        console.log(`Hit Rate (1=Yes, 0=No): ${hit ? 1 : 0}`);

        let mrr = 0;
        nodes.forEach((node, idx) => {
            if (item.expectedIds.includes(node.node.id_) && mrr === 0) {
                mrr = 1 / (idx + 1);
            }
        });
        console.log(`MRR: ${mrr.toFixed(2)}`);
    }

    // --- 2. Generation Evaluation (LLM-as-Judge) ---
    console.log("\n--- Part 2: Generation Evaluation (LLM-as-Judge) ---");

    const faithfulnessEvaluator = new FaithfulnessEvaluator({});
    const relevancyEvaluator = new RelevancyEvaluator({});

    const queryEngine = index.asQueryEngine();

    for (const item of queries) {
        const response = await queryEngine.query({ query: item.query });
        const responseText = response.toString();
        const sourceNodes = response.sourceNodes;

        const contexts = sourceNodes?.map(n => n.node.getContent(MetadataMode.NONE)) || [];

        console.log(`\nQuery: "${item.query}"`);
        console.log(`Generated Answer: "${responseText}"`);

        const faithfulnessResult = await faithfulnessEvaluator.evaluate({
            query: item.query,
            response: responseText,
            contexts: contexts
        });

        console.log(`Faithfulness Score: ${faithfulnessResult.score}`);
        console.log(`Faithfulness Passing: ${faithfulnessResult.passing}`);
        if (faithfulnessResult.feedback) console.log(`Feedback: ${faithfulnessResult.feedback}`);

        const relevancyResult = await relevancyEvaluator.evaluate({
            query: item.query,
            response: responseText,
            contexts: contexts
        });

        console.log(`Relevancy Score: ${relevancyResult.score}`);
        console.log(`Relevancy Passing: ${relevancyResult.passing}`);
        if (relevancyResult.feedback) console.log(`Feedback: ${relevancyResult.feedback}`);
    }

    console.log("\nEvaluation Complete.");
}

await main();
