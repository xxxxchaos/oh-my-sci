/**
 * config 模块测试
 */
import { describe, it, expect } from 'bun:test';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { loadConfig, validateConfig, deepMerge } from '../src/config';
import { DEFAULT_CONFIG } from '../src/constants';
import type { OmoSciConfig } from '../src/types';

describe('config', () => {
  describe('loadConfig', () => {
    it('在文件不存在时返回默认值', () => {
      const config = loadConfig('/nonexistent/path/omo-sci.jsonc');
      expect(config).toEqual(DEFAULT_CONFIG);
      expect(config.environment.mcp_required).toEqual(['unified_search']);
      expect(config.environment.mcp_optional).toContain('search_cnki');
      expect(config.environment.mcp_optional).toContain('Consensus__search');
    });

    it('迁移旧配置：CNKI 和 Consensus 从必选移到可选', () => {
      const tmpDir = mkdtempSync(join(tmpdir(), 'omo-sci-config-'));
      try {
        const configPath = join(tmpDir, 'omo-sci.jsonc');
        writeFileSync(configPath, JSON.stringify({
          environment: {
            mcp_required: ['unified_search', 'search_cnki', 'Consensus__search', 'officecli', 'custom_required_tool'],
            mcp_optional: ['zotero_search_items', 'officecli'],
          },
        }));

        const config = loadConfig(configPath);
        expect(config.environment.mcp_required).toContain('unified_search');
        expect(config.environment.mcp_required).toContain('custom_required_tool');
        expect(config.environment.mcp_required).not.toContain('search_cnki');
        expect(config.environment.mcp_required).not.toContain('Consensus__search');
        expect(config.environment.mcp_required).not.toContain('officecli');
        expect(config.environment.mcp_optional).toContain('search_cnki');
        expect(config.environment.mcp_optional).toContain('Consensus__search');
        expect(config.environment.mcp_optional).not.toContain('officecli');
      } finally {
        rmSync(tmpDir, { recursive: true, force: true });
      }
    });
  });

  describe('validateConfig', () => {
    it('在空 fallback_chain 时警告', () => {
      const warnings = validateConfig(DEFAULT_CONFIG);
      // 所有 6 个 category 的 fallback_chain 都为空
      expect(warnings.length).toBe(6);
      for (const w of warnings) {
        expect(w).toContain('fallback_chain');
      }
    });

    it('在有 fallback_chain 时不警告', () => {
      const configWithChain: OmoSciConfig = {
        ...DEFAULT_CONFIG,
        router: {
          ...DEFAULT_CONFIG.router,
          categories: {
            'fast-search': {
              category: 'fast-search',
              fallback_chain: [
                {
                  provider: 'minimax',
                  model_id: 'minimax-m3',
                  context_window: 128_000,
                  max_output: 8_192,
                },
              ],
              concurrency_limit: 4,
            },
            'agent-orchestration': {
              category: 'agent-orchestration',
              fallback_chain: [],
              concurrency_limit: 2,
            },
            'deep-reasoning': {
              category: 'deep-reasoning',
              fallback_chain: [],
              concurrency_limit: 2,
            },
            'chinese-writing': {
              category: 'chinese-writing',
              fallback_chain: [],
              concurrency_limit: 2,
            },
            'long-context': {
              category: 'long-context',
              fallback_chain: [],
              concurrency_limit: 2,
            },
            'methodical-review': {
              category: 'methodical-review',
              fallback_chain: [],
              concurrency_limit: 2,
            },
          },
          concurrency: { max_total_agents: 8 },
        },
      };

      const warnings = validateConfig(configWithChain);
      // 只有 5 个 category 没有 fallback_chain
      expect(warnings.length).toBe(5);
      expect(warnings.every((w) => !w.includes('fast-search'))).toBe(true);
    });
  });

  describe('deepMerge', () => {
    it('用户部分覆盖 category 配置时正确合并', () => {
      const userPartial = {
        router: {
          categories: {
            'fast-search': {
              category: 'fast-search' as const,
              fallback_chain: [
                {
                  provider: 'minimax' as const,
                  model_id: 'minimax-m3',
                  context_window: 128_000,
                  max_output: 8_192,
                },
              ],
              concurrency_limit: 8,
            },
          },
          concurrency: { max_total_agents: 12 },
        },
      };

      const merged = deepMerge(
        DEFAULT_CONFIG,
        userPartial as Partial<OmoSciConfig>,
      );

      // 被覆盖的字段使用用户值
      expect(merged.router.categories['fast-search'].fallback_chain.length).toBe(1);
      expect(merged.router.categories['fast-search'].concurrency_limit).toBe(8);
      expect(merged.router.concurrency.max_total_agents).toBe(12);

      // 未被覆盖的 category 保留默认值
      expect(merged.router.categories['deep-reasoning'].fallback_chain).toEqual([]);
      expect(merged.router.categories['deep-reasoning'].concurrency_limit).toBe(2);
      expect(merged.router.categories['agent-orchestration'].concurrency_limit).toBe(2);
    });
  });
});
