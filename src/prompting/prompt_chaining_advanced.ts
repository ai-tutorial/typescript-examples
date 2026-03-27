/**
 * Prompt Chaining Advanced (Module 1)
 *
 * Costs & Safety: Multiple calls; keep prompts minimal.
 * Module reference: [Prompt Chaining: Breaking Complex Tasks](https://aitutorial.dev/context-engineering-prompt-design/advanced-techniques#prompt-chaining-breaking-complex-tasks)
 * Why: Break complex tasks into simple steps; retry and evaluate independently.
 *
 * Chain steps: classify → extract → (optional) search → respond
 */

import { generateText } from 'ai';
import { createModel } from './utils.js';

const model = createModel();

/**
 * Demonstrates the prompt chaining approach with multiple LLM calls.
 *
 * This example shows how to chain steps: classify → extract → respond,
 * where each step can be retried independently. The retry variant adds
 * resilience for production use cases.
 *
 * Note: Each chain step has a single responsibility, making it easy to
 * debug, test, and modify individual steps without affecting others.
 */
async function main(): Promise<void> {
    // Step 1: Run basic prompt chain examples
    console.log('=== Prompt Chaining Examples ===');
    console.log('')
    console.log('--- Example 1: Complaint ---');
    await promptChain("I'm frustrated that my order hasn't arrived yet. It's been 2 weeks!");

    console.log('--- Example 2: Question ---');
    await promptChain("What's your return policy for electronics?");

    console.log('--- Example 3: Request ---');
    await promptChain("Can you help me reset my password? I forgot it.");

    // Step 2: Run prompt chain with retry logic
    console.log('--- Example 4: Urgent Request (with Retry Logic) ---');
    await promptChainWithRetry("I need urgent help with my account - it's been locked!");

    console.log('')
    console.log('=== All examples completed! ===');
}

/**
 * Step 1: Classify the user's intent
 *
 * This first step determines what type of request the user is making.
 * By separating classification from processing, we can:
 * - Handle different request types with specialized prompts
 * - Retry classification independently if it fails
 * - Route to appropriate handlers based on classification
 */
async function classifyIntent(userMessage: string): Promise<string> {
    const classificationPrompt = `Classify the following user message into one of these categories:
- question: User is asking a question
- request: User is making a request (e.g., "do this", "help me with")
- complaint: User is expressing dissatisfaction
- feedback: User is providing feedback (positive or negative)
- other: Anything else

User message: "${userMessage}"

Respond with ONLY the category name (question, request, complaint, feedback, or other):`;

    console.log(`  Input: "${userMessage}"`);

    const response = await generateText({
        model,
        messages: [
            { role: 'user', content: classificationPrompt },
        ],
    });

    const category = (response.text || 'other').trim().toLowerCase();
    console.log(`  Classification: ${category}`);
    return category;
}

/**
 * Step 2: Extract key information from the user's message
 *
 * Once we know the intent, we extract relevant information.
 * This separation allows us to:
 * - Validate extracted information independently
 * - Handle extraction errors separately from classification
 * - Use different extraction strategies for different intents
 */
async function extractInformation(userMessage: string, intent: string): Promise<Record<string, string>> {
    const extractionPrompt = `Extract key information from the following user message.
Intent category: ${intent}

User message: "${userMessage}"

Extract and return a JSON object with the following structure:
{
  "mainTopic": "the main subject or topic",
  "urgency": "low, medium, or high",
  "keyDetails": "any important details mentioned"
}

Respond with ONLY valid JSON, no additional text:`;

    const response = await generateText({
        model,
        messages: [
            { role: 'user', content: extractionPrompt },
        ],
    });

    const content = response.text || '{}';
    try {
        const extracted = JSON.parse(content) as Record<string, string>;
        console.log(`  Extracted: ${JSON.stringify(extracted, null, 2)}`);
        return extracted;
    } catch (error) {
        console.error('  Error parsing extraction result:', error);
        const fallback = {
            mainTopic: 'unknown',
            urgency: 'medium',
            keyDetails: userMessage,
        };
        return fallback;
    }
}

/**
 * Step 3: Generate a response based on classification and extracted information
 *
 * The final step uses the results from previous steps to generate an appropriate response.
 * This approach:
 * - Ensures responses are tailored to the specific intent
 * - Uses extracted information to provide relevant details
 * - Can be retried independently if the response quality is poor
 */
async function generateResponse(
    userMessage: string,
    intent: string,
    extractedInfo: Record<string, string>
): Promise<string> {
    const responsePrompt = `You are a helpful assistant. Generate an appropriate response based on the following information:

Intent: ${intent}
Main Topic: ${extractedInfo.mainTopic || 'not specified'}
Urgency: ${extractedInfo.urgency || 'medium'}
Key Details: ${extractedInfo.keyDetails || 'none'}

Original user message: "${userMessage}"

Generate a helpful, concise response (2-3 sentences) that:
- Acknowledges the user's ${intent}
- Addresses the main topic: ${extractedInfo.mainTopic || 'their message'}
- Matches the urgency level: ${extractedInfo.urgency || 'medium'}
- Incorporates the key details: ${extractedInfo.keyDetails || 'provided information'}

Response:`;

    const response = await generateText({
        model,
        messages: [
            { role: 'user', content: responsePrompt },
        ],
    });

    const result = response.text || 'I apologize, but I was unable to generate a response.';
    console.log(`  Response: ${result}`);
    return result;
}

/**
 * Orchestrates the chain of LLM calls: classify → extract → respond.
 *
 * Each step can be retried independently, and errors in one step
 * don't necessarily break the entire chain.
 */
async function promptChain(userMessage: string): Promise<void> {
    console.log('')
    console.log(`User Message: ${userMessage}`);
    console.log('--- Step 1: Classify Intent ---');
    const intent = await classifyIntent(userMessage);

    console.log('--- Step 2: Extract Information ---');
    const extractedInfo = await extractInformation(userMessage, intent);

    console.log('--- Step 3: Generate Response ---');
    await generateResponse(userMessage, intent, extractedInfo);
    console.log('');
}

/**
 * Prompt chaining with retry logic for each step.
 *
 * In production, each step should handle failures gracefully.
 * This variant retries each step independently with fallback values.
 */
async function promptChainWithRetry(
    userMessage: string,
    maxRetries: number = 2
): Promise<void> {
    console.log('')
    console.log(`User Message: ${userMessage}`);

    // Step 1: Classify (with retry)
    let intent = 'other';
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            intent = await classifyIntent(userMessage);
            if (intent && intent !== 'other') {
                break;
            }
        } catch (error) {
            console.error(`  Classification attempt ${attempt + 1} failed:`, error);
            if (attempt === maxRetries - 1) {
                intent = 'other';
            }
        }
    }

    // Step 2: Extract (with retry)
    let extractedInfo: Record<string, string> = {
        mainTopic: 'unknown',
        urgency: 'medium',
        keyDetails: userMessage,
    };
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            extractedInfo = await extractInformation(userMessage, intent);
            if (extractedInfo.mainTopic && extractedInfo.mainTopic !== 'unknown') {
                break;
            }
        } catch (error) {
            console.error(`  Extraction attempt ${attempt + 1} failed:`, error);
        }
    }

    // Step 3: Generate response (with retry)
    let response = 'I apologize, but I was unable to generate a response.';
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            response = await generateResponse(userMessage, intent, extractedInfo);
            if (response && response.length > 10) {
                break;
            }
        } catch (error) {
            console.error(`  Response generation attempt ${attempt + 1} failed:`, error);
        }
    }
    console.log('');
}

// Run the main function
await main();
