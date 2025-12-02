// Import the OpenAI SDK - this gives us access to OpenAI's API
import OpenAI from 'openai';
import { config } from 'dotenv';
import { join } from 'path';

// Load environment variables from env/.env file
// This is where your OPENAI_API_KEY is stored. 
config({ path: join(process.cwd(), 'env', '.env') });

// Create an OpenAI client instance
// This is your connection to OpenAI's API - it handles authentication and requests
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Your API key from the .env file
});

// Make a request to the chat completions API
// This is where the magic happens - you send a message and get a response
const response = await client.chat.completions.create({

  model: 'gpt-4o-mini',  // Which model to use: gpt-4o-mini is fast and cost-effective (recommended for learning)
  
  // Messages array: this is the conversation history
  // Each message has a role (user, assistant, or system) and content
  messages: [
    { 
      role: 'user',           // This is a message from the user (you)
      content: 'Say hello in 3 words.' // The actual text you're sending
    }
  ],
});

// Extract and print the response
// The response contains an array of choices, we take the first one
// Each choice has a message with the content (the AI's response)
console.log(response.choices[0].message.content);
