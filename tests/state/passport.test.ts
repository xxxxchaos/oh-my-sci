/**
 * Material Passport 状态系统测试
 */
import { describe, it, expect, afterEach } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  DEFAULT_PASSPORT,
  loadPassport,
  savePassport,
  updateStageState,
  validatePassportPreconditions,
  validatePassportSchema,
  computeStageHash,
  stageToKey,
} from '../../src/state/passport';
import type { MaterialPassport } from '../../src/types';

describe('MaterialPassport 状态系统', () => {
  let tmpDir: string;

  afterEach(() => {
    if (tmpDir) {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  // ──────────────────────────────────────────────────────────
  // DEFAULT_PASSPORT
  // ──────────────────────────────────────────────────────────

  describe('DEFAULT_PASSPORT', () => {
    it('包含 passport_version 和 layout 字段', () => {
      expect(DEFAULT_PASSPORT.passport_version).toBe('0.1.0');
      expect(DEFAULT_PASSPORT.project.layout).toBe('omo-sci');
    });

    it('初始状态为 stage-0-intake', () => {
      expect(DEFAULT_PASSPORT.pipeline.current_stage).toBe('stage-0-intake');
    });

    it('所有阶段的状态为 pending', () => {
      expect(DEFAULT_PASSPORT.stage_0_intake.status).toBe('pending');
      expect(DEFAULT_PASSPORT.stage_1_design.status).toBe('pending');
      expect(DEFAULT_PASSPORT.stage_2_analysis.status).toBe('pending');
      expect(DEFAULT_PASSPORT.stage_3_writing.status).toBe('pending');
      expect(DEFAULT_PASSPORT.stage_4_submission.status).toBe('pending');
      expect(DEFAULT_PASSPORT.stage_5_summary.status).toBe('pending');
    });

    it('初始 data_provenance 为 SEALED', () => {
      expect(DEFAULT_PASSPORT.data_provenance).toBe('SEALED');
    });

    it('空集合字段初始为空数组', () => {
      expect(DEFAULT_PASSPORT.signoff_records).toEqual([]);
      expect(DEFAULT_PASSPORT.claim_evidence_map).toEqual([]);
      expect(DEFAULT_PASSPORT.review_sessions).toEqual([]);
      expect(DEFAULT_PASSPORT.wisdom_collected).toEqual([]);
    });

    it('不具备 integrity_gate', () => {
      expect(DEFAULT_PASSPORT.integrity_gate_1).toBeUndefined();
      expect(DEFAULT_PASSPORT.integrity_gate_2).toBeUndefined();
    });
  });

  // ──────────────────────────────────────────────────────────
  // stageToKey
  // ──────────────────────────────────────────────────────────

  describe('stageToKey', () => {
    it('映射所有 8 个 stage', () => {
      expect(stageToKey('stage-0-intake')).toBe('stage_0_intake');
      expect(stageToKey('stage-1-design')).toBe('stage_1_design');
      expect(stageToKey('stage-2-analysis')).toBe('stage_2_analysis');
      expect(stageToKey('stage-3-writing')).toBe('stage_3_writing');
      expect(stageToKey('stage-4-submission')).toBe('stage_4_submission');
      expect(stageToKey('stage-5-summary')).toBe('stage_5_summary');
      expect(stageToKey('gate-i')).toBe('integrity_gate_1');
      expect(stageToKey('gate-ii')).toBe('integrity_gate_2');
    });
  });

  // ──────────────────────────────────────────────────────────
  // loadPassport — 文件不存在
  // ──────────────────────────────────────────────────────────

  describe('loadPassport', () => {
    it('文件不存在时返回默认 passport', () => {
      tmpDir = mkdtempSync(join(tmpdir(), 'passport-test-'));
      const passport = loadPassport(tmpDir);

      expect(passport.passport_version).toBe('0.1.0');
      expect(passport.project.layout).toBe('omo-sci');
      expect(passport.pipeline.current_stage).toBe('stage-0-intake');
      expect(passport.data_provenance).toBe('SEALED');
    });

    it('每次调用返回独立副本', () => {
      tmpDir = mkdtempSync(join(tmpdir(), 'passport-test-'));
      const a = loadPassport(tmpDir);
      const b = loadPassport(tmpDir);

      // 修改 a 不影响 b
      a.stage_0_intake.status = 'completed';
      expect(b.stage_0_intake.status).toBe('pending');
    });
  });

  // ──────────────────────────────────────────────────────────
  // 保存→加载往返
  // ──────────────────────────────────────────────────────────

  describe('保存→加载往返', () => {
    it('保存后重新加载数据一致', () => {
      tmpDir = mkdtempSync(join(tmpdir(), 'passport-test-'));

      const passport = loadPassport(tmpDir);
      passport.project.title = '测试项目';
      passport.project.pico = 'P: ICU patients, I: remimazolam, C: propofol, O: sedation';
      passport.stage_0_intake.status = 'completed';

      savePassport(tmpDir, passport);

      const reloaded = loadPassport(tmpDir);
      expect(reloaded.project.title).toBe('测试项目');
      expect(reloaded.project.pico).toContain('remimazolam');
      expect(reloaded.stage_0_intake.status).toBe('completed');
    });

    it('保存时会更新 pipeline.updated_at', () => {
      tmpDir = mkdtempSync(join(tmpdir(), 'passport-test-'));

      const passport = loadPassport(tmpDir);
      const originalUpdatedAt = passport.pipeline.updated_at;

      // 等待片刻确保时间不同
      const passport2 = loadPassport(tmpDir);
      passport2.project.title = '测试 updated_at';
      savePassport(tmpDir, passport2);

      const reloaded = loadPassport(tmpDir);
      expect(reloaded.pipeline.updated_at).not.toBe(originalUpdatedAt);
    });
  });

  // ──────────────────────────────────────────────────────────
  // updateStageState
  // ──────────────────────────────────────────────────────────

  describe('updateStageState', () => {
    it('更新指定阶段的状态并持久化', () => {
      tmpDir = mkdtempSync(join(tmpdir(), 'passport-test-'));

      // 初始状态
      let passport = loadPassport(tmpDir);
      expect(passport.stage_0_intake.status).toBe('pending');

      // 更新
      passport = updateStageState(tmpDir, 'stage-0-intake', {
        status: 'completed',
        completed_at: new Date().toISOString(),
      });
      expect(passport.stage_0_intake.status).toBe('completed');

      // 验证持久化
      passport = loadPassport(tmpDir);
      expect(passport.stage_0_intake.status).toBe('completed');
      expect(passport.stage_0_intake.completed_at).toBeDefined();
    });

    it('更新闸门 gate-i', () => {
      tmpDir = mkdtempSync(join(tmpdir(), 'passport-test-'));

      updateStageState(tmpDir, 'gate-i', {
        status: 'completed',
        completed_at: '2026-06-16T12:00:00.000Z',
      });

      const passport = loadPassport(tmpDir);
      expect(passport.integrity_gate_1).toBeDefined();
      expect(passport.integrity_gate_1!.status).toBe('passed');
      expect(passport.integrity_gate_1!.checked_at).toBe('2026-06-16T12:00:00.000Z');
    });

    it('更新闸门 gate-ii 标记失败', () => {
      tmpDir = mkdtempSync(join(tmpdir(), 'passport-test-'));

      updateStageState(tmpDir, 'gate-ii', { status: 'failed' });

      const passport = loadPassport(tmpDir);
      expect(passport.integrity_gate_2).toBeDefined();
      expect(passport.integrity_gate_2!.status).toBe('failed');
    });

    it('更新不同阶段互不影响', () => {
      tmpDir = mkdtempSync(join(tmpdir(), 'passport-test-'));

      updateStageState(tmpDir, 'stage-1-design', { status: 'in_progress' });
      updateStageState(tmpDir, 'stage-3-writing', { status: 'in_progress' });

      const passport = loadPassport(tmpDir);
      expect(passport.stage_1_design.status).toBe('in_progress');
      expect(passport.stage_3_writing.status).toBe('in_progress');
      // 其他阶段不受影响
      expect(passport.stage_0_intake.status).toBe('pending');
      expect(passport.stage_2_analysis.status).toBe('pending');
    });
  });

  // ──────────────────────────────────────────────────────────
  // validatePassportPreconditions
  // ──────────────────────────────────────────────────────────

  describe('validatePassportPreconditions', () => {
    it('stage-0-intake 无前置条件', () => {
      const missing = validatePassportPreconditions(DEFAULT_PASSPORT, 'stage-0-intake');
      expect(missing).toEqual([]);
    });

    it('阶段1 检测到 stage-0 未完成', () => {
      const missing = validatePassportPreconditions(DEFAULT_PASSPORT, 'stage-1-design');
      expect(missing).toContain('阶段0（意图访谈）尚未完成');
    });

    it('阶段1 前置条件满足时通过', () => {
      tmpDir = mkdtempSync(join(tmpdir(), 'passport-test-'));
      let passport = loadPassport(tmpDir);
      passport.stage_0_intake.status = 'completed';
      savePassport(tmpDir, passport);

      passport = loadPassport(tmpDir);
      const missing = validatePassportPreconditions(passport, 'stage-1-design');
      expect(missing).toEqual([]);
    });

    it('闸门I 检测到阶段2未完成', () => {
      const missing = validatePassportPreconditions(DEFAULT_PASSPORT, 'gate-i');
      expect(missing).toContain('阶段2（数据分析）尚未完成');
    });

    it('阶段3 检测到闸门I未通过', () => {
      // 构造仅阶段2完成但闸门I缺失的状态
      tmpDir = mkdtempSync(join(tmpdir(), 'passport-test-'));
      let passport = loadPassport(tmpDir);
      passport.stage_2_analysis.status = 'completed';
      savePassport(tmpDir, passport);

      passport = loadPassport(tmpDir);
      const missing = validatePassportPreconditions(passport, 'stage-3-writing');
      expect(missing).toContain('闸门I（完整性检查）未通过');
    });

    it('阶段3 检测到前置条件全部满足时通过', () => {
      tmpDir = mkdtempSync(join(tmpdir(), 'passport-test-'));
      let passport = loadPassport(tmpDir);
      passport.stage_2_analysis.status = 'completed';
      passport.integrity_gate_1 = {
        status: 'passed',
        checked_at: new Date().toISOString(),
        claim_sample_rate: 0.3,
        retry_count: 0,
        modes: {},
        overrides: [],
        report_path: 'gates/gate-i-report.md',
      };
      savePassport(tmpDir, passport);

      passport = loadPassport(tmpDir);
      const missing = validatePassportPreconditions(passport, 'stage-3-writing');
      expect(missing).toEqual([]);
    });
  });

  // ──────────────────────────────────────────────────────────
  // computeStageHash
  // ──────────────────────────────────────────────────────────

  describe('computeStageHash', () => {
    it('返回 64 字符的十六进制字符串', () => {
      const hash = computeStageHash({
        status: 'completed',
        artifacts: [],
        gates: {},
      });
      expect(hash).toBeDefined();
      expect(hash.length).toBe(64);
      expect(/^[a-f0-9]{64}$/.test(hash)).toBe(true);
    });

    it('相同内容产生相同 hash', () => {
      const stage: Parameters<typeof computeStageHash>[0] = {
        status: 'completed',
        started_at: '2026-06-16T00:00:00.000Z',
        artifacts: [{ path: 'test.md', checksum: 'abc123' }],
        gates: {},
      };

      const hash1 = computeStageHash(stage);
      const hash2 = computeStageHash({ ...stage });
      expect(hash1).toBe(hash2);
    });

    it('不同内容产生不同 hash', () => {
      const h1 = computeStageHash({
        status: 'completed',
        artifacts: [],
        gates: {},
      });
      const h2 = computeStageHash({
        status: 'pending',
        artifacts: [],
        gates: {},
      });
      expect(h1).not.toBe(h2);
    });

    it('仅 artifacts 路径不同产生不同 hash', () => {
      const h1 = computeStageHash({
        status: 'completed',
        artifacts: [{ path: 'a.md', checksum: 'abc' }],
        gates: {},
      });
      const h2 = computeStageHash({
        status: 'completed',
        artifacts: [{ path: 'b.md', checksum: 'abc' }],
        gates: {},
      });
      expect(h1).not.toBe(h2);
    });

    it('仅 gates 中某个值不同产生不同 hash', () => {
      const h1 = computeStageHash({
        status: 'completed',
        artifacts: [],
        gates: { gate1: { status: 'passed', checked_at: '2026-01-01', claim_sample_rate: 0.3, retry_count: 0, modes: {}, overrides: [], report_path: 'a.md' } },
      });
      const h2 = computeStageHash({
        status: 'completed',
        artifacts: [],
        gates: { gate1: { status: 'failed', checked_at: '2026-01-01', claim_sample_rate: 0.3, retry_count: 0, modes: {}, overrides: [], report_path: 'a.md' } },
      });
      expect(h1).not.toBe(h2);
    });

    it('语义相同但 key 顺序不同产生相同 hash', () => {
      const h1 = computeStageHash({
        status: 'completed',
        artifacts: [{ path: 'x.md', checksum: '123' }],
        gates: {},
      });
      // 翻转对象 key 顺序
      const h2 = computeStageHash({
        artifacts: [{ path: 'x.md', checksum: '123' }],
        gates: {},
        status: 'completed',
      } as any);
      expect(h1).toBe(h2);
    });

    it('含 GateReport 嵌套字段的 stage 哈希稳定', () => {
      const h1 = computeStageHash({
        status: 'completed',
        artifacts: [{ path: 'r.md', checksum: 'xyz' }],
        gates: {
          gate_i: { status: 'passed', checked_at: '2026-06-16', claim_sample_rate: 0.3, retry_count: 1, modes: { claim_01: 'CLEAR' }, overrides: [], report_path: 'gate.md' },
        },
      });
      const h2 = computeStageHash({
        artifacts: [{ checksum: 'xyz', path: 'r.md' }],
        gates: {
          gate_i: { checked_at: '2026-06-16', retry_count: 1, modes: { claim_01: 'CLEAR' }, status: 'passed', overrides: [], claim_sample_rate: 0.3, report_path: 'gate.md' },
        },
        status: 'completed',
      } as any);
      expect(h1).toBe(h2);
    });
  });

  // ──────────────────────────────────────────────────────────
  // validatePassportSchema
  // ──────────────────────────────────────────────────────────

  describe('validatePassportSchema', () => {
    it('有效 passport 通过验证', () => {
      const result = validatePassportSchema(DEFAULT_PASSPORT);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('null/undefined 验证失败', () => {
      expect(validatePassportSchema(null).valid).toBe(false);
      expect(validatePassportSchema(undefined).valid).toBe(false);
      expect(validatePassportSchema('string').valid).toBe(false);
    });

    it('缺失 passport_version 时失败', () => {
      const { passport_version, ...rest } = DEFAULT_PASSPORT;
      const result = validatePassportSchema(rest);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('missing passport_version');
    });

    it('缺失 pipeline.current_stage 时失败', () => {
      const data = { ...DEFAULT_PASSPORT, pipeline: {} };
      const result = validatePassportSchema(data);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('missing pipeline.current_stage');
    });

    it('错误的 layout 值时失败', () => {
      const data = { ...DEFAULT_PASSPORT, project: { layout: 'invalid' } };
      const result = validatePassportSchema(data);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('project.layout must be "omo-sci" or "codexsci-legacy"');
    });

    it('signoff_records 不是数组时失败', () => {
      const data = { ...DEFAULT_PASSPORT, signoff_records: 'not-array' };
      const result = validatePassportSchema(data);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('signoff_records must be an array');
    });

    // ── 增强校验：data_provenance ──

    it('data_provenance 为合法值时通过', () => {
      const data = { ...DEFAULT_PASSPORT };
      for (const label of ['SEALED', 'real', 'simulated']) {
        data.data_provenance = label as any;
        const result = validatePassportSchema(data);
        expect(result.valid).toBe(true);
      }
    });

    it('data_provenance 为非法值时失败', () => {
      const data = { ...DEFAULT_PASSPORT, data_provenance: 'invalid-label' };
      const result = validatePassportSchema(data);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('data_provenance');
    });

    // ── 增强校验：6 个 stage_* block ──

    it('stage_* block status 为非法值时失败', () => {
      const data = { ...DEFAULT_PASSPORT, stage_0_intake: { status: 'invalid-status', artifacts: [], gates: {} } as any };
      const result = validatePassportSchema(data);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('stage_0_intake.status');
    });

    it('stage_* block artifacts 不是数组时失败', () => {
      const data = { ...DEFAULT_PASSPORT, stage_1_design: { status: 'pending', artifacts: 'not-array', gates: {} } };
      const result = validatePassportSchema(data);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('stage_1_design.artifacts');
    });

    it('stage_* block gates 不是对象时失败', () => {
      const data = { ...DEFAULT_PASSPORT, stage_2_analysis: { status: 'pending', artifacts: [], gates: [] } };
      const result = validatePassportSchema(data);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('stage_2_analysis.gates');
    });

    it('所有 6 个 stage_* block 同时校验', () => {
      const data = { ...DEFAULT_PASSPORT };
      // 将 stage_0_intake 改为无效 status
      data.stage_0_intake = { status: 'bogus', artifacts: [], gates: {} } as any;
      const result = validatePassportSchema(data);
      expect(result.errors.some(e => e.includes('stage_0_intake'))).toBe(true);
    });

    // ── 增强校验：integrity_gate_* ──

    it('integrity_gate_1 为合法 GateReport 时通过', () => {
      const data = { ...DEFAULT_PASSPORT, integrity_gate_1: { status: 'passed', checked_at: '2026-06-16T00:00:00Z', claim_sample_rate: 0.3, retry_count: 0, modes: {}, overrides: [], report_path: 'gate.md' } };
      const result = validatePassportSchema(data);
      expect(result.valid).toBe(true);
    });

    it('integrity_gate_1 claim_sample_rate 非法时失败', () => {
      const data = { ...DEFAULT_PASSPORT, integrity_gate_1: { status: 'passed', claim_sample_rate: 0.5 } };
      const result = validatePassportSchema(data);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('claim_sample_rate');
    });

    it('integrity_gate_2 retry_count 非法时失败', () => {
      const data = { ...DEFAULT_PASSPORT, integrity_gate_2: { status: 'failed', retry_count: -1 } };
      const result = validatePassportSchema(data);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('retry_count');
    });

    it('integrity_gate_1 modes 不是对象时失败', () => {
      const data = { ...DEFAULT_PASSPORT, integrity_gate_2: { status: 'passed', modes: 'not-object' } };
      const result = validatePassportSchema(data);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('modes');
    });

    it('integrity_gate_1 report_path 不是字符串时失败', () => {
      const data = { ...DEFAULT_PASSPORT, integrity_gate_1: { report_path: 123 } };
      const result = validatePassportSchema(data);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('report_path');
    });

    // ── 增强校验：claim_evidence_map ──

    it('claim_evidence_map 为合法数组时通过', () => {
      const data = { ...DEFAULT_PASSPORT, claim_evidence_map: [{ claim_id: 'c1', evidence_type: 'literature', verification_status: 'verified' }] };
      const result = validatePassportSchema(data);
      expect(result.valid).toBe(true);
    });

    it('claim_evidence_map 不是数组时失败', () => {
      const data = { ...DEFAULT_PASSPORT, claim_evidence_map: 'not-array' };
      const result = validatePassportSchema(data);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('claim_evidence_map');
    });

    it('claim_evidence_map 记录缺失 claim_id 时报错', () => {
      const data = { ...DEFAULT_PASSPORT, claim_evidence_map: [{ evidence_type: 'literature', verification_status: 'verified' }] };
      const result = validatePassportSchema(data);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('claim_id');
    });

    it('claim_evidence_map 记录 evidence_type 非法时报错', () => {
      const data = { ...DEFAULT_PASSPORT, claim_evidence_map: [{ claim_id: 'c1', evidence_type: 'invalid-type', verification_status: 'verified' }] };
      const result = validatePassportSchema(data);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('evidence_type');
    });

    it('claim_evidence_map 记录 verification_status 非法时报错', () => {
      const data = { ...DEFAULT_PASSPORT, claim_evidence_map: [{ claim_id: 'c1', evidence_type: 'literature', verification_status: 'invalid' }] };
      const result = validatePassportSchema(data);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('verification_status');
    });
  });
});
