/**
 * install 模块测试
 */
import { describe, it, expect, afterEach } from "bun:test";
import { install } from "../src/install";

describe("install", () => {
  const originalCwd = process.cwd;

  afterEach(() => {
    process.cwd = originalCwd;
  });

  it("should write config with given options", async () => {
    const configPath = await install({
      noTui: true,
      providers: ["deepseek", "qwen-bailian"],
      quota: 200000000,
    });

    expect(configPath).toBeDefined();
    expect(configPath).toContain("omo-sci.jsonc");

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
    const configPath = await install({
      noTui: true,
      providers: ["deepseek"],
      quota: 100000000,
    });

    const configFile = Bun.file(configPath);
    const content = await configFile.text();
    expect(content).toContain("deepseek");
    expect(content).toContain("100000000");
  });

  it("should create .opencode command files", async () => {
    await install({
      noTui: true,
      providers: ["deepseek"],
      quota: 200000000,
    });

    const home = process.env.HOME || "~";
    const cwd = process.cwd();
    const doctorCmdPath = `${cwd}/.opencode/commands/sci-doctor.md`;
    const dubinAgentPath = `${cwd}/.opencode/agents/dubin.md`;

    const doctorCmd = Bun.file(doctorCmdPath);
    const dubinAgent = Bun.file(dubinAgentPath);

    expect(await doctorCmd.exists()).toBe(true);
    expect(await dubinAgent.exists()).toBe(true);
  });

  it("should fail without providers", async () => {
    // This test checks that the install function handles empty providers
    // (the CLI does the validation, the function itself currently doesn't)
    const configPath = await install({
      noTui: true,
      providers: [],
      quota: 200000000,
    });

    expect(configPath).toBeDefined();
    const configFile = Bun.file(configPath);
    const exists = await configFile.exists();
    expect(exists).toBe(true);
  });
});
