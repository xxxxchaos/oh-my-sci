/**
 * Dubin 进化记忆系统 — 跨项目研究者画像与经验积累
 *
 * 追踪研究者画像（身份、偏好、学习模式）、项目历史、进化日志。
 * 随每次项目完成自动更新，形成持续的个性化研究助手体验。
 *
 * 持久化目录：~/.config/opencode/omo-sci-profile/
 *  - researcher.json: 研究者画像
 *  - project-history.json: 项目历史列表
 *  - evolution.md: 进化日志（人类可读 Markdown 日记）
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { OMO_SCI_PROFILE_DIR } from '../constants';

// ====================================================================
// Types
// ====================================================================

export interface ResearcherProfile {
  last_updated: string;
  total_projects_completed: number;
  identity: {
    specialty?: string;
    sub_specialties?: string[];
    institution_type?: string;
    data_resources?: string[];
    target_journals?: string[];
    research_role?: string;
  };
  research_preferences: {
    preferred_study_types?: string[];
    avoided_study_types?: string[];
    typical_sample_size_range?: string;
    preferred_statistical_approach?: string;
    writing_language?: string;
    writing_style_notes?: string;
  };
  interaction_preferences: {
    detail_level?: 'brief' | 'moderate' | 'exhaustive';
    signoff_frequency?: string;
    explain_jargon?: boolean;
    offer_options_when?: 'always' | 'stuck_only' | 'never';
  };
  learned_patterns: {
    common_mistakes?: string[];
    effective_patterns?: string[];
    trust_built?: Record<string, 'high' | 'moderate' | 'low'>;
  };
  domain_evolution: {
    emerging_interests?: string[];
    knowledge_gaps?: string[];
    suggested_next?: string;
  };
}

export interface ProjectHistoryEntry {
  id: string;
  title: string;
  type: string;
  sample_size?: number;
  main_finding?: string;
  target_journal?: string;
  status: string;
  started_at: string;
  completed_at?: string;
  key_decisions: string[];
  lessons_carried_forward: string[];
}

// ====================================================================
// Defaults
// ====================================================================

const DEFAULT_PROFILE: ResearcherProfile = {
  last_updated: new Date().toISOString(),
  total_projects_completed: 0,
  identity: {},
  research_preferences: {},
  interaction_preferences: {},
  learned_patterns: {},
  domain_evolution: {},
};

// ====================================================================
// Profile I/O
// ====================================================================

/**
 * 解析 profile 目录：优先使用参数，其次环境变量，最后全局常量
 */
function resolveProfileDir(profileDir?: string): string {
  if (profileDir) return profileDir;
  if (process.env.OMO_SCI_PROFILE_DIR) return process.env.OMO_SCI_PROFILE_DIR;
  return OMO_SCI_PROFILE_DIR;
}

/**
 * 加载研究者画像
 *
 * 文件不存在时返回默认画像（首次使用自动创建空画像）。
 * @param profileDir 可选 profile 目录（默认 OMO_SCI_PROFILE_DIR / 环境变量）
 */
export function loadProfile(profileDir?: string): ResearcherProfile {
  const dir = resolveProfileDir(profileDir);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  const path = join(dir, 'researcher.json');
  if (!existsSync(path)) {
    return { ...DEFAULT_PROFILE, last_updated: new Date().toISOString() };
  }
  const raw = readFileSync(path, 'utf-8');
  return JSON.parse(raw) as ResearcherProfile;
}

/**
 * 保存研究者画像
 *
 * 自动更新 last_updated 时间戳。
 * @param profileDir 可选 profile 目录（默认 OMO_SCI_PROFILE_DIR / 环境变量）
 */
export function saveProfile(profile: ResearcherProfile, profileDir?: string): void {
  const dir = resolveProfileDir(profileDir);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  profile.last_updated = new Date().toISOString();
  writeFileSync(
    join(dir, 'researcher.json'),
    JSON.stringify(profile, null, 2),
  );
}

// ====================================================================
// Project History I/O
// ====================================================================

/**
 * 加载项目历史列表
 * @param profileDir 可选 profile 目录（默认 OMO_SCI_PROFILE_DIR / 环境变量）
 */
export function loadProjectHistory(profileDir?: string): ProjectHistoryEntry[] {
  const dir = resolveProfileDir(profileDir);
  const path = join(dir, 'project-history.json');
  if (!existsSync(path)) return [];
  return JSON.parse(readFileSync(path, 'utf-8')) as ProjectHistoryEntry[];
}

/**
 * 追加一条项目历史记录
 * @param profileDir 可选 profile 目录（默认 OMO_SCI_PROFILE_DIR / 环境变量）
 */
export function appendProjectHistory(entry: ProjectHistoryEntry, profileDir?: string): void {
  const history = loadProjectHistory(profileDir);
  history.push(entry);
  const dir = resolveProfileDir(profileDir);
  writeFileSync(
    join(dir, 'project-history.json'),
    JSON.stringify(history, null, 2),
  );
}

// ====================================================================
// Evolution Diary
// ====================================================================

/**
 * 追加进化日志条目到 evolution.md
 *
 * 每条以日期为标题，可多次调用追加同一日内容。
 * @param profileDir 可选 profile 目录（默认 OMO_SCI_PROFILE_DIR / 环境变量）
 */
export function appendEvolutionDiary(entry: string, profileDir?: string): void {
  const dir = resolveProfileDir(profileDir);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  const path = join(dir, 'evolution.md');
  const timestamp = new Date().toISOString().slice(0, 10);
  const line = `## ${timestamp}\n${entry}\n\n`;
  if (existsSync(path)) {
    writeFileSync(path, line, { flag: 'a' });
  } else {
    writeFileSync(path, `# Dubin 进化日志\n\n${line}`);
  }
}

// ====================================================================
// digestCompletedProject
// ====================================================================

/**
 * 项目完成时调用 — 更新画像、追加项目历史、记录进化日志
 *
 * 调用时机：当 agent 流水线完成时，由完成 handler 触发。
 * 效果：
 *  1. total_projects_completed +1
 *  2. 追加项目历史记录
 *  3. 将 lessons 和 keyDecisions 写入进化日志
 *
 * @param projectDir 项目目录（目前仅用于标识，后续可拓展）
 * @param projectSummary 项目摘要信息
 * @param profileDir 可选 profile 目录（默认 OMO_SCI_PROFILE_DIR / 环境变量）
 */
export async function digestCompletedProject(
  projectDir: string,
  projectSummary: {
    id: string;
    title: string;
    type: string;
    mainFinding: string;
    keyDecisions: string[];
    lessons: string[];
  },
  profileDir?: string,
): Promise<void> {
  const profile = loadProfile(profileDir);
  profile.total_projects_completed = (profile.total_projects_completed ?? 0) + 1;

  // 追加项目历史
  appendProjectHistory(
    {
      id: projectSummary.id,
      title: projectSummary.title,
      type: projectSummary.type,
      main_finding: projectSummary.mainFinding,
      status: 'completed',
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      key_decisions: projectSummary.keyDecisions,
      lessons_carried_forward: projectSummary.lessons,
    },
    profileDir,
  );

  // 追加进化日记
  const entries: string[] = [];
  if (projectSummary.lessons.length > 0) {
    entries.push(
      `从「${projectSummary.title}」学到了：${projectSummary.lessons.join('；')}`,
    );
  }
  if (projectSummary.keyDecisions.length > 0) {
    entries.push(
      `关键决策：${projectSummary.keyDecisions.join('；')}`,
    );
  }
  for (const e of entries) {
    appendEvolutionDiary(e, profileDir);
  }

  saveProfile(profile, profileDir);
}
