/**
 * Prompt Chaining (Module 1)
 * 
 * Costs & Safety: Multiple calls; keep prompts minimal.
 * Module reference: [Prompt Chaining: Breaking Complex Tasks](https://aitutorial.dev/context-engineering-prompt-design/advanced-techniques#prompt-chaining-breaking-complex-tasks)
 * Why: Break complex tasks into simple steps; retry and evaluate independently.
 * 
 * Chain steps: classify → extract → (optional) search → respond
 */

import OpenAI from 'openai';
import { config } from 'dotenv';
import { join } from 'path';

// Load environment variables from env/.env
config({ path: join(process.cwd(), 'env', '.env') });

// Setup
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

const client: OpenAI = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Main function that demonstrates the prompt chaining approach
 * 
 * This example shows how to chain multiple LLM calls:
 * 1. Classify the user's intent
 * 2. Extract relevant information from the message
 * 3. Generate an appropriate response using the classified intent and extracted information
 * 
 * This approach breaks complex tasks into simple steps that can be retried and evaluated independently.
 */
async function main(): Promise<void> {
    console.log('=== Prompt Chaining Example ===\n');
    
    const userMessage = "I'm frustrated that my order hasn't arrived yet. It's been 2 weeks!";
    console.log('User Message:', userMessage);
    console.log('--- Step 1: Classify Intent ---');
    
    const intent = await classifyIntent(userMessage);
    console.log('Intent:', intent);
    
    console.log('--- Step 2: Extract Information ---');
    const extractedInfo = await extractInformation(userMessage, intent);
    console.log('Extracted Information:', JSON.stringify(extractedInfo, null, 2));
    
    console.log('--- Step 3: Generate Response ---');
    const response = await generateResponse(userMessage, intent, extractedInfo);
    console.log('Response:', response);
    console.log('');
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

    const response = await client.chat.completions.create({
        model: MODEL,
        messages: [
            { role: 'user', content: classificationPrompt }
        ],
        temperature: 0.1, // Low temperature for consistent classification
    });

    const category = (response.choices[0].message.content || 'other').trim().toLowerCase();
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

    const response = await client.chat.completions.create({
        model: MODEL,
        messages: [
            { role: 'user', content: extractionPrompt }
        ],
        temperature: 0.2,
        response_format: { type: 'json_object' },
    });

    const content = response.choices[0].message.content || '{}';
    try {
        const extracted = JSON.parse(content) as Record<string, string>;
        return extracted;
    } catch (error) {
        console.error('Error parsing extraction result:', error);
        return {
            mainTopic: 'unknown',
            urgency: 'medium',
            keyDetails: userMessage,
        };
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

    const response = await client.chat.completions.create({
        model: MODEL,
        messages: [
            { role: 'user', content: responsePrompt }
        ],
        temperature: 0.7,
    });

    return response.choices[0].message.content || 'I apologize, but I was unable to generate a response.';
}


await main();

