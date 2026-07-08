/**
 * plugin-tools.ts 测试
 *
 * 核心断言：闸门/阶段推进工具在前置条件不满足时必须 throw，
 * 而不是静默放行。这是"提示词约定"升级为"工具调用强制"的
 * 关键行为——没有这层保证，注册工具就只是换了个写法的建议。
 */
import { describe, it, expect, afterEach } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  passportAdvanceStage,
  passportRecordClaim,
  passportRecordGate,
  passportStatus,
} from '../src/plugin-tools';
import { loadPassport, updateStageState } from '../src/state/passport';

function mockContext(directory: string, agent = 'dubin') {
  return { directory, agent } as any;
}

describe('plugin-tools', () => {
  let tmpDir: string;

  afterEach(() => {
    if (tmpDir) rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('passport-advance-stage', () => {
    it('前置条件不满足时拒绝执行（不能跳过阶段）', async () => {
      tmpDir = mkdtempSync(join(tmpdir(), 'omo-sci-tool-'));
      // 阶段0尚未完成，直接尝试推进到阶段2
      await expect(
        passportAdvanceStage.execute(
          { target_stage: 'stage-2-analysis', summary: '试图跳过阶段1' },
          mockContext(tmpDir),
        ),
      ).rejects.toThrow(/前置条件未满足/);
    });

    it('前置条件满足时推进成功，并把上一阶段标记为已完成', async () => {
      tmpDir = mkdtempSync(join(tmpdir(), 'omo-sci-tool-'));
      const result = await passportAdvanceStage.execute(
        { target_stage: 'stage-1-design', summary: '完成意图访谈，确认 PICO' },
        mockContext(tmpDir),
      );
      expect(result).toContain('stage-1-design');

      const passport = loadPassport(tmpDir);
      expect(passport.pipeline.current_stage).toBe('stage-1-design');
      expect(passport.stage_0_intake.status).toBe('completed');
      expect(passport.stage_1_design.status).toBe('in_progress');
      expect(passport.wisdom_collected.length).toBe(1);
      expect(passport.wisdom_collected[0].content).toContain('PICO');
      expect(passport.wisdom_collected[0].agent).toBe('dubin');
    });

    it('闸门I未通过时拒绝推进到阶段3（写作）', async () => {
      tmpDir = mkdtempSync(join(tmpdir(), 'omo-sci-tool-'));
      updateStageState(tmpDir, 'stage-0-intake', { status: 'completed' });
      updateStageState(tmpDir, 'stage-1-design', { status: 'completed' });
      updateStageState(tmpDir, 'stage-2-analysis', { status: 'completed' });
      // 闸门I 从未记录 —— 直接尝试跳到写作阶段
      await expect(
        passportAdvanceStage.execute(
          { target_stage: 'stage-3-writing', summary: '跳过闸门I直接写作' },
          mockContext(tmpDir),
        ),
      ).rejects.toThrow(/闸门I/);
    });
  });

  describe('passport-record-gate', () => {
    it('阶段2未完成时拒绝记录闸门I', async () => {
      tmpDir = mkdtempSync(join(tmpdir(), 'omo-sci-tool-'));
      await expect(
        passportRecordGate.execute(
          { gate: 'gate-i', status: 'passed', report_path: 'reports/gate-i.md', claim_sample_rate: 0.3 },
          mockContext(tmpDir, 'ebmer'),
        ),
      ).rejects.toThrow(/前置条件未满足/);
    });

    it('claim_evidence_map 为空时拒绝记录闸门I通过（不能只凭口头说验证过了）', async () => {
      tmpDir = mkdtempSync(join(tmpdir(), 'omo-sci-tool-'));
      updateStageState(tmpDir, 'stage-0-intake', { status: 'completed' });
      updateStageState(tmpDir, 'stage-1-design', { status: 'completed' });
      updateStageState(tmpDir, 'stage-2-analysis', { status: 'completed' });

      await expect(
        passportRecordGate.execute(
          { gate: 'gate-i', status: 'passed', report_path: 'reports/gate-i.md', claim_sample_rate: 0.3 },
          mockContext(tmpDir, 'ebmer'),
        ),
      ).rejects.toThrow(/claim_evidence_map 为空/);
    });

    it('存在 missing/conflict 主张时拒绝记录闸门I通过', async () => {
      tmpDir = mkdtempSync(join(tmpdir(), 'omo-sci-tool-'));
      updateStageState(tmpDir, 'stage-0-intake', { status: 'completed' });
      updateStageState(tmpDir, 'stage-1-design', { status: 'completed' });
      updateStageState(tmpDir, 'stage-2-analysis', { status: 'completed' });

      await passportRecordClaim.execute(
        {
          claim_id: 'C1',
          claim_text: '瑞马唑仑组谵妄发生率更低',
          evidence_type: 'analysis_result',
          evidence_ids: ['Table2-row1'],
          verification_status: 'verified',
        },
        mockContext(tmpDir, 'ebmer'),
      );
      await passportRecordClaim.execute(
        {
          claim_id: 'C2',
          claim_text: '既往研究显示同样趋势',
          evidence_type: 'literature',
          evidence_ids: ['PMID_UNKNOWN'],
          verification_status: 'missing',
        },
        mockContext(tmpDir, 'ebmer'),
      );

      await expect(
        passportRecordGate.execute(
          { gate: 'gate-i', status: 'passed', report_path: 'reports/gate-i.md', claim_sample_rate: 0.3 },
          mockContext(tmpDir, 'ebmer'),
        ),
      ).rejects.toThrow(/C2/);
    });

    it('主张全部验证通过后，可以记录闸门I通过，写入报告路径', async () => {
      tmpDir = mkdtempSync(join(tmpdir(), 'omo-sci-tool-'));
      updateStageState(tmpDir, 'stage-0-intake', { status: 'completed' });
      updateStageState(tmpDir, 'stage-1-design', { status: 'completed' });
      updateStageState(tmpDir, 'stage-2-analysis', { status: 'completed' });

      await passportRecordClaim.execute(
        {
          claim_id: 'C1',
          claim_text: '瑞马唑仑组谵妄发生率更低',
          evidence_type: 'analysis_result',
          evidence_ids: ['Table2-row1'],
          verification_status: 'verified',
        },
        mockContext(tmpDir, 'ebmer'),
      );

      const result = await passportRecordGate.execute(
        { gate: 'gate-i', status: 'passed', report_path: 'reports/gate-i.md', claim_sample_rate: 0.3 },
        mockContext(tmpDir, 'ebmer'),
      );
      expect(result).toContain('✅');

      const passport = loadPassport(tmpDir);
      expect(passport.integrity_gate_1?.status).toBe('passed');
      expect(passport.integrity_gate_1?.report_path).toBe('reports/gate-i.md');
      expect(passport.integrity_gate_1?.claim_sample_rate).toBe(0.3);
    });

    it('记录闸门I失败时不检查 claim_evidence_map，失败后续阶段仍会被拒绝', async () => {
      tmpDir = mkdtempSync(join(tmpdir(), 'omo-sci-tool-'));
      updateStageState(tmpDir, 'stage-0-intake', { status: 'completed' });
      updateStageState(tmpDir, 'stage-1-design', { status: 'completed' });
      updateStageState(tmpDir, 'stage-2-analysis', { status: 'completed' });

      const result = await passportRecordGate.execute(
        { gate: 'gate-i', status: 'failed', report_path: 'reports/gate-i.md', claim_sample_rate: 1.0 },
        mockContext(tmpDir, 'ebmer'),
      );
      expect(result).toContain('⚠️');

      const passport = loadPassport(tmpDir);
      expect(passport.integrity_gate_1?.status).toBe('failed');

      await expect(
        passportAdvanceStage.execute(
          { target_stage: 'stage-3-writing', summary: '闸门I失败仍想推进' },
          mockContext(tmpDir),
        ),
      ).rejects.toThrow(/闸门I/);
    });
  });

  describe('passport-record-claim', () => {
    it('记录一条主张，写入 claim_evidence_map', async () => {
      tmpDir = mkdtempSync(join(tmpdir(), 'omo-sci-tool-'));
      const result = await passportRecordClaim.execute(
        {
          claim_id: 'PMID_12345678',
          claim_text: '瑞马唑仑与丙泊酚谵妄发生率的既往研究',
          evidence_type: 'literature',
          evidence_ids: ['PMID_12345678'],
          verification_status: 'verified',
        },
        mockContext(tmpDir, 'writer'),
      );
      expect(result).toContain('✅');

      const passport = loadPassport(tmpDir);
      expect(passport.claim_evidence_map.length).toBe(1);
      expect(passport.claim_evidence_map[0].claim_id).toBe('PMID_12345678');
      expect(passport.claim_evidence_map[0].evidence_type).toBe('literature');
    });

    it('用相同 claim_id 再次调用会更新而不是重复添加', async () => {
      tmpDir = mkdtempSync(join(tmpdir(), 'omo-sci-tool-'));
      await passportRecordClaim.execute(
        {
          claim_id: 'C1',
          claim_text: '初次记录',
          evidence_type: 'analysis_result',
          evidence_ids: ['x'],
          verification_status: 'missing',
        },
        mockContext(tmpDir, 'ebmer'),
      );
      await passportRecordClaim.execute(
        {
          claim_id: 'C1',
          claim_text: '补充验证后更新',
          evidence_type: 'analysis_result',
          evidence_ids: ['Table1-row3'],
          verification_status: 'verified',
        },
        mockContext(tmpDir, 'ebmer'),
      );

      const passport = loadPassport(tmpDir);
      expect(passport.claim_evidence_map.length).toBe(1);
      expect(passport.claim_evidence_map[0].verification_status).toBe('verified');
    });
  });

  describe('passport-status', () => {
    it('返回结构化的阶段和闸门状态摘要', async () => {
      tmpDir = mkdtempSync(join(tmpdir(), 'omo-sci-tool-'));
      const result = await passportStatus.execute({}, mockContext(tmpDir));
      expect(result).toContain('stage-0-intake: pending');
      expect(result).toContain('gate-i: not_run');
      expect(result).toContain('数据溯源标签: SEALED');
    });
  });
});
