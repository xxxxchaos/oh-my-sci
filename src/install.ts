/**
 * omo-sci 安装模块
 *
 * 生成 OpenCode 集成配置文件，写入 ~/.config/opencode/omo-sci.jsonc。
 * 同时也创建 .opencode/ 目录中的命令和 agent 配置。
 */

import { getConfigDir, getConfigPath } from "./doctor";

export interface InstallOptions {
  noTui: boolean;
  providers: string[];
  quota: number;
}

export interface OmoSciConfig {
  $schema?: string;
  providers: string[];
  quota: number;
  modelMapping: Record<string, string[]>;
  installedAt: string;
}

const DEFAULT_MODEL_MAPPING: Record<string, string[]> = {
  "agent-orchestration": ["qwen/qwen-3.7-max", "deepseek/deepseek-v4-pro"],
  "deep-reasoning": ["deepseek/deepseek-v4-pro", "qwen/qwen-3.7-max"],
  "chinese-writing": ["glm/glm-5.2", "qwen/qwen-3.7-max"],
  "fast-search": ["minimax/minimax-m3"],
  "long-context": ["minimax/minimax-m3", "glm/glm-5.2"],
  "methodical-review": ["deepseek/deepseek-v4-pro", "qwen/qwen-3.7-max"],
};

/**
 * 执行安装流程
 *
 * @param options 安装选项
 * @returns 写入的配置文件路径
 */
export async function install(options: InstallOptions): Promise<string> {
  const config: OmoSciConfig = {
    providers: options.providers,
    quota: options.quota,
    modelMapping: DEFAULT_MODEL_MAPPING,
    installedAt: new Date().toISOString(),
  };

  if (!options.noTui) {
    console.log("交互式 TUI 模式（待实现）");
    console.log("使用 --no-tui 可跳过交互，直接写入配置");
  }

  const configDir = getConfigDir();
  const configPath = getConfigPath();

  // 创建配置目录
  const fs = await import("fs");
  fs.mkdirSync(configDir, { recursive: true });

  // 写入 JSONC 配置
  const jsoncContent = generateConfigJsonc(config);
  Bun.write(configPath, jsoncContent);

  // 同时创建 .opencode 配置目录
  const cwd = process.cwd();
  const opencodeDir = `${cwd}/.opencode`;
  const commandsDir = `${opencodeDir}/commands`;
  const agentsDir = `${opencodeDir}/agents`;

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

  Bun.write(`${commandsDir}/sci-doctor.md`, doctorCommandContent);

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

  Bun.write(`${commandsDir}/sci-status.md`, statusCommandContent);

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
  ].join("\n");

  Bun.write(`${agentsDir}/dubin.md`, dubinAgentContent);

  return configPath;
}

/**
 * 生成 JSONC 格式的配置内容
 *
 * 首先生成合法的 JSON，然后在序列化后的字符串中插入注释行。
 * 这样 stripJsoncComments() 总能还原为有效的 JSON。
 */
function generateConfigJsonc(config: OmoSciConfig): string {
  // 构建完整的数据对象
  // 注意：command 和 agent 定义已改为 .opencode/ 文件方式
  const fullConfig: Record<string, unknown> = {
    $schema: "https://opencode.ai/config.json",
    providers: config.providers,
    quota: config.quota,
    modelMapping: config.modelMapping,
    installedAt: config.installedAt,
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
    { key: '"providers"', comment: "已注册的模型 API 提供商" },
    { key: '"quota"', comment: "月配额（token 数）" },
    { key: '"modelMapping"', comment: "能力分类 → 模型 fallback 链" },
    { key: '"installedAt"', comment: "安装时间" },
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
