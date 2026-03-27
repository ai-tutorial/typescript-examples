import { initChatModel } from 'langchain';
import { config } from 'dotenv';
import { join } from 'path';

// Load environment variables from env/.env file
config({ path: join(process.cwd(), 'env', '.env'), quiet: true });

type Provider = 'openai' | 'gemini';

const modelIds: Record<Provider, string> = {
    openai: `openai:${process.env.OPENAI_MODEL || 'gpt-4.1-nano'}`,
    gemini: `google-genai:${process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite'}`,
};

export async function createModel(provider?: Provider) {
    const selected = provider ?? (process.env.AI_PROVIDER as Provider) ?? 'openai';
    return initChatModel(modelIds[selected]);
}
