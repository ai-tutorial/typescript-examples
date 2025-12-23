/**
 * Costs & Safety: Uses OpenAI API for generation. Small graph/doc set keeps costs low.
 * Module reference: [Advanced RAG Patterns](https://aitutorial.dev/rag/advanced-rag-patterns#pattern-1-graphrag-knowledge-graphs-rag)
 * Why: Demonstrates how to use a Knowledge Graph to perform multi-hop retrieval, finding connections between entities that simple vector search might miss.
 */

import OpenAI from "openai";
import { config } from 'dotenv';
import { join } from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
config({ path: join(process.cwd(), 'env', '.env') });

const openai = new OpenAI();
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o';

/**
 * Minimal Graph implementation to avoid extra dependencies.
 * Mimics basic functionality needed for this example.
 */
class Graph {
    private edges: Map<string, Array<{ target: string; data: any }>> = new Map();
    private nodes: Map<string, any> = new Map();

    setEdge(source: string, target: string, data: any) {
        if (!this.edges.has(source)) this.edges.set(source, []);
        this.edges.get(source)?.push({ target, data });

        // Add nodes if they don't distinguish existence separate from edges
        if (!this.nodes.has(source)) this.nodes.set(source, {});
        if (!this.nodes.has(target)) this.nodes.set(target, {});
    }

    setNode(id: string, data: any) {
        this.nodes.set(id, data);
    }

    hasNode(id: string): boolean {
        return this.nodes.has(id);
    }

    successors(id: string): string[] {
        return this.edges.get(id)?.map(e => e.target) || [];
    }

    node(id: string): any {
        return this.nodes.get(id);
    }
}

/**
 * Main function demonstrating GraphRAG
 */
async function main() {
    console.log("--- GraphRAG Example ---");

    // 1. Setup Knowledge Graph
    const kg = new Graph();
    // Alice works on Project X and Project Y
    kg.setEdge("Alice", "Project X", { type: "works_on" });
    kg.setEdge("Bob", "Project X", { type: "works_on" }); // Bob also on X
    kg.setEdge("Alice", "Project Y", { type: "works_on" });

    // Link Entities to Documents (Mocking document index)
    // In a real system, you'd look up which docs mention "Alice", "Project X", etc.
    kg.setNode("Alice", { document_ids: ["doc_1"] });
    kg.setNode("Project X", { document_ids: ["doc_2", "doc_3"] });
    kg.setNode("Project Y", { document_ids: ["doc_4"] });
    kg.setNode("Bob", { document_ids: ["doc_5"] });

    // 2. Setup Document Store
    const documentStore = new Map<string, string>([
        ["doc_1", "Alice is a senior engineer."],
        ["doc_2", "Project X is a new mobile app."],
        ["doc_3", "Project X deadline is Q4."],
        ["doc_4", "Project Y is a backend migration."],
        ["doc_5", "Bob is a junior developer."]
    ]);

    const graphRag = new GraphRAG(kg, documentStore);

    // 3. Query
    const question = "Who worked on both Project X and Project Y?";
    const entities = ["Project X", "Project Y"];

    console.log(`Question: "${question}"`);
    console.log(`Entities (extracted): ${JSON.stringify(entities)}`);

    console.log("\nQuerying...");
    const answer = await graphRag.query(question, entities);

    console.log("\nAnswer:");
    console.log(answer);
}

class GraphRAG {
    private kg: Graph;
    private docs: Map<string, string>;

    constructor(knowledgeGraph: Graph, documentStore: Map<string, string>) {
        this.kg = knowledgeGraph;
        this.docs = documentStore;
    }

    graphGuidedRetrieval(
        entities: string[]
    ): string[] {
        console.log("  -> Walking graph nodes...");
        // Step 1: Find subgraph around entities (simple traversal)
        const relevantNodes = new Set(entities);

        // For this simple example, we look at incoming/outgoing if implemented, 
        // or just simple successor expansion.
        // We'll traverse 1 hop for demo.
        for (const entity of entities) {
            if (this.kg.hasNode(entity)) {
                // Find who is connected to these projects?
                // Our simple graph is directed: Alice -> Project X.
                // If we start at Project X, we might need predecessors to find Alice.
                // For simplicity in this unidirectional mock, let's just cheat and scan all edges
                // or assume we want to find people associated with these projects.

                // NOTE: A real Graph DB would allow bidirectional traversal easily.
                // Here we'll just check who points TO these entities for the demo logic
                // if we can't traverse backwards easily in this simple map.

                // Let's implement a naive 'connected' check by iterating all nodes 
                // to finding who points to Project X/Y.
                // In production, use Neo4j/NetworkX.
            }
        }

        // Fix for demo: We know Alice -> Project X. 
        // If query is "Who worked on...", we usually extract "Project X".
        // We need to find nodes connected to Project X.
        // Let's add 'Alice' to relevant nodes manually if connected.
        // (In a real graph traversal, we'd go Project X <-(works_on)- Alice)

        // Hardcoding the traversal logic for this specific graph direction (Source->Target)
        // If we want "Who worked on X", we look for Sources where Target=X.
        // Let's just create a bidirectional lookup for this demo.

        const reverseEdges: Record<string, string[]> = {};
        // Build reverse index map
        // @ts-ignore - reaching into private for setup
        for (const [source, targets] of this.kg.edges.entries()) {
            for (const edge of targets) {
                if (!reverseEdges[edge.target]) reverseEdges[edge.target] = [];
                reverseEdges[edge.target].push(source);
            }
        }

        for (const entity of entities) {
            const connectedPeople = reverseEdges[entity] || [];
            connectedPeople.forEach(p => relevantNodes.add(p));
        }

        console.log(`  -> Found relevant nodes: ${Array.from(relevantNodes).join(", ")}`);

        // Step 2: Retrieve documents mentioning any relevant node
        const docIds = new Set<string>();
        for (const node of relevantNodes) {
            const nodeData = this.kg.node(node);
            if (nodeData?.document_ids) {
                for (const docId of nodeData.document_ids) {
                    docIds.add(docId);
                }
            }
        }

        return Array.from(docIds);
    }

    async query(question: string, entities: string[]): Promise<string> {
        // Step 1: Graph-guided retrieval
        const docIds = this.graphGuidedRetrieval(entities);

        // Step 2: Fetch actual documents
        const documents = docIds.map(docId => this.docs.get(docId)).filter(Boolean) as string[];
        const context = documents.join("\n\n");

        console.log(`  -> Retrieved ${documents.length} docs based on graph connections.`);

        // Step 3: Generate answer
        const response = await openai.chat.completions.create({
            model: MODEL,
            messages: [{
                role: "user",
                content: `Context:\n${context}\n\nQuestion: ${question}`
            }]
        });

        return response.choices[0].message.content || "";
    }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    main().catch(console.error);
}
