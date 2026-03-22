# TypeScript AI Tutorial Examples

Interactive TypeScript examples for [aitutorial.dev](https://aitutorial.dev). These are embedded via StackBlitz in the tutorial site.

## Project Structure

- `src/prompting/` — Context engineering & prompt design examples
- `src/rag/` — Retrieval-Augmented Generation examples
- `src/agents/` — AI agent & MCP server examples
- `src/types/` — Shared type definitions
- `src/utils/` — Shared utilities
- `scripts/run.ts` — Interactive runner script
- `env/.env` — API keys (not in git)

Module-specific dependencies are installed automatically when running an example from that module.

## Code Style

- Every file must have a `main` function as the first function after imports/setup
- Functions must declare return types
- Functions must have a single return point
- Local variables should not have explicit type annotations (use TypeScript inference)
- Use template literals for `console.log` with variables: `` console.log(`Result: ${value}`) ``
- Don't start `console.log` with `\n` — use separate `console.log('')` for blank lines
- Multi-line template literals must align with surrounding indentation

## File Structure

- Each file is a self-contained, executable script
- `main` function JSDoc must include: brief description, introduction ("This example shows..."), concluding note
- Use numbered step comments in `main`: `// Step 1: ...`, `// Step 2: ...`
- If `main` only calls one function, inline it directly into `main`
- Input/output logs go inside called functions, not in `main`

## File Header Documentation

Every file must include these three fields in its header comment:

1. **Costs & Safety**: API cost/safety notes (e.g., "Real API calls; keep inputs small.")
2. **Module reference**: Link to the tutorial section: `[Section Name](https://aitutorial.dev/{module-slug}#{anchor-slug})`
3. **Why**: Brief explanation of why this technique is useful

## API Configuration

- Supports Gemini (`GOOGLE_GENERATIVE_AI_API_KEY`) and OpenAI (`OPENAI_API_KEY`)
- Set `AI_PROVIDER=gemini` or `AI_PROVIDER=openai` in `env/.env`
- Uses Vercel AI SDK (`ai` package) with `@ai-sdk/openai` and `@ai-sdk/google` providers
- OpenAI SDK uses `max_completion_tokens` (not the deprecated `max_tokens`)

## Running

```bash
npm start          # interactive runner
npx tsx src/prompting/hello_world.ts  # direct execution
```
