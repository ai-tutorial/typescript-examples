/**
 * Self-Consistency: Multiple Reasoning Paths with Majority Voting
 * 
 * Costs & Safety: Real API calls; generates multiple responses. Requires API key(s).
 * Module reference: [Self-Consistency: Voting for Reliability](https://aitutorial.dev/context-engineering-prompt-design/advanced-techniques#self-consistency-voting-for-reliability)
 * Why: Improves accuracy by generating multiple chain-of-thought reasoning paths and taking
 *      a majority vote. Reduces the impact of individual reasoning errors.
 */

import OpenAI from 'openai';
import { config } from 'dotenv';
import { join } from 'path';

// Load environment variables from env/.env
config({ path: join(process.cwd(), 'env', '.env') });

// Setup
const MODEL = 'gpt-4o-mini'; // Need gpt-4o or gpt-4o-mini for this example

const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Main function that demonstrates self-consistency technique
 * 
 * This example shows how to improve accuracy using self-consistency by generating multiple reasoning paths and taking a majority vote.
 * 
 * This technique is particularly effective for problems where reasoning matters,
 * as it reduces the impact of individual reasoning errors.
 */
async function main(): Promise<void> {
    const problem = `    A store has 15 apples. They sell 3 apples in the morning and 4 apples in the afternoon. 
    Then they receive a delivery of 8 more apples. How many apples do they have at the end of the day?`;

    // Step 1: Generate multiple chain-of-thought reasoning paths for the same problem
    const reasoningPaths = await generateReasoningPaths(problem, 5);

    // Step 2: Extract the final answer from each path
    const answers = extractAnswersFromPaths(reasoningPaths);

    // Step 3: Take a majority vote to determine the final answer
    displayResults(reasoningPaths, answers);
}

/**
 * Step 1: Generate multiple chain-of-thought reasoning paths
 */
async function generateReasoningPaths(problem: string, numPaths: number): Promise<string[]> {
    console.log(`\nGenerating ${numPaths} reasoning paths...\n`);

    const temperatures = [0.3, 0.5, 0.7, 0.9, 1.0].slice(0, numPaths);

    const reasoningPaths = await Array.from({ length: numPaths }, (_, i) => i)
        .reduce(async (accPromise, i) => {
            const acc = await accPromise;
            const temperature = temperatures[i] || 0.7;
            console.log(`Path ${i + 1}/${numPaths} (temperature: ${temperature})...`);

            const prompt = `Solve the following problem step by step. Show your reasoning and end with "The answer is: [your answer]".

    Problem: ${problem}

    Let's think step by step:`;

            const response = await client.chat.completions.create({
                model: MODEL,
                messages: [{ role: 'user', content: prompt }],
                temperature: temperature,
            });

            const path = response.choices[0].message.content || '';

            await new Promise(resolve => setTimeout(resolve, 100));

            return [...acc, path];
        }, Promise.resolve([] as string[]));

    return reasoningPaths;
}

/**
 * Extract the final answer from a reasoning path
 * Looks for patterns like "The answer is: X" or "Answer: X"
 */
function extractAnswer(reasoningPath: string): string | null {
    const answerPattern1 = /the answer is:\s*([^\n.]+)/i;
    const match1 = reasoningPath.match(answerPattern1);
    if (match1) {
        return match1[1].trim();
    }

    const answerPattern2 = /answer:\s*([^\n.]+)/i;
    const match2 = reasoningPath.match(answerPattern2);
    if (match2) {
        return match2[1].trim();
    }

    const numbers = reasoningPath.match(/\d+/g);
    if (numbers && numbers.length > 0) {
        return numbers[numbers.length - 1];
    }

    return null;
}

/**
 * Perform majority voting on a list of answers
 */
function majorityVote(answers: string[]): string {
    if (answers.length === 0) return '';

    const counts = answers.reduce((acc, answer) => {
        const normalized = answer.toLowerCase().trim();
        acc.set(normalized, (acc.get(normalized) || 0) + 1);
        return acc;
    }, new Map<string, number>());

    const [majorityAnswer] = Array.from(counts.entries())
        .reduce((max, [answer, count]) => count > max[1] ? [answer, count] : max, ['', 0]);
    return majorityAnswer;
}

/**
 * Step 2: Extract the final answer from each reasoning path
 */
function extractAnswersFromPaths(reasoningPaths: string[]): string[] {
    const answers = reasoningPaths.map(extractAnswer)
        .filter((a): a is string => a !== null);
    return answers;
}

/**
 * Step 3: Take a majority vote and display results
 */
function displayResults(reasoningPaths: string[], answers: string[]): void {
    const majorityAnswer = majorityVote(answers);

    const majorityCount = answers.filter(
        a => a.toLowerCase() === majorityAnswer.toLowerCase()
    ).length;
    const confidence = answers.length > 0
        ? (majorityCount / answers.length) * 100
        : 0;

    console.log('\n=== Reasoning Paths ===\n');
    reasoningPaths.forEach((path, index) => {
        console.log(`--- Path ${index + 1} ---`);
        console.log(path);
        const extracted = extractAnswer(path);
        console.log(`Extracted Answer: ${extracted || 'Could not extract'}`);
        console.log('');
    });

    console.log('=== Results ===\n');
    console.log('All Answers:', answers);
    console.log(`Majority Answer: ${majorityAnswer}`);
    console.log(`Confidence: ${confidence.toFixed(1)}%`);
    console.log(`\nFinal Answer: ${majorityAnswer}`);

    const expectedAnswer = '16';
    const isCorrect = majorityAnswer.toLowerCase().trim() === expectedAnswer;
    console.log(`\nExpected Answer: ${expectedAnswer}`);
    console.log(`Correct: ${isCorrect ? '✓' : '✗'}`);
}

await main();
