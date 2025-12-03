# TypeScript AI Tutorial Examples

> **Part of [AI Tutorial](https://aitutorial.dev)** - A comprehensive guide to building with AI and LLMs.

This repository contains practical TypeScript examples that complement the [AI Tutorial](https://aitutorial.dev) curriculum. These hands-on examples demonstrate real-world patterns for working with OpenAI's API, structured prompts, and production-ready LLM applications.

## Overview

This project is designed to accompany the [AI Tutorial](https://aitutorial.dev) learning modules. It provides executable TypeScript code examples that teach you how to:

- Interact with OpenAI's API effectively
- Use structured outputs with JSON and XML schemas
- Design effective prompts using proven patterns
- Handle API responses and errors gracefully
- Build production-ready LLM applications

**📚 For the full tutorial content, visit [aitutorial.dev](https://aitutorial.dev)**

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- An OpenAI API key ([Get one here](https://platform.openai.com/api-keys))

## Setup

1. **Clone or navigate to the project directory:**
   ```bash
   cd typescript-examples
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure your API key:**
   - Create an `env` directory if it doesn't exist
   - Create `env/.env` file with your OpenAI API key:
     ```env
     OPENAI_API_KEY=sk-your-api-key-here
     OPENAI_MODEL=gpt-4o-mini
     ```

## Project Structure

```
typescript-examples/
├── src/
│   └── module1/
│       ├── hello_world.ts                              # Basic OpenAI API usage
│       ├── structured_outputs_schema_in_prompt.ts      # Structured outputs - Schema in prompt (JSON)
│       ├── structured_outputs_json_mode.ts             # Structured outputs - JSON mode
│       ├── structured_outputs_xml_schema_in_prompt.ts  # Structured outputs - Schema in prompt (XML)
│       ├── structured_outputs_xml_mode.ts              # Structured outputs - XML mode
│       └── structured_prompt_anatomy.ts                # Prompt engineering fundamentals
├── env/
│   └── .env                            # Your API keys (not in git)
├── run.ts                              # Interactive runner script
├── package.json
└── tsconfig.json
```

## Examples

### 1. Hello World (`hello_world.ts`)
A simple example showing how to make your first API call to OpenAI.

**Key concepts:**
- Setting up the OpenAI client
- Making a basic chat completion request
- Handling responses

### 2. Structured Outputs with JSON

Two approaches to getting structured, validated outputs from the API:

- **Schema in Prompt** (`structured_outputs_schema_in_prompt.ts`) - Includes the JSON schema in the prompt itself
- **JSON Mode** (`structured_outputs_json_mode.ts`) - Uses OpenAI's structured outputs feature

**Key concepts:**
- Defining JSON schemas
- Schema validation with Ajv
- Error handling for invalid responses
- Comparing different approaches to structured outputs

### 3. Structured Outputs with XML

Two approaches to getting structured, validated outputs using XML:

- **Schema in Prompt** (`structured_outputs_xml_schema_in_prompt.ts`) - Includes the XML schema in the prompt itself
- **XML Mode** (`structured_outputs_xml_mode.ts`) - Uses prompt instructions to request XML output

**Key concepts:**
- XML schema definitions
- XML parsing and validation
- Alternative to JSON schemas
- Comparing different approaches to structured outputs

### 4. Structured Prompt Anatomy (`structured_prompt_anatomy.ts`)
Teaches the fundamentals of prompt engineering with structured components.

**Key concepts:**
- Role/Persona definition
- Context and instructions
- Constraints and examples
- Input formatting

## Running Examples

### Method 1: Direct Execution

Run any example file directly using tsx:

```bash
npx tsx src/module1/hello_world.ts
```

### Method 2: Using the Interactive Runner

The project includes an interactive runner script that provides a better development experience:

```bash
npm start
# or
npx tsx run.ts
```

The runner will:
1. Install dependencies automatically
2. Wait for a config file (`env/run.conf`) to be created
3. Execute the specified TypeScript file
4. Allow you to re-run the example easily

**To use the runner:**
1. Create `env/run.conf` with the file path:
   ```
   file=src/module1/hello_world.ts
   ```
2. Run `npm start`
3. Press Enter to execute when prompted

## Dependencies

- **openai** - Official OpenAI Node.js SDK
- **dotenv** - Environment variable management
- **ajv** - JSON schema validation
- **@xmldom/xmldom** - XML parsing
- **zod** - TypeScript-first schema validation
- **tsx** - TypeScript execution

## Configuration

### Environment Variables

Create `env/.env` with:

```env
OPENAI_API_KEY=sk-your-key-here
OPENAI_MODEL=gpt-4o-mini
```

### Model Selection

Recommended models for learning:
- `gpt-4o-mini` - Fast, cost-effective, great for learning
- `gpt-4o` - More capable, higher cost
- `gpt-4-turbo` - Advanced capabilities
- `gpt-3.5-turbo` - Legacy, still functional

## General Guidance

### Getting Started

1. **Follow the tutorial order** - The examples are designed to build upon each other. Start with `hello_world.ts` and progress sequentially.

2. **Read the code comments** - Each example includes detailed comments explaining concepts, patterns, and best practices.

3. **Experiment and modify** - Don't just run the examples—modify them, break them, and understand why they work.

4. **Refer to the main tutorial** - These code examples complement the detailed explanations in [AI Tutorial](https://aitutorial.dev). Read the corresponding tutorial sections for deeper understanding.

### Understanding the Examples

Each example file includes:
- **Purpose** - What you'll learn from this example
- **Key concepts** - Important patterns and techniques demonstrated
- **Code structure** - How the code is organized and why
- **Error handling** - How to handle common issues

### Working with the Code

- **Type safety** - All examples use TypeScript for type safety. Pay attention to type definitions.
- **Environment setup** - Always configure your `.env` file before running examples.
- **API costs** - These examples make real API calls. Monitor your usage, especially when experimenting.
- **Error messages** - Read error messages carefully—they often point to configuration issues.

## Best Practices

1. **Keep API keys secure** - Never commit `.env` files to version control. Use `.gitignore` to exclude them.

2. **Start with simple examples** - Begin with `hello_world.ts` before moving to complex examples. Master the basics first.

3. **Use structured outputs** - JSON/XML schemas improve reliability and reduce parsing errors. Always validate responses.

4. **Handle errors gracefully** - Always include error handling for API calls. Network issues and API errors are common.

5. **Validate responses** - Use schema validation to ensure data integrity. Don't trust API responses blindly.

6. **Monitor costs** - Track your API usage. Use `gpt-4o-mini` for learning to minimize costs.

7. **Read the documentation** - Refer to [OpenAI's API documentation](https://platform.openai.com/docs) for the latest features and best practices.

8. **Test incrementally** - Build and test your code incrementally. Don't write everything at once.

9. **Use TypeScript types** - Leverage TypeScript's type system to catch errors early and improve code quality.

10. **Follow the tutorial** - These examples work best when used alongside the [AI Tutorial](https://aitutorial.dev) content.

## Troubleshooting

### API Key Issues
- Ensure your API key is in `env/.env` as `OPENAI_API_KEY`
- Verify the key starts with `sk-`
- Check that you have credits in your OpenAI account

### Module Not Found Errors
- Run `npm install` to ensure all dependencies are installed
- Check that you're using the correct import paths

### TypeScript Errors
- Verify `tsconfig.json` is properly configured
- Ensure all type definitions are installed (`@types/node`)

## Learning Path

1. **Start here:** `hello_world.ts` - Get familiar with basic API usage
2. **Next:** `structured_prompt_anatomy.ts` - Learn prompt engineering
3. **Then:** `structured_outputs_schema_in_prompt.ts` and `structured_outputs_json_mode.ts` - Master structured outputs (JSON)
4. **Advanced:** `structured_outputs_xml_schema_in_prompt.ts` and `structured_outputs_xml_mode.ts` - Explore XML alternatives

## Resources

### Primary Resources
- **[AI Tutorial](https://aitutorial.dev)** - The main tutorial website with comprehensive guides
- [OpenAI API Documentation](https://platform.openai.com/docs) - Official API reference
- [OpenAI Node.js SDK](https://github.com/openai/openai-node) - SDK documentation and examples

### Learning Resources
- [TypeScript Documentation](https://www.typescriptlang.org/docs/) - TypeScript language reference
- [JSON Schema Specification](https://json-schema.org/) - Understanding JSON schemas
- [XML Schema Tutorial](https://www.w3schools.com/xml/schema_intro.asp) - XML schema basics

### Community & Support
- Visit [aitutorial.dev](https://aitutorial.dev) for the latest updates and community discussions
- Check the tutorial website for additional examples and advanced topics

## About AI Tutorial

This repository is part of the [AI Tutorial](https://aitutorial.dev) project—a comprehensive, hands-on guide to building production-ready AI applications. The tutorial covers:

- **Context Engineering & Prompt Design** - Master the art of prompt engineering
- **RAG (Retrieval-Augmented Generation)** - Build knowledge-powered applications
- **AI Agents** - Create autonomous AI agents
- **Multi-Agent Systems** - Coordinate multiple agents for complex tasks
- **Production Best Practices** - Deploy and maintain AI applications

Each module includes theoretical explanations, practical examples (like these TypeScript files), and hands-on exercises.

## License

This project is part of the [AI Tutorial](https://aitutorial.dev) series. See the main tutorial repository for license information.

## Contributing

This is a tutorial project designed for learning. For issues, questions, or improvements:
1. Check the [AI Tutorial website](https://aitutorial.dev) for the latest content
2. Refer to the main tutorial repository for contribution guidelines
3. These examples are meant to be modified and experimented with—feel free to adapt them to your needs!
