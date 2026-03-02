import fs from 'fs';
import path from 'path';
import readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';

import { loadEnv } from '../shared/env';
import { LLM, Message } from '../shared';

// 解析 LLM 响应后的结构：
// code: 提取出的代码内容
// commentary: 非代码说明文字
interface ParsedResponse {
  code: string;
  commentary: string;
}

// 从 LLM 返回文本中提取第一个 Markdown 代码块。
// 如果没有代码块，则回退为原文本。
function extractCodeBlock(response: string): string {
  const match = response.match(/```(?:typescript|ts|javascript|js)?\s*([\s\S]*?)```/i);
  return match ? match[1].trim() : response.trim();
}

// 将响应拆分为“代码”和“注释说明”两部分，便于后续步骤复用。
function parseResponse(response: string): ParsedResponse {
  const code = extractCodeBlock(response);
  const commentary = response
    .replace(/```(?:typescript|ts|javascript|js)?\s*[\s\S]*?```/gi, '')
    .trim();

  return { code, commentary };
}

// 根据用户描述生成安全文件名（仅保留 a-z、0-9、空格和短横线）。
function safeFileName(inputText: string): string {
  const slug = inputText
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 40);

  return `${slug || 'generated-function'}.ts`;
}

// 将最终“文档化函数 + 测试代码”写入本地 ts 文件，并返回文件路径。
function saveFinalOutput(description: string, documentedCode: string, testsCode: string): string {
  const outputDir = path.resolve(process.cwd(), 'src/module1/generated');
  fs.mkdirSync(outputDir, { recursive: true });

  const outputPath = path.join(outputDir, safeFileName(description));
  const finalContent = [
    documentedCode.trim(),
    '',
    '// ------------------------------',
    '// Tests (Jest or Vitest)',
    '// ------------------------------',
    testsCode.trim(),
    '',
  ].join('\n');

  fs.writeFileSync(outputPath, finalContent, 'utf-8');
  return outputPath;
}

// 顺序提示主流程：
// 1) 生成基础函数
// 2) 增加完整文档
// 3) 生成测试用例
export async function runSequentialPromptingExercise(): Promise<void> {
  // 加载 .env 环境变量（API Key / 模型配置）。
  loadEnv();

  const llm = new LLM();
  // 创建命令行交互，用于读取用户输入。
  const rl = readline.createInterface({ input, output });

  try {
    console.log('='.repeat(60));
    console.log('Sequential Prompting Exercise');
    console.log('='.repeat(60));

    const functionDescription = (await rl.question('What TypeScript function do you want to create?\n> ')).trim();
    if (!functionDescription) {
      throw new Error('Function description cannot be empty.');
    }

    // 用于维持多轮上下文：后续每次请求都带上前面的 user/assistant 消息。
    const history: Message[] = [
      Message.system(
        'You are a TypeScript expert. Follow instructions exactly. ' +
        'Return code in markdown code blocks.'
      ),
    ];

    console.log('\n[Step 1/3] Generating initial function...');
    const firstPrompt = [
      `Create a basic TypeScript function based on this description: "${functionDescription}".`,
      'Include brief commentary after the code.',
      'Return TypeScript in a code block.',
    ].join('\n');

    // 第一步：把用户需求发给 LLM，得到初版函数。
    history.push(Message.user(firstPrompt));
    const firstResponse = await llm.generate(history);
    // 将模型回复加入历史，保证第二步能“看到”第一步结果。
    history.push(Message.assistant(firstResponse));

    const firstParsed = parseResponse(firstResponse);
    console.log('\nInitial function code:');
    console.log(firstParsed.code);
    if (firstParsed.commentary) {
      console.log('\nInitial commentary:');
      console.log(firstParsed.commentary);
    }

    console.log('\n[Step 2/3] Adding documentation...');
    // 第二步：基于第一步代码，让 LLM 添加完整文档（描述、参数、返回值、示例、边缘情况）。
    const secondPrompt = [
      'Add comprehensive documentation to this function, including:',
      '- Function description',
      '- Parameter descriptions',
      '- Return value description',
      '- Example usage',
      '- Edge cases',
      '',
      'Function:',
      '```typescript',
      firstParsed.code,
      '```',
      '',
      'Return only the documented function in one TypeScript code block.',
    ].join('\n');

    history.push(Message.user(secondPrompt));
    const secondResponse = await llm.generate(history);
    history.push(Message.assistant(secondResponse));

    const secondParsed = parseResponse(secondResponse);
    console.log('\nDocumented function code:');
    console.log(secondParsed.code);

    console.log('\n[Step 3/3] Generating tests (Jest or Vitest)...');
    // 第三步：基于文档化后的函数生成测试，覆盖基础、边缘、错误与多输入场景。
    const thirdPrompt = [
      'Add test cases for the documented function using Jest or Vitest.',
      'Tests must cover:',
      '- Basic functionality',
      '- Edge cases',
      '- Error cases',
      '- Various input scenarios',
      '',
      'Documented function:',
      '```typescript',
      secondParsed.code,
      '```',
      '',
      'Return only test code in one TypeScript code block.',
    ].join('\n');

    history.push(Message.user(thirdPrompt));
    const thirdResponse = await llm.generate(history);
    history.push(Message.assistant(thirdResponse));

    const thirdParsed = parseResponse(thirdResponse);
    console.log('\nGenerated tests:');
    console.log(thirdParsed.code);

    // 保存最终结果到本地 .ts 文件。
    const savedPath = saveFinalOutput(functionDescription, secondParsed.code, thirdParsed.code);
    console.log(`\nSaved final output to: ${savedPath}`);
  } finally {
    // 无论成功失败都关闭 readline，避免进程挂起。
    rl.close();
  }
}

async function main(): Promise<void> {
  try {
    await runSequentialPromptingExercise();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
