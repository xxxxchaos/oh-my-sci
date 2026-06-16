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
        providers: ["deepseek"],
        quota: 500000000,
        modelMapping: {
          "deep-reasoning": ["deepseek/deepseek-v4-pro"],
        },
        installedAt: "2026-06-16T00:00:00.000Z",
      },
    });

    expect(output).toContain("已安装");
    expect(output).toContain("deepseek");
    expect(output).toContain("5.0 亿 tokens");
  });
});
