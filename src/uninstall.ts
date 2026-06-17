/**
 * omo-sci 卸载模块
 *
 * 只删除 omo-sci 生成的文件，避免误删用户已有 OpenCode 配置。
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { OPENCODE_CONFIG_DIR, OMO_SCI_PROFILE_DIR } from "./constants";

export const OMO_SCI_AGENT_FILES = [
  "archimedes.md",
  "dubin.md",
  "ebmer.md",
  "irber.md",
  "polisher.md",
  "pubmeder.md",
  "spsser.md",
  "submitter.md",
  "writer.md",
] as const;

export const OMO_SCI_COMMAND_FILES = [
  "sci-doctor.md",
  "sci-start.md",
  "sci-status.md",
  "sci-usage.md",
] as const;

export interface UninstallOptions {
  configDir?: string;
  projectDir?: string;
  keepConfig?: boolean;
  keepProject?: boolean;
  removeProfile?: boolean;
  dryRun?: boolean;
}

export interface UninstallPlan {
  configPath: string;
  projectDir: string;
  opencodeJsonPath: string;
  agentsDir: string;
  commandsDir: string;
  profileDir: string;
  filesToRemove: string[];
  dirsToRemoveIfEmpty: string[];
  willUpdateOpencodeJson: boolean;
  willRemoveOpencodeJson: boolean;
  warnings: string[];
}

export interface UninstallResult extends UninstallPlan {
  removed: string[];
  updated: string[];
  skipped: string[];
}

export function getUninstallPlan(options: UninstallOptions = {}): UninstallPlan {
  const configDir = options.configDir ?? OPENCODE_CONFIG_DIR;
  const projectDir = path.resolve(options.projectDir ?? process.cwd());
  const configPath = path.join(configDir, "omo-sci.jsonc");
  const opencodeJsonPath = path.join(projectDir, "opencode.json");
  const agentsDir = path.join(projectDir, ".opencode", "agents");
  const commandsDir = path.join(projectDir, ".opencode", "commands");
  const profileDir = OMO_SCI_PROFILE_DIR;
  const filesToRemove: string[] = [];
  const dirsToRemoveIfEmpty: string[] = [];
  const warnings: string[] = [];

  if (!options.keepConfig) {
    filesToRemove.push(configPath);
  }

  if (!options.keepProject) {
    for (const file of OMO_SCI_AGENT_FILES) {
      filesToRemove.push(path.join(agentsDir, file));
    }
    for (const file of OMO_SCI_COMMAND_FILES) {
      filesToRemove.push(path.join(commandsDir, file));
    }
    dirsToRemoveIfEmpty.push(agentsDir, commandsDir, path.join(projectDir, ".opencode"));
  }

  if (options.removeProfile) {
    filesToRemove.push(profileDir);
  } else {
    warnings.push(`保留 Dubin 进化记忆目录: ${profileDir}`);
  }

  const opencodeState = inspectOpencodeJson(opencodeJsonPath);

  return {
    configPath,
    projectDir,
    opencodeJsonPath,
    agentsDir,
    commandsDir,
    profileDir,
    filesToRemove,
    dirsToRemoveIfEmpty,
    willUpdateOpencodeJson: !options.keepProject && opencodeState === "update",
    willRemoveOpencodeJson: !options.keepProject && opencodeState === "remove",
    warnings,
  };
}

export function uninstall(options: UninstallOptions = {}): UninstallResult {
  const plan = getUninstallPlan(options);
  const removed: string[] = [];
  const updated: string[] = [];
  const skipped: string[] = [];

  if (options.dryRun) {
    return { ...plan, removed, updated, skipped };
  }

  for (const target of plan.filesToRemove) {
    if (!fs.existsSync(target)) {
      skipped.push(target);
      continue;
    }
    fs.rmSync(target, { recursive: true, force: true });
    removed.push(target);
  }

  if (!options.keepProject) {
    const opencodeAction = removePluginFromOpencodeJson(plan.opencodeJsonPath);
    if (opencodeAction === "removed") {
      removed.push(plan.opencodeJsonPath);
    } else if (opencodeAction === "updated") {
      updated.push(plan.opencodeJsonPath);
    } else {
      skipped.push(plan.opencodeJsonPath);
    }

    for (const dir of plan.dirsToRemoveIfEmpty) {
      removeDirIfEmpty(dir, removed);
    }
  }

  return { ...plan, removed, updated, skipped };
}

export function formatUninstallPlan(plan: UninstallPlan): string {
  const lines = [
    "╔══════════════════════════════════════════╗",
    "║        omo-sci 卸载预览                  ║",
    "╚══════════════════════════════════════════╝",
    "",
    `  项目目录: ${plan.projectDir}`,
    `  全局配置: ${plan.configPath}`,
    "",
    "  将删除:",
  ];

  const existing = plan.filesToRemove.filter(target => fs.existsSync(target));
  if (existing.length === 0) {
    lines.push("    （未发现可删除文件）");
  } else {
    for (const target of existing) {
      lines.push(`    - ${target}`);
    }
  }

  if (plan.willUpdateOpencodeJson) {
    lines.push(`    - 从 ${plan.opencodeJsonPath} 移除 plugin: omo-sci`);
  }
  if (plan.willRemoveOpencodeJson) {
    lines.push(`    - ${plan.opencodeJsonPath}（仅包含 omo-sci 时删除）`);
  }

  if (plan.warnings.length > 0) {
    lines.push("", "  保留/提醒:");
    for (const warning of plan.warnings) {
      lines.push(`    - ${warning}`);
    }
  }

  return lines.join("\n");
}

export function formatUninstallResult(result: UninstallResult): string {
  const lines = [
    "╔══════════════════════════════════════════╗",
    "║        omo-sci 卸载完成                  ║",
    "╚══════════════════════════════════════════╝",
    "",
    `  项目目录: ${result.projectDir}`,
    `  全局配置: ${result.configPath}`,
    "",
    `  删除: ${result.removed.length}`,
    `  更新: ${result.updated.length}`,
    `  跳过: ${result.skipped.length}`,
  ];

  if (result.updated.length > 0) {
    lines.push("", "  已更新:");
    for (const target of result.updated) lines.push(`    - ${target}`);
  }

  if (result.warnings.length > 0) {
    lines.push("", "  提醒:");
    for (const warning of result.warnings) lines.push(`    - ${warning}`);
  }

  return lines.join("\n");
}

type OpencodeJsonState = "missing" | "ignore" | "update" | "remove";

function inspectOpencodeJson(opencodeJsonPath: string): OpencodeJsonState {
  if (!fs.existsSync(opencodeJsonPath)) return "missing";
  const data = readOpencodeJson(opencodeJsonPath);
  if (!data || !Array.isArray(data.plugin) || !data.plugin.includes("omo-sci")) {
    return "ignore";
  }

  const nextPlugins = data.plugin.filter((plugin: unknown) => plugin !== "omo-sci");
  const nextData = { ...data };
  if (nextPlugins.length > 0) {
    nextData.plugin = nextPlugins;
  } else {
    delete nextData.plugin;
  }

  return Object.keys(nextData).length === 0 ? "remove" : "update";
}

function removePluginFromOpencodeJson(opencodeJsonPath: string): "removed" | "updated" | "skipped" {
  const state = inspectOpencodeJson(opencodeJsonPath);
  if (state === "missing" || state === "ignore") return "skipped";
  if (state === "remove") {
    fs.rmSync(opencodeJsonPath, { force: true });
    return "removed";
  }

  const data = readOpencodeJson(opencodeJsonPath);
  if (!data || !Array.isArray(data.plugin)) return "skipped";
  const nextPlugins = data.plugin.filter((plugin: unknown) => plugin !== "omo-sci");
  const nextData = { ...data };
  if (nextPlugins.length > 0) {
    nextData.plugin = nextPlugins;
  } else {
    delete nextData.plugin;
  }
  fs.writeFileSync(opencodeJsonPath, `${JSON.stringify(nextData, null, 2)}\n`);
  return "updated";
}

function readOpencodeJson(opencodeJsonPath: string): Record<string, unknown> | null {
  try {
    return JSON.parse(fs.readFileSync(opencodeJsonPath, "utf8")) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function removeDirIfEmpty(dir: string, removed: string[]): void {
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return;
  if (fs.readdirSync(dir).length > 0) return;
  fs.rmdirSync(dir);
  removed.push(dir);
}
