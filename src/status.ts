/**
 * omo-sci 状态查看模块
 */

import { getConfigPath } from "./doctor";
import type { OmoSciConfig } from "./types";

export interface StatusInfo {
  installed: boolean;
  configPath: string;
  config: OmoSciConfig | null;
}

/**
 * 读取并返回当前配置状态
 */
export async function getStatus(): Promise<StatusInfo> {
  const configPath = getConfigPath();
  const configFile = Bun.file(configPath);
  const exists = await configFile.exists();

  if (!exists) {
    return {
      installed: false,
      configPath,
      config: null,
    };
  }

  try {
    const text = await configFile.text();
    // 解析 JSONC（去掉注释）
    const json = stripJsoncComments(text);
    const config = JSON.parse(json) as OmoSciConfig;
    return {
      installed: true,
      configPath,
      config,
    };
  } catch (err) {
    return {
      installed: false,
      configPath,
      config: null,
    };
  }
}

/** 简化版 JSONC 注释去除 */
function stripJsoncComments(text: string): string {
  return text
    .split("\n")
    .map((line) => {
      const trimmed = line.trimStart();
      if (trimmed.startsWith("//")) return "";
      return line;
    })
    .join("\n");
}

/** 格式化状态为控制台输出 */
export function formatStatus(status: StatusInfo): string {
  if (!status.installed) {
    return [
      "╔══════════════════════════════════════════╗",
      "║     omo-sci 未安装                        ║",
      "╚══════════════════════════════════════════╝",
      "",
      `  运行以下命令安装:`,
      `    bun run bin/omo-sci.ts install --providers deepseek,qwen-bailian --quota 500000000`,
      "",
    ].join("\n");
  }

  const config = status.config;
  if (!config) {
    return [
      "╔══════════════════════════════════════════╗",
      "║     omo-sci 配置文件损坏                  ║",
      "╚══════════════════════════════════════════╝",
      "",
      `  配置文件: ${status.configPath}`,
      "  文件存在但解析失败，请尝试重新安装",
      "",
    ].join("\n");
  }

  const lines: string[] = [
    "╔══════════════════════════════════════════╗",
    "║     omo-sci 状态                          ║",
    "╚══════════════════════════════════════════╝",
    "",
    `  状态: 已安装`,
    `  配置: ${status.configPath}`,
    `  安装时间: ${config.installed_at ?? "未知"}`,
    `  月配额: ${(config.usage.token_quota / 100000000).toFixed(1)} 亿 tokens`,
    `  Token 余量: 未监控（待实现用量追踪）`,
    "",
    `  能力分类 → 模型 fallback 链:`,
  ];

  for (const [category, catConfig] of Object.entries(config.router.categories)) {
    const models = catConfig.fallback_chain.map(m => `${m.provider}/${m.model_id}`);
    lines.push(`    ${category} (并发=${catConfig.concurrency_limit}): ${models.join(" → ") || "（空）"}`);
  }

  return lines.join("\n");
}
