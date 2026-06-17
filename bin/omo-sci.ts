#!/usr/bin/env bun
/**
 * omo-sci CLI 入口
 *
 * 用法:
 *   omo-sci install
 *   omo-sci configure --providers deepseek,qwen-bailian --quota 500000000
 *   omo-sci uninstall
 *   omo-sci doctor
 *   omo-sci status
 */

import { runDoctor, formatDoctorReport, formatDoctorReportJson } from "../src/doctor";
import { DEFAULT_INSTALL_PROVIDERS, DEFAULT_INSTALL_QUOTA, getInstallModelPlan, install, VALID_QUOTAS } from "../src/install";
import { getStatus, formatStatus } from "../src/status";
import { formatUsageBar, getUsageInfo } from "../src/commands/sci-usage";
import { sciStart } from "../src/commands/sci-start";
import { getProjectStatus, formatProjectStatus } from "../src/commands/sci-status";
import type { ProviderId } from "../src/types";
import * as path from "node:path";
import { PROVIDER_WHITELIST } from "../src/router/provider";
import {
  formatUninstallPlan,
  formatUninstallResult,
  getUninstallPlan,
  uninstall,
} from "../src/uninstall";

const GITHUB_BETA_RUN = "bunx github:xxxxchaos/oh-my-sci";

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === "--help" || command === "-h") {
    showHelp();
    process.exit(0);
  }

  switch (command) {
    case "install": {
      await handleInstall(args.slice(1));
      break;
    }
    case "configure":
    case "config:init": {
      await handleConfigure(args.slice(1));
      break;
    }
    case "setup": {
      await handleSetup(args.slice(1));
      break;
    }
    case "uninstall": {
      await handleUninstall(args.slice(1));
      break;
    }
    case "doctor": {
      await handleDoctor(args.slice(1));
      break;
    }
    case "status": {
      await handleStatus(args.slice(1));
      break;
    }
    case "config": {
      await handleConfig();
      break;
    }
    case "usage": {
      handleUsage();
      break;
    }
    case "start": {
      handleStart();
      break;
    }
    default: {
      console.error(`未知命令: ${command}`);
      console.error("运行 `omo-sci --help` 查看用法");
      process.exit(1);
    }
  }
}

async function handleInstall(args: string[]): Promise<void> {
  const options = parseInstallArgs(args);

  console.log("正在安装 omo-sci...");
  if (options.providers.length === 0) {
    console.log(`  提供商: ${DEFAULT_INSTALL_PROVIDERS.join(", ")}（默认，可稍后用 configure 修改）`);
  } else {
    console.log(`  提供商: ${options.providers.join(", ")}`);
  }
  console.log(`  月配额: ${(options.quota / 100000000).toFixed(1)} 亿 tokens`);
  if (options.configDir) console.log(`  配置目录: ${options.configDir}`);
  if (options.projectDir) console.log(`  项目目录: ${options.projectDir}`);
  console.log("");
  console.log(getInstallModelPlan(options.providers as ProviderId[], options.quota));
  console.log("");

  const installConfig: { configDir?: string; projectDir?: string } = {};
  if (options.configDir) installConfig.configDir = options.configDir;
  if (options.projectDir) installConfig.projectDir = options.projectDir;

  const configPath = await install(options, installConfig);
  printInstallLocations("安装完成", configPath, options.projectDir);
  printNextCommands();
}

async function handleConfigure(args: string[]): Promise<void> {
  const options = args.length === 0
    ? await promptInstallOptions()
    : parseInstallArgs(args, { requireProviders: true });

  console.log("正在配置 omo-sci 模型...");
  console.log(`  提供商: ${options.providers.join(", ")}`);
  console.log(`  月配额: ${(options.quota / 100000000).toFixed(1)} 亿 tokens`);
  if (options.configDir) console.log(`  配置目录: ${options.configDir}`);
  if (options.projectDir) console.log(`  项目目录: ${options.projectDir}`);
  console.log("");
  console.log(getInstallModelPlan(options.providers as ProviderId[], options.quota));
  console.log("");

  const installConfig: { configDir?: string; projectDir?: string } = {};
  if (options.configDir) installConfig.configDir = options.configDir;
  if (options.projectDir) installConfig.projectDir = options.projectDir;

  const configPath = await install(options, installConfig);
  printInstallLocations("配置完成", configPath, options.projectDir);
}

async function handleSetup(args: string[]): Promise<void> {
  if (args.length > 0) {
    await handleConfigure(args);
    return;
  }

  if (!isInteractive()) {
    showSetupHelp();
    return;
  }

  console.log(renderTitle("omo-sci 设置向导"));
  console.log("请选择要做的事：");
  console.log("  1. 安装到当前项目");
  console.log("  2. 配置/切换模型 provider");
  console.log("  3. 查看项目状态");
  console.log("  4. 运行环境诊断");
  console.log("  5. 卸载当前项目的 omo-sci");
  console.log("");

  const choice = await promptText("输入编号", "1");
  switch (choice.trim()) {
    case "1":
      await handleInstall([]);
      break;
    case "2":
      await handleConfigure([]);
      break;
    case "3":
      await handleStatus([]);
      break;
    case "4":
      await handleDoctor(["--models"]);
      break;
    case "5":
      await handleUninstall([]);
      break;
    default:
      console.error(`没有这个选项。运行 \`${GITHUB_BETA_RUN} setup\` 可重新打开向导。`);
      process.exit(1);
  }
}

async function handleUninstall(args: string[]): Promise<void> {
  const options = parseUninstallArgs(args);
  const plan = getUninstallPlan(options);
  console.log(formatUninstallPlan(plan));
  console.log("");

  if (options.dryRun) {
    console.log("这是 dry-run 预览，没有删除任何文件。");
    return;
  }

  if (!options.yes) {
    if (!isInteractive()) {
      console.error("非交互环境请加 --yes 确认卸载，或加 --dry-run 只预览。");
      process.exit(1);
    }
    const answer = await promptText("确认卸载当前项目的 omo-sci？输入 y 继续", "n");
    if (!["y", "yes"].includes(answer.trim().toLowerCase())) {
      console.log("已取消卸载。");
      return;
    }
  }

  const result = uninstall(options);
  console.log(formatUninstallResult(result));
}

function printInstallLocations(prefix: string, configPath: string, projectDirOption?: string): void {
  const projectDir = path.resolve(projectDirOption ?? process.cwd());
  console.log(`${prefix}:`);
  console.log(`  全局配置: ${configPath}`);
  console.log(`  项目目录: ${projectDir}`);
  console.log(`  OpenCode 项目配置: ${path.join(projectDir, "opencode.json")}`);
  console.log(`  命令目录: ${path.join(projectDir, ".opencode", "commands")}`);
  console.log(`  Agent 目录: ${path.join(projectDir, ".opencode", "agents")}`);
}

function printNextCommands(): void {
  console.log("");
  console.log("下一步:");
  console.log(`  GitHub beta 继续使用: ${GITHUB_BETA_RUN} setup`);
  console.log(`  配置模型 provider: ${GITHUB_BETA_RUN} configure`);
  console.log(`  验证安装: ${GITHUB_BETA_RUN} doctor --models`);
  console.log("  如果你已全局安装 omo-sci，也可以直接运行: omo-sci setup");
}

async function handleDoctor(args: string[]): Promise<void> {
  const jsonFlag = args.includes("--json") || args.includes("-j");
  const modelFlag = args.includes("--models");
  let projectDir: string | undefined;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--project' && i + 1 < args.length) {
      projectDir = args[++i];
    }
  }
  const report = await runDoctor({ includeModelChecks: modelFlag, projectDir });

  if (jsonFlag) {
    console.log(formatDoctorReportJson(report));
  } else {
    console.log(formatDoctorReport(report));
  }

  if (report.summary.error > 0) {
    process.exit(1);
  }
}

async function handleStatus(args: string[]): Promise<void> {
  let projectDir: string | undefined;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--project' && i + 1 < args.length) {
      projectDir = args[++i];
    }
  }

  const status = getProjectStatus(projectDir);
  console.log(formatProjectStatus(status));
}

async function handleConfig(): Promise<void> {
  const status = await getStatus();
  console.log(formatStatus(status));
}

function handleUsage(): void {
  const usage = getUsageInfo();
  console.log(formatUsageBar(usage));
}

function handleStart(): void {
  console.log(sciStart());
}

interface InstallArgs {
  noTui: boolean;
  providers: string[];
  quota: number;
  configDir?: string;
  projectDir?: string;
}

interface UninstallArgs {
  yes: boolean;
  dryRun: boolean;
  configDir?: string;
  projectDir?: string;
  keepConfig?: boolean;
  keepProject?: boolean;
  removeProfile?: boolean;
}

function parseInstallArgs(
  args: string[],
  settings: { requireProviders?: boolean } = {},
): InstallArgs {
  let noTui = false;
  let providers: string[] = [];
  let quota = 500000000;
  let configDir: string | undefined;
  let projectDir: string | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case "--no-tui":
        noTui = true;
        break;
      case "--providers":
        if (i + 1 < args.length) {
          providers = args[++i]
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
        }
        break;
      case "--quota":
        if (i + 1 < args.length) {
          quota = parseInt(args[++i], 10);
          if (isNaN(quota) || quota <= 0) {
            console.error("--quota 必须是正整数");
            process.exit(1);
          }
        }
        break;
      case "--config-dir":
        if (i + 1 < args.length) configDir = args[++i];
        break;
      case "--project-dir":
        if (i + 1 < args.length) projectDir = args[++i];
        break;
      default:
        if (arg.startsWith("--")) {
          console.error(`未知选项: ${arg}`);
          process.exit(1);
        }
    }
  }

  if (settings.requireProviders && providers.length === 0) {
    console.error("--providers 是必填项，例如: --providers deepseek,qwen-bailian");
    process.exit(1);
  }

  return { noTui, providers, quota, configDir, projectDir };
}

function parseUninstallArgs(args: string[]): UninstallArgs {
  let yes = false;
  let dryRun = false;
  let configDir: string | undefined;
  let projectDir: string | undefined;
  let keepConfig = false;
  let keepProject = false;
  let removeProfile = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case "--yes":
      case "-y":
        yes = true;
        break;
      case "--dry-run":
        dryRun = true;
        break;
      case "--config-dir":
        if (i + 1 < args.length) configDir = args[++i];
        break;
      case "--project-dir":
        if (i + 1 < args.length) projectDir = args[++i];
        break;
      case "--keep-config":
        keepConfig = true;
        break;
      case "--keep-project":
        keepProject = true;
        break;
      case "--profile":
        removeProfile = true;
        break;
      default:
        if (arg.startsWith("--")) {
          console.error(`未知选项: ${arg}`);
          process.exit(1);
        }
    }
  }

  return { yes, dryRun, configDir, projectDir, keepConfig, keepProject, removeProfile };
}

async function promptInstallOptions(): Promise<InstallArgs> {
  if (!isInteractive()) {
    console.error(`请指定 --providers，例如: ${GITHUB_BETA_RUN} configure --providers opencode-go,deepseek --quota 500000000`);
    process.exit(1);
  }

  console.log(renderTitle("模型配置向导"));
  console.log("选择你能调用的 provider，可输入编号或 provider 名，多个用逗号分隔。");
  PROVIDER_WHITELIST.forEach((provider, index) => {
    const defaultMark = DEFAULT_INSTALL_PROVIDERS.includes(provider) ? "（默认）" : "";
    console.log(`  ${index + 1}. ${provider}${defaultMark}`);
  });
  console.log("");

  const providerInput = await promptText("providers", DEFAULT_INSTALL_PROVIDERS.join(","));
  const providers = parseProviderSelection(providerInput);

  console.log("");
  console.log("选择月 token 配额（只做本地提醒，不会限制 API）：");
  VALID_QUOTAS.forEach((quota, index) => {
    const defaultMark = quota === DEFAULT_INSTALL_QUOTA ? "（默认）" : "";
    console.log(`  ${index + 1}. ${quota} (${(quota / 100000000).toFixed(1)} 亿)${defaultMark}`);
  });
  const quotaInput = await promptText("quota", String(DEFAULT_INSTALL_QUOTA));
  const quota = parseQuotaSelection(quotaInput);

  return { noTui: true, providers, quota };
}

function parseProviderSelection(input: string): string[] {
  const selected = input
    .split(",")
    .map(part => part.trim())
    .filter(Boolean)
    .map(part => {
      if (/^\d+$/.test(part)) {
        const provider = PROVIDER_WHITELIST[Number(part) - 1];
        if (provider) return provider;
      }
      return part;
    });

  const invalid = selected.filter(provider => !PROVIDER_WHITELIST.includes(provider as ProviderId));
  if (selected.length === 0 || invalid.length > 0) {
    console.error(`provider 无效: ${invalid.join(", ") || input}`);
    console.error(`支持的 provider: ${PROVIDER_WHITELIST.join(", ")}`);
    process.exit(1);
  }
  return selected;
}

function parseQuotaSelection(input: string): number {
  const trimmed = input.trim();
  const quota = /^\d+$/.test(trimmed) && trimmed.length <= 2
    ? VALID_QUOTAS[Number(trimmed) - 1]
    : Number(trimmed);
  if (!quota || !VALID_QUOTAS.includes(quota as (typeof VALID_QUOTAS)[number])) {
    console.error(`quota 无效。请选择: ${VALID_QUOTAS.join(", ")}`);
    process.exit(1);
  }
  return quota;
}

async function promptText(label: string, defaultValue: string): Promise<string> {
  const readline = await import("node:readline/promises");
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await rl.question(`${label} [${defaultValue}]: `);
    return answer.trim() || defaultValue;
  } finally {
    rl.close();
  }
}

function isInteractive(): boolean {
  return Boolean(process.stdin.isTTY && process.stdout.isTTY);
}

function renderTitle(title: string): string {
  return [
    "╔══════════════════════════════════════════╗",
    `║ ${title.padEnd(38, " ")} ║`,
    "╚══════════════════════════════════════════╝",
  ].join("\n");
}

function showSetupHelp(): void {
  console.log([
    "omo-sci setup 需要交互式终端。",
    "",
    "GitHub beta 常用非交互命令:",
    `  ${GITHUB_BETA_RUN} install`,
    `  ${GITHUB_BETA_RUN} configure --providers opencode-go,deepseek --quota 500000000`,
    `  ${GITHUB_BETA_RUN} status`,
    `  ${GITHUB_BETA_RUN} doctor --models`,
    `  ${GITHUB_BETA_RUN} uninstall --yes`,
    "",
    "如果你已全局安装 omo-sci，也可以使用对应的 omo-sci ... 简写。",
  ].join("\n"));
}

function showHelp(): void {
  console.log(`
omo-sci — 医学科研 AI 智能体团队

用法:
  omo-sci install [选项]      安装 omo-sci 插件（可零参数）
  omo-sci configure [选项]    配置/更新模型 provider 和配额
  omo-sci setup               打开安装/配置/诊断/卸载向导
  omo-sci uninstall [选项]    卸载当前项目中的 omo-sci
  omo-sci doctor [选项]       环境诊断
  omo-sci status [选项]       查看项目 Passport/Boulder 状态
  omo-sci config              查看安装配置状态
  omo-sci usage               查看用量信息
  omo-sci start               启动 Dubin 研究引擎
  omo-sci --help              显示此帮助

install 选项:
  --no-tui                    兼容参数；当前安装流程默认非交互
  --providers <list>          可选。提供商列表（逗号分隔），默认: opencode-go
  --quota <number>            可选。月配额（tokens），默认: 500000000
  --config-dir <path>         配置输出目录（默认 ~/.config/opencode）
  --project-dir <path>        项目目录（默认当前目录）

configure 选项:
  --providers <list>          提供商列表（逗号分隔）；不传时进入交互向导
  --quota <number>            月配额（tokens），例如: 500000000
  --config-dir <path>         配置输出目录（默认 ~/.config/opencode）
  --project-dir <path>        项目目录（默认当前目录）

uninstall 选项:
  --yes, -y                   跳过确认，直接卸载
  --dry-run                   只预览将删除/更新的文件
  --keep-config               保留全局配置 ~/.config/opencode/omo-sci.jsonc
  --keep-project              保留当前项目 .opencode/ 与 opencode.json
  --profile                   同时删除 Dubin 进化记忆目录
  --config-dir <path>         配置目录（默认 ~/.config/opencode）
  --project-dir <path>        项目目录（默认当前目录）

doctor 选项:
  --json, -j                  JSON 格式输出
  --models                    检查当前项目 agent 模型链是否匹配 omo-sci 配置
  --project <dir>             指定项目目录（默认当前目录）

status 选项:
  --project <dir>             指定项目目录（默认当前目录）

示例:
  ${GITHUB_BETA_RUN} install
  ${GITHUB_BETA_RUN} setup
  ${GITHUB_BETA_RUN} configure
  ${GITHUB_BETA_RUN} configure --providers deepseek,qwen-bailian --quota 500000000
  ${GITHUB_BETA_RUN} uninstall --dry-run
  ${GITHUB_BETA_RUN} uninstall --yes
  ${GITHUB_BETA_RUN} install --no-tui --project-dir /tmp/test

已全局安装 omo-sci 时，也可使用:
  omo-sci setup
  omo-sci doctor --models
  omo-sci doctor
`);
}

await main();
