/**
 * sci-agent 命令处理器
 *
 * 查看/切换当前项目所有 agent 的模型分配。
 * 可在 CLI (`omo-sci agent`) 和 OpenCode (`/sci-agent`) 中复用。
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { loadConfig } from '../config';
import { extractAgentModels, AGENT_CATEGORIES } from '../model-config';
import { AGENT_DISPLAY_NAMES, CATEGORY_LABELS } from '../router/categories';
import type { AgentName, CapabilityCategory } from '../types';

// ====================================================================
// 类型
// ====================================================================

export interface AgentStatus {
  /** agent 文件名（不含 .md） */
  agentName: string;
  /** 中文显示名 */
  displayName: string;
  /** 当前使用的模型（model: 字段） */
  currentModel: string;
  /** fallback 队列 */
  fallbackChain: string[];
  /** 分类中文标签 */
  categoryLabel: string;
}

// ====================================================================
// 核心函数
// ====================================================================

/**
 * 读取项目 `.opencode/agents/*.md` frontmatter，
 * 结合 omo-sci.jsonc 配置，返回每个 agent 的模型分配状态
 */
export function getAgentStatus(projectDir?: string): AgentStatus[] {
  const dir = projectDir ?? process.cwd();
  const agentsDir = join(dir, '.opencode', 'agents');

  if (!existsSync(agentsDir)) {
    return [];
  }

  // 加载 omo-sci 配置（用于 fallback 可用性参考，同时作为兜底）
  loadConfig();

  return readdirSync(agentsDir)
    .filter(file => file.endsWith('.md'))
    .sort()
    .map(file => {
      const agentName = file.replace(/\.md$/, '');
      const content = readFileSync(join(agentsDir, file), 'utf-8');
      const models = extractAgentModels(content);

      const displayName =
        AGENT_DISPLAY_NAMES[agentName as AgentName] ?? agentName;
      const categoryKey = AGENT_CATEGORIES[agentName as AgentName];
      const categoryLabel = categoryKey
        ? (CATEGORY_LABELS[categoryKey] ?? categoryKey)
        : '未知';

      const [currentModel = '未配置', ...fallbackChain] = models;

      return {
        agentName,
        displayName,
        currentModel,
        fallbackChain,
        categoryLabel,
      };
    });
}

// ====================================================================
// 格式化输出
// ====================================================================

/**
 * 格式化 agent 模型分配表
 *
 * Agent        | 分类           | 当前模型                    | Fallback
 * dubin        | 编排调度 …     | opencode-go/qwen3.7-max    | deepseek/deepseek-v4-pro, …
 */
export function formatAgentTable(statuses: AgentStatus[]): string {
  if (statuses.length === 0) {
    return '未找到 agent 文件（.opencode/agents/ 不存在或为空）';
  }

  const lines: string[] = [];
  const header =
    'Agent'.padEnd(14) +
    '| 分类'.padEnd(30) +
    '| 当前模型'.padEnd(32) +
    '| Fallback';
  const sep =
    '─'.repeat(14) +
    '|' +
    '─'.repeat(30) +
    '|' +
    '─'.repeat(32) +
    '|' +
    '─'.repeat(50);

  lines.push(header);
  lines.push(sep);

  for (const s of statuses) {
    const agent = s.agentName.padEnd(13);
    const cat = s.categoryLabel.slice(0, 28).padEnd(29);
    const model = s.currentModel.padEnd(31);
    const fallback =
      s.fallbackChain.length > 0 ? s.fallbackChain.join(', ') : '无';
    lines.push(`${agent}| ${cat}| ${model}| ${fallback}`);
  }

  return lines.join('\n');
}

/**
 * 列出 omo-sci 配置中每类能力分类的可用 model，
 * 含 context_window / max_output 信息
 */
export function formatProviderList(): string {
  const config = loadConfig();
  const categories = config.router.categories;

  if (!categories || Object.keys(categories).length === 0) {
    return 'omo-sci 配置中未找到 provider/模型配置。请先运行 `omo-sci configure`。';
  }

  const lines: string[] = [];
  lines.push('omo-sci 配置 —— 各能力分类的可用模型');
  lines.push('');

  for (const [key, catConfig] of Object.entries(categories)) {
    const label = CATEGORY_LABELS[key as CapabilityCategory] ?? key;
    const decor = '─'.repeat(Math.min(label.length, 40));
    lines.push(`  ${label}`);
    lines.push(`  ${decor}`);

    const chain = catConfig.fallback_chain;
    if (chain.length === 0) {
      lines.push('    (未配置模型)');
    } else {
      for (const model of chain) {
        lines.push(
          `    ${model.provider}/${model.model_id}` +
            `  (ctx: ${model.context_window.toLocaleString()},` +
            ` max: ${model.max_output.toLocaleString()})`,
        );
      }
    }
    lines.push('');
  }

  return joinLines(lines);
}

function joinLines(lines: string[]): string {
  return lines.join('\n');
}
