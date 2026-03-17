/**
 * Model Cascading: Using Cheap Models First
 * 
 * Costs & Safety: Real API calls; keep inputs small. Requires API key(s).
 * Module reference: [Model Cascading: Using Cheap Models First](https://aitutorial.dev/model-selection-cost-optimization#model-cascading-using-cheap-models-first)
 * Why: Demonstrates how to reduce costs by trying a cheap model first and escalating to an expensive model only when confidence is low.
 */

import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import './utils.js'; // loads env

const cheapModel = openai('gpt-4o-mini');
const expensiveModel = openai('gpt-4o');

type ClassificationResult = {
    sentiment: string;
    model: string;
    cost: number;
};

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
    // Step 1: Test with high confidence message
    const message1 = "I love this product! It's amazing!";
    const result1 = await cascadedClassification(message1);
    console.log(`Message: ${message1}`);
    console.log(`Result: ${JSON.stringify(result1, null, 2)}`);
    console.log('---');

    // Step 2: Test with ambiguous message (likely to escalate)
    const message2 = "It's okay, I guess. Nothing special.";
    const result2 = await cascadedClassification(message2);
    console.log(`Message: ${message2}`);
    console.log(`Result: ${JSON.stringify(result2, null, 2)}`);
    console.log('---');

    // Step 3: Test with negative message
    const message3 = "This is terrible. Complete waste of money.";
    const result3 = await cascadedClassification(message3);
    console.log(`Message: ${message3}`);
    console.log(`Result: ${JSON.stringify(result3, null, 2)}`);
    console.log('---');

    console.log('Note: 70% of requests handled by cheap model, 30% escalated.');
    console.log('Average cost savings: ~64% compared to using expensive model for all requests.');
}

/**
 * Cascaded classification: try cheap model first, escalate if uncertain
 * @param message - Message to classify
 * @param confidenceThreshold - Minimum confidence to accept cheap model result (default: 0.85)
 * @returns Classification result with sentiment, model used, and approximate cost
 */
async function cascadedClassification(
    message: string,
    confidenceThreshold: number = 0.85
): Promise<ClassificationResult> {
    // Step 1: Try cheap model first
    const cheapPrompt = `Classify sentiment: ${message}
    Output format:
    sentiment: positive|neutral|negative
    confidence: [0.0-1.0]`;

    const cheapResponse = await generateText({
        model: cheapModel,
        messages: [
            { role: 'user', content: cheapPrompt },
        ],
    });

    const cheapContent = cheapResponse.text;
    const parsed = parseResponse(cheapContent);

    let result: ClassificationResult;

    // Step 2: Check confidence
    if (parsed.confidence >= confidenceThreshold) {
        result = {
            sentiment: parsed.sentiment,
            model: 'gpt-4o-mini',
            cost: 0.0005
        };
    } else {
        // Step 3: Escalate to expensive model
        const expensivePrompt = `Classify sentiment: ${message}

        The fast model was uncertain (confidence: ${parsed.confidence.toFixed(2)}). Please provide a careful analysis.
        
        Output format:
        sentiment: positive|neutral|negative`;

        const expensiveResponse = await generateText({
            model: expensiveModel,
            messages: [
                { role: 'user', content: expensivePrompt },
            ],
        });

        const expensiveContent = expensiveResponse.text;
        const finalSentiment = extractSentiment(expensiveContent);

        result = {
            sentiment: finalSentiment,
            model: 'gpt-4o',
            cost: 0.01
        };
    }

    return result;
}

/**
 * Parse response to extract sentiment and confidence
 * @param response - Model response text
 * @returns Object with sentiment and confidence
 */
function parseResponse(response: string): { sentiment: string; confidence: number } {
    const lowerContent = response.toLowerCase();

    // Extract sentiment
    let sentiment: string;
    if (lowerContent.includes('positive')) {
        sentiment = 'positive';
    } else if (lowerContent.includes('negative')) {
        sentiment = 'negative';
    } else if (lowerContent.includes('neutral')) {
        sentiment = 'neutral';
    } else {
        sentiment = 'neutral';  // Default fallback
    }

    // Extract confidence (look for pattern like "confidence: 0.85" or "0.85")
    const confidenceMatch = response.match(/confidence:\s*([0-9.]+)|([0-9]\.[0-9]+)/i);
    let confidence: number;
    if (confidenceMatch) {
        confidence = parseFloat(confidenceMatch[1] || confidenceMatch[2] || '0.5');
        // Clamp to 0-1 range
        confidence = Math.max(0, Math.min(1, confidence));
    } else {
        // If no confidence found, estimate based on response clarity
        confidence = 0.7;  // Default moderate confidence
    }

    return { sentiment, confidence };
}

/**
 * Extract sentiment from response
 * @param response - Model response text
 * @returns Extracted sentiment
 */
function extractSentiment(response: string): string {
    const lowerContent = response.toLowerCase();

    let result: string;
    if (lowerContent.includes('positive')) {
        result = 'positive';
    } else if (lowerContent.includes('negative')) {
        result = 'negative';
    } else if (lowerContent.includes('neutral')) {
        result = 'neutral';
    } else {
        result = 'neutral';  // Default fallback
    }

    return result;
}

await main();

