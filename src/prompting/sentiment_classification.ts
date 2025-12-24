/**
 * Customer Sentiment Classification with Prompt Testing
 * 
 * Costs & Safety: Real API calls; keep inputs small. Requires API key(s).
 * Module reference: [Example: Customer Sentiment Classification](https://aitutorial.dev/prompt-optimization-testing#example-customer-sentiment-classification)
 * Why: Demonstrates how to systematically test and improve prompts by defining success criteria, creating evaluation datasets, and iterating on prompt design.
 */

import OpenAI from 'openai';
import { config } from 'dotenv';
import { join } from 'path';

// Load environment variables from env/.env file
config({ path: join(process.cwd(), 'env', '.env') });

// Create an OpenAI client instance
const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const MODEL = process.env.OPENAI_MODEL!;

type EvaluationItem = {
    message: string;
    label: string;
};

type Failure = {
    input: string;
    expected: string;
    actual: string;
};

/**
 * Main function that demonstrates prompt testing and iteration for sentiment classification
 * 
 * This example shows how to systematically test and improve prompts by defining
 * success criteria, creating evaluation datasets, and iterating on prompt design.
 * 
 * The iterative approach with structured testing helps identify prompt weaknesses
 * and measure improvements objectively.
 */
async function main(): Promise<void> {
    // Step 1: Create evaluation dataset
    const evalData: EvaluationItem[] = [
        { message: "Your product broke after one day!", label: "negative" },
        { message: "It works fine, nothing special", label: "neutral" },
        { message: "Best purchase of my life!", label: "positive" },
        { message: "Terrible quality, waste of money", label: "negative" },
        { message: "Does the job, nothing more", label: "neutral" },
        { message: "Love this product!", label: "positive" },
        { message: "Completely disappointed", label: "negative" },
        { message: "It's okay, I guess", label: "neutral" },
        { message: "Amazing! Highly recommend", label: "positive" },
        { message: "Not worth the price", label: "negative" },
    ];

    // Step 2: Test different prompt versions
    const v1Prompt = "Classify sentiment: {message}";
    const v1Accuracy = await testPrompt(v1Prompt, evalData);
    console.log(`V1 Accuracy: ${(v1Accuracy * 100).toFixed(1)}%`);

    const v2Prompt = `Classify the sentiment of this message as positive, neutral, or negative.
    Message: {message}
    Sentiment:`;
    const v2Accuracy = await testPrompt(v2Prompt, evalData);
    console.log(`V2 Accuracy: ${(v2Accuracy * 100).toFixed(1)}%`);

    const v3Prompt = `<task>Classify customer sentiment</task>

    <examples>
    Positive: "Love this!", "Best ever!"
    Neutral: "It's okay", "Does the job"
    Negative: "Terrible", "Waste of money"
    </examples>

    <message>{message}</message>

    <output>positive|neutral|negative</output>`;
    const v3Accuracy = await testPrompt(v3Prompt, evalData);
    console.log(`V3 Accuracy: ${(v3Accuracy * 100).toFixed(1)}%`);

    // Step 3: Analyze failures for the best version
    console.log('=== Failure Analysis (V3) ===');
    const failures = await analyzeFailures(v3Prompt, evalData);
    if (failures.length > 0) {
        failures.forEach((failure, index) => {
            console.log(`Failure ${index + 1}:`);
            console.log(`  Input: ${failure.input}`);
            console.log(`  Expected: ${failure.expected}`);
            console.log(`  Actual: ${failure.actual}`);
        });
    } else {
        console.log('No failures - perfect accuracy!');
    }
}

/**
 * Test a prompt template against evaluation data
 * @param promptTemplate - Prompt template with {message} placeholder
 * @param evalData - Evaluation dataset
 * @returns Accuracy as a number between 0 and 1
 */
async function testPrompt(promptTemplate: string, evalData: EvaluationItem[]): Promise<number> {
    let correct = 0;

    for (const item of evalData) {
        const prompt = promptTemplate.replace("{message}", item.message);
        const prediction = await generatePrediction(prompt);

        if (prediction.toLowerCase().trim() === item.label.toLowerCase()) {
            correct++;
        }
    }

    const accuracy = correct / evalData.length;
    return accuracy;
}

/**
 * Analyze failures for a prompt template
 * @param promptTemplate - Prompt template with {message} placeholder
 * @param evalData - Evaluation dataset
 * @returns Array of failure objects
 */
async function analyzeFailures(promptTemplate: string, evalData: EvaluationItem[]): Promise<Failure[]> {
    const failures: Failure[] = [];

    for (const item of evalData) {
        const prompt = promptTemplate.replace("{message}", item.message);
        const prediction = await generatePrediction(prompt);

        if (prediction.toLowerCase().trim() !== item.label.toLowerCase()) {
            failures.push({
                input: item.message,
                expected: item.label,
                actual: prediction.trim()
            });
        }
    }

    return failures;
}

/**
 * Generate a prediction using the OpenAI API
 * @param prompt - Complete prompt to send to the model
 * @returns Predicted label
 */
async function generatePrediction(prompt: string): Promise<string> {
    console.log(`[API Call] Sending prompt: "${prompt.replace(/\n/g, ' ').substring(0, 50)}..."`);
    const response = await client.chat.completions.create({
        model: MODEL,
        messages: [
            { role: 'user', content: prompt }
        ],
    });

    const content = response.choices[0].message.content || '';
    const lowerContent = content.toLowerCase();

    let result: string;
    if (lowerContent.includes('positive')) {
        result = 'positive';
    } else if (lowerContent.includes('negative')) {
        result = 'negative';
    } else if (lowerContent.includes('neutral')) {
        result = 'neutral';
    } else {
        result = content.trim();
    }

    return result;
}

await main();

