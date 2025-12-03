/**
 * Self-Consistency: Multiple Reasoning Paths with Majority Voting
 * 
 * Self-Consistency improves accuracy by:
 * 1. Generating multiple chain-of-thought reasoning paths for the same problem
 * 2. Extracting the final answer from each path
 * 3. Taking a majority vote to determine the final answer
 * 
 * This technique is particularly effective for problems where reasoning matters,
 * as it reduces the impact of individual reasoning errors.
 * 
 * Costs & Safety: Real API calls; generates multiple responses. Requires API key(s).
 * Module reference: `Modules/module-1.md` — Section on Self-Consistency.
 */

import OpenAI from 'openai';
import { config } from 'dotenv';
import { join } from 'path';

// Load environment variables from env/.env
config({ path: join(process.cwd(), 'env', '.env') });

// Setup
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

/**
 * Generate a single chain-of-thought reasoning path
 */
async function generateReasoningPath(
    client: OpenAI,
    problem: string,
    temperature: number
): Promise<string> {
    const prompt = `Solve the following problem step by step. Show your reasoning and end with "The answer is: [your answer]".

Problem: ${problem}

Let's think step by step:`;

    const response = await client.chat.completions.create({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: temperature, // Higher temperature = more diverse reasoning paths
    });

    return response.choices[0].message.content || '';
}

/**
 * Extract the final answer from a reasoning path
 * Looks for patterns like "The answer is: X" or "Answer: X"
 */
function extractAnswer(reasoningPath: string): string | null {
    // Try to find "The answer is: X" pattern
    const answerPattern1 = /the answer is:\s*([^\n.]+)/i;
    const match1 = reasoningPath.match(answerPattern1);
    if (match1) {
        return match1[1].trim();
    }

    // Try to find "Answer: X" pattern
    const answerPattern2 = /answer:\s*([^\n.]+)/i;
    const match2 = reasoningPath.match(answerPattern2);
    if (match2) {
        return match2[1].trim();
    }

    // Try to find the last number in the response (fallback)
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
 * Self-Consistency: Generate multiple reasoning paths and take majority vote
 */
async function selfConsistency(
    client: OpenAI,
    problem: string,
    numPaths: number = 5
): Promise<{
    reasoningPaths: string[];
    answers: string[];
    majorityAnswer: string;
    confidence: number;
}> {
    console.log(`\nGenerating ${numPaths} reasoning paths...\n`);

    // Generate multiple reasoning paths with varying temperatures
    const temperatures = [0.3, 0.5, 0.7, 0.9, 1.0].slice(0, numPaths);

    const reasoningPaths = await Array.from({ length: numPaths }, (_, i) => i)
        .reduce(async (accPromise, i) => {
            const acc = await accPromise;
            const temperature = temperatures[i] || 0.7;
            console.log(`Path ${i + 1}/${numPaths} (temperature: ${temperature})...`);

            const path = await generateReasoningPath(client, problem, temperature);

            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 100));

            return [...acc, path];
        }, Promise.resolve([] as string[]));

    // Extract and filter answers inline (only keep valid extractions)
    const answers = reasoningPaths.map(extractAnswer)
        .filter((a): a is string => a !== null);

    // Perform majority voting
    const majorityAnswer = majorityVote(answers);

    // Calculate confidence (percentage of paths that agree with majority)
    const majorityCount = answers.filter(
        a => a.toLowerCase() === majorityAnswer.toLowerCase()
    ).length;
    const confidence = answers.length > 0
        ? (majorityCount / answers.length) * 100
        : 0;

    return {
        reasoningPaths,
        answers,
        majorityAnswer,
        confidence,
    };
}

/**
 * Main example: Solve a math problem using Self-Consistency
 */
async function main(): Promise<void> {
    const client: OpenAI = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    });

    // Example problem: A word problem that benefits from reasoning
    const problem = `A store has 15 apples. They sell 3 apples in the morning and 4 apples in the afternoon. 
Then they receive a delivery of 8 more apples. How many apples do they have at the end of the day?`;

    // Perform the same question 5 times ...
    const result = await selfConsistency(client, problem, 5);

    // Display results
    console.log('\n=== Reasoning Paths ===\n');
    result.reasoningPaths.forEach((path, index) => {
        console.log(`--- Path ${index + 1} ---`);
        console.log(path);
        const extracted = extractAnswer(path);
        console.log(`Extracted Answer: ${extracted || 'Could not extract'}`);
        console.log();
    });

    console.log('=== Results ===\n');
    console.log('All Answers:', result.answers);
    console.log(`Majority Answer: ${result.majorityAnswer}`);
    console.log(`Confidence: ${result.confidence.toFixed(1)}%`);
    console.log(`\nFinal Answer: ${result.majorityAnswer}`);

    // Expected answer: 15 - 3 - 4 + 8 = 16
    const expectedAnswer = '16';
    const isCorrect = result.majorityAnswer.toLowerCase().trim() === expectedAnswer;
    console.log(`\nExpected Answer: ${expectedAnswer}`);
    console.log(`Correct: ${isCorrect ? '✓' : '✗'}`);
}

/**
 * Production notes:
 * 
 * 1. Self-Consistency improves accuracy by aggregating multiple reasoning paths
 * 2. Use varying temperatures to generate diverse reasoning paths
 * 3. Majority voting works best when you have an odd number of paths (3, 5, 7, etc.)
 * 4. Higher confidence scores indicate stronger agreement among paths
 * 5. This technique is most effective for problems requiring reasoning (math, logic, etc.)
 * 6. Consider the trade-off between accuracy improvement and API costs
 * 7. For production, you may want to set a minimum confidence threshold
 * 8. Extract answers consistently - use regex patterns or structured output formats
 * 9. Monitor the distribution of answers to detect systematic errors
 * 10. Combine with other techniques (chain-of-thought, few-shot learning) for best results
 */

main().catch(console.error);

