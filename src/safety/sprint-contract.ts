/**
 * Sprint Contract protocol — EBMer 两阶段盲审协议
 *
 * Phase 1: 盲审预判（只看分析摘要）
 * Phase 2: 实审对比（读正文，检查偏离度）
 */
import type { GateReport, GateModeStatus } from '../types';

export interface SprintPhase1 {
  predictions: string[];  // 预判的 3-5 个失败模式
  expectedEvidenceLevel: string;
  expectedRigor: number;  // 1-5
}

export interface SprintPhase2 {
  actualFindings: string[];
  deviations: Array<{ predicted: string; found: boolean; note: string }>;
  deviationCount: number;
}

export function createPhase1(predictions: string[], evidenceLevel: string, rigor: number): SprintPhase1 {
  return { predictions, expectedEvidenceLevel: evidenceLevel, expectedRigor: Math.min(5, Math.max(1, rigor)) };
}

export function createPhase2(actualFindings: string[], phase1: SprintPhase1): SprintPhase2 {
  const deviations = phase1.predictions.map(p => {
    const found = actualFindings.some(f => f.includes(p));
    return { predicted: p, found, note: found ? '预判一致' : 'Phase2 未发现此模式' };
  });
  return { actualFindings, deviations, deviationCount: deviations.filter(d => !d.found).length };
}

export function isWithinTolerance(phase2: SprintPhase2, maxDeviations: number = 2): boolean {
  return phase2.deviationCount <= maxDeviations;
}

export function buildGateReport(
  modeResults: Record<string, GateModeStatus>,
  claimSampleRate: 0.3 | 1.0,
  retryCount: number,
  reportPath: string,
  overrides: Array<{ mode: string; reason: string; approved_by_user: boolean }> = [],
): GateReport {
  const allClear = Object.values(modeResults).every(s => s === 'CLEAR' || s === 'OVERRIDDEN');
  return {
    status: allClear ? 'passed' : 'failed',
    checked_at: new Date().toISOString(),
    claim_sample_rate: claimSampleRate,
    retry_count: retryCount,
    modes: modeResults,
    overrides,
    report_path: reportPath,
  };
}
