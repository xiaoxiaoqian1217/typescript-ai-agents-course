# TypeScript AI Agents Tutorial

Learn to build AI agents from scratch using modern TypeScript patterns.

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Set up your environment
cp .env.example .env
# Edit .env and add your OpenAI API key

# 3. Run any module
npm run module1:prompting
```

## Project Structure

```
src/
├── shared/           # Core abstractions used across all modules
│   ├── Message.ts    # LLM message representation
│   ├── LLM.ts        # OpenAI wrapper with provider abstraction
│   ├── Action.ts     # Parsed tool invocations
│   ├── ActionResult.ts # Tool execution results
│   ├── Tool.ts       # Tool definitions with JSON schema
│   ├── Prompt.ts     # Combines messages + tools
│   ├── Memory.ts     # Agent memory storage
│   ├── Goal.ts       # Goal representation for GAME framework
│   └── FileTools.ts  # Shared file operations
│
├── module1/          # Basic Agent Concepts
│   ├── ProgrammaticPrompting.ts  # Simple LLM interaction
│   ├── QuasiAgent.ts             # Multi-turn conversation
│   └── AgentLoop.ts              # Full agent loop pattern
│
├── module2/          # Function Calling
│   ├── FunctionCallingExample.ts # Basic function calling
│   └── AgentLoopFunctionCalling.ts # Agent with function calling
│
├── module3/          # GAME Framework
│   └── GAMEAgent.ts  # Goals, Actions, Memory, Environment
│
└── module4/          # Advanced Patterns
    └── SelfPromptingAgent.ts # Agent delegation
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run build` | Compile TypeScript to JavaScript |
| `npm run test` | Run unit tests |
| `npm run typecheck` | Type-check without emitting |
| `npm run module1:prompting` | Run basic prompting example |
| `npm run module1:quasi` | Run quasi-agent example |
| `npm run module1:agent` | Run full agent loop |
| `npm run module2:function-calling` | Run function calling example |
| `npm run module2:agent` | Run agent with function calling |
| `npm run module3:game` | Run GAME framework agent |
| `npm run module4:self-prompting` | Run self-prompting agent |

## Module Overview

### Module 1: Basic Agent Concepts

Learn the fundamentals of interacting with LLMs and building agent loops.

1. **Programmatic Prompting** - Basic LLM interaction
2. **Quasi-Agent** - Multi-turn conversations with memory
3. **Agent Loop** - The core pattern: prompt → respond → parse → execute → repeat

### Module 2: Function Calling

Use OpenAI's function calling API for structured tool invocation.

1. **Function Calling Example** - Basic function calling
2. **Agent Loop with Function Calling** - Integrating function calling into agents

### Module 3: GAME Framework

A structured approach to agent design:
- **G**oals - What the agent wants to achieve
- **A**ctions - Tools available to the agent
- **M**emory - Context and state storage
- **E**nvironment - The world the agent operates in

### Module 4: Self-Prompting Agents

Advanced patterns for agent delegation and self-improvement.

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage
```

## Requirements

- Node.js 18+
- OpenAI API key
