/**
 * Cross-Encoder Reranking
 *
 * Costs & Safety: Real API calls; keep inputs small. Requires API key(s).
 * Module reference: [Reranking](https://aitutorial.dev/rag/reranking#minimal-rerank-pipeline)
 * Why: Reranking significantly increases RAG precision by rescoring top candidates with more computationally expensive methods after a fast first-pass retrieval.
 */

import { embed, generateText } from 'ai';
import { createModel, createEmbeddingModel } from './utils.js';
import { readFileSync } from 'fs';
import { join } from 'path';
import { LexicalRetriever } from './utils/lexical_retriever';
import { SemanticRetriever } from './utils/semantic_retriever';

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
 * Perform hybrid search combining lexical and semantic search with RRF fusion
 */
async function performHybridSearch(query: string, docs: string[]): Promise<Array<{ docIdx: number; document: string }>> {
    const bm25Results = await (await LexicalRetriever.create(docs, 20)).searchIndexes(query, 20);
    console.log('Performing semantic (vector) search with SemanticRetriever...');
    const semanticResults = await (await SemanticRetriever.create(docs, 20)).searchIndexes(query, 20);

    const fusedResults = reciprocalRankFusion([bm25Results, semanticResults]);

    return fusedResults.slice(0, 15).map(idx => ({
        docIdx: idx,
        document: docs[idx],
    }));
}

/**
 * Rerank candidates using embeddings with detailed similarity scoring
 */
async function rerankWithCrossEncoder(
    query: string,
    candidates: Array<{ docIdx: number; document: string }>
): Promise<Array<{ docIdx: number; document: string; rerankScore: number }>> {
    console.log('Reranking with detailed similarity scoring...');
    const embeddingModel = createEmbeddingModel();

    const embeddingPromises = candidates.map(async (candidate) => {
        const combinedText = `Query: ${query}\n\nDocument: ${candidate.document}`;
        const { embedding } = await embed({ model: embeddingModel, value: combinedText });
        return embedding;
    });

    const { embedding: queryEmbedding } = await embed({ model: embeddingModel, value: query });

    const combinedEmbeddings = await Promise.all(embeddingPromises);

    const scoredCandidates = candidates.map((candidate, idx) => ({
        ...candidate,
        rerankScore: cosineSimilarity(queryEmbedding, combinedEmbeddings[idx]),
    }));

    return scoredCandidates.sort((a, b) => b.rerankScore - a.rerankScore);
}

/**
 * Generate final answer using top reranked documents
 */
async function generateAnswer(
    model: ReturnType<typeof createModel>,
    query: string,
    topDocs: Array<{ document: string }>
): Promise<void> {
    const context = topDocs.map(d => d.document).join('\n\n');

    console.log('Generating answer with LLM...');
    console.log('');

    const { text } = await generateText({
        model,
        messages: [
            {
                role: 'system',
                content: 'Answer strictly from the provided context. Be specific and cite examples.',
            },
            {
                role: 'user',
                content: `Context:\n${context}\n\nQuestion: ${query}`,
            },
        ],
    });

    console.log('=== FINAL ANSWER ===');
    console.log(`${text}`);
}

/**
 * Main function that demonstrates cross-encoder reranking in a RAG pipeline
 *
 * This example shows how to implement a complete reranking workflow:
 * retrieve candidates using fast methods, merge with RRF, rerank with a cross-encoder, then generate.
 *
 * This two-stage approach balances speed (fast retrieval) with accuracy (precise reranking).
 */
async function main(): Promise<void> {
    const model = createModel();

    // Step 1: Load and prepare documents
    const essayPath = join(process.cwd(), 'assets', 'paul_graham_essay.txt');
    const essayText = readFileSync(essayPath, 'utf-8');
    const docs = essayText.split('\n\n').filter(p => p.trim().length > 0);

    console.log(`Loaded ${docs.length} document chunks`);
    console.log('');

    // Step 2: Define query
    const query = `How did Paul Graham's experiences with both "low end eats high end" products
                    and working on unprestigious projects influence his decisions when founding Y Combinator?
                    Include specific examples of what he learned at Interleaf about software markets,
                    how this connected to Viaweb's strategy, and explain the batch model concept he
                    discovered "by accident" and why it worked better than traditional VC approaches.`;

    console.log('Query:');
    console.log(`${query}`);
    console.log('');

    // Step 3: Hybrid retrieval (lexical + semantic)
    const hybridResults = await performHybridSearch(query, docs);
    console.log(`Retrieved ${hybridResults.length} candidates via hybrid search`);
    console.log('');

    // Step 4: Rerank with cross-encoder
    const rerankedResults = await rerankWithCrossEncoder(query, hybridResults);
    console.log('Top 3 after cross-encoder reranking:');
    rerankedResults.slice(0, 3).forEach((result, i) => {
        console.log(`${i + 1}. Doc ${result.docIdx} (score: ${result.rerankScore.toFixed(3)})`);
        console.log(`   ${result.document.substring(0, 100)}...`);
    });
    console.log('');

    // Step 5: Generate answer with top results
    await generateAnswer(model, query, rerankedResults.slice(0, 5));
}

await main();
