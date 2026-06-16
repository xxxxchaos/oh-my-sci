/**
 * Boulder 系统 — 当前会话状态
 *
 * 追踪当前会话：活跃计划、session ID、当前阶段/Phase、待完成任务。
 * 支持跨会话中断和恢复。
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { BoulderState, StageId, PendingTask } from '../types';

// ====================================================================
// Internal Constants
// ====================================================================

const OMO_SCI_DIR = '.omo-sci';
const BOULDER_FILE = 'boulder.json';

// ====================================================================
// Helpers
// ====================================================================

/** 计算 boulder JSON 文件路径 */
function boulderFilePath(projectDir: string): string {
  return join(projectDir, OMO_SCI_DIR, BOULDER_FILE);
}

/** 生成唯一 session ID */
function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

// ====================================================================
// createBoulder / loadBoulder / saveBoulder
// ====================================================================

/** 创建新的会话 Boulder */
export function createBoulder(
  planName: string,
  currentStage: StageId,
  currentPhase: string,
): BoulderState {
  return {
    active_plan: planName,
    session_id: generateSessionId(),
    started_at: new Date().toISOString(),
    current_stage: currentStage,
    current_phase: currentPhase,
    pending_tasks: [],
  };
}

/** 加载 Boulder 状态，文件不存在时返回 null */
export function loadBoulder(projectDir: string): BoulderState | null {
  const fpath = boulderFilePath(projectDir);
  if (!existsSync(fpath)) return null;
  const raw = readFileSync(fpath, 'utf-8');
  return JSON.parse(raw) as BoulderState;
}

/** 保存 Boulder 状态到 .omo-sci/boulder.json */
export function saveBoulder(projectDir: string, boulder: BoulderState): void {
  const dir = join(projectDir, OMO_SCI_DIR);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(boulderFilePath(projectDir), JSON.stringify(boulder, null, 2), 'utf-8');
}

// ====================================================================
// addPendingTask / updateTaskStatus
// ====================================================================

/** 添加待完成任务到当前 Boulder */
export function addPendingTask(projectDir: string, task: PendingTask): BoulderState {
  const boulder = loadBoulder(projectDir);
  if (!boulder) {
    throw new Error(`没有找到 boulder 状态，项目目录: ${projectDir}`);
  }
  boulder.pending_tasks.push(task);
  saveBoulder(projectDir, boulder);
  return boulder;
}

/** 更新指定待完成任务的状态 */
export function updateTaskStatus(
  projectDir: string,
  taskId: string,
  status: PendingTask['status'],
): void {
  const boulder = loadBoulder(projectDir);
  if (!boulder) {
    throw new Error(`没有找到 boulder 状态，项目目录: ${projectDir}`);
  }
  const task = boulder.pending_tasks.find((t) => t.id === taskId);
  if (!task) {
    throw new Error(`未找到任务: ${taskId}`);
  }
  task.status = status;
  saveBoulder(projectDir, boulder);
}
