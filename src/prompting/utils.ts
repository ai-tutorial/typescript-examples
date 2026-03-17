import { openai } from '@ai-sdk/openai';
import { google } from '@ai-sdk/google';
import { config } from 'dotenv';
import { join } from 'path';

// Load environment variables from env/.env file
config({ path: join(process.cwd(), 'env', '.env') });

const models = {
    openai: openai('gpt-4o-mini'),
    gemini: google('gemini-2.0-flash'),
};

export type Provider = keyof typeof models;

export function createModel(provider?: Provider) {
    const selected = provider ?? (process.env.AI_PROVIDER as Provider) ?? 'openai';
    return models[selected];
}
