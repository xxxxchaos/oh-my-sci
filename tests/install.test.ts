/**
 * install 模块测试
 */
import { describe, it, expect, afterEach } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { install } from "../src/install";

describe("install", () => {
  let tmpDir: string;

  afterEach(() => {
    if (tmpDir) {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

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
    expect(content).toContain("deepseek");
    expect(content).toContain("qwen-bailian");
    expect(content).toContain("200000000");
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
    expect(content).toContain("deepseek");
    expect(content).toContain("500000000");
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
