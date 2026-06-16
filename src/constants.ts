/**
 * omo-sci 常量与默认配置
 *
 * 定义路径常量、默认配置对象。
 * 纯数据文件，无副作用。
 */

import { homedir } from 'node:os';
import { join } from 'node:path';
import type { OmoSciConfig } from './types';

/** ~/.config/opencode */
export const OPENCODE_CONFIG_DIR = join(homedir(), '.config', 'opencode');

/** ~/.config/opencode/omo-sci.jsonc — 用户配置文件路径 */
export const OMO_SCI_CONFIG_PATH = join(OPENCODE_CONFIG_DIR, 'omo-sci.jsonc');

/** ~/.config/opencode/omo-sci */
export const OMO_SCI_DIR = join(OPENCODE_CONFIG_DIR, 'omo-sci');

/** ~/.config/opencode/omo-sci/profile */
export const OMO_SCI_PROFILE_DIR = join(OMO_SCI_DIR, 'profile');

/** ~/.config/opencode/omo-sci/projects */
export const OMO_SCI_PROJECTS_DIR = join(OMO_SCI_DIR, 'projects');

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
    mcp_required: [
      'unified_search',
      'search_cnki',
      'search_cochrane_reviews',
      'web_search_exa',
      'Consensus__search',
      'officecli',
    ],
    mcp_optional: ['zotero_search_items', 'browser_navigate'],
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
