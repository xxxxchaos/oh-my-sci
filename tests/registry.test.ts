/**
 * registry.ts 测试
 *
 * 覆盖两件事：
 * 1. AGENT_REGISTRY 数据本身的完整性和已知策略断言（原 categories.test.ts
 *    的 agent 级部分迁移至此）
 * 2. 漂移守卫：用 registry 重新渲染 frontmatter，必须与仓库里已提交的
 *    .opencode/agents/*.md 逐字节一致。此前 scripts/generate-agent-configs.ts
 *    自带一套过期的 CATEGORY_FALLBACKS，曾导致重新生成后的文件与
 *    model-config.ts 实际生效的模型链不一致（例如 irber/spsser/writer 的
 *    默认模型与 AGENT_FALLBACK_ORDERS 对不上）。这个测试确保同类问题
 *    再次出现时 CI 会失败，而不是等用户在生产环境发现。
 */
import { describe, it, expect } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  AGENT_NAMES,
  AGENT_REGISTRY,
  AGENT_CATEGORY,
  AGENT_DISPLAY_NAMES,
  AGENT_FALLBACK_ORDERS,
  buildAgentFrontmatter,
} from '../src/registry';
import type { AgentName } from '../src/types';

const PROJECT_ROOT = join(__dirname, '..');

describe('registry', () => {
  describe('AGENT_REGISTRY', () => {
    it('包含全部 9 个 agent，字段完整', () => {
      const expectedAgents: AgentName[] = [
        'dubin', 'archimedes', 'irber', 'pubmeder', 'spsser',
        'writer', 'submitter', 'ebmer', 'polisher',
      ];
      expect(AGENT_NAMES.sort()).toEqual([...expectedAgents].sort());

      for (const name of AGENT_NAMES) {
        const def = AGENT_REGISTRY[name];
        expect(def.displayName.length).toBeGreaterThan(0);
        expect(def.description.length).toBeGreaterThan(0);
        expect(def.modelChain.length).toBeGreaterThanOrEqual(2);
        expect(def.permissions.read).toBe('allow');
      }
    });

    it('EBMer 分类为 methodical-review（此前曾与 deep-reasoning 矛盾）', () => {
      expect(AGENT_REGISTRY.ebmer.category).toBe('methodical-review');
    });

    it('只读 agent（irber/ebmer/polisher）不含 edit/bash 权限', () => {
      for (const name of ['irber', 'ebmer', 'polisher'] as AgentName[]) {
        expect(AGENT_REGISTRY[name].permissions.edit).toBeUndefined();
        expect(AGENT_REGISTRY[name].permissions.bash).toBeUndefined();
      }
    });

    it('agent 级推荐矩阵锁定 moonshot 调研结论', () => {
      expect(AGENT_FALLBACK_ORDERS.dubin[0]).toBe('qwen3.7-plus');
      expect(AGENT_FALLBACK_ORDERS.archimedes[0]).toBe('qwen3.7-max');
      expect(AGENT_FALLBACK_ORDERS.pubmeder.slice(0, 2)).toEqual(['minimax-m3', 'kimi-k2.6']);
      expect(AGENT_FALLBACK_ORDERS.spsser[0]).toBe('deepseek-v4-pro');
      expect(AGENT_FALLBACK_ORDERS.ebmer[0]).toBe('glm-5.2');
      expect(AGENT_FALLBACK_ORDERS.polisher[0]).toBe('glm-5.2');
    });
  });

  describe('派生视图与 AGENT_REGISTRY 保持一致', () => {
    it('AGENT_CATEGORY / AGENT_DISPLAY_NAMES / AGENT_FALLBACK_ORDERS 均从同一份数据派生', () => {
      for (const name of AGENT_NAMES) {
        expect(AGENT_CATEGORY[name]).toBe(AGENT_REGISTRY[name].category);
        expect(AGENT_DISPLAY_NAMES[name]).toBe(AGENT_REGISTRY[name].displayName);
        expect(AGENT_FALLBACK_ORDERS[name]).toEqual(AGENT_REGISTRY[name].modelChain);
      }
    });
  });

  describe('漂移守卫：registry 渲染结果必须与已提交的 .opencode/agents/*.md 一致', () => {
    for (const name of AGENT_NAMES) {
      it(`${name}.md 的 frontmatter 与 registry 定义一致`, async () => {
        const def = AGENT_REGISTRY[name];
        const srcPath = join(PROJECT_ROOT, 'src', 'agents', `${name}.ts`);
        const mod = await import(srcPath);
        const expected = `${buildAgentFrontmatter(def)}\n\n${mod.PROMPT}\n`;

        const mdPath = join(PROJECT_ROOT, '.opencode', 'agents', `${name}.md`);
        const actual = readFileSync(mdPath, 'utf-8');

        expect(actual).toBe(expected);
      });
    }
  });
});
