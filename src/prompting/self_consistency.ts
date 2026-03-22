/**
 * Self-Consistency: Multiple Reasoning Paths with Majority Voting
 *
 * Costs & Safety: Real API calls; generates multiple responses. Requires API key(s).
 * Module reference: [Self-Consistency: Voting for Reliability](https://aitutorial.dev/context-engineering-prompt-design/advanced-techniques#self-consistency-voting-for-reliability)
 * Why: Improves accuracy by generating multiple chain-of-thought reasoning paths and taking
 *      a majority vote. Reduces the impact of individual reasoning errors.
 */

import { generateText } from 'ai';
import { createModel } from './utils.js';

/**
 * Extract the final answer from a reasoning path.
 * Looks for "The answer is: X", "Answer: X", or falls back to last number.
 */
function extractAnswer(reasoningPath: string): string | null {
    const match = reasoningPath.match(/(?:the answer is|answer):\s*([^\n.]+)/i);
    if (match) return match[1].trim();

    const numbers = reasoningPath.match(/\d+/g);
    return numbers ? numbers[numbers.length - 1] : null;
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
 * Generate multiple chain-of-thought reasoning paths
 */
async function generateReasoningPaths(model: ReturnType<typeof createModel>, problem: string, numPaths: number): Promise<string[]> {
    const temperatures = [0.3, 0.5, 0.7, 0.9, 1.0].slice(0, numPaths);
    const paths: string[] = [];

    console.log(`Generating ${numPaths} reasoning paths...`);
    console.log('');

    for (let i = 0; i < numPaths; i++) {
        const temperature = temperatures[i] || 0.7;
        console.log(`Path ${i + 1}/${numPaths} (temperature: ${temperature})...`);

        const { text } = await generateText({
            model,
            messages: [
                { role: 'user', content: `Solve the following problem step by step. Show your reasoning and end with "The answer is: [your answer]".

    Problem: ${problem}

    Let's think step by step:` },
            ],
        });

        paths.push(text);
    }

    return paths;
}

/**
 * Display reasoning paths and majority vote results
 */
function displayResults(paths: string[], answers: string[]): void {
    const majority = majorityVote(answers);
    const majorityCount = answers.filter(a => a.toLowerCase() === majority.toLowerCase()).length;
    const confidence = answers.length > 0 ? (majorityCount / answers.length) * 100 : 0;

    console.log('');
    console.log('=== Reasoning Paths ===');
    console.log('');
    paths.forEach((path, i) => {
        console.log(`--- Path ${i + 1} ---`);
        console.log(path);
        console.log(`Extracted Answer: ${extractAnswer(path) || 'Could not extract'}`);
        console.log('');
    });

    console.log('=== Results ===');
    console.log('');
    console.log(`All Answers: ${JSON.stringify(answers)}`);
    console.log(`Majority Answer: ${majority}`);
    console.log(`Confidence: ${confidence.toFixed(1)}%`);
    console.log(`Final Answer: ${majority}`);

    const expectedAnswer = '16';
    console.log('');
    console.log(`Expected Answer: ${expectedAnswer}`);
    console.log(`Correct: ${majority.toLowerCase().trim() === expectedAnswer ? '✓' : '✗'}`);
}

/**
 * Main function that demonstrates self-consistency technique
 *
 * This example shows how to improve accuracy using self-consistency by generating
 * multiple reasoning paths and taking a majority vote.
 *
 * This technique is particularly effective for problems where reasoning matters,
 * as it reduces the impact of individual reasoning errors.
 */
async function main(): Promise<void> {
    const model = createModel();
    const problem = `A store has 15 apples. They sell 3 apples in the morning and 4 apples in the afternoon.
    Then they receive a delivery of 8 more apples. How many apples do they have at the end of the day?`;

    // Step 1: Generate multiple chain-of-thought reasoning paths
    const paths = await generateReasoningPaths(model, problem, 5);

    // Step 2: Extract answers and take majority vote
    const answers = paths.map(extractAnswer).filter((a): a is string => a !== null);

    // Step 3: Display results
    displayResults(paths, answers);
}

await main();
