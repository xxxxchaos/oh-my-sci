/**
 * fallback.ts 测试
 */
import { describe, it, expect } from 'bun:test';
import { resolveModel, resolveFallbackChain, isCategoryAvailable } from '../../src/router/fallback';
import type { CapabilityCategory, RouterConfig } from '../../src/types';

function makeConfig(chain: Record<CapabilityCategory, number>): RouterConfig {
  const categories = {
    'agent-orchestration': { category: 'agent-orchestration' as const, fallback_chain: chain['agent-orchestration'] > 0 ? [{ provider: 'deepseek' as const, model_id: 'deepseek-v4-pro', context_window: 1_000_000, max_output: 128_000 }] : [], concurrency_limit: 2 },
    'deep-reasoning': { category: 'deep-reasoning' as const, fallback_chain: chain['deep-reasoning'] > 0 ? [{ provider: 'deepseek' as const, model_id: 'deepseek-v4-pro', context_window: 1_000_000, max_output: 128_000 }] : [], concurrency_limit: 2 },
    'chinese-writing': { category: 'chinese-writing' as const, fallback_chain: chain['chinese-writing'] > 0 ? [{ provider: 'zhipu' as const, model_id: 'glm-5.2', context_window: 1_000_000, max_output: 128_000 }] : [], concurrency_limit: 2 },
    'fast-search': { category: 'fast-search' as const, fallback_chain: chain['fast-search'] > 0 ? [{ provider: 'minimax' as const, model_id: 'minimax-m3', context_window: 1_000_000, max_output: 128_000 }] : [], concurrency_limit: 4 },
    'long-context': { category: 'long-context' as const, fallback_chain: chain['long-context'] > 0 ? [{ provider: 'deepseek' as const, model_id: 'deepseek-v4-pro', context_window: 1_000_000, max_output: 128_000 }] : [], concurrency_limit: 2 },
    'methodical-review': { category: 'methodical-review' as const, fallback_chain: chain['methodical-review'] > 0 ? [{ provider: 'deepseek' as const, model_id: 'deepseek-v4-pro', context_window: 1_000_000, max_output: 128_000 }] : [], concurrency_limit: 2 },
  };
  return { categories, concurrency: { max_total_agents: 8 } };
}

describe('fallback', () => {
  describe('resolveModel', () => {
    it('返回 fallback 链的第一个模型', () => {
      const config = makeConfig({ 'agent-orchestration': 1, 'deep-reasoning': 0, 'chinese-writing': 0, 'fast-search': 0, 'long-context': 0, 'methodical-review': 0 });
      const model = resolveModel('agent-orchestration', config);
      expect(model).not.toBeNull();
      expect(model!.model_id).toBe('deepseek-v4-pro');
    });

    it('在空链时返回 null', () => {
      const config = makeConfig({ 'agent-orchestration': 0, 'deep-reasoning': 0, 'chinese-writing': 0, 'fast-search': 0, 'long-context': 0, 'methodical-review': 0 });
      const model = resolveModel('agent-orchestration', config);
      expect(model).toBeNull();
    });
  });

  describe('resolveFallbackChain', () => {
    it('在空链时返回空数组', () => {
      const config = makeConfig({ 'agent-orchestration': 0, 'deep-reasoning': 0, 'chinese-writing': 0, 'fast-search': 0, 'long-context': 0, 'methodical-review': 0 });
      const chain = resolveFallbackChain('agent-orchestration', config);
      expect(chain).toEqual([]);
    });
  });

  describe('isCategoryAvailable', () => {
    it('在有模型时返回 true', () => {
      const config = makeConfig({ 'agent-orchestration': 1, 'deep-reasoning': 0, 'chinese-writing': 0, 'fast-search': 0, 'long-context': 0, 'methodical-review': 0 });
      expect(isCategoryAvailable('agent-orchestration', config)).toBe(true);
    });

    it('在无模型时返回 false', () => {
      const config = makeConfig({ 'agent-orchestration': 0, 'deep-reasoning': 0, 'chinese-writing': 0, 'fast-search': 0, 'long-context': 0, 'methodical-review': 0 });
      expect(isCategoryAvailable('agent-orchestration', config)).toBe(false);
    });
  });
});
