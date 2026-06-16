/**
 * usage-tracker 模块测试
 */
import { describe, it, expect } from 'bun:test';
import { recordUsage, getQuotaWarning } from '../../src/safety/usage-tracker';
import { DEFAULT_CONFIG } from '../../src/constants';

describe('usage-tracker', () => {
  describe('recordUsage', () => {
    it('正确累加 input + output tokens', () => {
      const result = recordUsage({
        timestamp: '2026-06-16T00:00:00Z',
        agent: 'dubin',
        stage: 'stage-0-intake',
        input_tokens: 100_000,
        output_tokens: 50_000,
      });
      expect(result.currentUsage).toBe(150_000);
    });

    it('50% 用量返回 light 警告', () => {
      // token_quota 默认 500_000_000, 50% = 250_000_000
      const result = recordUsage({
        timestamp: '2026-06-16T00:00:00Z',
        agent: 'writer',
        stage: 'stage-3-writing',
        input_tokens: 250_000_000,
        output_tokens: 0,
      });
      expect(result.warningLevel).toBe('light');
      expect(result.quotaPercent).toBe(50);
    });

    it('80% 用量返回 moderate 警告', () => {
      const result = recordUsage({
        timestamp: '2026-06-16T00:00:00Z',
        agent: 'archimedes',
        stage: 'stage-2-analysis',
        input_tokens: 400_000_000,
        output_tokens: 0,
      });
      expect(result.warningLevel).toBe('moderate');
      expect(result.quotaPercent).toBe(80);
    });

    it('100% 用量返回 critical 警告', () => {
      const result = recordUsage({
        timestamp: '2026-06-16T00:00:00Z',
        agent: 'spsser',
        stage: 'stage-2-analysis',
        input_tokens: 500_000_000,
        output_tokens: 0,
      });
      expect(result.warningLevel).toBe('critical');
      expect(result.quotaPercent).toBe(100);
    });

    it('0% 用量返回 none', () => {
      const result = recordUsage({
        timestamp: '2026-06-16T00:00:00Z',
        agent: 'dubin',
        stage: 'stage-0-intake',
        input_tokens: 0,
        output_tokens: 0,
      });
      expect(result.warningLevel).toBe('none');
      expect(result.quotaPercent).toBe(0);
    });
  });

  describe('getQuotaWarning', () => {
    it('返回正确的警告文案', () => {
      expect(getQuotaWarning('light')).toContain('50%');
      expect(getQuotaWarning('moderate')).toContain('MiniMax');
      expect(getQuotaWarning('critical')).toContain('额度已用完');
    });

    it('空字符串兜底', () => {
      expect(getQuotaWarning('none' as any)).toBe('');
    });
  });
});
