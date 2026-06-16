/**
 * doctor 模块测试
 */
import { describe, it, expect } from "bun:test";
import { runDoctor, formatDoctorReport } from "../src/doctor";

describe("runDoctor", () => {
  it("should return a report with checks", async () => {
    const report = await runDoctor();

    expect(report).toBeDefined();
    expect(report.timestamp).toBeDefined();
    expect(report.checks).toBeDefined();
    expect(report.checks.length).toBeGreaterThan(0);
    expect(report.summary.total).toBe(report.checks.length);
    expect(report.summary.ok + report.summary.warn + report.summary.error).toBe(
      report.summary.total,
    );
  });

  it("should always have Bun check (ok)", async () => {
    const report = await runDoctor();
    const bunCheck = report.checks.find((c) => c.name === "Bun");
    expect(bunCheck).toBeDefined();
    expect(bunCheck!.status).toBe("ok");
    expect(bunCheck!.message).toContain("Bun v");
  });

  it("should always have Git check", async () => {
    const report = await runDoctor();
    const gitCheck = report.checks.find((c) => c.name === "Git");
    expect(gitCheck).toBeDefined();
    // Git may or may not be installed, but check should complete
    expect(["ok", "warn"]).toContain(gitCheck!.status);
  });

  it("should always have OpenCode check", async () => {
    const report = await runDoctor();
    const opencodeCheck = report.checks.find((c) => c.name === "OpenCode");
    expect(opencodeCheck).toBeDefined();
    expect(["ok", "warn"]).toContain(opencodeCheck!.status);
  });

  it("should always have config check", async () => {
    const report = await runDoctor();
    const configCheck = report.checks.find((c) => c.name === "配置");
    expect(configCheck).toBeDefined();
    expect(["ok", "warn"]).toContain(configCheck!.status);
  });
});

describe("formatDoctorReport", () => {
  it("should produce multi-line output", async () => {
    const report = await runDoctor();
    const output = formatDoctorReport(report);

    expect(output).toBeDefined();
    expect(output.length).toBeGreaterThan(50);
    expect(output).toContain("omo-sci 环境诊断报告");
    expect(output).toContain("摘要:");
    expect(output).toContain("时间:");
  });

  it("should contain status icons for each check", async () => {
    const report = await runDoctor();
    const output = formatDoctorReport(report);

    expect(output).toContain("✓");
    expect(output).toContain("Bun");
  });
});
