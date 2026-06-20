/**
 * omo-sci 常量与默认配置
 *
 * 定义路径常量、默认配置对象。
 * 纯数据文件，无副作用。
 */

import { homedir } from 'node:os';
import { join } from 'node:path';
import type { OmoSciConfig } from './types';

/** 文献检索核心 MCP：Pubmeder 没有它就只能输出检索策略，不能完成真实 PubMed 检索 */
export const REQUIRED_LITERATURE_MCPS = ['unified_search'] as const;

/** 文献检索增强 MCP：存在时纳入搜索，缺失时不阻塞 Pubmeder */
export const OPTIONAL_LITERATURE_MCPS = [
  'search_cnki',
  'Consensus__search',
  'search_cochrane_reviews',
  'web_search_exa',
  'zotero_search_items',
  'browser_navigate',
] as const;

/** ~/.config/opencode */
export const OPENCODE_CONFIG_DIR = join(homedir(), '.config', 'opencode');

/** ~/.config/opencode/omo-sci.jsonc — 用户配置文件路径 */
export const OMO_SCI_CONFIG_PATH = join(OPENCODE_CONFIG_DIR, 'omo-sci.jsonc');

/** ~/.config/opencode/omo-sci-profile/ — Dubin 进化记忆系统目录 */
export const OMO_SCI_PROFILE_DIR = join(OPENCODE_CONFIG_DIR, 'omo-sci-profile');

/** 默认完整配置 */
export const DEFAULT_CONFIG: OmoSciConfig = {
  router: {
    categories: {
      'agent-orchestration': { category: 'agent-orchestration', fallback_chain: [], concurrency_limit: 2 },
      'deep-reasoning': { category: 'deep-reasoning', fallback_chain: [], concurrency_limit: 2 },
      'chinese-writing': { category: 'chinese-writing', fallback_chain: [], concurrency_limit: 2 },
      'fast-search': { category: 'fast-search', fallback_chain: [], concurrency_limit: 4 },
      'long-context': { category: 'long-context', fallback_chain: [], concurrency_limit: 2 },
      'methodical-review': { category: 'methodical-review', fallback_chain: [], concurrency_limit: 2 },
    },
    concurrency: { max_total_agents: 8 },
  },
  safety: { max_step: 50, max_time_minutes: 30, loop_detect_threshold: 5 },
  usage: {
    token_quota: 500_000_000,
    current_usage: 0,
    quota_reset_date: new Date().toISOString().slice(0, 7) + '-01',
  },
  environment: {
    mcp_required: [...REQUIRED_LITERATURE_MCPS],
    mcp_optional: [...OPTIONAL_LITERATURE_MCPS],
    r_packages: [
      'tableone',
      'gtsummary',
      'finalfit',
      'survival',
      'coxme',
      'rms',
      'MatchIt',
      'WeightIt',
      'mice',
      'flowchart',
      'ggplot2',
      'patchwork',
    ],
    software: ['R', 'Pandoc', 'Git', 'PlotCase'],
  },
};
