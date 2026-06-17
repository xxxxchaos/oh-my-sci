import { describe, expect, it } from 'bun:test';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { checkInstalledAgentModels, rewriteAgentFrontmatter } from '../src/model-config';
import type { OmoSciConfig } from '../src/types';

function testConfig(): OmoSciConfig {
  const model = {
    provider: 'qwen-bailian' as const,
    model_id: 'qwen3.7-max',
    context_window: 1_000_000,
    max_output: 128_000,
  };
  const category = {
    category: 'agent-orchestration' as const,
    fallback_chain: [model],
    concurrency_limit: 2,
  };

  return {
    router: {
      categories: {
        'agent-orchestration': category,
        'deep-reasoning': { ...category, category: 'deep-reasoning' },
        'chinese-writing': { ...category, category: 'chinese-writing' },
        'fast-search': { ...category, category: 'fast-search' },
        'long-context': { ...category, category: 'long-context' },
        'methodical-review': { ...category, category: 'methodical-review' },
      },
      concurrency: { max_total_agents: 8 },
    },
    safety: { max_step: 50, max_time_minutes: 30, loop_detect_threshold: 5 },
    usage: { token_quota: 200000000, current_usage: 0, quota_reset_date: '2026-06-01' },
    environment: { mcp_required: [], mcp_optional: [], r_packages: [], software: [] },
    installed_at: '2026-06-16T00:00:00.000Z',
  };
}

describe('model-config', () => {
  it('rewriteAgentFrontmatter 用配置模型替换旧模型', () => {
    const content = `---
description: "test"
mode: subagent
model: deepseek/deepseek-v4-pro
model_fallback: ["opencode-go/qwen3.7-max"]
permission:
  read: allow
---

# Prompt
`;

    const rewritten = rewriteAgentFrontmatter(content, {
      agent: 'archimedes',
      category: 'deep-reasoning',
      model: 'qwen-bailian/qwen3.7-max',
      fallback: [],
    });

    expect(rewritten).toContain('model: qwen-bailian/qwen3.7-max');
    expect(rewritten).not.toContain('deepseek/deepseek-v4-pro');
    expect(rewritten).toContain('# Prompt');
  });

  it('rewriteAgentFrontmatter 将内部 provider 名转为 OpenCode auth 名', () => {
    const content = `---
description: "test"
mode: subagent
model: deepseek/deepseek-v4-pro
model_fallback: ["opencode-go/qwen3.7-max"]
permission:
  read: allow
---

# Prompt
`;

    const rewritten = rewriteAgentFrontmatter(content, {
      agent: 'pubmeder',
      category: 'fast-search',
      model: 'zhipu/glm-5.2',
      fallback: ['minimax/minimax-m3'],
    });

    expect(rewritten).toContain('model: zhipuai-coding-plan/glm-5.2');
    expect(rewritten).toContain('model_fallback:');
    expect(rewritten).toContain('minimax-cn-coding-plan/minimax-m3');
    expect(rewritten).not.toContain('zhipu/glm-5.2');
    expect(rewritten).not.toContain('minimax/minimax-m3');
  });

  it('checkInstalledAgentModels 标记配置外模型', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'omo-sci-model-check-'));
    try {
      const agentsDir = join(tmpDir, '.opencode', 'agents');
      mkdirSync(agentsDir, { recursive: true });
      writeFileSync(join(agentsDir, 'archimedes.md'), `---
description: "test"
mode: subagent
model: deepseek/deepseek-v4-pro
---

# Prompt
`);

      const results = checkInstalledAgentModels(tmpDir, testConfig());
      expect(results[0]?.status).toBe('warn');
      expect(results[0]?.message).toContain('未出现在 omo-sci 配置');
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
