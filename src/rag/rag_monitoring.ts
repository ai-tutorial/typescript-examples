/**
 * RAG Monitoring & Debugging
 *
 * Costs & Safety: Uses LLM API calls for evaluation. Costs apply per evaluation call.
 * Module reference: [Evaluation & Quality Metrics](https://aitutorial.dev/rag/evaluation-and-quality-metrics#building-a-golden-dataset)
 * Why: Demonstrates continuous evaluation logic, Golden Dataset creation, and systematic debugging of RAG failures (Retrieval vs. Generation).
 */

import { generateText } from "ai";
import { createModel } from "./utils.js";
import * as fs from "fs";
import { fileURLToPath } from "url";

/**
 * Demonstrates golden dataset creation, failure debugging, and production monitoring
 *
 * This example shows how to build a golden dataset for repeatable evaluation,
 * diagnose whether failures come from retrieval or generation, and set up
 * continuous monitoring with sampled LLM-as-Judge evaluation.
 *
 * These patterns let you catch regressions before users do and fix the right
 * component instead of guessing.
 */
async function main(): Promise<void> {
    // Step 1: Generate Golden Dataset
    console.log("--- Generating Golden Dataset ---");
    await generateGoldenDataset();

    console.log('');

    // Step 2: Debug retrieval failure scenario
    console.log("--- Debugging Demo ---");
    const sampleQuery = "What is the capital of Texas?";

    console.log("Scenario 1: Retrieval Failure");
    debugRAGFailureWithScores(
        sampleQuery,
        { [RetrievalMetric.HIT_RATE]: 0.0, [RetrievalMetric.MRR]: 0.0 },
        { passing: false, score: 0, feedback: "Irrelevant" }
    );

    console.log('');

    // Step 3: Debug generation failure scenario
    console.log("Scenario 2: Generation Failure");
    debugRAGFailureWithScores(
        sampleQuery,
        { [RetrievalMetric.HIT_RATE]: 1.0, [RetrievalMetric.MRR]: 1.0 },
        { passing: false, score: 0.1, feedback: "Faithfulness failure: The response claims Austin is on Mars, which is not supported by context." }
    );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    main().catch(console.error);
}

// Mock helper functions (in reality, these involve human review)
function annotateRelevantDocsTexts(query: string, _corpus: unknown): string[] {
    return ["Relevant document text 1 for " + query, "Relevant document text 2"];
}

function writeExpectedAnswer(query: string, _relevantNodeTexts: string[]): string {
    return "This is the expected answer for " + query;
}

export async function generateGoldenDataset(): Promise<GoldenDatasetEntry[]> {
    console.log("Building Golden Dataset...");
    const corpus = {};

    // 1. Collect real user queries
    const realQueries = [
        "How do I reset my password?",
        "What's the return policy?",
        "Do you ship internationally?",
    ];

    // 2. For each query, manually identify relevant docs
    const goldenDataset: GoldenDatasetEntry[] = [];

    for (const query of realQueries) {
        const relevantNodeTexts = annotateRelevantDocsTexts(query, corpus);
        const expectedAnswer = writeExpectedAnswer(query, relevantNodeTexts);

        goldenDataset.push({
            query,
            ground_truth_nodes: relevantNodeTexts,
            expected_answer: expectedAnswer
        });
    }

    // 3. Save for repeated evaluation
    fs.writeFileSync('golden_dataset.json', JSON.stringify(goldenDataset, null, 2));
    console.log("Saved golden_dataset.json");

    return goldenDataset;
}

export const RetrievalMetric = {
    HIT_RATE: "hit_rate",
    MRR: "mrr"
};

export interface EvaluationResult {
    passing: boolean;
    score: number;
    feedback: string;
}

interface GoldenDatasetEntry {
    query: string;
    ground_truth_nodes: string[];
    expected_answer: string;
}

export class ResponseEvaluator {
    private model: ReturnType<typeof createModel>;

    constructor() {
        this.model = createModel();
    }

    async evaluate(params: { query: string; response: string; contexts: string[] }): Promise<EvaluationResult> {
        const { text: response } = await generateText({
            model: this.model,
            prompt: `You are an impartial judge evaluating whether an answer is faithful to the provided context.

Context:
${params.contexts.join("\n---\n")}

Question: ${params.query}
Answer: ${params.response}

Is the answer fully supported by the context?

Respond with a JSON object: {"score": <0.0-1.0>, "passing": <true/false>, "feedback": "<brief explanation>"}
Score 1.0 = fully faithful, 0.0 = completely hallucinated. Passing threshold: 0.8.`,
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
}

export function debugRAGFailureWithScores(
    query: string,
    retrievalScores: Record<string, number>,
    responseResults: EvaluationResult
): string {
    console.log("=== RAG Failure Analysis ===");
    console.log(`Query: ${query}`);

    // 1. Check Retrieval Failure
    const hitRate = retrievalScores[RetrievalMetric.HIT_RATE] || 0;
    const mrrScore = retrievalScores[RetrievalMetric.MRR] || 0;

    if (hitRate < 0.80 || mrrScore < 0.70) {
        console.log(`RETRIEVAL PROBLEM (Hit Rate: ${hitRate.toFixed(2)}, MRR: ${mrrScore.toFixed(2)})`);
        console.log("Fix: Focus on tuning chunking, reranking, or embedding model.");
        return "retrieval_failure";
    }

    // 2. Check Generation Failure
    if (!responseResults.passing) {
        console.log("GENERATION PROBLEM (LLM-as-Judge Failure)");
        const feedback = responseResults.feedback;

        if (feedback.includes("Faithfulness") || feedback.includes("support")) {
            console.log(`Failure Type: Hallucination (Faithfulness)`);
            console.log(`Feedback: ${feedback}`);
            console.log("Fix: Constrain LLM prompt, adjust temperature, or improve reranker.");
            return "generation_faithfulness_failure";
        }

        if (feedback.includes("Relevance") || feedback.includes("query")) {
            console.log(`Failure Type: Off-Topic (Relevancy)`);
            console.log(`Feedback: ${feedback}`);
            console.log("Fix: Clarify LLM system prompt on staying concise and relevant.");
            return "generation_relevancy_failure";
        }

        console.log(`Failure Detected: ${feedback}`);
        return "generation_general_failure";
    }

    console.log("Both retrieval and generation meet automated targets.");
    return "evaluation_passed";
}

export class ProductionRAGMonitor {
    private goldenDataset: GoldenDatasetEntry[];
    private sampleRate: number;
    private resEvaluator: ResponseEvaluator;

    constructor(
        goldenDataset: GoldenDatasetEntry[],
        sampleRate = 0.1
    ) {
        this.goldenDataset = goldenDataset;
        this.sampleRate = sampleRate;
        this.resEvaluator = new ResponseEvaluator();
    }

    shouldEvaluate(): boolean {
        return Math.random() < this.sampleRate;
    }

    async logAndEvaluate(
        query: string,
        retrievedNodesText: string[],
        answer: string
    ): Promise<void> {
        console.log(`[Log] Query: "${query}" | Answer Length: ${answer.length}`);

        if (this.shouldEvaluate()) {
            const goldenCase = this.goldenDataset.find(c => c.query === query);

            if (goldenCase) {
                console.log(`[Eval] Evaluating against golden set for: "${query}"`);

                const resEval = await this.resEvaluator.evaluate({
                    query,
                    response: answer,
                    contexts: retrievedNodesText
                });

                if (!resEval.passing) {
                    console.warn(`[Alert] Hallucination/Irrelevance Detected: ${resEval.feedback}`);
                } else {
                    console.log(`[Eval] Passed.`);
                }
            }
        }
    }
}
