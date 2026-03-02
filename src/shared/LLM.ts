/**
 * LLM abstraction layer that provides a clean interface for interacting with Language Models.
 *
 * Why use this abstraction instead of OpenAI directly?
 * --------------------------------------------------------
 * This class implements a critical abstraction layer that decouples the application's
 * business logic from any specific LLM provider. This architectural decision offers
 * several significant advantages:
 *
 * 1. **Provider Independence**: By using our own Message abstraction, we can easily switch
 *    between different LLM providers (OpenAI, Anthropic, Google, etc.) without changing
 *    any code in the rest of the application. Only this class needs modification.
 *
 * 2. **API Evolution Protection**: LLM provider APIs frequently change. This abstraction
 *    insulates the rest of the codebase from these changes. If OpenAI deprecates an
 *    API or changes its data structures, we only need to update this single class.
 *
 * 3. **Testing and Mocking**: This approach makes testing significantly easier. We can
 *    mock this class with predictable responses for unit tests without needing to
 *    stub complex provider-specific APIs.
 *
 * 4. **Cost Control**: We can easily implement fallback strategies, rate limiting, or
 *    routing logic to different models/providers based on cost or performance needs
 *    without affecting the consumer code.
 *
 * 5. **Observability**: This centralized class provides a single point for adding logging,
 *    metrics, error handling, and monitoring for all LLM interactions.
 *
 * 6. **Future-Proofing**: As new LLM providers emerge or as we develop internal models,
 *    we can integrate them seamlessly by just adapting this class.
 *
 * @example
 * ```typescript
 * // Basic usage
 * const llm = new LLM();
 * const response = await llm.generate([
 *   Message.system("You are helpful."),
 *   Message.user("Hello!")
 * ]);
 *
 * // With a Prompt object (includes tools)
 * const prompt = new Prompt(messages, tools);
 * const response = await llm.generate(prompt);
 *
 * // With custom model
 * const llm = new LLM({ model: "gpt-5" });
 * ```
 */

import OpenAI from 'openai';
import { Message } from './Message';
import { Tool } from './Tool';
import { Prompt } from './Prompt';

/** Configuration options for the LLM */
export interface LLMConfig {
  /** OpenAI API key (defaults to OPENAI_API_KEY env var) */
  apiKey?: string;
  /** Model to use (defaults to OPENAI_MODEL env var or "gpt-5-nano") */
  model?: string;
  /** Maximum tokens in response */
  maxTokens?: number;
  /** Enable debug logging */
  debug?: boolean;
}

/** Response from the LLM when tools are available */
export interface ToolCallResponse {
  tool: string;
  args: Record<string, unknown>;
}

export class LLM {
  private readonly client: OpenAI;
  private readonly model: string;
  private readonly maxTokens: number;
  private readonly debug: boolean;

  constructor(config: LLMConfig = {}) {
    const apiKey = config.apiKey ?? process.env.DASHSCOPE_API_KEY ?? process.env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new Error(
        'API key is required. Set DASHSCOPE_API_KEY (recommended) or OPENAI_API_KEY, or pass apiKey in config.\n' +
        'Tip: Copy .env.example to .env and add your API key.'
      );
    }

    this.client = new OpenAI({
      apiKey,
      baseURL: process.env.LLM_BASE_URL ?? process.env.OPENAI_BASE_URL ?? 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    });
    this.model = config.model ?? process.env.QWEN_MODEL ?? process.env.OPENAI_MODEL ?? 'qwen-turbo';
    this.maxTokens = config.maxTokens ?? 4096;
    this.debug = config.debug ?? process.env.DEBUG === 'true';
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Main API
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Generates a response from the LLM.
   *
   * Accepts either:
   * - An array of Messages (simple case)
   * - A Prompt object (when you need tools)
   *
   * When tools are provided and the LLM chooses to call one, the response
   * will be a JSON string like: {"tool": "readFile", "args": {"fileName": "test.txt"}}
   *
   * @param input - Messages or Prompt to send to the LLM
   * @returns The LLM's response as a string
   */
  async generate(input: Message[] | Prompt): Promise<string> {
    const prompt = Array.isArray(input) ? new Prompt(input) : input;

    try {
      const openaiMessages = this.toOpenAIMessages(prompt.messages);

      if (prompt.hasTools()) {
        return await this.generateWithTools(openaiMessages, prompt.tools);
      } else {
        return await this.generateSimple(openaiMessages);
      }
    } catch (error) {
      this.logError(error, prompt);
      throw error;
    }
  }

  /**
   * Alias for generate() - for backward compatibility.
   */
  async generateResponse(input: Message[] | Prompt): Promise<string> {
    return this.generate(input);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Internal Methods
  // ─────────────────────────────────────────────────────────────────────────────

  private async generateSimple(
    messages: OpenAI.Chat.ChatCompletionMessageParam[]
  ): Promise<string> {
    this.log('Generating response (no tools)...');

    const completion = await this.client.chat.completions.create({
      model: this.model,
      messages,
      max_tokens: this.maxTokens,
    });

    const message = completion.choices[0]?.message;
    const content = message?.content;

    // Check for refusal (newer models may refuse certain requests)
    if ('refusal' in message && message.refusal) {
      throw new Error(`Model refused request: ${message.refusal}`);
    }

    if (!content) {
      // Log additional debug info
      this.log('Full response:', JSON.stringify(completion.choices[0], null, 2));
      throw new Error('No response content received from OpenAI');
    }

    this.log('Response received:', content.substring(0, 100) + '...');
    return content;
  }

  private async generateWithTools(
    messages: OpenAI.Chat.ChatCompletionMessageParam[],
    tools: readonly Tool[]
  ): Promise<string> {
    this.log('Generating response with tools:', tools.map(t => t.name).join(', '));

    const openaiTools = this.toOpenAITools(tools);

    const completion = await this.client.chat.completions.create({
      model: this.model,
      messages,
      max_tokens: this.maxTokens,
      tools: openaiTools,
    });

    const message = completion.choices[0]?.message;
    const toolCalls = message?.tool_calls;

    if (toolCalls && toolCalls.length > 0) {
      // LLM chose to call a tool
      const toolCall = toolCalls[0];

      // Handle function tool calls (type: 'function')
      if (toolCall.type === 'function') {
        const response: ToolCallResponse = {
          tool: toolCall.function.name,
          args: JSON.parse(toolCall.function.arguments),
        };

        this.log('Tool call:', response.tool, response.args);
        return JSON.stringify(response);
      } else {
        throw new Error(`Unsupported tool call type: ${toolCall.type}`);
      }
    } else {
      // LLM responded with text (no tool call)
      const content = message?.content;
      if (!content) {
        throw new Error('No response content received from OpenAI');
      }

      this.log('Text response (no tool call):', content.substring(0, 100) + '...');
      return content;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Conversion Helpers
  // ─────────────────────────────────────────────────────────────────────────────

  private toOpenAIMessages(
    messages: readonly Message[]
  ): OpenAI.Chat.ChatCompletionMessageParam[] {
    return messages.map(msg => ({
      role: msg.role,
      content: msg.content,
    }));
  }

  private toOpenAITools(tools: readonly Tool[]): OpenAI.Chat.ChatCompletionTool[] {
    return tools.map(tool => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters as OpenAI.FunctionParameters,
      },
    }));
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Logging
  // ─────────────────────────────────────────────────────────────────────────────

  private log(...args: unknown[]): void {
    if (this.debug) {
      console.log('[LLM]', ...args);
    }
  }

  private logError(error: unknown, prompt: Prompt): void {
    console.error('[LLM] Error generating response:', error);

    if (this.debug) {
      console.log('[LLM] Messages:', prompt.messages.map(m => m.toString()));
      if (prompt.hasTools()) {
        console.log('[LLM] Tools:', prompt.tools.map(t => t.name));
      }
      console.log('[LLM] Model:', this.model);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Utility
  // ─────────────────────────────────────────────────────────────────────────────

  /** Returns the model name being used */
  getModel(): string {
    return this.model;
  }
}
