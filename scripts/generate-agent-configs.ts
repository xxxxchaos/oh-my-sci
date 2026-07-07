#!/usr/bin/env bun
/**
 * 从 src/agents/*.ts 读取 PROMPT 导出并生成 .opencode/agents/*.md 文件
 *
 * frontmatter（description/mode/model/model_fallback/permission）全部从
 * src/registry.ts 的 AGENT_REGISTRY 派生，禁止在本脚本里重新定义任何
 * agent 级映射表——那正是此前 EBMer 分类矛盾等问题的根源。
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { AGENT_NAMES, AGENT_REGISTRY, buildAgentFrontmatter } from '../src/registry';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');

const AGENTS_DIR = join(PROJECT_ROOT, '.opencode', 'agents');
const AGENTS_SRC_DIR = join(PROJECT_ROOT, 'src', 'agents');

async function main(): Promise<void> {
  if (!existsSync(AGENTS_DIR)) {
    console.error(`错误: ${AGENTS_DIR} 不存在`);
    process.exit(1);
  }

  let okCount = 0;
  let errorCount = 0;

  for (const name of AGENT_NAMES) {
    const def = AGENT_REGISTRY[name];
    const srcPath = join(AGENTS_SRC_DIR, `${name}.ts`);
    if (!existsSync(srcPath)) {
      console.error(`[跳过] ${srcPath} 不存在`);
      errorCount++;
      continue;
    }

    try {
      // Bun 支持直接 import .ts 文件
      const mod = await import(srcPath);
      const prompt: string = mod.PROMPT;

      if (!prompt || prompt.length < 50) {
        console.error(`[警告] ${name} PROMPT 为空或过短 (${prompt?.length ?? 0} chars)`);
        errorCount++;
        continue;
      }

      const mdContent = `${buildAgentFrontmatter(def)}\n\n${prompt}\n`;
      const mdPath = join(AGENTS_DIR, `${name}.md`);
      writeFileSync(mdPath, mdContent, 'utf-8');
      console.log(`[OK] ${name}.md 已写入 (${prompt.length} chars)`);
      okCount++;
    } catch (err) {
      console.error(`[错误] ${name} 导入失败:`, err);
      errorCount++;
    }
  }

  console.log(`\n完成: ${okCount} 成功, ${errorCount} 失败`);
}

await main();
