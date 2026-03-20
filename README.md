# TypeScript AI Tutorial Examples

> **Part of [AI Tutorial](https://aitutorial.dev)** — A comprehensive guide to building with AI and LLMs.

This repository contains practical TypeScript examples that complement the [AI Tutorial](https://aitutorial.dev) curriculum. Each module provides executable code demonstrating real-world patterns for working with LLMs, from basic prompting to RAG pipelines and AI agents.

**📚 For the full tutorial content, visit [aitutorial.dev](https://aitutorial.dev)**

## Prerequisites

- Node.js (v18 or higher)
- npm

## Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/ai-tutorial/typescript-examples.git
   cd typescript-examples
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure your API keys:**
   Create `env/.env` with your API keys:
   ```env
   OPENAI_API_KEY=sk-your-api-key-here
   OPENAI_MODEL=gpt-4.1-nano
   GOOGLE_GENERATIVE_AI_API_KEY=your-gemini-key-here
   GEMINI_MODEL=gemini-2.5-flash-lite
   AI_PROVIDER=gemini
   ```

## Project Structure

```
typescript-examples/
├── src/
│   ├── prompting/          # Context engineering & prompt design examples
│   ├── rag/                # Retrieval-Augmented Generation examples
│   ├── agents/             # AI agent & MCP server examples
│   ├── types/              # Shared type definitions
│   └── utils/              # Shared utilities
├── env/
│   └── .env                # Your API keys (not in git)
├── scripts/
│   └── run.ts              # Interactive runner script
├── run.sh                  # Shell runner
├── package.json
└── tsconfig.json
```

## Modules

### Prompting (`src/prompting/`)

| Example | Description |
|---------|-------------|
| `hello_world.ts` | Basic LLM API call |
| `structured_prompt_anatomy.ts` | Prompt engineering fundamentals (role, context, constraints) |
| `structured_outputs_schema_in_prompt.ts` | Structured outputs — JSON schema in prompt |
| `structured_outputs_json_mode.ts` | Structured outputs — JSON mode |
| `structured_outputs_xml_schema_in_prompt.ts` | Structured outputs — XML schema in prompt |
| `structured_outputs_xml_mode.ts` | Structured outputs — XML mode |
| `sentiment_classification.ts` | Sentiment analysis with structured outputs |
| `ambiguous_output_parsing.ts` | Handling ambiguous LLM responses |
| `context_stuffing.ts` | Context window management |
| `prompt_chaining.ts` | Sequential prompt chaining |
| `prompt_chaining_advanced.ts` | Advanced chaining with conditional logic |
| `self_consistency.ts` | Self-consistency sampling |
| `advance_self_consistency.ts` | Advanced self-consistency techniques |
| `model_cascading.ts` | Model cascading (cheap → expensive fallback) |
| `prompt_injection.ts` | Prompt injection detection & defense |
| `prompt_caching_openai.ts` | Prompt caching with OpenAI |
| `prompt_caching_anthropic.ts` | Prompt caching with Anthropic |

### RAG (`src/rag/`)

| Example | Description |
|---------|-------------|
| `basic_rag.ts` | Basic RAG pipeline |
| `chunking_strategies.ts` | Document chunking strategies |
| `chunking_methods.ts` | Chunking method implementations |
| `search_lexical.ts` | Lexical (keyword) search |
| `search_semantic.ts` | Semantic (embedding) search |
| `search_hybrid.ts` | Hybrid search (lexical + semantic) |
| `search_inverted_index.ts` | Inverted index search |
| `cross_encoder_reranking.ts` | Cross-encoder reranking |
| `rag_iterative.ts` | Iterative RAG refinement |
| `rag_evaluation.ts` | RAG evaluation metrics |
| `rag_monitoring.ts` | RAG pipeline monitoring |
| `rag_graph.ts` | Graph-based RAG |
| `rag_hybrid_data.ts` | Hybrid data sources for RAG |
| `pdf_processing.ts` | PDF text extraction |
| `pdf_vision.ts` | PDF processing with vision models |
| `pdf_image_ocr.ts` | PDF image OCR extraction |
| `pdf_image_captioning.ts` | PDF image captioning |
| `pdf_table_extraction.ts` | PDF table extraction |
| `pdf_needle_search.ts` | Needle-in-a-haystack PDF search |
| `pdf_hierarchical_summary.ts` | Hierarchical PDF summarization |
| `pdf_unstructured_pipeline.ts` | Unstructured PDF processing pipeline |

### Agents (`src/agents/`)

| Example | Description |
|---------|-------------|
| `weather_agent.ts` | Tool-using weather agent |
| `weather_mcp_server.ts` | MCP server for weather tools |
| `customer_support_mcp_server.ts` | Customer support MCP server |
| `rag_agentic.ts` | Agentic RAG with tool use |

## Running Examples

### Using the Interactive Runner

```bash
npm start
# or
./run.sh
```

### Direct Execution

Run any example file directly:

```bash
npx tsx src/prompting/hello_world.ts
```

### Run All Prompting Tests

```bash
npm run test:prompting
```

## Dependencies

- **dotenv** — Environment variable management
- **fast-xml-parser** — XML parsing and validation
- **xml-escape** — XML string escaping
- **tsx** — TypeScript execution
- **typescript** — Type checking

> Module-specific dependencies (AI SDKs, embedding libraries, etc.) are installed automatically when you run an example from that module.

## Configuration

### API Providers

The examples support multiple LLM providers. Set `AI_PROVIDER` in your `env/.env`:

| Provider | API Key Variable | Recommended Model |
|----------|-----------------|-------------------|
| Gemini | `GOOGLE_GENERATIVE_AI_API_KEY` | `gemini-2.5-flash-lite` |
| OpenAI | `OPENAI_API_KEY` | `gpt-4.1-nano` |

Gemini offers a free tier — get a key at [aistudio.google.com/apikey](https://aistudio.google.com/apikey).

## Learning Path

1. **Start here:** `src/prompting/hello_world.ts` — basic API usage
2. **Prompt design:** `structured_prompt_anatomy.ts` → structured outputs → chaining
3. **RAG:** `basic_rag.ts` → chunking → search → evaluation
4. **Agents:** `weather_agent.ts` → MCP servers → agentic RAG

## Resources

- **[AI Tutorial](https://aitutorial.dev)** — Main tutorial website
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Google AI Studio](https://aistudio.google.com/)
- [Vercel AI SDK](https://sdk.vercel.ai/)
- [Model Context Protocol](https://modelcontextprotocol.io/)

## License

See the main tutorial repository for license information.
