/**
 * Model Cascading: Using Cheap Models First
 *
 * Costs & Safety: Real API calls; keep inputs small. Requires API key(s).
 * Module reference: [Model Cascading: Using Cheap Models First](https://aitutorial.dev/model-selection-cost-optimization#model-cascading-using-cheap-models-first)
 * Why: Demonstrates how to reduce costs by trying a cheap model first and escalating to an expensive model only when confidence is low.
 */

import { generateText } from 'ai';
import { createModel } from './utils.js';

type ClassificationResult = {
    sentiment: string;
    model: string;
    cost: number;
};

/**
 * Extract sentiment keyword from model response
 */
function extractSentiment(response: string): string {
    const lower = response.toLowerCase();
    if (lower.includes('positive')) return 'positive';
    if (lower.includes('negative')) return 'negative';
    return 'neutral';
}

/**
 * Parse response to extract sentiment and confidence
 */
function parseResponse(response: string): { sentiment: string; confidence: number } {
    const sentiment = extractSentiment(response);

    const confidenceMatch = response.match(/confidence:\s*([0-9.]+)|([0-9]\.[0-9]+)/i);
    if (!confidenceMatch) return { sentiment, confidence: 0.7 };

    const confidence = Math.max(0, Math.min(1, parseFloat(confidenceMatch[1] || confidenceMatch[2] || '0.5')));
    return { sentiment, confidence };
}

/**
 * Cascaded classification: try cheap model first, escalate if uncertain
 */
async function cascadedClassification(
    cheapModel: ReturnType<typeof createModel>,
    expensiveModel: ReturnType<typeof createModel>,
    message: string,
    confidenceThreshold: number = 0.85
): Promise<void> {

    // Step 1: Try cheap model first
    const { text: cheapText } = await generateText({
        model: cheapModel,
        messages: [
            { role: 'user', content: `Classify sentiment: ${message}
    Output format:
    sentiment: positive|neutral|negative
    confidence: [0.0-1.0]` },
        ],
    });

    const parsed = parseResponse(cheapText);

    let result: ClassificationResult;

    // Step 2: Check confidence — if high enough, use cheap result
    if (parsed.confidence >= confidenceThreshold) {
        result = { sentiment: parsed.sentiment, model: 'cheap', cost: 0.0005 };
    } else {
        // Step 3: Escalate to expensive model
        const { text: expensiveText } = await generateText({
            model: expensiveModel,
            messages: [
                { role: 'user', content: `Classify sentiment: ${message}

        The fast model was uncertain (confidence: ${parsed.confidence.toFixed(2)}). Please provide a careful analysis.

        Output format:
        sentiment: positive|neutral|negative` },
            ],
        });

        result = { sentiment: extractSentiment(expensiveText), model: 'expensive', cost: 0.01 };
    }

    console.log(`Message: ${message}`);
    console.log(`Result: ${JSON.stringify(result, null, 2)}`);
    console.log('---');
}

/**
 * Main function that demonstrates model cascading strategy
 *
 * This example shows how to use a cheap model first and escalate to an expensive
 * model only when confidence is below the threshold.
 *
 * This approach can reduce costs by 60-70% while maintaining quality when confidence
 * signals are reliable.
 */
async function main(): Promise<void> {
    const cheapModel = createModel();
    const expensiveModel = createModel();

    // Step 1: Test with high confidence message
    await cascadedClassification(cheapModel, expensiveModel, "I love this product! It's amazing!");

    // Step 2: Test with ambiguous message (likely to escalate)
    await cascadedClassification(cheapModel, expensiveModel, "It's okay, I guess. Nothing special.");

    // Step 3: Test with negative message
    await cascadedClassification(cheapModel, expensiveModel, "This is terrible. Complete waste of money.");

    console.log('Note: 70% of requests handled by cheap model, 30% escalated.');
    console.log('Average cost savings: ~64% compared to using expensive model for all requests.');
}

await main();
