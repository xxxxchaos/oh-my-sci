#!/usr/bin/env bun
/**
 * 从 src/agents/*.ts 读取 PROMPT 导出并生成 .opencode/agents/*.md 文件
 *
 * 使用 Bun 运行时直接动态 import .ts 源文件，提取 PROMPT named export，
 * 然后写入对应的 .opencode/agents/*.md 文件（包含 frontmatter + 完整 prompt 正文）。
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');

const AGENTS_DIR = join(PROJECT_ROOT, '.opencode', 'agents');
const AGENTS_SRC_DIR = join(PROJECT_ROOT, 'src', 'agents');

type AgentMode = 'primary' | 'subagent';
type CapabilityCategory =
  | 'agent-orchestration'
  | 'deep-reasoning'
  | 'chinese-writing'
  | 'fast-search'
  | 'long-context'
  | 'methodical-review';

interface AgentDef {
  name: string;
  mode: AgentMode;
  description: string;
  category: CapabilityCategory;
}

// Default model per capability category (matches design spec section 三)
const CATEGORY_DEFAULT_MODEL: Record<CapabilityCategory, string> = {
  'agent-orchestration': 'opencode-go/qwen3.7-max',
  'deep-reasoning': 'deepseek/deepseek-v4-pro',
  'chinese-writing': 'opencode-go/glm-5.2',
  'fast-search': 'opencode-go/minimax-m3',
  'long-context': 'opencode-go/minimax-m3',
  'methodical-review': 'deepseek/deepseek-v4-pro',
};

// Fallback models: if the primary isn't available, try these
const CATEGORY_FALLBACKS: Record<CapabilityCategory, string[]> = {
  'agent-orchestration': ['deepseek/deepseek-v4-pro', 'opencode-go/kimi-k2.7-code'],
  'deep-reasoning': ['opencode-go/qwen3.7-max', 'opencode-go/kimi-k2.7-code'],
  'chinese-writing': ['opencode-go/qwen3.7-max', 'deepseek/deepseek-v4-pro'],
  'fast-search': ['opencode-go/kimi-k2.7-code', 'deepseek/deepseek-v4-flash'],
  'long-context': ['opencode-go/glm-5.1', 'opencode-go/qwen3.7-max'],
  'methodical-review': ['opencode-go/qwen3.7-max', 'opencode-go/kimi-k2.7-code'],
};

const agents: AgentDef[] = [
  { name: 'dubin', mode: 'primary', description: '医学研究主编排者。引导结构化访谈，拆解委派任务，调和审稿冲突，确保研究全流程质量。', category: 'agent-orchestration' },
  { name: 'archimedes', mode: 'subagent', description: '研究设计师。PICO框架提取、FINER评估、研究类型判定、样本量计算、偏倚控制策略。', category: 'deep-reasoning' },
  { name: 'irber', mode: 'subagent', description: '计划审查员。方案质量审查、FINER评分、伦理风险预审、阻塞项标记。只读。', category: 'agent-orchestration' },
  { name: 'pubmeder', mode: 'subagent', description: '文献搜索员。多源并行检索(PubMed/CNKI/Cochrane/Exa/Consensus)，四色分类证据矩阵，效应量提取。', category: 'fast-search' },
  { name: 'spsser', mode: 'subagent', description: '统计分析师。SAP撰写、R分析执行、8项诊断、敏感性分析(PSM/IPTW/MICE)、Tables+Figures生成。', category: 'deep-reasoning' },
  { name: 'writer', mode: 'subagent', description: '论文写作者。根据已签核结果生成初稿(中/英文)、目标期刊格式适配、参考文献审计。', category: 'chinese-writing' },
  { name: 'submitter', mode: 'subagent', description: '投稿协调员。期刊匹配分析、投稿包生成、格式转换、26项投稿检查。', category: 'agent-orchestration' },
  { name: 'ebmer', mode: 'subagent', description: '方法学审稿人。Sprint Contract两阶段盲审、12模式临床失败检查、数据一致性验证。只读。', category: 'methodical-review' },
  { name: 'polisher', mode: 'subagent', description: '逻辑审稿人。逻辑链连贯性检查、去AI味扫描、语言质量审查。只读。', category: 'chinese-writing' },
];

// Permission blocks per agent
function getPermissions(name: string): string {
  if (name === 'dubin') {
    return `permission:
  read: allow
  edit: ask
  bash: allow
  glob: allow
  grep: allow
color: primary`;
  }
  if (name === 'irber' || name === 'ebmer' || name === 'polisher') {
    return `permission:
  read: allow`;
  }
  // archimedes, pubmeder, spsser, writer, submitter
  return `permission:
  read: allow
  edit: allow
  bash: allow`;
}

async function main(): Promise<void> {
  if (!existsSync(AGENTS_DIR)) {
    console.error(`错误: ${AGENTS_DIR} 不存在`);
    process.exit(1);
  }

  let okCount = 0;
  let errorCount = 0;

  for (const agent of agents) {
    const srcPath = join(AGENTS_SRC_DIR, `${agent.name}.ts`);
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
        console.error(`[警告] ${agent.name} PROMPT 为空或过短 (${prompt?.length ?? 0} chars)`);
        errorCount++;
        continue;
      }

      const model = CATEGORY_DEFAULT_MODEL[agent.category];
      const fallbacks = CATEGORY_FALLBACKS[agent.category] ?? [];
      const fallbackStr = fallbacks.length > 0 ? `\nmodel_fallback: [${fallbacks.map(m => `"${m}"`).join(', ')}]` : '';

      const frontmatter = `---
description: "${agent.description}"
mode: ${agent.mode}
model: ${model}${fallbackStr}
${getPermissions(agent.name)}
---`;

      const mdContent = `${frontmatter}

${prompt}
`;
      const mdPath = join(AGENTS_DIR, `${agent.name}.md`);
      writeFileSync(mdPath, mdContent, 'utf-8');
      console.log(`[OK] ${agent.name}.md 已写入 (${prompt.length} chars)`);
      okCount++;
    } catch (err) {
      console.error(`[错误] ${agent.name} 导入失败:`, err);
      errorCount++;
    }
  }

  console.log(`\n完成: ${okCount} 成功, ${errorCount} 失败`);
}

await main();
