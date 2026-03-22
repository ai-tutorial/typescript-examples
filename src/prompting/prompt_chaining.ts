/**
 * Prompt Chaining (Module 1)
 *
 * Costs & Safety: Multiple calls; keep prompts minimal.
 * Module reference: [Prompt Chaining: Breaking Complex Tasks](https://aitutorial.dev/context-engineering-prompt-design/advanced-techniques#prompt-chaining-breaking-complex-tasks)
 * Why: Break complex tasks into simple steps; retry and evaluate independently.
 *
 * Chain steps: classify → extract → respond
 */

import { generateText } from 'ai';
import { createModel } from './utils.js';

/**
 * Step 1: Classify the user's intent.
 * Separating classification from processing lets us retry independently
 * and route to specialized handlers.
 */
async function classifyIntent(model: ReturnType<typeof createModel>, userMessage: string): Promise<string> {
    console.log('--- Step 1: Classify Intent ---');
    console.log(`User Message: ${userMessage}`);

    const { text } = await generateText({
        model,
        messages: [
            { role: 'user', content: `Classify the following user message into one of these categories:
    - question: User is asking a question
    - request: User is making a request (e.g., "do this", "help me with")
    - complaint: User is expressing dissatisfaction
    - feedback: User is providing feedback (positive or negative)
    - other: Anything else

    User message: "${userMessage}"

    Respond with ONLY the category name (question, request, complaint, feedback, or other):` },
        ],
    });

    const category = (text || 'other').trim().toLowerCase();
    console.log(`Intent: ${category}`);
    return category;
}

/**
 * Step 2: Extract key information from the user's message.
 * Once we know the intent, we extract relevant details separately
 * so extraction errors don't affect classification.
 */
async function extractInformation(model: ReturnType<typeof createModel>, userMessage: string, intent: string): Promise<Record<string, string>> {
    console.log('--- Step 2: Extract Information ---');
    console.log(`Intent: ${intent}`);

    const { text } = await generateText({
        model,
        messages: [
            { role: 'user', content: `Extract key information from the following user message.
    Intent category: ${intent}

    User message: "${userMessage}"

    Extract and return a JSON object with the following structure:
    {
      "mainTopic": "the main subject or topic",
      "urgency": "low, medium, or high",
      "keyDetails": "any important details mentioned"
    }

    Respond with ONLY valid JSON, no additional text:` },
        ],
    });

    try {
        const extracted = JSON.parse(text || '{}') as Record<string, string>;
        console.log(`Extracted Information: ${JSON.stringify(extracted, null, 2)}`);
        return extracted;
    } catch {
        const fallback = { mainTopic: 'unknown', urgency: 'medium', keyDetails: userMessage };
        console.log(`Extracted Information: ${JSON.stringify(fallback, null, 2)}`);
        return fallback;
    }
}

/**
 * Step 3: Generate a response based on classification and extracted information.
 * Uses results from previous steps to produce a tailored response
 * that can be retried independently if quality is poor.
 */
async function generateResponse(
    model: ReturnType<typeof createModel>,
    userMessage: string,
    intent: string,
    extractedInfo: Record<string, string>
): Promise<void> {
    console.log('--- Step 3: Generate Response ---');

    const { text } = await generateText({
        model,
        messages: [
            { role: 'user', content: `You are a helpful assistant. Generate an appropriate response based on the following information:

    Intent: ${intent}
    Main Topic: ${extractedInfo.mainTopic || 'not specified'}
    Urgency: ${extractedInfo.urgency || 'medium'}
    Key Details: ${extractedInfo.keyDetails || 'none'}

    Original user message: "${userMessage}"

    Generate a helpful, concise response (2-3 sentences) that:
    - Acknowledges the user's ${intent}
    - Addresses the main topic: ${extractedInfo.mainTopic || 'their message'}
    - Matches the urgency level: ${extractedInfo.urgency || 'medium'}

    Response:` },
        ],
    });

    console.log(`Response: ${text}`);
}

/**
 * Main function that demonstrates the prompt chaining approach
 *
 * This example shows how to chain multiple LLM calls to break complex tasks into simple steps.
 *
 * This approach breaks complex tasks into simple steps that can be retried and evaluated independently.
 */
async function main(): Promise<void> {
    const model = createModel();
    const userMessage = "I'm frustrated that my order hasn't arrived yet. It's been 2 weeks!";

    // Step 1: Classify the user's intent
    const intent = await classifyIntent(model, userMessage);

    // Step 2: Extract relevant information from the message
    const extractedInfo = await extractInformation(model, userMessage, intent);

    // Step 3: Generate an appropriate response
    await generateResponse(model, userMessage, intent, extractedInfo);
}

await main();
