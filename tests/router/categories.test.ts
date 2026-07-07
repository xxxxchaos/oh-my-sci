/**
 * categories.ts 测试
 *
 * agent 级映射（显示名、模型链）已迁移到 src/registry.ts，
 * 断言见 tests/registry.test.ts。这里只保留分类级配置的断言。
 */
import { describe, it, expect } from 'bun:test';
import { CATEGORY_LABELS, DEFAULT_FALLBACK_ORDERS, DEFAULT_MODEL_DENYLIST } from '../../src/router/categories';
import type { CapabilityCategory } from '../../src/types';

describe('categories', () => {
  describe('CATEGORY_LABELS', () => {
    it('包含全部 6 个分类', () => {
      const expectedCategories: CapabilityCategory[] = [
        'agent-orchestration',
        'deep-reasoning',
        'chinese-writing',
        'fast-search',
        'long-context',
        'methodical-review',
      ];
      for (const cat of expectedCategories) {
        expect(CATEGORY_LABELS[cat]).toBeDefined();
        expect(typeof CATEGORY_LABELS[cat]).toBe('string');
      }
      expect(Object.keys(CATEGORY_LABELS).length).toBe(6);
    });
  });

  describe('DEFAULT_FALLBACK_ORDERS', () => {
    it('每个分类至少有 2 个 fallback 模型', () => {
      for (const [category, models] of Object.entries(DEFAULT_FALLBACK_ORDERS)) {
        expect(models.length).toBeGreaterThanOrEqual(2);
      }
    });

    it('默认推荐矩阵符合 v0.1.17 医学科研策略', () => {
      expect(DEFAULT_FALLBACK_ORDERS['agent-orchestration'][0]).toBe('qwen3.7-plus');
      expect(DEFAULT_FALLBACK_ORDERS['deep-reasoning'][0]).toBe('qwen3.7-max');
      expect(DEFAULT_FALLBACK_ORDERS['fast-search'][0]).toBe('minimax-m3');
      expect(DEFAULT_FALLBACK_ORDERS['fast-search']).toContain('kimi-k2.6');
      expect(DEFAULT_FALLBACK_ORDERS['fast-search']).not.toContain('kimi-k2.7-code');
      expect(DEFAULT_FALLBACK_ORDERS['chinese-writing']).not.toContain('kimi-k2.7-code');
      expect(DEFAULT_MODEL_DENYLIST['fast-search']).toContain('kimi-k2.7-code');
    });
  });
});
