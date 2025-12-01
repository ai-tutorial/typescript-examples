import OpenAI from 'openai';
import { config } from 'dotenv';
import { join } from 'path';

// Load environment variables from env/.env
config({ path: join(process.cwd(), 'env', '.env') });

async function main() {
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY, // set your key in env
  });

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini', // or any model you want
    messages: [{ role: 'user', content: 'Say hello in 3 words.' }],
  });

  console.log(response.choices[0].message.content);
}

main();
