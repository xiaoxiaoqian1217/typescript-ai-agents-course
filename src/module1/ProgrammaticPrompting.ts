/**
 * Module 1: Programmatic Prompting
 *
 * This is the simplest possible interaction with an LLM - sending a prompt
 * and receiving a response. No memory, no tools, no agent loop.
 *
 * Key concepts:
 * - Creating messages with roles (system, user, assistant)
 * - Using the LLM abstraction to generate responses
 * - Understanding the basic request/response flow
 *
 * Run with: npm run module1:prompting
 */

import { loadEnv } from '../shared/env';
import { Message, LLM } from '../shared';

/**
 * Demonstrates basic LLM prompting without any agent features.
 */
async function basicPrompting(): Promise<void> {
  // console.log('='.repeat(60));
  // console.log('Module 1: Programmatic Prompting');
  // console.log('='.repeat(60));

  const llm = new LLM();

  // // Example 1: Simple completion
  // console.log('\n📝 Example 1: Simple Completion\n');

  // const messages = [
  //   Message.system('You are a helpful assistant that gives concise answers.'),
  //   Message.user('What is TypeScript in one sentence?'),
  // ];

  // const response = await llm.generate(messages);
  // console.log('Response:', response);

  // // Example 2: Code generation
  // console.log('\n📝 Example 2: Code Generation\n');

  // const codeMessages = [
  //   Message.system(
  //     'You are a TypeScript expert. Write clean, well-typed code. ' +
  //     'Only output the code, no explanations.'
  //   ),
  //   Message.user('Write a function that checks if a string is a palindrome.'),
  // ];

  // const codeResponse = await llm.generate(codeMessages);
  // console.log('Generated code:\n');
  // console.log(codeResponse);

  // Example 3: Structured output
  console.log('\n📝 Example 3: Structured Output (JSON)\n');

  const jsonMessages = [
    Message.system(
      'You are a helpful assistant. Always respond in valid JSON format.'
    ),
    Message.user(
      'List 3 programming languages with their primary use case. ' +
      'Format: [{"language": "name", "useCase": "description"}]'
    ),
  ];

  const jsonResponse = await llm.generate(jsonMessages);
  console.log('JSON Response:', jsonResponse);

  // Try to parse it
  try {
    const parsed = JSON.parse(jsonResponse);
    console.log('Parsed successfully:', parsed);
  } catch {
    console.log('Note: Response was not valid JSON');
  }
}

/**
 * Demonstrates how different system prompts affect responses.
 */
async function systemPromptVariations(): Promise<void> {
  console.log('\n' + '='.repeat(60));
  console.log('System Prompt Variations');
  console.log('='.repeat(60));

  const llm = new LLM();
  const userQuestion = 'Explain recursion.';

  // Same question, different personas
  const personas = [
    {
      name: 'Teacher',
      system: 'You are a patient teacher explaining to a beginner. Use simple analogies.',
    },
    {
      name: 'Expert',
      system: 'You are a computer science professor. Be precise and technical.',
    },
    {
      name: 'Comedian',
      system: 'You are a comedian. Explain technical concepts with humor.',
    },
  ];

  for (const persona of personas) {
    console.log(`\n🎭 ${persona.name}'s explanation:\n`);

    const messages = [
      Message.system(persona.system),
      Message.user(userQuestion),
    ];

    const response = await llm.generate(messages);
    console.log(response);
    console.log('\n' + '-'.repeat(40));
  }
}


async function base64Prompting(): Promise<void> {
  console.log('='.repeat(60));
  console.log('Base64 Encoding Prompt'); 
  const llm = new LLM();

  // Example 1: Simple completion
  console.log('\n📝 Example 1: Simple Completion\n');

  const messages = [
    Message.system('你是一个base64编码器。将用户输入的文本转换为base64格式输出。'),
    Message.user ('今天的天气怎么样？'),
  ];

  const response = await llm.generate(messages);
  console.log('Response:', response);

}

// ─────────────────────────────────────────────────────────────────────────────
// Main Entry Point
// ─────────────────────────────────────────────────────────────────────────────


async function main(): Promise<void> {
  loadEnv();

  try {
    await basicPrompting();
    // await systemPromptVariations();
    // await base64Prompting();
    console.log('\n✅ Programmatic prompting examples completed!');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { basicPrompting, systemPromptVariations, base64Prompting };
