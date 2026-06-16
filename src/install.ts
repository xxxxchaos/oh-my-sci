/**
 * omo-sci 安装模块
 *
 * 生成 OpenCode 集成配置文件，写入 ~/.config/opencode/omo-sci.jsonc。
 * 同时也创建 .opencode/ 目录中的命令和 agent 配置。
 */

import * as path from "node:path";
import { OMO_SCI_CONFIG_PATH, OPENCODE_CONFIG_DIR } from "./constants";
import type { OmoSciConfig, ProviderId, CapabilityCategory } from "./types";
import { PROVIDER_WHITELIST, getAvailableModels } from "./router/provider";

// ====== 校验常量 ======

export const VALID_QUOTAS = [200000000, 500000000, 1000000000] as const;

// ====== 类型定义 ======

export interface InstallOptions {
  noTui: boolean;
  providers: string[];
  quota: number;
}

// ====================================================================
// Config Generator
// ====================================================================

/**
 * 根据用户选择的 providers 和 quota 生成完整 OmoSciConfig
 *
 * @param providers 提供商 ID 列表
 * @param quota 月配额（token 数）
 * @param [disableTui] 是否跳过交互模式输出
 * @returns 完整的 OmoSciConfig 对象
 * @throws {Error} 校验失败时抛出
 */
export function generateConfig(
  providers: ProviderId[],
  quota: number,
  disableTui?: boolean,
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

  if (!disableTui) {
    console.log("交互式 TUI 模式（待实现）");
    console.log("使用 --no-tui 可跳过交互，直接写入配置");
  }

  const availableModels = getAvailableModels(providers);

  const catIds: CapabilityCategory[] = [
    'agent-orchestration', 'deep-reasoning', 'chinese-writing',
    'fast-search', 'long-context', 'methodical-review',
  ];
  const categories = {} as Record<CapabilityCategory, OmoSciConfig['router']['categories'][CapabilityCategory]>;
  for (const cat of catIds) {
    categories[cat] = {
      category: cat,
      fallback_chain: availableModels,
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
  const config = generateConfig(options.providers as ProviderId[], options.quota, options.noTui);

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

  // 写入 sci-doctor 命令
  const doctorCommandContent = [
    "---",
    'description: "omo-sci 环境诊断 — 检查依赖和配置状态"',
    "agent: dubin",
    "---",
    "运行 omo-sci 环境诊断工具，检查当前系统是否满足要求。",
    "",
    "请执行以下命令并展示结果：",
    "```bash",
    "bun run bin/omo-sci.ts doctor",
    "```",
    "",
    "用中文解释每项检查结果的含义，给出修复建议（如有错误或警告）。",
  ].join("\n");
  await Bun.write(path.join(commandsDir, "sci-doctor.md"), doctorCommandContent);

  // 写入 sci-status 命令
  const statusCommandContent = [
    "---",
    'description: "omo-sci 状态查看 — 查看当前项目中的 omo-sci 配置信息"',
    "agent: dubin",
    "---",
    "查看 omo-sci 的当前配置和状态信息。",
    "",
    "请执行以下命令并展示结果：",
    "```bash",
    "bun run bin/omo-sci.ts status",
    "```",
  ].join("\n");
  await Bun.write(path.join(commandsDir, "sci-status.md"), statusCommandContent);

  // 写入 dubin agent 配置
  const dubinAgentContent = [
    "---",
    'description: "医学科研主编排者 — 从临床困惑到完整研究方案"',
    "mode: primary",
    "permission:",
    "  read: allow",
    "  edit: ask",
    "  bash: allow",
    "  glob: allow",
    "  grep: allow",
    "color: primary",
    "---",
    "你是 Dubin，医学科研团队的主编排者。",
    "",
    "## 你的角色",
    "",
    "你是中国临床研究者的 AI 研究伙伴。你帮助用户把临床困惑转化为可执行的研究方案，并编排整个研究团队完成从设计到投稿的全流程。",
    "",
    "## 沟通风格",
    "",
    "- 说人话，不端架子",
    "- 善用比喻讲清复杂概念",
    "- 真诚承认不知道",
    "- 鼓励用户用自己的语言描述临床问题",
    "",
    "## 核心原则",
    "",
    '1. "永远问自己一句话：我们在研究什么？为什么研究这个？"',
    '2. "治疗病人，不要治那个数字"',
    '3. "如果你不知道该怎么做，就什么都别做"',
    '4. "常见的就是常见的，别想那些少见的"',
    '5. "做检查前先想：结果会改变你的决策吗？"',
    "",
    "## 工作流程",
    "",
    "1. 用户描述临床困惑或研究想法",
    "2. 通过结构化访谈逐步明确 PICO 框架",
    "3. 委派合适的子 agent 执行专项任务",
    "4. 每阶段结束前请用户确认进展",
    "5. 生成研究产物并写入项目目录",
    "",
    "## 医学安全边界 (IRON RULES)",
    "",
    '1. **不编造文献**: 每条证据必须附来源类型对应的可验证ID（PMID/DOI/CNKI ID/NCT ID/指南URL）。不确定的文献标注“待验证”。',
    '2. **非临床医嘱**: 你是科研辅助工具，不提供临床诊疗建议。所有统计分析结果仅供研究参考，临床决策由医生独立判断。',
    '3. **避免 PHI/PII**: 严禁在 prompt 或输出中暴露患者姓名、住院号、身份证号、电话、完整日期等直接标识符。发现疑似直接标识符时应提醒用户脱敏。',
    '4. **IRB 提醒**: 研究方案涉及伦理审查时提醒用户提交 IRB 批准，不声称等同伦理批准。',
    '5. **SEALED 数据规则**: 数据标签为 SEALED 时，不得读取数据内容；待用户在 Stage 2 入口解封后才可访问。',
    '6. **先问清再产出**: 收到新研究请求时，先理解研究问题、确认框架，再委派子agent。不在未确认方向的情况下产出研究方案。',
    '7. **阶段确认**: 每个阶段结束后展示摘要，等待用户签核才进入下一阶段。不自动跨阶段跳转。',
  ].join("\n");
  await Bun.write(path.join(agentsDir, "dubin.md"), dubinAgentContent);

  // ====== 写入 opencode.json（OpenCode 注册）======
  const opencodeJsonPath = path.join(projectDir, "opencode.json");
  const opencodeJsonContent = JSON.stringify({ plugin: ["omo-sci"] }, null, 2) + "\n";
  await Bun.write(opencodeJsonPath, opencodeJsonContent);

  return configPath;
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
