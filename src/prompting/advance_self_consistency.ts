/**
 * Advanced Self-Consistency: Multiple Reasoning Paths with Majority Voting
 *
 * Costs & Safety: Real API calls; generates multiple responses. Requires API key(s).
 * Module reference: [Self-Consistency: Voting for Reliability](https://aitutorial.dev/context-engineering-prompt-design/advanced-techniques#self-consistency-voting-for-reliability)
 * Why: Improves accuracy by generating multiple chain-of-thought reasoning paths and taking
 *      a majority vote. Reduces the impact of individual reasoning errors.
 */

import { generateText } from 'ai';
import { createModel } from './utils.js';

const model = createModel();

/**
 * Demonstrates the advanced self-consistency technique for improved accuracy.
 *
 * This example shows how to generate multiple chain-of-thought reasoning paths
 * for the same problem and use majority voting to pick the most reliable answer.
 *
 * This technique is particularly effective for problems where reasoning matters,
 * as it reduces the impact of individual reasoning errors.
 */
async function main(): Promise<void> {
    const problem = `A store has 15 apples. They sell 3 apples in the morning and 4 apples in the afternoon.
    Then they receive a delivery of 8 more apples. How many apples do they have at the end of the day?`;

    // Step 1: Generate multiple chain-of-thought reasoning paths for the same problem
    const reasoningPaths = await generateReasoningPaths(problem, 5);

    // Step 2: Extract the final answer from each path
    const answers = extractAnswersFromPaths(reasoningPaths);

    // Step 3: Take a majority vote and display results
    displayResults(reasoningPaths, answers);
}

/**
 * Generate multiple chain-of-thought reasoning paths at varying temperatures
 */
async function generateReasoningPaths(problem: string, numPaths: number): Promise<string[]> {
    console.log('')
    console.log(`Generating ${numPaths} reasoning paths...`);
    console.log('')

    const temperatures = [0.3, 0.5, 0.7, 0.9, 1.0].slice(0, numPaths);

    const reasoningPaths = await Array.from({ length: numPaths }, (_, i) => i)
        .reduce(async (accPromise, i) => {
            const acc = await accPromise;
            const temperature = temperatures[i] || 0.7;
            console.log(`  Path ${i + 1}/${numPaths} (temperature: ${temperature})...`);

            const response = await generateText({
                model,
                messages: [
                    {
                        role: 'system',
                        content: 'You are a careful math tutor. Solve problems step by step and end with "The answer is: [your answer]".',
                    },
                    {
                        role: 'user',
                        content: `Solve the following problem step by step.\n\nProblem: ${problem}\n\nLet's think step by step:`,
                    },
                ],
            });

            const path = response.text;
            await new Promise(resolve => setTimeout(resolve, 100));
            return [...acc, path];
        }, Promise.resolve([] as string[]));

    return reasoningPaths;
}

/**
 * Extract the final answer from each reasoning path
 */
function extractAnswersFromPaths(reasoningPaths: string[]): string[] {
    const answers = reasoningPaths.map(extractAnswer)
        .filter((a): a is string => a !== null);
    return answers;
}

/**
 * Take a majority vote and display all results
 */
function displayResults(reasoningPaths: string[], answers: string[]): void {
    const majorityAnswer = majorityVote(answers);

    const majorityCount = answers.filter(
        a => a.toLowerCase() === majorityAnswer.toLowerCase()
    ).length;
    const confidence = answers.length > 0
        ? (majorityCount / answers.length) * 100
        : 0;

    console.log('')
    console.log('=== Reasoning Paths ===');
    console.log('')
    reasoningPaths.forEach((path, index) => {
        console.log(`--- Path ${index + 1} ---`);
        console.log(path);
        const extracted = extractAnswer(path);
        console.log(`Extracted Answer: ${extracted || 'Could not extract'}`);
        console.log('');
    });

    console.log('=== Results ===');
    console.log('')
    console.log(`All Answers: ${JSON.stringify(answers)}`);
    console.log(`Majority Answer: ${majorityAnswer}`);
    console.log(`Confidence: ${confidence.toFixed(1)}%`);
    console.log('')
    console.log(`Final Answer: ${majorityAnswer}`);

    const expectedAnswer = '16';
    const isCorrect = majorityAnswer.toLowerCase().trim() === expectedAnswer;
    console.log('')
    console.log(`Expected Answer: ${expectedAnswer}`);
    console.log(`Correct: ${isCorrect ? '✓' : '✗'}`);
}

/**
 * Extract the final answer from a reasoning path.
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

await main();
