import { describe, expect, it, afterEach } from "bun:test";
import { mkdtempSync, rmSync, existsSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { install } from "../src/install";
import { getUninstallPlan, uninstall } from "../src/uninstall";

let tmpDir: string | null = null;

afterEach(() => {
  if (tmpDir) {
    rmSync(tmpDir, { recursive: true, force: true });
    tmpDir = null;
  }
});

describe("uninstall", () => {
  it("删除 omo-sci 生成的项目文件和全局配置", async () => {
    tmpDir = mkdtempSync(join(tmpdir(), "omo-sci-uninstall-"));
    const configDir = join(tmpDir, "config");
    const projectDir = join(tmpDir, "project");

    await install({ noTui: true }, { configDir, projectDir });
    const result = uninstall({ configDir, projectDir });

    expect(existsSync(join(configDir, "omo-sci.jsonc"))).toBe(false);
    expect(existsSync(join(projectDir, "opencode.json"))).toBe(false);
    expect(existsSync(join(projectDir, ".opencode", "agents", "dubin.md"))).toBe(false);
    expect(existsSync(join(projectDir, ".opencode", "commands", "sci-start.md"))).toBe(false);
    expect(result.removed.length).toBeGreaterThan(0);
  });

  it("从已有 opencode.json 中只移除 omo-sci plugin", async () => {
    tmpDir = mkdtempSync(join(tmpdir(), "omo-sci-uninstall-"));
    const configDir = join(tmpDir, "config");
    const projectDir = join(tmpDir, "project");

    await install({ noTui: true }, { configDir, projectDir });
    writeFileSync(
      join(projectDir, "opencode.json"),
      `${JSON.stringify({ plugin: ["other-plugin", "omo-sci"], theme: "dark" }, null, 2)}\n`,
    );

    uninstall({ configDir, projectDir });

    const json = JSON.parse(readFileSync(join(projectDir, "opencode.json"), "utf8"));
    expect(json.plugin).toEqual(["other-plugin"]);
    expect(json.theme).toBe("dark");
  });

  it("dry-run 不删除文件", async () => {
    tmpDir = mkdtempSync(join(tmpdir(), "omo-sci-uninstall-"));
    const configDir = join(tmpDir, "config");
    const projectDir = join(tmpDir, "project");

    await install({ noTui: true }, { configDir, projectDir });
    const plan = getUninstallPlan({ configDir, projectDir, dryRun: true });
    const result = uninstall({ configDir, projectDir, dryRun: true });

    expect(plan.filesToRemove.length).toBeGreaterThan(0);
    expect(result.removed).toEqual([]);
    expect(existsSync(join(configDir, "omo-sci.jsonc"))).toBe(true);
    expect(existsSync(join(projectDir, ".opencode", "agents", "dubin.md"))).toBe(true);
  });

  it("不删除用户自己的 .opencode 文件", async () => {
    tmpDir = mkdtempSync(join(tmpdir(), "omo-sci-uninstall-"));
    const configDir = join(tmpDir, "config");
    const projectDir = join(tmpDir, "project");
    const customAgent = join(projectDir, ".opencode", "agents", "custom.md");

    await install({ noTui: true }, { configDir, projectDir });
    mkdirSync(join(projectDir, ".opencode", "agents"), { recursive: true });
    writeFileSync(customAgent, "custom");

    uninstall({ configDir, projectDir });

    expect(existsSync(customAgent)).toBe(true);
    expect(existsSync(join(projectDir, ".opencode", "agents"))).toBe(true);
  });
});
