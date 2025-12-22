
/**
 * RAG Monitoring & Debugging
 * 
 * Costs & Safety:
 * - Uses OpenAI GPT-4 (via judgeLLM) for evaluation. Costs apply per evaluation.
 * - Safe to run; reads local files and calls API.
 * 
 * Module: RAG > RAG Evaluation (Lesson 2.6)
 * Reference: https://aitutorial.dev
 * 
 * Why:
 * Demonstrates continuous evaluation logic, Golden Dataset creation, and
 * systematic debugging of RAG failures (Retrieval vs. Generation).
 */

import { FaithfulnessEvaluator } from "llamaindex";
import * as fs from "fs";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), "env/.env"), override: true });

// ==========================================
// Part 0: Main Execution
// ==========================================

async function main() {
    // 1. Generate Golden Dataset Demo
    console.log("--- Generating Golden Dataset ---");
    await generateGoldenDataset();
    console.log("");

    // 2. Debugging Demo
    console.log("--- Debugging Demo ---");
    const sampleQuery = "What is the capital of Texas?";

    // Scenario 1: Retrieval Failure
    console.log("Scenario 1: Retrieval Failure");
    debugRAGFailureWithScores(
        sampleQuery,
        { [RetrievalMetric.HIT_RATE]: 0.0, [RetrievalMetric.MRR]: 0.0 },
        { passing: false, score: 0, feedback: "Irrelevant" } // Generation won't matter much if retrieval fails per logic
    );

    // Scenario 2: Generation Failure (Hallucination)
    console.log("\nScenario 2: Generation Failure");
    debugRAGFailureWithScores(
        sampleQuery,
        { [RetrievalMetric.HIT_RATE]: 1.0, [RetrievalMetric.MRR]: 1.0 },
        { passing: false, score: 0.1, feedback: "Faithfulness failure: The response claims Austin is on Mars, which is not supported by context." }
    );
}





// ==========================================
// Part 1: Golden Dataset Creation
// ==========================================

// Mock helper functions (in reality, these involve human review)
function annotateRelevantDocsTexts(query: string, _corpus: any): string[] {
    // Human annotators review and mark relevant docs (text content is needed here)
    // Return dummy data for example
    return ["Relevant document text 1 for " + query, "Relevant document text 2"];
}

function writeExpectedAnswer(query: string, _relevantNodeTexts: string[]): string {
    // Human writes the ideal answer
    return "This is the expected answer for " + query;
}

/**
 * Generates a Golden Dataset from real queries.
 * @returns The generated dataset.
 */
export async function generateGoldenDataset() {
    console.log("Building Golden Dataset...");
    const corpus = {}; // Load your corpus here

    // 1. Collect real user queries
    const realQueries = [
        "How do I reset my password?",
        "What's the return policy?",
        "Do you ship internationally?",
    ];

    // 2. For each query, manually identify relevant docs
    const goldenDataset: Array<{
        query: string;
        ground_truth_nodes: string[];
        expected_answer: string;
    }> = [];

    for (const query of realQueries) {
        // Human annotators review and mark relevant docs (text content is needed here)
        const relevantNodeTexts = annotateRelevantDocsTexts(query, corpus);

        // Optionally: write expected answer (still useful for the ResponseEvaluator ground truth)
        const expectedAnswer = writeExpectedAnswer(query, relevantNodeTexts);

        // LlamaIndex RetrieverEvaluator requires this exact format:
        goldenDataset.push({
            query: query,
            ground_truth_nodes: relevantNodeTexts, // List of Node Texts (the relevant chunks)
            expected_answer: expectedAnswer
        });
    }

    // 3. Save for repeated evaluation
    fs.writeFileSync('golden_dataset.json', JSON.stringify(goldenDataset, null, 2));
    console.log("Saved golden_dataset.json");

    return goldenDataset;
}

// ==========================================
// Part 2: Monitoring & Debugging Types
// ==========================================

// Define helper constants for metrics
export const RetrievalMetric = {
    HIT_RATE: "hit_rate",
    MRR: "mrr"
};

// Define compatible interface for Evaluation Result
export interface EvaluationResult {
    passing: boolean;
    score: number;
    feedback: string;
}

/**
 * Wrapper for FaithfulnessEvaluator to act as a generic ResponseEvaluator 
 * for the purpose of this example.
 */
export class ResponseEvaluator {
    private evaluator: FaithfulnessEvaluator;

    constructor(_config: { llm?: any }) {
        // FaithfulnessEvaluator uses global Settings.llm or passed service context usually.
        // We initialize it simply here.
        this.evaluator = new FaithfulnessEvaluator({});
    }

    async evaluate(params: { query: string; response: string; contexts: string[] }): Promise<EvaluationResult> {
        // Faithfulness evaluation
        const result = await this.evaluator.evaluate({
            query: params.query,
            response: params.response,
            contexts: params.contexts
        });

        return {
            passing: result.passing,
            score: result.score,
            feedback: result.feedback || "No feedback provided."
        };
    }
}

// ==========================================
// Part 3: Debugging Logic
// ==========================================

export function debugRAGFailureWithScores(
    query: string,
    retrievalScores: Record<string, number>,
    responseResults: EvaluationResult
): string {
    console.log("=== RAG Failure Analysis ===");
    console.log(`Query: ${query}\n`);

    // 1. Check Retrieval Failure (Layer 1)
    const hitRate = retrievalScores[RetrievalMetric.HIT_RATE] || 0;
    const mrrScore = retrievalScores[RetrievalMetric.MRR] || 0;

    // Check against targets (Recall@10 > 0.90, MRR > 0.80)
    // Adjusted thresholds for example
    if (hitRate < 0.80 || mrrScore < 0.70) {
        console.log(`\n❌ RETRIEVAL PROBLEM (Hit Rate: ${hitRate.toFixed(2)}, MRR: ${mrrScore.toFixed(2)})`);
        console.log("— Fix: Focus on tuning chunking, reranking, or embedding model.");
        return "retrieval_failure";
    }

    // 2. Check Generation Failure (Layer 2)
    if (!responseResults.passing) {
        console.log("\n❌ GENERATION PROBLEM (LLM-as-Judge Failure)");
        const feedback = responseResults.feedback;

        // Simple string matching for diagnosis
        if (feedback.includes("Faithfulness") || feedback.includes("support")) {
            console.log(`— Failure Type: Hallucination/Misinterpretation (Faithfulness)`);
            console.log(`— Feedback: ${feedback}`);
            console.log("— Fix: Constrain LLM prompt, adjust temperature, or improve reranker quality to reduce noise.");
            return "generation_faithfulness_failure";
        }

        if (feedback.includes("Relevance") || feedback.includes("query")) {
            console.log(`— Failure Type: Off-Topic/Irrelevance (Relevancy)`);
            console.log(`— Feedback: ${feedback}`);
            console.log("— Fix: Clarify LLM system prompt on staying concise and relevant.");
            return "generation_relevancy_failure";
        }

        // Default failure message if specific keywords not found
        console.log(`— Failure Detected: ${feedback}`);
        return "generation_general_failure";
    }

    console.log("\n✓ Both retrieval and generation meet automated targets.");
    return "evaluation_passed";
}

// ==========================================
// Part 4: Production Monitor
// ==========================================

export class ProductionRAGMonitor {
    private goldenDataset: Array<{
        query: string;
        ground_truth_nodes: string[];
        expected_answer: string;
    }>;
    private sampleRate: number;
    private resEvaluator: ResponseEvaluator;

    constructor(
        goldenDataset: Array<{ query: string; ground_truth_nodes: string[]; expected_answer: string }>,
        sampleRate: number = 0.1,
        judgeLLM?: any
    ) {
        this.goldenDataset = goldenDataset;
        this.sampleRate = sampleRate;
        this.resEvaluator = new ResponseEvaluator({ llm: judgeLLM });
    }

    shouldEvaluate(): boolean {
        return Math.random() < this.sampleRate;
    }

    async logAndEvaluate(
        query: string,
        retrievedNodesText: string[],
        answer: string
    ): Promise<void> {
        // Log every query (mock implementation)
        console.log(`[Log] Query: "${query}" | Answer Length: ${answer.length}`);

        if (this.shouldEvaluate()) {
            // Find matching golden case (requires exact query match for simplicity here)
            const goldenCase = this.goldenDataset.find(c => c.query === query);

            if (goldenCase) {
                console.log(`[Eval] Evaluating against golden set for: "${query}"`);

                // --- Step 2: Evaluate Generation (Layer 2) ---
                const resEval = await this.resEvaluator.evaluate({
                    query: query,
                    response: answer,
                    contexts: retrievedNodesText
                });

                // Check critical metrics
                if (!resEval.passing) {
                    console.warn(`[Alert] Hallucination/Irrelevance Detected: ${resEval.feedback}`);
                } else {
                    console.log(`[Eval] Passed.`);
                }
            }
        }
    }
}

if (process.argv[1] === import.meta.filename) {
    main().catch(console.error);
}
