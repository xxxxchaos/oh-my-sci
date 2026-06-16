import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { AgentName, CapabilityCategory, ModelSpec, OmoSciConfig } from './types';

export interface AgentModelBinding {
  agent: AgentName;
  category: CapabilityCategory;
  model?: string;
  fallback: string[];
}

export interface AgentModelCheck {
  agent: string;
  status: 'ok' | 'warn' | 'error';
  message: string;
}

export const AGENT_CATEGORIES: Record<AgentName, CapabilityCategory> = {
  dubin: 'agent-orchestration',
  archimedes: 'deep-reasoning',
  irber: 'agent-orchestration',
  pubmeder: 'fast-search',
  spsser: 'deep-reasoning',
  writer: 'chinese-writing',
  submitter: 'agent-orchestration',
  ebmer: 'methodical-review',
  polisher: 'chinese-writing',
};

export function modelKey(model: ModelSpec): string {
  return `${model.provider}/${model.model_id}`;
}

export function buildAgentModelPlan(config: OmoSciConfig): AgentModelBinding[] {
  return Object.entries(AGENT_CATEGORIES).map(([agent, category]) => {
    const chain = config.router.categories[category]?.fallback_chain ?? [];
    const [primary, ...fallbacks] = chain.map(modelKey);
    return {
      agent: agent as AgentName,
      category,
      model: primary,
      fallback: fallbacks,
    };
  });
}

export function formatAgentModelPlan(plan: AgentModelBinding[]): string {
  const lines = [
    '模型分配计划（将写入 .opencode/agents/*.md）:',
    '  Agent        Category              Primary model                    Fallback',
  ];

  for (const item of plan) {
    const primary = item.model ?? '未配置';
    const fallback = item.fallback.length > 0 ? item.fallback.join(' -> ') : '无';
    lines.push(
      `  ${item.agent.padEnd(12)} ${item.category.padEnd(21)} ${primary.padEnd(32)} ${fallback}`,
    );
  }

  return lines.join('\n');
}

export function applyAgentModelPlan(agentsDir: string, config: OmoSciConfig): void {
  const plan = buildAgentModelPlan(config);

  for (const item of plan) {
    const filePath = join(agentsDir, `${item.agent}.md`);
    if (!existsSync(filePath)) continue;
    const content = readFileSync(filePath, 'utf-8');
    writeFileSync(filePath, rewriteAgentFrontmatter(content, item), 'utf-8');
  }
}

export function rewriteAgentFrontmatter(content: string, binding: AgentModelBinding): string {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) return content;

  const body = content.slice(match[0].length);
  const originalLines = match[1].split('\n');
  const lines: string[] = [];

  for (const line of originalLines) {
    if (line.startsWith('model: ') || line.startsWith('model_fallback: ')) continue;
    lines.push(line);
    if (line.startsWith('mode: ')) {
      if (binding.model) lines.push(`model: ${binding.model}`);
      if (binding.fallback.length > 0) {
        lines.push(`model_fallback: [${binding.fallback.map(m => `"${m}"`).join(', ')}]`);
      }
    }
  }

  return `---\n${lines.join('\n')}\n---\n\n${body.replace(/^\n+/, '')}`;
}

export function checkInstalledAgentModels(
  projectDir: string,
  config: OmoSciConfig,
): AgentModelCheck[] {
  const agentsDir = join(projectDir, '.opencode', 'agents');
  if (!existsSync(agentsDir)) {
    return [{ agent: '*', status: 'error', message: `${agentsDir} 不存在，尚未安装 OpenCode agents` }];
  }

  const allowedModels = new Set(
    Object.values(config.router.categories)
      .flatMap(category => category.fallback_chain)
      .map(modelKey),
  );

  return readdirSync(agentsDir)
    .filter(file => file.endsWith('.md'))
    .sort()
    .map((file) => {
      const agent = file.replace(/\.md$/, '');
      const content = readFileSync(join(agentsDir, file), 'utf-8');
      const models = extractAgentModels(content);
      if (models.length === 0) {
        return { agent, status: 'error', message: '缺少 model/model_fallback，OpenCode 将无法按计划路由' };
      }

      const unknown = models.filter(model => !allowedModels.has(model));
      if (unknown.length > 0) {
        return {
          agent,
          status: 'warn',
          message: `agent 使用了未出现在 omo-sci 配置中的模型: ${unknown.join(', ')}`,
        };
      }

      return {
        agent,
        status: 'ok',
        message: `模型链: ${models.join(' -> ')}`,
      };
    });
}

export function extractAgentModels(content: string): string[] {
  const models: string[] = [];
  const primary = content.match(/^model:\s*(.+)$/m)?.[1]?.trim();
  if (primary) models.push(primary);

  const fallbackRaw = content.match(/^model_fallback:\s*\[(.*)\]\s*$/m)?.[1];
  if (fallbackRaw) {
    const fallback = fallbackRaw
      .split(',')
      .map(item => item.trim().replace(/^["']|["']$/g, ''))
      .filter(Boolean);
    models.push(...fallback);
  }

  return models;
}
