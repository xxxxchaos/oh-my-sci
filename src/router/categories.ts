/**
 * omo-sci 分类路由 — 能力分类标签与分类级默认 fallback 顺序
 *
 * agent 级的显示名/模型链已收敛到 src/registry.ts（唯一数据源）。
 * 这里只保留"分类"这个更粗粒度维度的配置：
 * - CATEGORY_LABELS：分类的中文说明
 * - DEFAULT_FALLBACK_ORDERS / DEFAULT_MODEL_DENYLIST：install.ts 在生成
 *   config.router.categories[cat].fallback_chain（写入 omo-sci.jsonc，
 *   与具体 agent 无关）时使用的分类级排序和禁用表
 */

import type { CapabilityCategory } from '../types';

export const CATEGORY_LABELS: Record<CapabilityCategory, string> = {
  'agent-orchestration': '编排调度 — 多轮对话、工具调用、任务委派',
  'deep-reasoning': '深度推理 — 数学、逻辑、方法论推导',
  'chinese-writing': '中文写作 — 医学论文的中文表达与格式',
  'fast-search': '高频搜索 — 文献检索、数据库查询、信息提取',
  'long-context': '长上下文 — 文献全文分析、长篇论文通读',
  'methodical-review': '方法学审查 — 统计正确性、研究设计批判',
};

export const DEFAULT_FALLBACK_ORDERS: Record<CapabilityCategory, string[]> = {
  'agent-orchestration': ['qwen3.7-plus', 'qwen3.7-max', 'kimi-k2.6', 'glm-5.2'],
  'deep-reasoning': ['qwen3.7-max', 'qwen3.7-plus', 'deepseek-v4-pro', 'kimi-k2.7-code'],
  'chinese-writing': ['qwen3.7-plus', 'glm-5.2', 'kimi-k2.6', 'qwen3.7-max'],
  'fast-search': ['minimax-m3', 'kimi-k2.6', 'qwen3.7-plus', 'qwen3.7-max', 'deepseek-v4-flash'],
  'long-context': ['qwen3.7-plus', 'minimax-m3', 'kimi-k2.6', 'glm-5.2', 'qwen3.7-max'],
  'methodical-review': ['glm-5.2', 'qwen3.7-max', 'deepseek-v4-pro', 'kimi-k2.6'],
};

export const DEFAULT_MODEL_DENYLIST: Partial<Record<CapabilityCategory, string[]>> = {
  'agent-orchestration': ['kimi-k2.7-code'],
  'chinese-writing': ['kimi-k2.7-code'],
  'fast-search': ['kimi-k2.7-code'],
  'long-context': ['kimi-k2.7-code'],
  'methodical-review': ['kimi-k2.7-code'],
};
