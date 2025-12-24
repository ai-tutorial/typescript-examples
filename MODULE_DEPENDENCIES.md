# Module-Specific Dependencies

## Overview

Each module directory (e.g., `src/agents/`, `src/rag/`, `src/prompting/`) can now have its own `package.json` file containing only the dependencies needed for that specific module.

## Benefits

1. **Faster Installation**: StackBlitz only installs dependencies needed for the current example
2. **Clearer Dependencies**: Each module explicitly declares what it needs
3. **Better Organization**: Dependencies are scoped to their usage
4. **Reduced Bloat**: Users don't download unnecessary packages

## How It Works

### 1. Module package.json Structure

Each module's `package.json` should include:
- Only the dependencies used by files in that module
- Common dev dependencies (tsx, typescript, @types/node)
- Module name and description

Example (`src/agents/package.json`):
```json
{
  "name": "agents-examples",
  "version": "1.0.0",
  "type": "module",
  "description": "Agent examples for AI Tutorial",
  "dependencies": {
    "@langchain/core": "^1.1.8",
    "@langchain/openai": "^1.2.0",
    "@modelcontextprotocol/sdk": "^1.25.1",
    "@types/express": "^5.0.6",
    "dotenv": "^17.2.3",
    "express": "^5.2.1",
    "openai": "^6.9.1",
    "zod": "^4.2.1"
  },
  "devDependencies": {
    "@types/node": "^24.10.1",
    "tsx": "^4.20.6",
    "typescript": "~5.9.3"
  }
}
```

### 2. Automatic Detection

When a file is executed:
1. The `run.ts` script extracts the file path from `env/run.conf`
2. It checks if a `package.json` exists in the file's directory
3. If found, it runs `npm install` in that directory
4. Then executes the file with the module's dependencies available

### 3. Fallback Behavior

- If no module-specific `package.json` exists, uses root dependencies
- If module installation fails, continues with root dependencies
- Warnings are shown but don't block execution

## Creating a New Module

To add module-specific dependencies for a new directory:

1. Create `package.json` in the module directory:
   ```bash
   cd src/your-module
   touch package.json
   ```

2. Add only the dependencies used by that module:
   ```json
   {
     "name": "your-module-examples",
     "version": "1.0.0",
     "type": "module",
     "dependencies": {
       "package-you-need": "^1.0.0"
     },
     "devDependencies": {
       "@types/node": "^24.10.1",
       "tsx": "^4.20.6",
       "typescript": "~5.9.3"
     }
   }
   ```

3. Test locally:
   ```bash
   cd src/your-module
   npm install
   npx tsx your-file.ts
   ```

## Current Modules

- **`src/agents/`**: Agent examples (LangChain, OpenAI, MCP SDK)
- **`src/rag/`**: RAG examples (to be created)
- **`src/prompting/`**: Prompting examples (to be created)

## Notes

- The root `package.json` still contains all dependencies for backward compatibility
- Module `package.json` files are optional - only create them when beneficial
- Keep dev dependencies consistent across modules (tsx, typescript, @types/node)
