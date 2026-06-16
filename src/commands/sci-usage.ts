/**
 * sci-usage 命令处理器
 *
 * 读取 loadConfig().usage，格式化用量进度条。
 */

import { loadConfig } from "../config";
import type { UsageConfig } from "../types";

/**
 * 计算用量信息
 */
export function getUsageInfo(): UsageConfig {
  return loadConfig().usage;
}

/**
 * 格式化用量进度条
 *
 * @param usage 用量配置（可选，默认从 loadConfig() 读取）
 * @param barWidth 进度条宽度（默认 40 字符）
 */
export function formatUsageBar(usage?: UsageConfig, barWidth: number = 40): string {
  const u = usage ?? getUsageInfo();
  const ratio = u.token_quota > 0 ? u.current_usage / u.token_quota : 0;
  const pct = Math.min(ratio, 1);
  const filled = Math.round(pct * barWidth);
  const empty = barWidth - filled;

  const bar = "█".repeat(filled) + "░".repeat(empty);
  const usedStr = (u.current_usage / 1e8).toFixed(2);
  const quotaStr = (u.token_quota / 1e8).toFixed(2);

  return [
    "╔══════════════════════════════════════════╗",
    "║     omo-sci 用量监控                     ║",
    "╚══════════════════════════════════════════╝",
    "",
    `  Token 用量: ${usedStr} 亿 / ${quotaStr} 亿`,
    `  [${bar}]  ${(pct * 100).toFixed(1)}%`,
    `  配额重置日: ${u.quota_reset_date}`,
    "",
  ].join("\n");
}
