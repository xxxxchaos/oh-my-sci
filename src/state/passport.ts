/**
 * Material Passport — 跨会话状态系统
 *
 * 状态文件的序列化/反序列化、阶段 state 更新、前置条件验证、阶段 hash 计算。
 * 所有函数对齐 src/types.ts 的 MaterialPassport 接口。
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import type {
  MaterialPassport,
  StageId,
  StageState,
  GateReport,
} from '../types';

// ====================================================================
// Internal Constants
// ====================================================================

const OMO_SCI_DIR = '.omo-sci';
const PASSPORT_FILE = 'passport.json';

// ====================================================================
// Helpers
// ====================================================================

/** 创建默认的空阶段状态（每次独立对象防止引用共享） */
function defaultStageState(): StageState {
  return {
    status: 'pending',
    artifacts: [],
    gates: {},
  };
}

/** 计算 passport JSON 文件路径 */
function passportFilePath(projectDir: string): string {
  return join(projectDir, OMO_SCI_DIR, PASSPORT_FILE);
}

// ====================================================================
// Stage-to-Key Mapping
// ====================================================================

/**
 * StageId → MaterialPassport key 映射
 *
 * 6 个流水线阶段映射到 stage_* 字段，
 * 2 个完整性闸门映射到 integrity_gate_* 字段。
 */
const STAGE_TO_KEY: Record<StageId, keyof MaterialPassport> = {
  'stage-0-intake': 'stage_0_intake',
  'stage-1-design': 'stage_1_design',
  'stage-2-analysis': 'stage_2_analysis',
  'stage-3-writing': 'stage_3_writing',
  'stage-4-submission': 'stage_4_submission',
  'stage-5-summary': 'stage_5_summary',
  'gate-i': 'integrity_gate_1',
  'gate-ii': 'integrity_gate_2',
} as const;

/** 查询 StageId 对应的 MaterialPassport key */
export function stageToKey(stage: StageId): keyof MaterialPassport {
  return STAGE_TO_KEY[stage];
}

// ====================================================================
// DEFAULT_PASSPORT
// ====================================================================

/** 最小的空白 MaterialPassport */
export const DEFAULT_PASSPORT: MaterialPassport = {
  passport_version: '0.1.0',
  project: {
    layout: 'omo-sci',
  },
  pipeline: {
    current_stage: 'stage-0-intake',
    started_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  signoff_records: [],
  data_provenance: 'SEALED',
  claim_evidence_map: [],
  stage_0_intake: defaultStageState(),
  stage_1_design: defaultStageState(),
  stage_2_analysis: defaultStageState(),
  stage_3_writing: defaultStageState(),
  stage_4_submission: defaultStageState(),
  stage_5_summary: defaultStageState(),
  review_sessions: [],
  wisdom_collected: [],
};

// ====================================================================
// loadPassport / savePassport
// ====================================================================

/**
 * 验证 MaterialPassport schema 完整性
 *
 * 检查必要字段是否存在且类型正确。
 * 返回 { valid, errors }，errors 列出所有缺失或无效的字段。
 */
export function validatePassportSchema(data: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['passport is not an object'] };
  }
  const p = data as Record<string, unknown>;

  if (!p.passport_version) errors.push('missing passport_version');
  if (!p.project || typeof p.project !== 'object') errors.push('missing or invalid project');
  else {
    const proj = p.project as Record<string, unknown>;
    if (!proj.layout || !['omo-sci', 'codexsci-legacy'].includes(proj.layout as string))
      errors.push('project.layout must be "omo-sci" or "codexsci-legacy"');
  }
  if (!p.pipeline || typeof p.pipeline !== 'object') errors.push('missing pipeline');
  else {
    const pipe = p.pipeline as Record<string, unknown>;
    if (!pipe.current_stage) errors.push('missing pipeline.current_stage');
  }
  if (!Array.isArray(p.signoff_records)) errors.push('signoff_records must be an array');
  if (!Array.isArray(p.review_sessions)) errors.push('review_sessions must be an array');

  return { valid: errors.length === 0, errors };
}

/**
 * 加载 MaterialPassport
 *
 * 文件不存在时返回 DEFAULT_PASSPORT。每次重新构造默认值，
 * 确保调用方修改返回值不影响后续调用。
 * 加载后执行 schema 验证，验证结果写入 metadata（不 throw，允许恢复模式）。
 */
export function loadPassport(projectDir: string): MaterialPassport {
  const fpath = passportFilePath(projectDir);
  if (!existsSync(fpath)) {
    // 深拷贝默认值
    return JSON.parse(JSON.stringify(DEFAULT_PASSPORT)) as MaterialPassport;
  }
  const raw = readFileSync(fpath, 'utf-8');
  const parsed = JSON.parse(raw) as MaterialPassport;

  // Schema 验证（不 throw，允许恢复模式）
  const validation = validatePassportSchema(parsed);
  if (!validation.valid) {
    // 将验证结果写入内部 metadata（不污染 passport 字段）
    (parsed as unknown as Record<string, unknown>)['__schema_warnings'] = validation.errors;
  }

  return parsed;
}

/**
 * 保存 MaterialPassport 到 .omo-sci/passport.json
 *
 * 自动创建 .omo-sci 目录，自动更新 passport.pipeline.updated_at。
 */
export function savePassport(projectDir: string, passport: MaterialPassport): void {
  const dir = join(projectDir, OMO_SCI_DIR);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  passport.pipeline.updated_at = new Date().toISOString();
  writeFileSync(passportFilePath(projectDir), JSON.stringify(passport, null, 2), 'utf-8');
}

// ====================================================================
// updateStageState
// ====================================================================

/**
 * 更新特定阶段的 state 并持久化
 *
 * - 对 6 个流水线阶段：合并 Partial<StageState> 到对应 stage_* 字段
 * - 对 2 个闸门：根据 Partial<StageState> 更新 GateReport（取兼容字段）
 */
export function updateStageState(
  projectDir: string,
  stage: StageId,
  update: Partial<StageState>,
): MaterialPassport {
  const passport = loadPassport(projectDir);
  const key = stageToKey(stage);

  if (key === 'integrity_gate_1' || key === 'integrity_gate_2') {
    // ── 闸门字段 ──
    const existing = passport[key] as GateReport | undefined;
    const updated: GateReport = {
      status: existing?.status ?? 'not_run',
      checked_at: existing?.checked_at ?? new Date().toISOString(),
      claim_sample_rate: existing?.claim_sample_rate ?? 0.3,
      retry_count: existing?.retry_count ?? 0,
      modes: existing?.modes ?? {},
      overrides: existing?.overrides ?? [],
      report_path: existing?.report_path ?? '',
    };

    // 从 Partial<StageState> 提取 GateReport 兼容字段
    if (update.status === 'completed') {
      updated.status = 'passed';
    } else if (update.status === 'failed') {
      updated.status = 'failed';
    }
    if (update.completed_at) {
      updated.checked_at = update.completed_at;
    } else if (update.started_at) {
      updated.checked_at = update.started_at;
    }

    passport[key] = updated;
  } else {
    // ── 普通阶段字段 ──
    const k = key as
      | 'stage_0_intake'
      | 'stage_1_design'
      | 'stage_2_analysis'
      | 'stage_3_writing'
      | 'stage_4_submission'
      | 'stage_5_summary';
    passport[k] = { ...passport[k], ...update } as StageState;
  }

  savePassport(projectDir, passport);
  return passport;
}

// ====================================================================
// validatePassportPreconditions
// ====================================================================

/**
 * 验证进入指定 stage 的前置条件
 *
 * 返回缺失条件的中文描述列表。空数组表示所有条件满足。
 */
export function validatePassportPreconditions(
  passport: MaterialPassport,
  stage: StageId,
): string[] {
  const missing: string[] = [];

  switch (stage) {
    case 'stage-0-intake':
      // 起始阶段无前置条件
      break;

    case 'stage-1-design':
      if (passport.stage_0_intake.status !== 'completed') {
        missing.push('阶段0（意图访谈）尚未完成');
      }
      break;

    case 'stage-2-analysis':
      if (passport.stage_1_design.status !== 'completed') {
        missing.push('阶段1（研究设计）尚未完成');
      }
      break;

    case 'gate-i':
      if (passport.stage_2_analysis.status !== 'completed') {
        missing.push('阶段2（数据分析）尚未完成');
      }
      break;

    case 'stage-3-writing':
      if (passport.stage_2_analysis.status !== 'completed') {
        missing.push('阶段2（数据分析）尚未完成');
      }
      if (!passport.integrity_gate_1 || passport.integrity_gate_1.status !== 'passed') {
        missing.push('闸门I（完整性检查）未通过');
      }
      break;

    case 'gate-ii':
      if (passport.stage_3_writing.status !== 'completed') {
        missing.push('阶段3（论文撰写）尚未完成');
      }
      break;

    case 'stage-4-submission':
      if (passport.stage_3_writing.status !== 'completed') {
        missing.push('阶段3（论文撰写）尚未完成');
      }
      if (!passport.integrity_gate_2 || passport.integrity_gate_2.status !== 'passed') {
        missing.push('闸门II（终审）未通过');
      }
      break;

    case 'stage-5-summary':
      if (passport.stage_4_submission.status !== 'completed') {
        missing.push('阶段4（投稿）尚未完成');
      }
      break;
  }

  return missing;
}

// ====================================================================
// computeStageHash
// ====================================================================

/**
 * 递归稳定的 JSON 序列化（按 key 排序）
 */
function stableStringify(obj: unknown): string {
  if (obj === null) return 'null';
  if (typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) {
    return '[' + obj.map(stableStringify).join(',') + ']';
  }
  // Object: 递归按键排序
  const keys = Object.keys(obj as Record<string, unknown>).sort();
  const pairs = keys.map(k => JSON.stringify(k) + ':' + stableStringify((obj as Record<string, unknown>)[k]));
  return '{' + pairs.join(',') + '}';
}

/**
 * 对 StageState block 做稳定序列化后计算 sha256
 *
 * 递归按 key 排序序列化，保证相同内容的 stage 产生相同 hash。
 */
export function computeStageHash(stage: StageState): string {
  const canonical = stableStringify(stage);
  return createHash('sha256').update(canonical, 'utf-8').digest('hex');
}
