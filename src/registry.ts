/**
 * omo-sci Agent 注册表 — 唯一数据源
 *
 * 此前 agent 的分类、模型优先链、显示名、描述、权限分散在 5 处
 * （src/types.ts、src/model-config.ts、src/router/categories.ts、
 * scripts/generate-agent-configs.ts 各有一份），曾出现过 EBMer 分类
 * 在两处互相矛盾的问题。这里收敛成单一数据源，其余位置改为从这里
 * 派生或直接读取，禁止再新增平行副本。
 */

import type { AgentName, CapabilityCategory } from './types';

export type AgentMode = 'primary' | 'subagent';

export interface AgentPermissions {
  read: 'allow';
  edit?: 'allow' | 'ask';
  bash?: 'allow';
  glob?: 'allow';
  grep?: 'allow';
}

export interface AgentDefinition {
  name: AgentName;
  displayName: string;
  mode: AgentMode;
  category: CapabilityCategory;
  description: string;
  /** 模型 ID 优先顺序（不含 provider 前缀），如 ['qwen3.7-plus', 'qwen3.7-max'] */
  modelChain: string[];
  permissions: AgentPermissions;
  color?: 'primary';
}

export const AGENT_REGISTRY: Record<AgentName, AgentDefinition> = {
  dubin: {
    name: 'dubin',
    displayName: 'Dubin (主编排者)',
    mode: 'primary',
    category: 'agent-orchestration',
    description: '医学研究主编排者。引导结构化访谈，拆解委派任务，调和审稿冲突，确保研究全流程质量。',
    modelChain: ['qwen3.7-plus', 'qwen3.7-max', 'kimi-k2.6', 'glm-5.2'],
    permissions: { read: 'allow', edit: 'ask', bash: 'allow', glob: 'allow', grep: 'allow' },
    color: 'primary',
  },
  archimedes: {
    name: 'archimedes',
    displayName: 'Archimedes (研究设计师)',
    mode: 'subagent',
    category: 'deep-reasoning',
    description: '研究设计师。PICO框架提取、FINER评估、研究类型判定、样本量计算、偏倚控制策略。',
    modelChain: ['qwen3.7-max', 'qwen3.7-plus', 'deepseek-v4-pro', 'glm-5.2'],
    permissions: { read: 'allow', edit: 'allow', bash: 'allow' },
  },
  irber: {
    name: 'irber',
    displayName: 'IRBer (计划审查员)',
    mode: 'subagent',
    category: 'agent-orchestration',
    description: '计划审查员。方案质量审查、FINER评分、伦理风险预审、阻塞项标记。只读。',
    modelChain: ['qwen3.7-max', 'glm-5.2', 'deepseek-v4-pro', 'kimi-k2.6'],
    permissions: { read: 'allow' },
  },
  pubmeder: {
    name: 'pubmeder',
    displayName: 'Pubmeder (文献搜索员)',
    mode: 'subagent',
    category: 'fast-search',
    description: '文献搜索员。PubMed 核心检索，CNKI/Consensus 等可选增强，四色分类证据矩阵，效应量提取。',
    modelChain: ['minimax-m3', 'kimi-k2.6', 'qwen3.7-plus', 'qwen3.7-max', 'deepseek-v4-flash', 'glm-5.2'],
    permissions: { read: 'allow', edit: 'allow', bash: 'allow' },
  },
  spsser: {
    name: 'spsser',
    displayName: 'SPSSer (统计分析师)',
    mode: 'subagent',
    category: 'deep-reasoning',
    description: '统计分析师。SAP撰写、R分析执行、8项诊断、敏感性分析(PSM/IPTW/MICE)、Tables+Figures生成。',
    modelChain: ['deepseek-v4-pro', 'qwen3.7-max', 'kimi-k2.7-code', 'qwen3.7-plus', 'minimax-m3'],
    permissions: { read: 'allow', edit: 'allow', bash: 'allow' },
  },
  writer: {
    name: 'writer',
    displayName: 'Writer (论文写作者)',
    mode: 'subagent',
    category: 'chinese-writing',
    description: '论文写作者。根据已签核结果生成初稿(中/英文)、目标期刊格式适配、参考文献审计。',
    modelChain: ['qwen3.7-plus', 'glm-5.2', 'kimi-k2.6', 'qwen3.7-max'],
    permissions: { read: 'allow', edit: 'allow', bash: 'allow' },
  },
  submitter: {
    name: 'submitter',
    displayName: 'Submitter (投稿协调员)',
    mode: 'subagent',
    category: 'agent-orchestration',
    description: '投稿协调员。期刊匹配分析、投稿包生成、格式转换、26项投稿检查。',
    modelChain: ['qwen3.7-plus', 'glm-5.2', 'qwen3.7-max', 'kimi-k2.6'],
    permissions: { read: 'allow', edit: 'allow', bash: 'allow' },
  },
  ebmer: {
    name: 'ebmer',
    displayName: 'EBMer (方法学审稿人)',
    mode: 'subagent',
    category: 'methodical-review',
    description: '方法学审稿人。Sprint Contract两阶段盲审、12模式临床失败检查、数据一致性验证。只读。',
    modelChain: ['glm-5.2', 'qwen3.7-max', 'deepseek-v4-pro', 'kimi-k2.6'],
    permissions: { read: 'allow' },
  },
  polisher: {
    name: 'polisher',
    displayName: 'Polisher (逻辑审稿人)',
    mode: 'subagent',
    category: 'chinese-writing',
    description: '逻辑审稿人。逻辑链连贯性检查、去AI味扫描、语言质量审查。只读。',
    modelChain: ['glm-5.2', 'qwen3.7-plus', 'kimi-k2.6', 'qwen3.7-max'],
    permissions: { read: 'allow' },
  },
};

export const AGENT_NAMES = Object.keys(AGENT_REGISTRY) as AgentName[];

// ====================================================================
// 派生视图 — 供只需要单一维度的调用方使用，不允许再手写平行副本
// ====================================================================

export const AGENT_CATEGORY: Record<AgentName, CapabilityCategory> = Object.fromEntries(
  AGENT_NAMES.map((name) => [name, AGENT_REGISTRY[name].category]),
) as Record<AgentName, CapabilityCategory>;

export const AGENT_DISPLAY_NAMES: Record<AgentName, string> = Object.fromEntries(
  AGENT_NAMES.map((name) => [name, AGENT_REGISTRY[name].displayName]),
) as Record<AgentName, string>;

export const AGENT_FALLBACK_ORDERS: Record<AgentName, string[]> = Object.fromEntries(
  AGENT_NAMES.map((name) => [name, AGENT_REGISTRY[name].modelChain]),
) as Record<AgentName, string[]>;

// ====================================================================
// Frontmatter 渲染 — 供 scripts/generate-agent-configs.ts 与漂移测试共用
// ====================================================================

function renderPermissionBlock(permissions: AgentPermissions): string {
  const lines = ['permission:', `  read: ${permissions.read}`];
  if (permissions.edit) lines.push(`  edit: ${permissions.edit}`);
  if (permissions.bash) lines.push(`  bash: ${permissions.bash}`);
  if (permissions.glob) lines.push(`  glob: ${permissions.glob}`);
  if (permissions.grep) lines.push(`  grep: ${permissions.grep}`);
  return lines.join('\n');
}

/**
 * 构建 agent frontmatter（默认按 opencode-go provider 生成，
 * 真实 provider 由 install 时 applyAgentModelPlan() 按用户配置改写）。
 */
export function buildAgentFrontmatter(def: AgentDefinition): string {
  const [primary, ...fallback] = def.modelChain;
  const model = `opencode-go/${primary}`;
  const fallbackStr =
    fallback.length > 0
      ? `\nmodel_fallback: [${fallback.map((m) => `"opencode-go/${m}"`).join(', ')}]`
      : '';
  const colorStr = def.color ? `\ncolor: ${def.color}` : '';

  return `---
description: "${def.description}"
mode: ${def.mode}
model: ${model}${fallbackStr}
${renderPermissionBlock(def.permissions)}${colorStr}
---`;
}
