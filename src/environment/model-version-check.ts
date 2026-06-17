/**
 * 模型版本检查
 *
 * 国产模型迭代极快（智谱 3 个月 3 版本），
 * 定期检查用户配置的模型是否有可用升级。
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/** 模型最新版本注册表 */
export const LATEST_MODEL_VERSIONS: Record<string, { latest: string; released: string; note: string }> = {
  'glm-5.1': { latest: 'glm-5.2', released: '2026-06-13', note: 'Code V3 全球第三，编码能力质变，1M 上下文。建议升级。' },
  'glm-5': { latest: 'glm-5.2', released: '2026-06-13', note: '已更新两代，建议直接升级到 GLM-5.2。' },
  'qwen3.7-max': { latest: 'qwen3.7-plus', released: '2026-05-20', note: 'Plus 版 Agent 能力持平、价格 1/6、支持视觉，编排层推荐切换。' },
  'kimi-k2.7-code': { latest: 'kimi-k2.6', released: '2026-04-21', note: 'K2.7 是纯编程模型，非编程任务应使用 K2.6。' },
  // 无更高级版本的模型不在此列表中
};

export interface ModelVersionCheckResult {
  agent: string;
  currentModel: string;
  currentVersion: string;
  latestVersion: string;
  note: string;
  status: 'ok' | 'upgrade_available' | 'deprecated';
}

/**
 * 提取模型 ID（去掉 provider 前缀）
 * 例如: "opencode-go/qwen3.7-max" → "qwen3.7-max"
 */
function extractModelId(modelKey: string): string {
  const parts = modelKey.split('/');
  return parts.length === 2 ? parts[1] : modelKey;
}

/**
 * 读取项目 agent 配置，检测是否有可用升级
 */
export function checkModelVersions(projectDir?: string): ModelVersionCheckResult[] {
  const dir = projectDir ?? process.cwd();
  const agentsDir = join(dir, '.opencode', 'agents');

  if (!existsSync(agentsDir)) {
    return [];
  }

  const results: ModelVersionCheckResult[] = [];

  for (const file of readdirSync(agentsDir).filter(f => f.endsWith('.md'))) {
    const agent = file.replace(/\.md$/, '');
    const content = readFileSync(join(agentsDir, file), 'utf-8');

    // 读取 model: 行
    const modelMatch = content.match(/^model:\s*(.+)$/m);
    if (!modelMatch) continue;

    const currentModel = modelMatch[1].trim();
    const currentVersion = extractModelId(currentModel);
    const entry = LATEST_MODEL_VERSIONS[currentVersion];

    if (!entry) {
      // 无更高级版本，标记为 ok
      results.push({
        agent,
        currentModel,
        currentVersion,
        latestVersion: currentVersion,
        note: '当前为最新版本',
        status: 'ok',
      });
      continue;
    }

    // 有升级可用
    const isDeprecated = entry.latest !== currentVersion && (
      currentVersion.includes('glm-5') && !currentVersion.includes('glm-5.2')
    );

    results.push({
      agent,
      currentModel,
      currentVersion,
      latestVersion: entry.latest,
      note: entry.note,
      status: isDeprecated ? 'deprecated' : 'upgrade_available',
    });
  }

  return results;
}

/**
 * 格式化版本检查结果为可读字符串
 */
export function formatModelVersionResults(results: ModelVersionCheckResult[]): string {
  if (results.length === 0) {
    return '  未检查到 agent 配置（.opencode/agents/ 不存在或为空）';
  }

  const lines: string[] = ['  模型版本检查:'];
  let hasUpgrade = false;

  for (const r of results) {
    if (r.status === 'ok') continue;

    hasUpgrade = true;
    const icon = r.status === 'deprecated' ? '✗' : '⚠';
    lines.push(`    ${icon}  ${r.agent}: ${r.currentModel}`);
    lines.push(`       建议升级 → ${r.latestVersion}`);
    lines.push(`       原因: ${r.note}`);
  }

  if (!hasUpgrade) {
    lines.push('    ✓ 所有 agent 模型均为最新版本');
  }

  return lines.join('\n');
}
