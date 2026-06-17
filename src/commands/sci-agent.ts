/**
 * sci-agent 命令处理器
 *
 * 查看/切换当前项目所有 agent 的模型分配。
 * 可在 CLI (`omo-sci agent`) 和 OpenCode (`/sci-agent`) 中复用。
 */

import { readFileSync, existsSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadConfig } from '../config';
import { extractAgentModels, AGENT_CATEGORIES, applyAgentModelPlan, modelKey } from '../model-config';
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
// 模型切换
// ====================================================================

/**
 * 切换单个 agent 的模型（或全部 agent 切换到同一模型）
 *
 * 读取 .opencode/agents/<agent>.md，替换 model: 行，清除 model_fallback: 行。
 * agentName 为 'all' 时遍历全部 agent。
 *
 * @param agentName - agent 名（如 'dubin'）或 'all'
 * @param model - 模型 ID（如 'opencode-go/deepseek-v4-pro'）
 * @param projectDir - 项目目录（默认 process.cwd()）
 */
export function setAgentModel(
  agentName: string,
  model: string,
  projectDir?: string,
): { success: boolean; message: string } {
  const dir = projectDir ?? process.cwd();
  const agentsDir = join(dir, '.opencode', 'agents');

  // 'all' 模式：遍历全部 agent
  if (agentName === 'all') {
    if (!existsSync(agentsDir)) {
      return { success: false, message: `Agent 目录不存在: ${agentsDir}` };
    }

    const files = readdirSync(agentsDir).filter(f => f.endsWith('.md'));
    if (files.length === 0) {
      return { success: false, message: `Agent 目录中无 .md 文件: ${agentsDir}` };
    }

    const msgs: string[] = [];
    for (const f of files) {
      const name = f.replace(/\.md$/, '');
      const r = setAgentModel(name, model, projectDir);
      msgs.push(r.message);
    }

    return { success: true, message: msgs.join('\n') };
  }

  // 单 agent 模式
  const filePath = join(agentsDir, `${agentName}.md`);

  if (!existsSync(filePath)) {
    return { success: false, message: `Agent 文件不存在: ${filePath}` };
  }

  const content = readFileSync(filePath, 'utf-8');

  // 记录切换前的模型
  const oldModels = extractAgentModels(content);
  const oldStr = oldModels.length > 0 ? oldModels.join(' -> ') : '未配置';

  // 检查 frontmatter 是否包含 model: 行
  let newContent = content;

  if (content.match(/^model:\s*.+$/m)) {
    // 替换已有的 model: 行
    newContent = newContent.replace(/^model:\s*.+$/m, `model: ${model}`);
  } else {
    // 无 model: 行，在 mode: 行后插入
    newContent = newContent.replace(/^(mode:\s*.+)$/m, `$1\nmodel: ${model}`);
  }

  // 清除 model_fallback: 行（单模型切换时不需要 fallback）
  newContent = newContent.replace(/^model_fallback:\s*\[.*\]\s*\n?/m, '');

  writeFileSync(filePath, newContent, 'utf-8');

  // 记录切换后
  const newModels = extractAgentModels(newContent);
  const newStr = newModels.length > 0 ? newModels.join(' -> ') : '未配置';

  return {
    success: true,
    message: `Agent "${agentName}" 模型已更新:\n  之前: ${oldStr}\n  之后: ${newStr}`,
  };
}

/**
 * 恢复所有 agent 为按分类路由的默认模型分配
 *
 * 读取 ~/.config/opencode/omo-sci.jsonc 中的 router.categories，
 * 按 AGENT_CATEGORIES 映射重新生成每个 agent 的 model/model_fallback，
 * 写入所有 agent .md 文件，并返回更新后的 agent 表格。
 *
 * @param projectDir - 项目目录（默认 process.cwd()）
 */
export function resetAgentModels(
  projectDir?: string,
): { success: boolean; message: string; agentTable: string } {
  const dir = projectDir ?? process.cwd();
  const agentsDir = join(dir, '.opencode', 'agents');

  if (!existsSync(agentsDir)) {
    return { success: false, message: `Agent 目录不存在: ${agentsDir}`, agentTable: '' };
  }

  const config = loadConfig();
  applyAgentModelPlan(agentsDir, config);

  const statuses = getAgentStatus(projectDir);
  const table = formatAgentTable(statuses);

  return {
    success: true,
    message: '所有 agent 已恢复为按分类路由的默认模型分配。',
    agentTable: table,
  };
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
        const desc = MODEL_DESCRIPTIONS[`${model.provider}/${model.model_id}`];
        const providerTag = desc?.providerDesc
          ? `  [${desc.providerDesc}]`
          : `  [${model.provider}]`;
        lines.push(
          `    ${model.provider}/${model.model_id}` +
            `  (ctx: ${model.context_window.toLocaleString()},` +
            ` max: ${model.max_output.toLocaleString()})` +
            providerTag,
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

// ====================================================================
// 交互面板渲染
// ====================================================================

/** Agent 名称列表（显示顺序） */
export const AGENT_NAMES: AgentName[] = [
  'dubin', 'archimedes', 'irber', 'pubmeder', 'spsser',
  'writer', 'submitter', 'ebmer', 'polisher',
];

/** 模型中文描述映射表（key 格式: provider/model_id） */
export const MODEL_DESCRIPTIONS: Record<string, {
  desc: string;
  providerDesc: string;
  strengths: string;
  caveats: string;
}> = {
  // === OpenCode Go 订阅路径 ===
  'opencode-go/qwen3.7-max': {
    desc: '阿里千问旗舰模型',
    providerDesc: '来源: OpenCode Go 订阅（月费 ¥72，配额内不限量）',
    strengths: 'Agent 稳定性国产最强，MCP-Atlas 76.4，35h 长链路不崩',
    caveats: '闭源，输出偏冗长',
  },
  'opencode-go/deepseek-v4-pro': {
    desc: 'DeepSeek V4 Pro（通过 Go 订阅）',
    providerDesc: '来源: OpenCode Go 订阅（月费 ¥72，配额内不限量）',
    strengths: '编程与数学推理国内最强，LiveCodeBench 93.5，通过订阅免按量计费',
    caveats: 'Go 订阅配额有限，高峰期可能受限',
  },
  'opencode-go/glm-5.1': {
    desc: '智谱 GLM 旗舰模型（通过 Go 订阅）',
    providerDesc: '来源: OpenCode Go 订阅（月费 ¥72，配额内不限量）',
    strengths: '中文写作最优，MIT 开源，1M 上下文',
    caveats: '模型响应延迟较高(30-60s)',
  },
  'opencode-go/kimi-k2.7-code': {
    desc: 'Kimi K2.7 编程模型（通过 Go 订阅）',
    providerDesc: '来源: OpenCode Go 订阅（月费 ¥72，配额内不限量）',
    strengths: '性价比极高，MCP 工具调用出色，thinking tokens -30%',
    caveats: '上下文仅256K',
  },
  'opencode-go/minimax-m3': {
    desc: 'MiniMax M3（通过 Go 订阅）',
    providerDesc: '来源: OpenCode Go 订阅（月费 ¥72，配额内不限量）',
    strengths: '超长程韧性最强，原生多模态',
    caveats: '纯 benchmark 与 Claude 有差距',
  },
  'opencode-go/deepseek-v4-flash': {
    desc: 'DeepSeek V4 Flash（通过 Go 订阅）',
    providerDesc: '来源: OpenCode Go 订阅',
    strengths: '速度极快，订阅内不限量使用',
    caveats: '复杂推理有限',
  },

  // === 直接 API 路径 ===
  'deepseek/deepseek-v4-pro': {
    desc: 'DeepSeek V4 Pro（官方 API）',
    providerDesc: '来源: DeepSeek 官方 API（按量计费 $1.74/M 输入 + $3.48/M 输出）',
    strengths: '编程与数学推理国内最强，无中间商，响应更快',
    caveats: '按量计费，长任务费用可能高于订阅',
  },
  'deepseek/deepseek-v4-flash': {
    desc: 'DeepSeek V4 Flash（官方 API）',
    providerDesc: '来源: DeepSeek 官方 API（按量计费，成本极低）',
    strengths: '速度极快，成本极低，适合高频简单任务',
    caveats: '复杂推理能力有限',
  },

  // === 第三方 API 路径 ===
  'kimi/kimi-k2.7-code': {
    desc: 'Kimi K2.7（官方 API）',
    providerDesc: '来源: Kimi 开放平台（按量计费 $0.95/M 输入）',
    strengths: '价格是 GPT-5.5 的 1/5，MCP 工具调用出色',
    caveats: '上下文仅256K',
  },
  'zhipu/glm-5.2': {
    desc: '智谱 GLM-5.2（官方 API）',
    providerDesc: '来源: 智谱开放平台（按量计费）',
    strengths: '中文写作最优，MIT 开源，1M 上下文',
    caveats: '响应延迟较高(30-60s)',
  },
  'minimax/minimax-m3': {
    desc: 'MiniMax M3（官方 API）',
    providerDesc: '来源: MiniMax 开放平台 / Token Plan（$20/月起 ~1.7B tokens）',
    strengths: '超长程韧性最强，包月 Token Plan 成本可控',
    caveats: '纯 benchmark 与 Claude 有差距',
  },
  'qwen-bailian/qwen3.7-max': {
    desc: '阿里千问旗舰（百炼 API）',
    providerDesc: '来源: 阿里百炼（按量计费 $2.5/M 输入 + $7.5/M 输出）',
    strengths: 'Agent 稳定性国产最强，1M 上下文',
    caveats: '闭源，输出偏冗长',
  },
};

// ====================================================================
// 面板辅助 — 使用 CJK 视觉宽度进行对齐
// ====================================================================

const PANEL_W = 56;   // 面板总宽度（含边框）
const CONTENT_W = PANEL_W - 2; // 两 ║ 之间内容宽度

function visualLen(s: string): number {
  let len = 0;
  for (const ch of s) {
    const code = ch.charCodeAt(0);
    if ((code >= 0x4e00 && code <= 0x9fff) ||
        (code >= 0x3000 && code <= 0x303f) ||
        (code >= 0xff00 && code <= 0xffef)) {
      len += 2;
    } else {
      len += 1;
    }
  }
  return len;
}

function padVisual(s: string, targetW: number): string {
  const cur = visualLen(s);
  return cur >= targetW ? s : s + ' '.repeat(targetW - cur);
}

function boxTop(): string {
  return '╔' + '═'.repeat(CONTENT_W) + '╗';
}

function boxBottom(): string {
  return '╚' + '═'.repeat(CONTENT_W) + '╝';
}

function boxSep(): string {
  return '╠' + '═'.repeat(CONTENT_W) + '╣';
}

function boxLine(s: string): string {
  return '║' + padVisual(s, CONTENT_W) + '║';
}

function boxEmpty(): string {
  return '║' + ' '.repeat(CONTENT_W) + '║';
}

/**
 * collectAllModels — 从配置中收集所有唯一的模型键（去重，按分类顺序排列）
 */
export function collectAllModels(): { key: string; provider: string; id: string }[] {
  const config = loadConfig();
  const seen = new Set<string>();
  const models: { key: string; provider: string; id: string }[] = [];
  for (const catConfig of Object.values(config.router.categories)) {
    for (const spec of catConfig.fallback_chain) {
      const key = modelKey(spec);
      if (!seen.has(key)) {
        seen.add(key);
        models.push({ key, provider: spec.provider, id: spec.model_id });
      }
    }
  }
  return models;
}

/**
 * collectConfiguredProviders — 从配置中收集已配置的 provider ID（去重）
 */
function collectConfiguredProviders(): string[] {
  const config = loadConfig();
  const providerSet = new Set<string>();
  for (const catConfig of Object.values(config.router.categories)) {
    for (const spec of catConfig.fallback_chain) {
      providerSet.add(spec.provider);
    }
  }
  return Array.from(providerSet);
}

/**
 * formatQuota — 格式化 token 配额为中文亿单位
 */
function formatQuota(quota: number): string {
  return `${(quota / 100000000).toFixed(1)} 亿`;
}

/**
 * findModelSpecByKey — 在所有分类中查找指定模型键的规格
 */
function findModelSpecByKey(key: string): { context_window: number; max_output: number; provider: string; model_id: string } | undefined {
  const config = loadConfig();
  const allSpecs = Object.values(config.router.categories).flatMap(c => c.fallback_chain);
  return allSpecs.find(s => modelKey(s) === key);
}

// ====================================================================
// 模型分组辅助
// ====================================================================

interface ModelGroupEntry {
  key: string;
  provider: string;
  id: string;
}

interface ModelGroup {
  header: string;
  models: ModelGroupEntry[];
}

/**
 * 将模型列表按 provider 类型分组（订阅优先，API 在后）
 */
function groupModelsByProvider(models: ModelGroupEntry[]): ModelGroup[] {
  const groups: ModelGroup[] = [];

  const subModels = models.filter(m => m.provider === 'opencode-go');
  const apiModels = models.filter(m => m.provider !== 'opencode-go');

  if (subModels.length > 0) {
    groups.push({
      header: '★ 推荐 — OpenCode Go 订阅（月费 ¥72 包月）',
      models: subModels,
    });
  }

  if (apiModels.length > 0) {
    groups.push({
      header: '── 按量计费 API ──',
      models: apiModels,
    });
  }

  return groups;
}

// ====================================================================
// 面板渲染函数
// ====================================================================

/**
 * renderMainPanel — 首页信息面板
 */
export function renderMainPanel(projectDir?: string, version?: string): string {
  const dir = projectDir ?? process.cwd();
  const config = loadConfig();
  const statuses = getAgentStatus(projectDir);
  const v = version ? `v${version.replace(/^v/, '')}` : '';

  const providers = collectConfiguredProviders().join(', ');
  const quotaStr = formatQuota(config.usage.token_quota);

  const lines: string[] = [];

  lines.push(boxTop());
  lines.push(boxLine(padVisual('omo-sci Agent 模型管理', CONTENT_W)));
  lines.push(boxLine(padVisual(v, CONTENT_W)));
  lines.push(boxSep());
  lines.push(boxEmpty());
  lines.push(boxLine(`  当前项目: ${dir}`));
  lines.push(boxLine(providers ? `  已配置 providers: ${providers}` : '  未配置 providers'));
  lines.push(boxLine(`  已配置 quota: ${quotaStr} tokens/月`));
  lines.push(boxEmpty());

  // Agent 模型分配内嵌框
  const innerW = CONTENT_W - 4; // 左右各 2 空格缩进
  const innerTitle = ' Agent 模型分配 ';
  const innerTitleVis = visualLen(innerTitle);
  const innerFill = Math.max(0, innerW - 4 - innerTitleVis);

  lines.push(boxLine('  ┌─' + innerTitle + '─'.repeat(innerFill) + '┐  '));

  if (statuses.length === 0) {
    lines.push(boxLine('  │  （未发现 agent 文件）' + ' '.repeat(Math.max(0, innerW - 26)) + '│  '));
  } else {
    for (let i = 0; i < statuses.length; i++) {
      const s = statuses[i];
      const idx = String(i + 1);
      const agentLine = `${idx}. ${s.agentName.padEnd(10)} ${s.categoryLabel.slice(0, 18).padEnd(18)} ${s.currentModel}`;
      const innerContent = '  │  ' + padVisual(agentLine, innerW - 6) + '│  ';
      lines.push(boxLine(innerContent));
    }
  }

  lines.push(boxLine('  └' + '─'.repeat(innerW - 2) + '┘  '));
  lines.push(boxEmpty());
  lines.push(boxLine('  快捷操作:'));
  lines.push(boxLine('  [1-9] 选择 agent 切换模型'));
  lines.push(boxLine('  [A] 全部切换为同一模型'));
  lines.push(boxLine('  [R] 恢复默认分配（按分类路由）'));
  lines.push(boxLine('  [P] 查看可用模型池'));
  lines.push(boxLine('  [Q] 退出'));
  lines.push(boxEmpty());
  lines.push(boxBottom());

  return lines.join('\n');
}

/**
 * renderModelPicker — 为指定 agent 显示模型选择面板
 */
export function renderModelPicker(agentName: string, projectDir?: string): string {
  const config = loadConfig();
  const statuses = getAgentStatus(projectDir);
  const agent = statuses.find(s => s.agentName === agentName);
  const displayName = AGENT_DISPLAY_NAMES[agentName as AgentName] ?? agentName;
  const category = AGENT_CATEGORIES[agentName as AgentName];
  const categoryLabel = category ? (CATEGORY_LABELS[category] ?? category) : '未知';
  const currentModel = agent?.currentModel ?? '未配置';

  // 收集可用模型并按 provider 分组
  const allModels = collectAllModels();
  const groups = groupModelsByProvider(allModels);

  const lines: string[] = [];
  lines.push(boxTop());
  lines.push(boxLine(padVisual(`  为 ${displayName} 选择模型`, CONTENT_W)));
  lines.push(boxLine(padVisual(`  能力分类: ${categoryLabel}`, CONTENT_W)));
  lines.push(boxLine(padVisual(`  当前模型: ${currentModel}`, CONTENT_W)));
  lines.push(boxSep());
  lines.push(boxEmpty());

  if (allModels.length === 0) {
    lines.push(boxLine(padVisual('  无可选模型（请先运行 omo-sci configure 配置模型）', CONTENT_W)));
  } else {
    lines.push(boxLine(padVisual('  可选模型（按推荐度排序）:', CONTENT_W)));
    lines.push(boxEmpty());

    let globalIndex = 0;

    for (const group of groups) {
      // 分组标题
      lines.push(boxLine(padVisual(`  ${group.header}`, CONTENT_W)));
      lines.push(boxEmpty());

      for (const m of group.models) {
        globalIndex++;
        const isCurrent = m.key === currentModel;
        const star = isCurrent ? ' ⭐' : '';
        const curLabel = isCurrent ? '  ← 当前' : '';
        const name = `  ${globalIndex}.${star} ${m.key}${curLabel}`;

        lines.push(boxLine(padVisual(name, CONTENT_W)));

        // 显示模型参数
        const spec = findModelSpecByKey(m.key);
        if (spec) {
          const params = `     上下文 ${(spec.context_window / 1000).toFixed(0)}K | 输出 ${(spec.max_output / 1000).toFixed(0)}K`;
          lines.push(boxLine(padVisual(params, CONTENT_W)));
        }

        // 显示中文描述 + 来源
        const desc = MODEL_DESCRIPTIONS[m.key];
        if (desc) {
          const descLine = `     ${desc.desc} · ${desc.strengths}`;
          const truncated = visualLen(descLine) > CONTENT_W - 4
            ? descLine.slice(0, CONTENT_W - 8) + '…'
            : descLine;
          lines.push(boxLine(padVisual(truncated, CONTENT_W)));

          // 如果 providerDesc 有额外信息（非简单重复），显示来源行
          if (desc.providerDesc && desc.providerDesc.length > 0) {
            const provLine = `     ${desc.providerDesc}`;
            const provTruncated = visualLen(provLine) > CONTENT_W - 4
              ? provLine.slice(0, CONTENT_W - 8) + '…'
              : provLine;
            lines.push(boxLine(padVisual(provTruncated, CONTENT_W)));
          }
        }

        lines.push(boxEmpty());
      }
    }
  }

  lines.push(boxLine('  输入 [1-N] 选择模型，或 [Q] 返回上级'));
  lines.push(boxEmpty());
  lines.push(boxBottom());

  return lines.join('\n');
}

/**
 * renderProviderPool — 查看可用模型池
 */
export function renderProviderPool(): string {
  const config = loadConfig();
  const allModels = collectAllModels();
  const groups = groupModelsByProvider(allModels);

  const lines: string[] = [];
  lines.push(boxTop());
  lines.push(boxLine(padVisual('  可用模型池', CONTENT_W)));
  lines.push(boxSep());
  lines.push(boxEmpty());

  if (allModels.length === 0) {
    lines.push(boxLine(padVisual('  未配置模型（请先运行 omo-sci configure）', CONTENT_W)));
  } else {
    for (const group of groups) {
      // 分组标题
      lines.push(boxLine(padVisual(`  ${group.header}`, CONTENT_W)));
      lines.push(boxEmpty());

      for (const m of group.models) {
        const spec = [...Object.values(config.router.categories).flatMap(c => c.fallback_chain)]
          .find(s => modelKey(s) === m.key);

        const nameLine = `  ${m.key}`;
        lines.push(boxLine(padVisual(nameLine, CONTENT_W)));

        if (spec) {
          const params = `    上下文 ${(spec.context_window / 1000).toFixed(0)}K | 输出 ${(spec.max_output / 1000).toFixed(0)}K`;
          lines.push(boxLine(padVisual(params, CONTENT_W)));
        }

        const desc = MODEL_DESCRIPTIONS[m.key];
        if (desc) {
          lines.push(boxLine(padVisual(`    ${desc.desc} · ${desc.strengths}`, CONTENT_W)));
          if (desc.providerDesc) {
            lines.push(boxLine(padVisual(`    ${desc.providerDesc}`, CONTENT_W)));
          }
          if (desc.caveats) {
            lines.push(boxLine(padVisual(`    ⚠ ${desc.caveats}`, CONTENT_W)));
          }
        }
        lines.push(boxEmpty());
      }
    }
  }

  lines.push(boxLine('  按回车返回...'));
  lines.push(boxEmpty());
  lines.push(boxBottom());

  return lines.join('\n');
}

/**
 * renderAllSwitchPicker — 全部 agent 切换模型面板
 */
export function renderAllSwitchPicker(projectDir?: string): string {
  const allModels = collectAllModels();
  const groups = groupModelsByProvider(allModels);

  const lines: string[] = [];
  lines.push(boxTop());
  lines.push(boxLine(padVisual('  全部 agent 切换为同一模型', CONTENT_W)));
  lines.push(boxSep());
  lines.push(boxEmpty());

  if (allModels.length === 0) {
    lines.push(boxLine(padVisual('  无可选模型（请先运行 omo-sci configure 配置模型）', CONTENT_W)));
  } else {
    let globalIndex = 0;

    for (const group of groups) {
      // 分组标题
      lines.push(boxLine(padVisual(`  ${group.header}`, CONTENT_W)));
      lines.push(boxEmpty());

      for (const m of group.models) {
        globalIndex++;
        const name = `  ${globalIndex}. ${m.key}`;
        lines.push(boxLine(padVisual(name, CONTENT_W)));

        const config = loadConfig();
        const spec = [...Object.values(config.router.categories).flatMap(c => c.fallback_chain)]
          .find(s => modelKey(s) === m.key);
        if (spec) {
          const params = `    上下文 ${(spec.context_window / 1000).toFixed(0)}K | 输出 ${(spec.max_output / 1000).toFixed(0)}K`;
          lines.push(boxLine(padVisual(params, CONTENT_W)));
        }

        // 显示中文描述
        const desc = MODEL_DESCRIPTIONS[m.key];
        if (desc) {
          const descLine = `    ${desc.desc} · ${desc.strengths}`;
          const truncated = visualLen(descLine) > CONTENT_W - 4
            ? descLine.slice(0, CONTENT_W - 8) + '…'
            : descLine;
          lines.push(boxLine(padVisual(truncated, CONTENT_W)));
        }

        lines.push(boxEmpty());
      }
    }
  }

  lines.push(boxLine('  输入模型编号 [1-N] 或 [Q] 返回上级'));
  lines.push(boxEmpty());
  lines.push(boxBottom());

  return lines.join('\n');
}
