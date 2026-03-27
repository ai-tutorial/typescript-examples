# TypeScript AI Tutorial Examples

Interactive TypeScript examples for [aitutorial.dev](https://aitutorial.dev). Every example runs in StackBlitz (browser) or locally with `npx tsx`.

## Setup

```bash
git clone https://github.com/ai-tutorial/typescript-examples.git
cd typescript-examples
cp env/.env.example env/.env
# Add your API keys to env/.env
```

## Configuration

Set `AI_PROVIDER` in `env/.env` to switch between providers:

| Provider | `AI_PROVIDER` | API Key | Default Model |
|----------|--------------|---------|---------------|
| OpenAI | `openai` | `OPENAI_API_KEY` | `gpt-4.1-nano` |
| Gemini | `gemini` | `GOOGLE_GENERATIVE_AI_API_KEY` + `GOOGLE_API_KEY` | `gemini-2.5-flash-lite` |
| Claude | `anthropic` | `ANTHROPIC_API_KEY` | `claude-haiku-4-5-20251001` |

Gemini offers a free tier — get a key at [aistudio.google.com/apikey](https://aistudio.google.com/apikey).

## Modules

### Prompting (`src/prompting/`)

LLM fundamentals, structured outputs, prompt chaining, security defenses, cost optimization.

```bash
npx tsx src/prompting/hello_world.ts
```

### RAG (`src/rag/`)

Search strategies, chunking, PDF processing, evaluation, reranking, advanced patterns.

```bash
npm run --prefix src/rag test:rag
```

### Agents (`src/agents/`)

LangChain agents, MCP servers, memory, business rules, security guardrails.

| File | What it does |
|------|-------------|
| `minimal_agent.ts` | Simplest LLM call (baseline) |
| `weather_agent.ts` | LangChain ReAct agent with tool calling |
| `weather_mcp_server.ts` | MCP server with self-test |
| `customer_support_agent.ts` | Multi-server agent (3 MCP servers, thread memory) |
| `CustomerSupportAgent.ts` | Stateless agent class |
| `KnowledgeBaseServer.ts` | MCP server: FAQ search |
| `CustomerInfoServer.ts` | MCP server: account, orders, preferences |
| `IncidentTicketServer.ts` | MCP server: ticket creation and tracking |
| `memory_examples.ts` | Working memory + long-term memory demos |
| `business_rules_validation.ts` | Deterministic expense validation |
| `guardrails_security.ts` | PII detection, jailbreak prevention, output filtering |
| `insurance_claims_example.ts` | Full insurance claims agent |
| `tool_selection_patterns.ts` | Context-based filtering, tool differentiation |
| `tool_analytics.ts` | Tool usage tracking and recommendations |

## Resources

- **[aitutorial.dev](https://aitutorial.dev)** — Full tutorial
- [Vercel AI SDK](https://sdk.vercel.ai/)
- [LangChain](https://www.langchain.com/)
- [MCP Specification](https://modelcontextprotocol.io/)

## Authors

- **Pablo Luna** ([LinkedIn](https://www.linkedin.com/in/luna-pablo/))
- **Paulo Veiga** ([LinkedIn](https://www.linkedin.com/in/paulo-gustavo-veiga-877b572/))
