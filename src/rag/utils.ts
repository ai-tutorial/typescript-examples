import { openai } from '@ai-sdk/openai';
import { google } from '@ai-sdk/google';
import { config } from 'dotenv';
import { join } from 'path';

// Load environment variables from env/.env file
config({ path: join(process.cwd(), 'env', '.env'), quiet: true });

const models = {
    openai: openai(process.env.OPENAI_MODEL || 'gpt-4.1-nano'),
    gemini: google(process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite'),
};

const embeddingModels = {
    openai: openai.embedding(process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small'),
    gemini: google.embedding(process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-001'),
};

export type Provider = keyof typeof models;

export function createModel(provider?: Provider) {
    const selected = provider ?? (process.env.AI_PROVIDER as Provider) ?? 'openai';
    return models[selected];
}

export function createEmbeddingModel(provider?: Provider) {
    const selected = provider ?? (process.env.AI_PROVIDER as Provider) ?? 'openai';
    return embeddingModels[selected];
}
