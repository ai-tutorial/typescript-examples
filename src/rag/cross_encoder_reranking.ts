/**
 * Costs & Safety: Real OpenAI API calls; keep inputs small. Requires OPENAI_API_KEY.
 * Module reference: [Reranking](https://aitutorial.dev/rag/reranking#minimal-rerank-pipeline)
 * Why: Reranking significantly increases RAG precision by rescoring top candidates with more computationally expensive methods after a fast first-pass retrieval.
 */

import OpenAI from 'openai';
import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { LexicalRetriever } from './utils/lexical_retriever';
import { SemanticRetriever } from './utils/semantic_retriever';

// Load environment variables
config({ path: join(process.cwd(), 'env', '.env') });

const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const openai = new OpenAI();

/**
 * Main function that demonstrates cross-encoder reranking in a RAG pipeline
 * 
 * This example shows how to implement a complete reranking workflow:
 * 1. Retrieve candidates using fast methods (lexical + semantic search)
 * 2. Merge results using Reciprocal Rank Fusion (RRF)
 * 3. Rerank with a cross-encoder for precision
 * 4. Generate final answer with top results
 * 
 * This two-stage approach balances speed (fast retrieval) with accuracy (precise reranking).
 */
async function main(): Promise<void> {
    // Step 1: Load and prepare documents
    const docs = loadDocuments();

    // Step 2: Define query
    const query = `How did Paul Graham's experiences with both "low end eats high end" products
                    and working on unprestigious projects influence his decisions when founding Y Combinator?
                    Include specific examples of what he learned at Interleaf about software markets,
                    how this connected to Viaweb's strategy, and explain the batch model concept he
                    discovered "by accident" and why it worked better than traditional VC approaches.`;

    console.log(`Query:`);
    console.log(`${query}`);
    console.log(``);

    // Step 3: Hybrid retrieval (lexical + semantic)
    const hybridResults = await performHybridSearch(query, docs);
    console.log(`Retrieved ${hybridResults.length} candidates via hybrid search`);
    console.log(``);

    // Step 4: Rerank with cross-encoder
    const rerankedResults = await rerankWithCrossEncoder(query, hybridResults);
    console.log(`Top 3 after cross-encoder reranking:`);
    rerankedResults.slice(0, 3).forEach((result, i) => {
        console.log(`${i + 1}. Doc ${result.docIdx} (score: ${result.rerankScore.toFixed(3)})`);
        console.log(`   ${result.document.substring(0, 100)}...`);
    });
    console.log(``);

    // Step 5: Generate answer with top results
    await generateAnswer(query, rerankedResults.slice(0, 5));
}

/**
 * Load and prepare documents from the assets directory
 */
function loadDocuments(): string[] {
    const essayPath = join(process.cwd(), 'assets', 'paul_graham_essay.txt');
    const essayText = readFileSync(essayPath, 'utf-8');
    const docs = essayText.split('\n\n').filter(p => p.trim().length > 0);

    console.log(`Loaded ${docs.length} document chunks`);
    console.log('');

    return docs;
}

/**
 * Perform hybrid search combining lexical (keyword) and semantic (vector) search with RRF fusion
 */
async function performHybridSearch(query: string, docs: string[]): Promise<Array<{ docIdx: number; document: string }>> {
    // BM25 search via LlamaIndex retriever
    const bm25Results = await performBM25Search(query, docs, 20);

    // Semantic search
    const semanticResults = await performSemanticSearch(query, docs, 20);

    // Merge with Reciprocal Rank Fusion
    const fusedResults = reciprocalRankFusion([bm25Results, semanticResults]);

    return fusedResults.slice(0, 15).map(idx => ({
        docIdx: idx,
        document: docs[idx]
    }));
}

/**
 * Lexical (keyword) search using the BM25 algorithm
 */
async function performBM25Search(query: string, docs: string[], topK: number): Promise<number[]> {
    const retriever = await LexicalRetriever.create(docs, topK);
    return retriever.searchIndexes(query, topK);
}

/**
 * Semantic (vector) search using embeddings
 */
async function performSemanticSearch(query: string, docs: string[], topK: number): Promise<number[]> {
    console.log('Performing semantic (vector) search with SemanticRetriever...');
    const retriever = await SemanticRetriever.create(docs, topK);
    return retriever.searchIndexes(query, topK);
}


/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(a: number[], b: number[]): number {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    return dotProduct / (magnitudeA * magnitudeB);
}

/**
 * Reciprocal Rank Fusion to merge multiple rankings
 */
function reciprocalRankFusion(rankings: number[][], k: number = 60): number[] {
    const fusedScores: Map<number, number> = new Map();

    for (const ranking of rankings) {
        ranking.forEach((docIdx, rank) => {
            const currentScore = fusedScores.get(docIdx) || 0;
            fusedScores.set(docIdx, currentScore + 1 / (k + rank + 1));
        });
    }

    return Array.from(fusedScores.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([idx]) => idx);
}

/**
 * Rerank candidates using OpenAI embeddings with detailed similarity scoring
 * 
 * This approach uses a more detailed prompt to get better relevance scores
 * compared to simple cosine similarity used in first-pass retrieval.
 */
async function rerankWithCrossEncoder(
    query: string,
    candidates: Array<{ docIdx: number; document: string }>
): Promise<Array<{ docIdx: number; document: string; rerankScore: number }>> {
    console.log('Reranking with detailed similarity scoring...');

    // Get fresh embeddings with a reranking-focused approach
    // We embed query + document together for better context
    const embeddingPromises = candidates.map(async (candidate) => {
        const combinedText = `Query: ${query}\n\nDocument: ${candidate.document}`;
        const response = await openai.embeddings.create({
            model: 'text-embedding-3-small',
            input: combinedText,
        });
        return response.data[0].embedding;
    });

    const queryResponse = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: query,
    });
    const queryEmbedding = queryResponse.data[0].embedding;

    const combinedEmbeddings = await Promise.all(embeddingPromises);

    // Score based on similarity between query and combined context
    const scoredCandidates = candidates.map((candidate, idx) => {
        const rerankScore = cosineSimilarity(queryEmbedding, combinedEmbeddings[idx]);
        return {
            ...candidate,
            rerankScore
        };
    });

    // Sort by rerank score
    return scoredCandidates.sort((a, b) => b.rerankScore - a.rerankScore);
}

/**
 * Generate final answer using top reranked documents
 */
async function generateAnswer(
    query: string,
    topDocs: Array<{ document: string }>
): Promise<void> {
    const context = topDocs.map(d => d.document).join(`\n\n`);

    console.log(`Generating answer with LLM...`);
    console.log(``);

    const response = await openai.chat.completions.create({
        model: MODEL,
        messages: [
            {
                role: `system`,
                content: `Answer strictly from the provided context. Be specific and cite examples.`
            },
            {
                role: `user`,
                content: `Context:\n${context}\n\nQuestion: ${query}`
            }
        ]
    });

    console.log(`=== FINAL ANSWER ===`);
    console.log(`${response.choices[0].message.content}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    main().catch(console.error);
}
