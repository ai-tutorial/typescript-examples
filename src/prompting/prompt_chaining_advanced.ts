/**
 * Prompt Chaining Advanced (Module 1)
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
const MODEL = process.env.OPENAI_MODEL!;

const client: OpenAI = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Main function that demonstrates the prompt chaining approach
 * 
 * Runs examples showing how to chain multiple LLM calls: classify → extract → respond
 */
async function main(): Promise<void> {
    console.log('=== Prompt Chaining Examples ===\n');
    
    console.log('--- Example 1: Complaint ---');
    await promptChain("I'm frustrated that my order hasn't arrived yet. It's been 2 weeks!");
    
    console.log('--- Example 2: Question ---');
    await promptChain("What's your return policy for electronics?");
    
    console.log('--- Example 3: Request ---');
    await promptChain("Can you help me reset my password? I forgot it.");
    
    console.log('--- Example 4: Urgent Request (with Retry Logic) ---');
    await promptChainWithRetry("I need urgent help with my account - it's been locked!");
    
    console.log('\n=== All examples completed! ===\n');
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

/**
 * Main prompt chaining function
 * 
 * This orchestrates the chain of LLM calls:
 * 1. Classify the intent
 * 2. Extract relevant information
 * 3. Generate an appropriate response
 * 
 * Each step can be retried independently, and errors in one step
 * don't necessarily break the entire chain.
 */
async function promptChain(userMessage: string): Promise<void> {
    console.log('\n--- Prompt Chaining Demo ---');
    console.log('User Message:', userMessage);
    console.log('--- Step 1: Classify Intent ---');
    
    // Step 1: Classify
    const intent = await classifyIntent(userMessage);
    console.log('Intent:', intent);
    
    console.log('--- Step 2: Extract Information ---');
    // Step 2: Extract
    const extractedInfo = await extractInformation(userMessage, intent);
    console.log('Extracted Information:', JSON.stringify(extractedInfo, null, 2));
    
    console.log('--- Step 3: Generate Response ---');
    // Step 3: Respond
    const response = await generateResponse(userMessage, intent, extractedInfo);
    console.log('Response:', response);
    console.log('');
}

/**
 * Example with error handling and retry logic
 * 
 * In production, you'd want to add retry logic for each step.
 * This example shows how you might structure that.
 */
async function promptChainWithRetry(
    userMessage: string,
    maxRetries: number = 2
): Promise<void> {
    console.log('\n--- Prompt Chaining with Retry Logic ---');
    console.log('User Message:', userMessage);
    
    // Step 1: Classify (with retry)
    let intent = 'other';
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            intent = await classifyIntent(userMessage);
            if (intent && intent !== 'other') {
                break; // Success
            }
        } catch (error) {
            console.error(`Classification attempt ${attempt + 1} failed:`, error);
            if (attempt === maxRetries - 1) {
                intent = 'other'; // Fallback
            }
        }
    }
    console.log('Intent:', intent);
    
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
                break; // Success
            }
        } catch (error) {
            console.error(`Extraction attempt ${attempt + 1} failed:`, error);
        }
    }
    console.log('Extracted Information:', JSON.stringify(extractedInfo, null, 2));
    
    // Step 3: Generate response (with retry)
    let response = 'I apologize, but I was unable to generate a response.';
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            response = await generateResponse(userMessage, intent, extractedInfo);
            if (response && response.length > 10) {
                break; // Success
            }
        } catch (error) {
            console.error(`Response generation attempt ${attempt + 1} failed:`, error);
        }
    }
    console.log('Response:', response);
    console.log('');
}

/**
 * Production notes:
 * 
 * 1. **Separation of Concerns**: Each step has a single, clear responsibility
 *    - Classification: Determine intent
 *    - Extraction: Pull out relevant data
 *    - Generation: Create the response
 * 
 * 2. **Error Handling**: Each step can fail independently
 *    - If classification fails, use a default category
 *    - If extraction fails, use the original message
 *    - If generation fails, provide a fallback response
 * 
 * 3. **Retry Logic**: Implement retries at each step level
 *    - Retry classification if it returns invalid categories
 *    - Retry extraction if JSON parsing fails
 *    - Retry generation if response is too short or empty
 * 
 * 4. **Cost Optimization**: 
 *    - Keep prompts minimal and focused
 *    - Use lower temperature for classification/extraction (0.1-0.2)
 *    - Use higher temperature for generation (0.7)
 *    - Cache classification results when possible
 * 
 * 5. **Performance**: 
 *    - Consider parallelizing independent steps when possible
 *    - Monitor latency at each step
 *    - Set timeouts for each API call
 * 
 * 6. **Testing**: 
 *    - Test each step independently
 *    - Test the full chain with various inputs
 *    - Test error scenarios (API failures, invalid responses)
 * 
 * 7. **Monitoring**: 
 *    - Log each step's input/output
 *    - Track success rates per step
 *    - Monitor costs per step
 *    - Alert on high failure rates
 * 
 * 8. **Flexibility**: 
 *    - Easy to add new steps (e.g., search, validation)
 *    - Easy to modify individual steps without affecting others
 *    - Easy to swap models for different steps
 * 
 * 9. **Debugging**: 
 *    - Each step's output is inspectable
 *    - Can debug individual steps in isolation
 *    - Can replay specific steps with saved inputs
 * 
 * 10. **Scalability**: 
 *     - Steps can be moved to separate services/microservices
 *     - Can implement caching at each step
 *     - Can add rate limiting per step
 */

// Run the main function
await main();

