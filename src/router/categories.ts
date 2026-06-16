/**
 * omo-sci 分类路由 — 分类标签与 agent 显示名
 *
 * 定义能力分类的中文标签、agent 中文显示名、以及默认 fallback 顺序。
 */

import type { AgentName, CapabilityCategory } from '../types';

export const CATEGORY_LABELS: Record<CapabilityCategory, string> = {
  'agent-orchestration': '编排调度 — 多轮对话、工具调用、任务委派',
  'deep-reasoning': '深度推理 — 数学、逻辑、方法论推导',
  'chinese-writing': '中文写作 — 医学论文的中文表达与格式',
  'fast-search': '高频搜索 — 文献检索、数据库查询、信息提取',
  'long-context': '长上下文 — 文献全文分析、长篇论文通读',
  'methodical-review': '方法学审查 — 统计正确性、研究设计批判',
};

export const AGENT_DISPLAY_NAMES: Record<AgentName, string> = {
  dubin: 'Dubin (主编排者)',
  archimedes: 'Archimedes (研究设计师)',
  irber: 'IRBer (计划审查员)',
  pubmeder: 'Pubmeder (文献搜索员)',
  spsser: 'SPSSer (统计分析师)',
  writer: 'Writer (论文写作者)',
  submitter: 'Submitter (投稿协调员)',
  ebmer: 'EBMer (方法学审稿人)',
  polisher: 'Polisher (逻辑审稿人)',
};

export const DEFAULT_FALLBACK_ORDERS: Record<CapabilityCategory, string[]> = {
  'agent-orchestration': ['qwen3.7-max', 'deepseek-v4-pro', 'kimi-k2.7-code'],
  'deep-reasoning': ['deepseek-v4-pro', 'qwen3.7-max', 'kimi-k2.7-code'],
  'chinese-writing': ['glm-5.2', 'qwen3.7-max', 'hy3'],
  'fast-search': ['minimax-m3', 'kimi-k2.7-code', 'deepseek-v4-flash'],
  'long-context': ['minimax-m3', 'glm-5.2', 'qwen3.7-max', 'deepseek-v4-pro'],
  'methodical-review': ['deepseek-v4-pro', 'qwen3.7-max'],
};
