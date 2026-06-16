#!/usr/bin/env bun
/**
 * omo-sci CLI 入口
 *
 * 用法:
 *   omo-sci install --no-tui --providers deepseek,qwen-bailian --quota 500000000
 *   omo-sci doctor
 *   omo-sci status
 */

import { runDoctor, formatDoctorReport, formatDoctorReportJson } from "../src/doctor";
import { getInstallModelPlan, install } from "../src/install";
import { getStatus, formatStatus } from "../src/status";
import { formatUsageBar, getUsageInfo } from "../src/commands/sci-usage";
import { sciStart } from "../src/commands/sci-start";
import { getProjectStatus, formatProjectStatus } from "../src/commands/sci-status";
import type { ProviderId } from "../src/types";

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
  console.log(`  提供商: ${options.providers.join(", ")}`);
  console.log(`  月配额: ${(options.quota / 100000000).toFixed(1)} 亿 tokens`);
  if (options.configDir) console.log(`  配置目录: ${options.configDir}`);
  if (options.projectDir) console.log(`  项目目录: ${options.projectDir}`);
  console.log(`  TUI: ${options.noTui ? "禁用" : "启用"}`);
  console.log("");
  console.log(getInstallModelPlan(options.providers as ProviderId[], options.quota));
  console.log("");

  const installConfig: { configDir?: string; projectDir?: string } = {};
  if (options.configDir) installConfig.configDir = options.configDir;
  if (options.projectDir) installConfig.projectDir = options.projectDir;

  const configPath = await install(options, installConfig);
  console.log(`安装完成。配置文件: ${configPath}`);
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

function parseInstallArgs(args: string[]): InstallArgs {
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

  if (providers.length === 0) {
    console.error("--providers 是必填项，例如: --providers deepseek,qwen-bailian");
    process.exit(1);
  }

  return { noTui, providers, quota, configDir, projectDir };
}

function showHelp(): void {
  console.log(`
omo-sci — 医学科研 AI 智能体团队

用法:
  omo-sci install [选项]      安装 omo-sci 插件
  omo-sci doctor [选项]       环境诊断
  omo-sci status [选项]       查看项目 Passport/Boulder 状态
  omo-sci config              查看安装配置状态
  omo-sci usage               查看用量信息
  omo-sci start               启动 Dubin 研究引擎
  omo-sci --help              显示此帮助

install 选项:
  --no-tui                    跳过交互式界面
  --providers <list>          提供商列表（逗号分隔），例如: deepseek,qwen-bailian
  --quota <number>            月配额（tokens），例如: 500000000
  --config-dir <path>         配置输出目录（默认 ~/.config/opencode）
  --project-dir <path>        项目目录（默认当前目录）

doctor 选项:
  --json, -j                  JSON 格式输出
  --models                    检查当前项目 agent 模型链是否匹配 omo-sci 配置
  --project <dir>             指定项目目录（默认当前目录）

status 选项:
  --project <dir>             指定项目目录（默认当前目录）

示例:
  omo-sci install --providers deepseek,qwen-bailian --quota 500000000
  omo-sci install --no-tui --providers deepseek --quota 200000000 --project-dir /tmp/test
  omo-sci doctor
  omo-sci doctor --json
  omo-sci status
  omo-sci status --project /path/to/project
  omo-sci config
  omo-sci usage
  omo-sci start
`);
}

await main();
