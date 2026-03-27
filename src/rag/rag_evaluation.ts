/**
 * RAG Evaluation
 *
 * Costs & Safety: Uses LLM API calls for generation and evaluation. Costs apply per call.
 * Module reference: [Evaluation & Quality Metrics](https://aitutorial.dev/rag/evaluation-and-quality-metrics)
 * Why: Demonstrates how to evaluate RAG systems using retrieval metrics (Hit Rate, MRR) and generation metrics (Faithfulness, Relevancy via LLM-as-Judge).
 */

import { generateText } from "ai";
import { createModel } from "./utils.js";
import { SemanticRetriever } from "./utils/semantic_retriever.js";
import { readFileSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";

/**
 * Evaluates a RAG system on both retrieval and generation quality
 *
 * This example shows how to measure retrieval metrics (Hit Rate, MRR) to check
 * if we find the right documents, then uses LLM-as-Judge to evaluate generation
 * quality (Faithfulness, Relevancy) without needing human labels.
 *
 * Separating retrieval and generation evaluation lets you pinpoint whether
 * failures come from bad retrieval or bad generation — the most important
 * diagnostic distinction in any RAG system.
 */
async function main(): Promise<void> {
    const model = createModel();

    // Step 1: Load corpus and build retriever
    console.log("Initializing RAG Evaluation...");
    const filePath = join(process.cwd(), "assets/paul_graham_essay.txt");
    const text = readFileSync(filePath, "utf-8");

    // Split into chunks for retrieval
    const chunks = text.split("\n\n").filter(c => c.trim().length > 50);
    const retriever = await SemanticRetriever.create(chunks, 3);

    // Step 2: Define queries with ground truth
    const queries = [
        {
            query: "Why did the author switch from philosophy to AI?",
            expectedChunkKeywords: ["philosophy", "AI"],
        },
        {
            query: "What was the first computer the author used?",
            expectedChunkKeywords: ["IBM", "1401"],
        }
    ];

    // Step 3: Evaluate retrieval (Hit Rate, MRR)
    console.log("--- Part 1: Retrieval Evaluation ---");

    for (const item of queries) {
        const results = await retriever.searchRanked(item.query, 3);
        console.log(`Query: "${item.query}"`);
        console.log(`Retrieved ${results.length} chunks.`);

        // Hit Rate: did any retrieved chunk contain expected keywords?
        const hit = results.some(r =>
            item.expectedChunkKeywords.some(kw => r.document.toLowerCase().includes(kw.toLowerCase()))
        );
        console.log(`Hit Rate: ${hit ? 1 : 0}`);

        // MRR: reciprocal rank of first relevant result
        let mrr = 0;
        for (let i = 0; i < results.length; i++) {
            const isRelevant = item.expectedChunkKeywords.some(kw =>
                results[i].document.toLowerCase().includes(kw.toLowerCase())
            );
            if (isRelevant) {
                mrr = 1 / (i + 1);
                break;
            }
        }
        console.log(`MRR: ${mrr.toFixed(2)}`);
        console.log('');
    }

    // Step 4: Evaluate generation (LLM-as-Judge)
    console.log("--- Part 2: Generation Evaluation (LLM-as-Judge) ---");

    for (const item of queries) {
        const results = await retriever.searchRanked(item.query, 3);
        const contexts = results.map(r => r.document);

        // Generate answer using retrieved context
        const { text: answer } = await generateText({
            model,
            prompt: `Answer the question based ONLY on the provided context.

Context:
${contexts.join("\n---\n")}

Question: ${item.query}

Answer:`,
        });

        console.log(`Query: "${item.query}"`);
        console.log(`Answer: "${answer.slice(0, 150)}..."`);

        // Faithfulness: is the answer grounded in context?
        const faithfulness = await evaluateWithJudge(model, {
            criterion: "faithfulness",
            query: item.query,
            answer,
            contexts,
        });
        console.log(`Faithfulness: ${faithfulness.passing ? "PASS" : "FAIL"} (${faithfulness.score.toFixed(2)})`);

        // Relevancy: does the answer address the query?
        const relevancy = await evaluateWithJudge(model, {
            criterion: "relevancy",
            query: item.query,
            answer,
            contexts,
        });
        console.log(`Relevancy: ${relevancy.passing ? "PASS" : "FAIL"} (${relevancy.score.toFixed(2)})`);
        console.log('');
    }

    console.log("Evaluation Complete.");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    main().catch(console.error);
}

interface JudgeInput {
    criterion: "faithfulness" | "relevancy";
    query: string;
    answer: string;
    contexts: string[];
}

interface JudgeResult {
    passing: boolean;
    score: number;
    feedback: string;
}

async function evaluateWithJudge(
    model: ReturnType<typeof createModel>,
    input: JudgeInput
): Promise<JudgeResult> {
    const contextBlock = input.contexts.join("\n---\n");

    const prompts: Record<string, string> = {
        faithfulness: `You are an impartial judge evaluating whether an answer is faithful to the provided context.

Context:
${contextBlock}

Question: ${input.query}
Answer: ${input.answer}

Is the answer fully supported by the context? Does it contain any claims not present in the context?

Respond with a JSON object: {"score": <0.0-1.0>, "passing": <true/false>, "feedback": "<brief explanation>"}
Score 1.0 = fully faithful, 0.0 = completely hallucinated. Passing threshold: 0.8.`,

        relevancy: `You are an impartial judge evaluating whether an answer is relevant to the question asked.

Question: ${input.query}
Answer: ${input.answer}

Does the answer directly address the question? Is it on-topic and helpful?

Respond with a JSON object: {"score": <0.0-1.0>, "passing": <true/false>, "feedback": "<brief explanation>"}
Score 1.0 = perfectly relevant, 0.0 = completely off-topic. Passing threshold: 0.8.`,
    };

    const { text: response } = await generateText({
        model,
        prompt: prompts[input.criterion],
    });

    try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
    } catch {
        // Fall through to default
    }

    return { passing: false, score: 0, feedback: "Could not parse judge response" };
}
