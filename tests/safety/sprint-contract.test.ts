/**
 * sprint-contract 模块测试
 */
import { describe, it, expect } from 'bun:test';
import {
  createPhase1,
  createPhase2,
  isWithinTolerance,
  buildGateReport,
} from '../../src/safety/sprint-contract';

describe('sprint-contract', () => {
  describe('createPhase1', () => {
    it('创建 Phase1 并包含预判列表', () => {
      const predictions = ['PSM 卡钳值设定', '缺失值处理', '亚组分析计划'];
      const phase1 = createPhase1(predictions, 'RCT', 4);
      expect(phase1.predictions).toEqual(predictions);
      expect(phase1.expectedEvidenceLevel).toBe('RCT');
      expect(phase1.expectedRigor).toBe(4);
    });

    it('rigor 限制在 1-5 范围', () => {
      expect(createPhase1([], 'RCT', 0).expectedRigor).toBe(1);
      expect(createPhase1([], 'RCT', 10).expectedRigor).toBe(5);
      expect(createPhase1([], 'RCT', 3).expectedRigor).toBe(3);
    });
  });

  describe('createPhase2', () => {
    it('命中所有预判时 deviationCount 为 0', () => {
      const phase1 = createPhase1(['PSM', 'MICE'], 'cohort', 3);
      const phase2 = createPhase2(['PSM matching with caliper 0.2', 'MICE imputation performed'], phase1);
      expect(phase2.deviationCount).toBe(0);
      expect(phase2.deviations[0].found).toBe(true);
      expect(phase2.deviations[0].note).toBe('预判一致');
    });

    it('部分预判未命中时记录偏离', () => {
      const phase1 = createPhase1(['PSM', 'MICE', 'subgroup'], 'cohort', 3);
      const phase2 = createPhase2(['PSM matching with caliper 0.2'], phase1);
      expect(phase2.deviationCount).toBe(2);
      expect(phase2.deviations[1].found).toBe(false);
      expect(phase2.deviations[1].note).toBe('Phase2 未发现此模式');
    });

    it('actualFindings 为空时全部偏离', () => {
      const phase1 = createPhase1(['a', 'b', 'c'], 'case-series', 2);
      const phase2 = createPhase2([], phase1);
      expect(phase2.deviationCount).toBe(3);
    });
  });

  describe('isWithinTolerance', () => {
    it('偏离数在容差内返回 true', () => {
      const phase1 = createPhase1(['a'], 'RCT', 4);
      const phase2 = createPhase2(['a'], phase1);
      expect(isWithinTolerance(phase2, 1)).toBe(true);
    });

    it('偏离数超过容差返回 false', () => {
      const phase1 = createPhase1(['a', 'b', 'c'], 'RCT', 4);
      const phase2 = createPhase2(['a'], phase1);
      expect(isWithinTolerance(phase2, 1)).toBe(false);
    });

    it('使用默认容差 2', () => {
      const phase1 = createPhase1(['a', 'b', 'c'], 'RCT', 4);
      const phase2 = createPhase2(['a'], phase1);
      // deviationCount=2, 默认容差=2, 2<=2 → true
      expect(isWithinTolerance(phase2)).toBe(true);
      // 提高容差到 3 → 仍然为 true
      expect(isWithinTolerance(phase2, 3)).toBe(true);
      // 降低容差到 1 → false
      expect(isWithinTolerance(phase2, 1)).toBe(false);
    });
  });

  describe('buildGateReport', () => {
    it('所有模式 CLEAR 时状态为 passed', () => {
      const report = buildGateReport(
        { '研究设计': 'CLEAR', '统计方法': 'CLEAR' },
        0.3,
        2,
        '/path/to/report.md',
      );
      expect(report.status).toBe('passed');
      expect(report.claim_sample_rate).toBe(0.3);
      expect(report.retry_count).toBe(2);
    });

    it('有 SUSPECTED 模式时状态为 failed', () => {
      const report = buildGateReport(
        { '研究设计': 'SUSPECTED', '统计方法': 'CLEAR' },
        1.0,
        3,
        '/path/to/report.md',
      );
      expect(report.status).toBe('failed');
    });

    it('OVERRIDDEN 模式被视为通过', () => {
      const report = buildGateReport(
        { '研究设计': 'OVERRIDDEN' },
        0.3,
        0,
        '/path/to/report.md',
        [{ mode: '研究设计', reason: '用户确认', approved_by_user: true }],
      );
      expect(report.status).toBe('passed');
      expect(report.overrides).toHaveLength(1);
    });
  });
});
