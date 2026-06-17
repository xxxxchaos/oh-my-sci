/**
 * omo-sci 安装模块
 *
 * 生成 OpenCode 集成配置文件，写入 ~/.config/opencode/omo-sci.jsonc。
 * 同时也创建 .opencode/ 目录中的命令和 agent 配置。
 */

import * as path from "node:path";
import * as fsSync from "node:fs";
import { OMO_SCI_CONFIG_PATH, OPENCODE_CONFIG_DIR } from "./constants";
import type { OmoSciConfig, ProviderId, CapabilityCategory } from "./types";
import { PROVIDER_WHITELIST, getAvailableModels } from "./router/provider";
import { DEFAULT_FALLBACK_ORDERS, DEFAULT_MODEL_DENYLIST } from "./router/categories";
import {
  applyAgentModelPlan,
  buildAgentModelPlan,
  formatAgentModelPlan,
} from "./model-config";

// ====== 校验常量 ======

export const VALID_QUOTAS = [200000000, 500000000, 1000000000] as const;
export const DEFAULT_INSTALL_PROVIDERS: ProviderId[] = ['opencode-go'];
export const DEFAULT_INSTALL_QUOTA = 500000000;

function orderModelsForCategory(
  category: CapabilityCategory,
  models: OmoSciConfig['router']['categories'][CapabilityCategory]['fallback_chain'],
): OmoSciConfig['router']['categories'][CapabilityCategory]['fallback_chain'] {
  const order = DEFAULT_FALLBACK_ORDERS[category] ?? [];
  const denied = new Set(DEFAULT_MODEL_DENYLIST[category] ?? []);
  return [...models].filter(model => !denied.has(model.model_id)).sort((a, b) => {
    const aIndex = order.indexOf(a.model_id);
    const bIndex = order.indexOf(b.model_id);
    const aRank = aIndex === -1 ? Number.MAX_SAFE_INTEGER : aIndex;
    const bRank = bIndex === -1 ? Number.MAX_SAFE_INTEGER : bIndex;
    if (aRank !== bRank) return aRank - bRank;
    if (a.provider === 'opencode-go' && b.provider !== 'opencode-go') return -1;
    if (a.provider !== 'opencode-go' && b.provider === 'opencode-go') return 1;
    return 0;
  });
}

// ====== 类型定义 ======

export interface InstallOptions {
  noTui: boolean;
  providers?: string[];
  quota?: number;
}

// ====================================================================
// Config Generator
// ====================================================================

/**
 * 根据用户选择的 providers 和 quota 生成完整 OmoSciConfig
 *
 * @param providers 提供商 ID 列表
 * @param quota 月配额（token 数）
 * @param [_disableTui] 保留兼容的非交互安装参数
 * @returns 完整的 OmoSciConfig 对象
 * @throws {Error} 校验失败时抛出
 */
export function generateConfig(
  providers: ProviderId[],
  quota: number,
  _disableTui?: boolean,
): OmoSciConfig {
  // ====== 输入校验 ======

  if (!providers || providers.length === 0) {
    throw new Error(
      "providers 不能为空。至少需要配置一个 API 提供商。支持的提供商: " +
        PROVIDER_WHITELIST.join(", "),
    );
  }

  for (const provider of providers) {
    if (!PROVIDER_WHITELIST.includes(provider)) {
      throw new Error(
        `不支持的提供商: "${provider}"。支持的提供商列表: ${PROVIDER_WHITELIST.join(", ")}`,
      );
    }
  }

  if (!VALID_QUOTAS.includes(quota as (typeof VALID_QUOTAS)[number])) {
    throw new Error(
      `无效的 quota: ${quota}。允许的配额值: ${VALID_QUOTAS.join(", ")}`,
    );
  }

  // ====== 构建配置 ======

  const availableModels = getAvailableModels(providers);

  const catIds: CapabilityCategory[] = [
    'agent-orchestration', 'deep-reasoning', 'chinese-writing',
    'fast-search', 'long-context', 'methodical-review',
  ];
  const categories = {} as Record<CapabilityCategory, OmoSciConfig['router']['categories'][CapabilityCategory]>;
  for (const cat of catIds) {
    categories[cat] = {
      category: cat,
      fallback_chain: orderModelsForCategory(cat, availableModels),
      concurrency_limit: cat === 'fast-search' ? 4 : 2,
    };
  }

  return {
    router: {
      categories,
      concurrency: { max_total_agents: 8 },
    },
    safety: { max_step: 50, max_time_minutes: 30, loop_detect_threshold: 5 },
    usage: {
      token_quota: quota,
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
        'tableone', 'gtsummary', 'finalfit', 'survival', 'coxme',
        'rms', 'MatchIt', 'WeightIt', 'mice', 'flowchart', 'ggplot2', 'patchwork',
      ],
      software: ['R', 'Pandoc', 'Git', 'PlotCase'],
    },
    installed_at: new Date().toISOString(),
  };
}

export function normalizeInstallOptions(options: InstallOptions): Required<InstallOptions> {
  return {
    noTui: options.noTui,
    providers: options.providers && options.providers.length > 0
      ? options.providers
      : [...DEFAULT_INSTALL_PROVIDERS],
    quota: options.quota ?? DEFAULT_INSTALL_QUOTA,
  };
}

// ====== 安装函数 ======

/**
 * 执行安装流程
 *
 * 调用 generateConfig() 生成配置，然后写入文件系统。
 *
 * @param options 安装选项
 * @param [installConfig] 可选安装配置
 * @param [installConfig.configDir] 配置目录（默认 ~/.config/opencode/omo-sci）
 * @param [installConfig.projectDir] 项目目录（默认 process.cwd()）
 * @returns 写入的配置文件路径
 * @throws {Error} 校验失败时抛出
 */
export async function install(
  options: InstallOptions,
  installConfig?: { configDir?: string; projectDir?: string },
): Promise<string> {
  // 使用 generateConfig 生成配置（包含输入校验）
  const normalized = normalizeInstallOptions(options);
  const config = generateConfig(normalized.providers as ProviderId[], normalized.quota, normalized.noTui);

  // ====== 路径解析 ======

  const configDir = installConfig?.configDir ?? OPENCODE_CONFIG_DIR;
  const projectDir = installConfig?.projectDir ?? process.cwd();
  const configPath = path.join(configDir, "omo-sci.jsonc");

  // ====== 写入 JSONC 配置 ======

  const fs = await import("fs");
  fs.mkdirSync(configDir, { recursive: true });

  const jsoncContent = generateConfigJsonc(config);
  await Bun.write(configPath, jsoncContent);

  // ====== 写入 .opencode 目录文件 ======

  const opencodeDir = path.join(projectDir, ".opencode");
  const commandsDir = path.join(opencodeDir, "commands");
  const agentsDir = path.join(opencodeDir, "agents");

  fs.mkdirSync(commandsDir, { recursive: true });
  fs.mkdirSync(agentsDir, { recursive: true });

  // 从包根目录 .opencode/ 递归复制 agent 和 command 文件
  function copyDir(src: string, dest: string): void {
    if (!fs.statSync(src).isDirectory()) return;
    for (const entry of fs.readdirSync(src)) {
      const srcPath = path.join(src, entry);
      const destPath = path.join(dest, entry);
      if (fs.statSync(srcPath).isDirectory()) {
        fs.mkdirSync(destPath, { recursive: true });
        copyDir(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }

  const pkgOmo = path.join(import.meta.dir, '..', '.opencode');
  if (fs.existsSync(pkgOmo) && fs.statSync(pkgOmo).isDirectory()) {
    copyDir(path.join(pkgOmo, 'agents'), agentsDir);
    copyDir(path.join(pkgOmo, 'commands'), commandsDir);
  }

  applyAgentModelPlan(agentsDir, config);

  // ====== 写入 opencode.json（OpenCode 注册）======
  const opencodeJsonPath = path.join(projectDir, "opencode.json");
  const opencodeJsonContent = JSON.stringify(mergeOpencodeConfig(opencodeJsonPath), null, 2) + "\n";
  await Bun.write(opencodeJsonPath, opencodeJsonContent);

  return configPath;
}

function mergeOpencodeConfig(opencodeJsonPath: string): Record<string, unknown> {
  let existing: Record<string, unknown> = {};

  if (fsSync.existsSync(opencodeJsonPath)) {
    try {
      existing = JSON.parse(fsSync.readFileSync(opencodeJsonPath, "utf8")) as Record<string, unknown>;
    } catch {
      existing = {};
    }
  }

  const plugins = Array.isArray(existing.plugin) ? existing.plugin : [];
  return {
    ...existing,
    plugin: Array.from(new Set([...plugins, "omo-sci"])),
  };
}

export function getInstallModelPlan(
  providers?: ProviderId[],
  quota: number = DEFAULT_INSTALL_QUOTA,
): string {
  const normalized = normalizeInstallOptions({ noTui: true, providers, quota });
  const config = generateConfig(normalized.providers as ProviderId[], normalized.quota, true);
  return formatAgentModelPlan(buildAgentModelPlan(config));
}

/**
 * 生成 JSONC 格式的配置内容
 *
 * 首先生成合法的 JSON，然后在序列化后的字符串中插入注释行。
 * 这样 stripJsoncComments() 总能还原为有效的 JSON。
 */
function generateConfigJsonc(config: OmoSciConfig): string {
  // 构建完整的数据对象，附带额外字段用于信息展示
  const fullConfig: Record<string, unknown> = {
    ...config,
    $schema: "https://opencode.ai/config.json",
    plugin: ["omo-sci"],
  };

  // 序列化为漂亮 JSON
  const json = JSON.stringify(fullConfig, null, "  ");

  // 按行拆解，在关键字段前插入注释
  const lines = json.split("\n");
  const result: string[] = [
    "// omo-sci 配置文件",
    "// 由 `omo-sci install` 生成，可手动编辑",
    "{",
  ];

  const indent = "  ";
  let i = 1; // 跳过第 0 行 "{"

  const commentMap: Array<{ key: string; comment: string }> = [
    { key: '"router"', comment: "分类路由配置——各能力分类的模型 fallback 链" },
    { key: '"safety"', comment: "安全机制配置——熔断器和循环检测" },
    { key: '"usage"', comment: "用量监控——月配额和当前使用量" },
    { key: '"environment"', comment: "环境就绪检查——必需 MCP 工具和软件" },
    {
      key: '"plugin"',
      comment:
        "OpenCode 原生集成——命令文件在 .opencode/commands/, agent 文件在 .opencode/agents/",
    },
  ];

  for (; i < lines.length - 1; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    for (const entry of commentMap) {
      if (trimmed.startsWith(`"${entry.key}"`) || trimmed.startsWith(entry.key)) {
        const commentLines = entry.comment.split("\n");
        for (const cl of commentLines) {
          result.push(`${indent}// ${cl}`);
        }
        break;
      }
    }

    result.push(line);
  }

  result.push("}");
  result.push("");

  return result.join("\n");
}
