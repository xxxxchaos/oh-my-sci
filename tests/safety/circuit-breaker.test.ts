/**
 * circuit-breaker 模块测试
 */
import { describe, it, expect } from 'bun:test';
import { startRun, recordStep, endRun, getLoopInterventionPrompt } from '../../src/safety/circuit-breaker';

describe('circuit-breaker', () => {
  describe('startRun', () => {
    it('返回非空 run ID', () => {
      const id = startRun('dubin');
      expect(id).toBeTruthy();
      expect(id).toContain('dubin-');
    });
  });

  describe('recordStep', () => {
    it('正常步骤返回 shouldContinue: true', () => {
      const runId = startRun('archimedes');
      const result = recordStep(runId, 'read_file', 'path/to/file');
      expect(result.shouldContinue).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('不存在的 run ID 返回 Run not found', () => {
      const result = recordStep('nonexistent-run', 'read_file', 'x');
      expect(result.shouldContinue).toBe(false);
      expect(result.reason).toBe('Run not found');
    });

    it('超过 max_step 后 shouldContinue 为 false', () => {
      const runId = startRun('irber');
      // max_step 默认 50，走 51 步触发
      for (let i = 0; i < 50; i++) {
        recordStep(runId, 'search', `query-${i}`);
      }
      const result = recordStep(runId, 'search', 'overflow');
      expect(result.shouldContinue).toBe(false);
      expect(result.reason).toContain('最大步数限制');
    });

    it('5 次相同工具调用触发循环检测', () => {
      const runId = startRun('spsser');
      // loop_detect_threshold 默认 5
      for (let i = 0; i < 4; i++) {
        const r = recordStep(runId, 'same_tool', 'same_params');
        expect(r.shouldContinue).toBe(true);
      }
      const result = recordStep(runId, 'same_tool', 'same_params');
      expect(result.shouldContinue).toBe(false);
      expect(result.reason).toContain('检测到循环');
    });

    it('不同工具调用不触发循环检测', () => {
      const runId = startRun('pubmeder');
      for (let i = 0; i < 10; i++) {
        const r = recordStep(runId, `tool-${i}`, `params-${i}`);
        expect(r.shouldContinue).toBe(true);
      }
    });
  });

  describe('endRun', () => {
    it('endRun 后 recordStep 返回 Run not found', () => {
      const runId = startRun('ebmer');
      endRun(runId);
      const result = recordStep(runId, 'some_tool', 'some_params');
      expect(result.shouldContinue).toBe(false);
      expect(result.reason).toBe('Run not found');
    });
  });

  describe('getLoopInterventionPrompt', () => {
    it('返回提示字符串', () => {
      const prompt = getLoopInterventionPrompt();
      expect(prompt).toContain('重复相同的操作');
      expect(prompt).toContain('Dubin');
    });
  });
});
