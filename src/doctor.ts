/**
 * omo-sci 环境诊断模块
 *
 * 检查运行 omo-sci 所需的各项依赖和环境条件。
 * 可在 CLI (bin/omo-sci.ts) 和 OpenCode 插件 (src/index.ts) 中复用。
 */

export interface HealthCheck {
  name: string;
  status: "ok" | "warn" | "error";
  message: string;
}

export interface DoctorReport {
  checks: HealthCheck[];
  timestamp: string;
  summary: {
    total: number;
    ok: number;
    warn: number;
    error: number;
  };
}

export interface DoctorOptions {
  includeModelChecks?: boolean;
  projectDir?: string;
}

/** 执行所有环境检查 */
export async function runDoctor(options: DoctorOptions = {}): Promise<DoctorReport> {
  const checks: HealthCheck[] = [];

  // 1. Bun 版本检查
  checks.push(await checkBunVersion());

  // 2. Node.js 版本检查（Bun 的 Node 兼容性）
  checks.push(await checkNodeVersion());

  // 3. Git 可用性检查
  checks.push(await checkGit());

  // 4. OpenCode 可用性检查
  checks.push(await checkOpenCode());

  // 5. 配置目录检查
  checks.push(await checkConfigDir());

  // 6. R 可用性检查（可选）
  checks.push(await checkR());

  if (options.includeModelChecks) {
    checks.push(...checkAgentModels(options.projectDir ?? process.cwd()));
  }

  const ok = checks.filter((c) => c.status === "ok").length;
  const warn = checks.filter((c) => c.status === "warn").length;
  const error = checks.filter((c) => c.status === "error").length;

  return {
    checks,
    timestamp: new Date().toISOString(),
    summary: { total: checks.length, ok, warn, error },
  };
}

function mapCheckStatus(status: string): 'ok' | 'warn' | 'error' {
  if (status === 'ok') return 'ok';
  if (status === 'warn') return 'warn';
  return 'error';
}

function checkAgentModels(projectDir: string): HealthCheck[] {
  try {
    const config = loadConfig();
    const results = checkInstalledAgentModels(projectDir, config);
    const healthChecks = results.map((result) => ({
      name: `模型配置/${result.agent}`,
      status: mapCheckStatus(result.status),
      message: result.message,
    }));

    // 模型版本检查
    const versionResults = checkModelVersions(projectDir);
    for (const vr of versionResults) {
      if (vr.status === 'ok') continue;
      healthChecks.push({
        name: `模型版本/${vr.agent}`,
        status: vr.status === 'deprecated' ? 'error' as const : 'warn' as const,
        message: `${vr.currentModel} → ${vr.latestVersion}: ${vr.note}`,
      });
    }

    return healthChecks;
  } catch (err) {
    return [{
      name: '模型配置',
      status: 'warn',
      message: `无法检查 agent 模型配置: ${err instanceof Error ? err.message : String(err)}`,
    }];
  }
}

async function checkBunVersion(): Promise<HealthCheck> {
  try {
    const result = Bun.version;
    const parts = result.split(".").map(Number);
    if (parts.length >= 2 && (parts[0] > 1 || (parts[0] === 1 && parts[1] >= 2))) {
      return { name: "Bun", status: "ok", message: `Bun v${result} (需求 >= 1.2)` };
    }
    return { name: "Bun", status: "warn", message: `Bun v${result}，建议升级到 >= 1.2` };
  } catch {
    return { name: "Bun", status: "error", message: "Bun 未检测到" };
  }
}

async function checkNodeVersion(): Promise<HealthCheck> {
  try {
    const version = process.versions.node;
    if (version) {
      return { name: "Node.js", status: "ok", message: `Node.js v${version} (Bun 兼容)` };
    }
    return { name: "Node.js", status: "ok", message: "Node.js 兼容层正常" };
  } catch {
    return { name: "Node.js", status: "warn", message: "Node.js 版本不可用" };
  }
}

async function checkGit(): Promise<HealthCheck> {
  try {
    const proc = Bun.spawnSync(["git", "--version"]);
    const stdout = proc.stdout.toString().trim();
    if (proc.exitCode === 0 && stdout) {
      return { name: "Git", status: "ok", message: stdout };
    }
    return { name: "Git", status: "warn", message: "git --version 返回空" };
  } catch {
    return { name: "Git", status: "warn", message: "Git 未安装（推荐）" };
  }
}

async function checkOpenCode(): Promise<HealthCheck> {
  try {
    const proc = Bun.spawnSync(["which", "opencode"]);
    if (proc.exitCode === 0) {
      const path = proc.stdout.toString().trim();
      return { name: "OpenCode", status: "ok", message: `opencode 可执行文件: ${path}` };
    }
    return { name: "OpenCode", status: "warn", message: "opencode 未在 PATH 中" };
  } catch {
    return { name: "OpenCode", status: "warn", message: "无法检测 opencode" };
  }
}

async function checkConfigDir(): Promise<HealthCheck> {
  const configPath = getConfigPath();
  try {
    if (await Bun.file(configPath).exists()) {
      return { name: "配置", status: "ok", message: `${configPath} 已存在` };
    }
    return { name: "配置", status: "warn", message: `未配置（运行 omo-sci install）` };
  } catch {
    return { name: "配置", status: "warn", message: `无法检查配置状态` };
  }
}

async function checkR(): Promise<HealthCheck> {
  try {
    const proc = Bun.spawnSync(["R", "--version"]);
    const stdout = proc.stdout.toString().trim();
    if (proc.exitCode === 0 && stdout) {
      const firstLine = stdout.split("\n")[0] || stdout;
      return { name: "R", status: "ok", message: `${firstLine}（满足阶段 2 需求）` };
    }
    return { name: "R", status: "warn", message: "R 未安装（阶段 2 数据分析需要 R >= 4.3）" };
  } catch {
    return { name: "R", status: "warn", message: "R 未安装（阶段 2 数据分析需要 R >= 4.3）" };
  }
}

import { OMO_SCI_CONFIG_PATH, OPENCODE_CONFIG_DIR } from "./constants";
import { loadConfig } from "./config";
import { checkInstalledAgentModels } from "./model-config";
import { checkModelVersions, formatModelVersionResults } from "./environment/model-version-check";

/** 获取 omo-sci 配置目录 */
export function getConfigDir(): string {
  return OPENCODE_CONFIG_DIR;
}

/** 获取 omo-sci 配置文件路径 */
export function getConfigPath(): string {
  return OMO_SCI_CONFIG_PATH;
}

/** 格式化 doctor 报告为控制台输出 */
export function formatDoctorReport(report: DoctorReport): string {
  const lines: string[] = [
    "╔══════════════════════════════════════════╗",
    "║        omo-sci 环境诊断报告              ║",
    "╚══════════════════════════════════════════╝",
    "",
  ];

  for (const check of report.checks) {
    const icon = check.status === "ok" ? "✓" : check.status === "warn" ? "⚠" : "✗";
    lines.push(`  ${icon}  ${check.name}: ${check.message}`);
  }

  lines.push("");
  lines.push(
    `  摘要: ${report.summary.ok}/${report.summary.total} 通过, ` +
      `${report.summary.warn} 警告, ${report.summary.error} 错误`,
  );
  lines.push(`  时间: ${report.timestamp}`);

  return lines.join("\n");
}

/** 格式化 doctor 报告为 JSON */
export function formatDoctorReportJson(report: DoctorReport): string {
  return JSON.stringify(report, null, 2);
}
