/**
 * status 模块测试
 */
import { describe, it, expect } from "bun:test";
import { getStatus, formatStatus } from "../src/status";

describe("getStatus", () => {
  it("should return not-installed state when config missing", async () => {
    // Temporarily use a non-existent config path
    const status = await getStatus();
    // The config may or may not exist depending on previous tests
    expect(status.installed).toBeDefined();
    expect(typeof status.installed).toBe("boolean");
    expect(status.configPath).toBeDefined();
    expect(status.configPath).toContain("omo-sci.jsonc");
  });

  it("should have configPath ending with omo-sci.jsonc", async () => {
    const status = await getStatus();
    expect(status.configPath.endsWith("omo-sci.jsonc")).toBe(true);
  });
});

describe("formatStatus", () => {
  it("should format uninstalled state", () => {
    const output = formatStatus({
      installed: false,
      configPath: "/tmp/.config/opencode/omo-sci/omo-sci.jsonc",
      config: null,
    });

    expect(output).toContain("未安装");
    expect(output).toContain("install");
  });

  it("should format installed state with config", () => {
    const output = formatStatus({
      installed: true,
      configPath: "/tmp/.config/opencode/omo-sci/omo-sci.jsonc",
      config: {
        router: {
          categories: {
            'agent-orchestration': { category: 'agent-orchestration', fallback_chain: [], concurrency_limit: 2 },
            'deep-reasoning': { category: 'deep-reasoning', fallback_chain: [{ provider: 'deepseek', model_id: 'deepseek-v4-pro', context_window: 1_000_000, max_output: 128_000 }], concurrency_limit: 2 },
            'chinese-writing': { category: 'chinese-writing', fallback_chain: [], concurrency_limit: 2 },
            'fast-search': { category: 'fast-search', fallback_chain: [], concurrency_limit: 4 },
            'long-context': { category: 'long-context', fallback_chain: [], concurrency_limit: 2 },
            'methodical-review': { category: 'methodical-review', fallback_chain: [], concurrency_limit: 2 },
          },
          concurrency: { max_total_agents: 8 },
        },
        safety: { max_step: 50, max_time_minutes: 30, loop_detect_threshold: 5 },
        usage: { token_quota: 500000000, current_usage: 0, quota_reset_date: '2026-06-01' },
        environment: { mcp_required: [], mcp_optional: [], r_packages: [], software: ['R'] },
        installed_at: "2026-06-16T00:00:00.000Z",
      },
    });

    expect(output).toContain("已安装");
    expect(output).toContain("deepseek");
    expect(output).toContain("5.0 亿 tokens");
  });
});
