/**
 * GraphRAG: Knowledge Graphs + RAG
 *
 * Costs & Safety: Real API calls; small graph keeps costs low. Requires API key(s).
 * Module reference: [Advanced RAG Patterns](https://aitutorial.dev/rag/advanced-rag-patterns#pattern-1-graphrag-knowledge-graphs-rag)
 * Why: Demonstrates how to use a Knowledge Graph to perform multi-hop retrieval, finding connections between entities that simple vector search might miss.
 */

import { generateText } from 'ai';
import { createModel } from './utils.js';

/**
 * Minimal Graph implementation to avoid extra dependencies.
 */
class Graph {
    edges: Map<string, Array<{ target: string; data: any }>> = new Map();
    private nodes: Map<string, any> = new Map();

    setEdge(source: string, target: string, data: any): void {
        if (!this.edges.has(source)) this.edges.set(source, []);
        this.edges.get(source)?.push({ target, data });
        if (!this.nodes.has(source)) this.nodes.set(source, {});
        if (!this.nodes.has(target)) this.nodes.set(target, {});
    }

    setNode(id: string, data: any): void {
        this.nodes.set(id, data);
    }

    hasNode(id: string): boolean {
        return this.nodes.has(id);
    }

    node(id: string): any {
        return this.nodes.get(id);
    }
}

/**
 * Graph-guided retrieval: walk the knowledge graph to find relevant documents
 */
function graphGuidedRetrieval(
    kg: Graph,
    docs: Map<string, string>,
    entities: string[]
): string[] {
    console.log('  -> Walking graph nodes...');
    const relevantNodes = new Set(entities);

    // Build reverse index for bidirectional traversal
    const reverseEdges: Record<string, string[]> = {};
    for (const [source, targets] of kg.edges.entries()) {
        for (const edge of targets) {
            if (!reverseEdges[edge.target]) reverseEdges[edge.target] = [];
            reverseEdges[edge.target].push(source);
        }
    }

    for (const entity of entities) {
        const connectedPeople = reverseEdges[entity] || [];
        connectedPeople.forEach(p => relevantNodes.add(p));
    }

    console.log(`  -> Found relevant nodes: ${Array.from(relevantNodes).join(', ')}`);

    const docIds = new Set<string>();
    for (const node of relevantNodes) {
        const nodeData = kg.node(node);
        if (nodeData?.document_ids) {
            for (const docId of nodeData.document_ids) {
                docIds.add(docId);
            }
        }
    }

    return Array.from(docIds);
}

/**
 * Main function demonstrating GraphRAG
 *
 * This example shows how to use a Knowledge Graph to perform multi-hop retrieval,
 * finding connections between entities that simple vector search might miss.
 *
 * The graph-guided approach retrieves documents by traversing entity relationships.
 */
async function main(): Promise<void> {
    const model = createModel();

    console.log('--- GraphRAG Example ---');

    // Step 1: Setup Knowledge Graph
    const kg = new Graph();
    kg.setEdge('Alice', 'Project X', { type: 'works_on' });
    kg.setEdge('Bob', 'Project X', { type: 'works_on' });
    kg.setEdge('Alice', 'Project Y', { type: 'works_on' });

    kg.setNode('Alice', { document_ids: ['doc_1'] });
    kg.setNode('Project X', { document_ids: ['doc_2', 'doc_3'] });
    kg.setNode('Project Y', { document_ids: ['doc_4'] });
    kg.setNode('Bob', { document_ids: ['doc_5'] });

    // Step 2: Setup Document Store
    const documentStore = new Map<string, string>([
        ['doc_1', 'Alice is a senior engineer.'],
        ['doc_2', 'Project X is a new mobile app.'],
        ['doc_3', 'Project X deadline is Q4.'],
        ['doc_4', 'Project Y is a backend migration.'],
        ['doc_5', 'Bob is a junior developer.'],
    ]);

    // Step 3: Query
    const question = 'Who worked on both Project X and Project Y?';
    const entities = ['Project X', 'Project Y'];

    console.log(`Question: "${question}"`);
    console.log(`Entities (extracted): ${JSON.stringify(entities)}`);
    console.log('\nQuerying...');

    // Step 4: Graph-guided retrieval
    const docIds = graphGuidedRetrieval(kg, documentStore, entities);
    const documents = docIds.map(docId => documentStore.get(docId)).filter(Boolean) as string[];
    const context = documents.join('\n\n');

    console.log(`  -> Retrieved ${documents.length} docs based on graph connections.`);

    // Step 5: Generate answer
    const { text } = await generateText({
        model,
        messages: [{
            role: 'user',
            content: `Context:\n${context}\n\nQuestion: ${question}`,
        }],
    });

    console.log('\nAnswer:');
    console.log(`${text}`);
}

await main();
