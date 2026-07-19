/**
 * sci-status 命令处理器
 *
 * 调用 loadPassport + loadBoulder，格式化当前项目状态。
 * 展示 MaterialPassport 阶段进展和 Boulder 会话状态。
 */

import { loadPassport } from "../state/passport";
import { loadBoulder } from "../state/boulder";
import type { MaterialPassport, BoulderState } from "../types";
import { findEffectiveInstall, OMO_SCI_VERSION, type EffectiveInstall } from '../install-manifest';

export interface ProjectStatus {
  passport: MaterialPassport;
  boulder: BoulderState | null;
  projectDir: string;
  install: EffectiveInstall | null;
}

/**
 * 获取当前项目状态
 *
 * @param projectDir 项目目录（默认 process.cwd()）
 */
export function getProjectStatus(projectDir?: string): ProjectStatus {
  const dir = projectDir ?? process.cwd();
  const passport = loadPassport(dir);
  const boulder = loadBoulder(dir);
  return { passport, boulder, projectDir: dir, install: findEffectiveInstall(dir) };
}

/**
 * 格式化项目状态为控制台输出
 */
export function formatProjectStatus(status: ProjectStatus): string {
  const lines: string[] = [
    "╔══════════════════════════════════════════╗",
    "║     omo-sci 项目状态                     ║",
    "╚══════════════════════════════════════════╝",
    "",
    `  项目: ${status.passport.project.title || "（未命名）"}`,
    `  Layout: ${status.passport.project.layout}`,
    `  当前阶段: ${status.passport.pipeline.current_stage}`,
    `  数据标签: ${status.passport.data_provenance}`,
    `  CLI 版本: ${OMO_SCI_VERSION}`,
    `  模板来源: ${formatInstallSource(status.install)}`,
    `  阶段 0（意图访谈）: ${status.passport.stage_0_intake.status}`,
    `  阶段 1（研究设计）: ${status.passport.stage_1_design.status}`,
    `  阶段 2（数据分析）: ${status.passport.stage_2_analysis.status}`,
    `  阶段 3（论文撰写）: ${status.passport.stage_3_writing.status}`,
    `  阶段 4（投稿）: ${status.passport.stage_4_submission.status}`,
    `  阶段 5（过程总结）: ${status.passport.stage_5_summary.status}`,
  ];

  if (status.boulder) {
    lines.push("",
      `  ── 会话状态 ──`,
      `  Session: ${status.boulder.session_id}`,
      `  活跃计划: ${status.boulder.active_plan}`,
      `  Phase: ${status.boulder.current_phase ?? "N/A"}`,
      `  待完成任务: ${status.boulder.pending_tasks.length}`,
    );
  } else {
    lines.push("",
      "  ── 会话状态: 无活跃会话 ──",
    );
  }

  return lines.join("\n");
}

function formatInstallSource(install: EffectiveInstall | null): string {
  if (!install) return '未找到（请运行 omo-sci install）';
  const source = install.inherited ? '继承' : '本地';
  const version = install.manifest?.package_version ?? '旧版/未知版本';
  return `${source} ${install.root}（${version}）`;
}
