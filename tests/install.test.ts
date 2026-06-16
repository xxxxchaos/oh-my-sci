/**
 * install 模块测试
 */
import { describe, it, expect, afterEach } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { install, generateConfig, VALID_QUOTAS } from "../src/install";
import { loadConfig } from "../src/config";
import type { ProviderId } from "../src/types";

describe("generateConfig", () => {
  it("从 providers 生成完整的 OmoSciConfig", () => {
    const config = generateConfig(["deepseek", "qwen-bailian"], 500000000, true);

    expect(config.router).toBeDefined();
    expect(config.router.categories).toBeDefined();
    expect(config.usage.token_quota).toBe(500000000);
    expect(config.safety.max_step).toBe(50);

    // 所有 6 个 category 都有 fallback_chain
    const entries = Object.entries(config.router.categories);
    expect(entries.length).toBe(6);
    for (const [, catCfg] of entries) {
      expect(catCfg.fallback_chain.length).toBeGreaterThan(0);
    }

    // provider 的模型 ID 出现在 fallback_chain 中
    const allModels = entries.flatMap(([, c]) => c.fallback_chain);
    const modelIds = allModels.map(m => m.model_id);
    expect(modelIds).toContain("deepseek-v4-pro");
    expect(modelIds).toContain("qwen3.7-max");

    // fast-search 并发为 4，其他为 2
    expect(config.router.categories["fast-search"].concurrency_limit).toBe(4);
    expect(config.router.categories["deep-reasoning"].concurrency_limit).toBe(2);
  });

  it("单 provider 生成正确", () => {
    const config = generateConfig(["minimax"], 200000000, true);
    const allModels = Object.values(config.router.categories).flatMap(c => c.fallback_chain);
    expect(allModels.every(m => m.provider === "minimax")).toBe(true);
    expect(config.usage.token_quota).toBe(200000000);
  });

  it("空 providers 抛错", () => {
    expect(() => generateConfig([], 500000000, true)).toThrow("providers 不能为空");
  });

  it("无效 provider 抛错", () => {
    expect(() => generateConfig(["unknown" as ProviderId], 500000000, true)).toThrow("不支持的提供商");
  });

  it("无效 quota 抛错", () => {
    expect(() => generateConfig(["deepseek"], 123456, true)).toThrow("无效的 quota");
  });

  it("所有 VALID_QUOTAS 都可通过", () => {
    for (const q of VALID_QUOTAS) {
      const config = generateConfig(["deepseek"], q, true);
      expect(config.usage.token_quota).toBe(q);
    }
  });
});

describe("install", () => {
  let tmpDir: string;

  afterEach(() => {
    if (tmpDir) {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  function configPathFromDir(dir: string): string {
    return join(dir, "omo-sci.jsonc");
  }

  it("should write config with given options", async () => {
    tmpDir = mkdtempSync(join(tmpdir(), "omo-sci-test-"));

    const configPath = await install(
      {
        noTui: true,
        providers: ["deepseek", "qwen-bailian"],
        quota: 200000000,
      },
      { configDir: tmpDir, projectDir: tmpDir },
    );

    expect(configPath).toBeDefined();
    expect(configPath).toContain("omo-sci.jsonc");
    expect(configPath).toContain(tmpDir);

    // Verify the file was written
    const configFile = Bun.file(configPath);
    const exists = await configFile.exists();
    expect(exists).toBe(true);

    const content = await configFile.text();
    // New config shape: provider model IDs in fallback_chain
    expect(content).toContain("deepseek-v4-pro");
    expect(content).toContain("qwen3.7-max");
    // quota appears as usage.token_quota
    expect(content).toContain("200000000");
    // Should contain router/safety/usage/environment sections
    expect(content).toContain('"router"');
    expect(content).toContain('"safety"');
    expect(content).toContain('"usage"');
    expect(content).toContain('"environment"');
  });

  it("should write config with single provider", async () => {
    tmpDir = mkdtempSync(join(tmpdir(), "omo-sci-test-"));

    const configPath = await install(
      {
        noTui: true,
        providers: ["deepseek"],
        quota: 500000000,
      },
      { configDir: tmpDir, projectDir: tmpDir },
    );

    const configFile = Bun.file(configPath);
    const content = await configFile.text();
    expect(content).toContain("deepseek-v4-pro");
    expect(content).toContain("500000000");
  });

  it("安装后 loadConfig() 能读到有效路由配置", async () => {
    tmpDir = mkdtempSync(join(tmpdir(), "omo-sci-test-"));

    await install(
      {
        noTui: true,
        providers: ["deepseek", "minimax"],
        quota: 500000000,
      },
      { configDir: tmpDir, projectDir: tmpDir },
    );

    // 使用 loadConfig 读取刚刚写入的配置
    const config = loadConfig(configPathFromDir(tmpDir));
    expect(config.router).toBeDefined();
    expect(config.router.categories).toBeDefined();
    // 所有 6 个 category 都有 fallback_chain
    const entries = Object.entries(config.router.categories);
    for (const [, catCfg] of entries) {
      expect(catCfg.fallback_chain.length).toBeGreaterThan(0);
    }
    // quota 正确写入
    expect(config.usage.token_quota).toBe(500000000);
    // safety/environment 有默认值
    expect(config.safety.max_step).toBe(50);
    expect(config.environment.software).toContain('R');
  });

  it("should create .opencode command files", async () => {
    tmpDir = mkdtempSync(join(tmpdir(), "omo-sci-test-"));

    await install(
      {
        noTui: true,
        providers: ["deepseek"],
        quota: 200000000,
      },
      { configDir: tmpDir, projectDir: tmpDir },
    );

    const doctorCmdPath = join(tmpDir, ".opencode", "commands", "sci-doctor.md");
    const dubinAgentPath = join(tmpDir, ".opencode", "agents", "dubin.md");
    const opencodeJsonPath = join(tmpDir, "opencode.json");

    const doctorCmd = Bun.file(doctorCmdPath);
    const dubinAgent = Bun.file(dubinAgentPath);
    const opencodeJson = Bun.file(opencodeJsonPath);

    expect(await doctorCmd.exists()).toBe(true);
    expect(await dubinAgent.exists()).toBe(true);
    expect(await opencodeJson.exists()).toBe(true);

    // Verify opencode.json content
    const jsonContent = await opencodeJson.text();
    expect(jsonContent).toContain('"omo-sci"');
  });

  it("should fail without providers", async () => {
    tmpDir = mkdtempSync(join(tmpdir(), "omo-sci-test-"));

    await expect(
      install(
        {
          noTui: true,
          providers: [],
          quota: 200000000,
        },
        { configDir: tmpDir, projectDir: tmpDir },
      ),
    ).rejects.toThrow("providers 不能为空");
  });

  it("should reject invalid provider", async () => {
    tmpDir = mkdtempSync(join(tmpdir(), "omo-sci-test-"));

    await expect(
      install(
        {
          noTui: true,
          providers: ["unknown-provider"],
          quota: 200000000,
        },
        { configDir: tmpDir, projectDir: tmpDir },
      ),
    ).rejects.toThrow("不支持的提供商");
  });

  it("should reject invalid quota", async () => {
    tmpDir = mkdtempSync(join(tmpdir(), "omo-sci-test-"));

    await expect(
      install(
        {
          noTui: true,
          providers: ["deepseek"],
          quota: 123456,
        },
        { configDir: tmpDir, projectDir: tmpDir },
      ),
    ).rejects.toThrow("无效的 quota");
  });
});
