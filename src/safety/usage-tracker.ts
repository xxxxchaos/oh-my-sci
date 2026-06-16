import { loadConfig } from '../config';
import { OMO_SCI_CONFIG_PATH } from '../constants';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { modify, applyEdits } from 'jsonc-parser';

interface UsageRecord {
  timestamp: string; agent: string; stage: string; input_tokens: number; output_tokens: number;
}

export function recordUsage(record: UsageRecord): { currentUsage: number; quotaPercent: number; warningLevel: 'none' | 'light' | 'moderate' | 'critical' } {
  const config = loadConfig();
  const totalTokens = record.input_tokens + record.output_tokens;
  const newUsage = config.usage.current_usage + totalTokens;
  if (existsSync(OMO_SCI_CONFIG_PATH)) {
    const raw = readFileSync(OMO_SCI_CONFIG_PATH, 'utf-8');
    const edits = modify(raw, ['usage', 'current_usage'], newUsage, {});
    writeFileSync(OMO_SCI_CONFIG_PATH, applyEdits(raw, edits), 'utf-8');
  }
  config.usage.current_usage = newUsage;
  const pct = (newUsage / config.usage.token_quota) * 100;
  let warningLevel: 'none' | 'light' | 'moderate' | 'critical' = 'none';
  if (pct >= 100) warningLevel = 'critical';
  else if (pct >= 80) warningLevel = 'moderate';
  else if (pct >= 50) warningLevel = 'light';
  return { currentUsage: newUsage, quotaPercent: Math.round(pct), warningLevel };
}

export function getQuotaWarning(level: 'light' | 'moderate' | 'critical'): string {
  switch (level) {
    case 'light': return '当前项目 token 消耗已达额度的 50%。';
    case 'moderate': return '接近额度上限了。后续任务我会优先用轻量模型（MiniMax M3 / Kimi K2.7），把 DeepSeek V4 Pro 留给最关键的分析步骤。';
    case 'critical': return '本月 token 额度已用完。当前进度已写入 Material Passport，下个月可以无缝恢复。或您现在调整额度上限。';
    default: return '';
  }
}
