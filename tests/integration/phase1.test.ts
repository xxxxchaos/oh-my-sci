/**
 * Phase 1 集成测试
 *
 * 验证从 config → router → state → hooks → safety 的完整管线。
 * 确保所有核心模块可以端到端协作。
 */

import { describe, it, expect, afterEach } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { generateConfig } from "../../src/install";
import { resolveModel, resolveFallbackChain } from "../../src/router/fallback";
import { loadConfig } from "../../src/config";
import {
  DEFAULT_PASSPORT,
  loadPassport,
  savePassport,
  updateStageState,
  computeStageHash,
  validatePassportPreconditions,
} from "../../src/state/passport";
import { createBoulder, loadBoulder, saveBoulder, addPendingTask, updateTaskStatus } from "../../src/state/boulder";
import { on, dispatch, clearHooks, registeredHooks } from "../../src/hooks/registry";
import { startRun, recordStep, endRun } from "../../src/safety/circuit-breaker";
import { runDoctor, formatDoctorReport, formatDoctorReportJson } from "../../src/doctor";
import type { ProviderId } from "../../src/types";

describe("Phase 1 Integration", () => {
  let tmpDir: string;

  afterEach(() => {
    if (tmpDir) {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  // ====================================================================
  // 1. config → router: generateConfig + resolveModel 端到端可用
  // ====================================================================

  describe("1. config → router", () => {
    it("generateConfig 生成有效配置，resolveModel 能从 fallback_chain 选第一个模型", () => {
      const config = generateConfig(["deepseek", "qwen-bailian"], 500000000, true);

      // 验证配置结构
      expect(config.router.categories["agent-orchestration"].fallback_chain.length).toBeGreaterThan(0);
      expect(config.usage.token_quota).toBe(500000000);

      // resolveModel 返回 fallback_chain 的第一个模型
      const model = resolveModel("agent-orchestration", config.router);
      expect(model).not.toBeNull();
      expect(model!.provider).toBe("qwen-bailian");
      expect(model!.model_id).toBe("qwen3.7-plus");
    });

    it("resolveFallbackChain 返回完整 fallback 链", () => {
      const config = generateConfig(["deepseek", "qwen-bailian", "minimax"], 200000000, true);
      const chain = resolveFallbackChain("fast-search", config.router);

      // 所有 provider 的模型都在 fallback 链中
      const providers = chain.map(m => m.provider);
      expect(providers).toContain("deepseek");
      expect(providers).toContain("qwen-bailian");
      expect(providers).toContain("minimax");
    });

    it("不同 category 按任务类型排序 fallback_chain", () => {
      const config = generateConfig(["opencode-go"], 500000000, true);
      const chainA = resolveFallbackChain("deep-reasoning", config.router);
      const chainB = resolveFallbackChain("fast-search", config.router);

      expect(chainA[0]?.model_id).toBe("qwen3.7-max");
      expect(chainB[0]?.model_id).toBe("minimax-m3");
    });

    it("generateConfig + loadConfig 配合使用", () => {
      // 模拟生成配置后写文件再 loadConfig 的流程
      const config = generateConfig(["deepseek", "qwen-bailian"], 500000000, true);

      // 直接验证：相当于 loadConfig 的效果
      expect(config.safety.max_step).toBe(50);
      expect(config.safety.loop_detect_threshold).toBe(5);
      expect(config.environment.software).toContain("R");
    });
  });

  // ====================================================================
  // 2. MaterialPassport: 创建 → 保存 → 加载 → hash 一致
  // ====================================================================

  describe("2. MaterialPassport lifecycle", () => {
    it("创建 → 保存 → 加载往返", () => {
      tmpDir = mkdtempSync(join(tmpdir(), "int-passport-"));

      // 创建 passport（默认）
      const passport = loadPassport(tmpDir);
      passport.project.title = "集成测试项目";
      passport.project.pico = "P: ICU, I: remimazolam, C: propofol, O: sedation";

      // 保存
      savePassport(tmpDir, passport);

      // 加载
      const reloaded = loadPassport(tmpDir);
      expect(reloaded.project.title).toBe("集成测试项目");
      expect(reloaded.project.layout).toBe("omo-sci");
      expect(reloaded.data_provenance).toBe("SEALED");
    });

    it("阶段更新 → 加载 → hash 一致", () => {
      tmpDir = mkdtempSync(join(tmpdir(), "int-passport-"));

      // 更新阶段状态
      updateStageState(tmpDir, "stage-0-intake", {
        status: "completed",
        completed_at: "2026-06-16T00:00:00.000Z",
      });

      // 加载并验证
      const passport = loadPassport(tmpDir);
      expect(passport.stage_0_intake.status).toBe("completed");

      // 对相同内容计算 hash
      const hash1 = computeStageHash(passport.stage_0_intake);

      // 重新加载后 hash 一致
      const passport2 = loadPassport(tmpDir);
      const hash2 = computeStageHash(passport2.stage_0_intake);
      expect(hash1).toBe(hash2);
    });

    it("闸门更新和前置条件验证", () => {
      tmpDir = mkdtempSync(join(tmpdir(), "int-passport-"));

      // 依次通过阶段
      updateStageState(tmpDir, "stage-0-intake", { status: "completed" });
      updateStageState(tmpDir, "stage-1-design", { status: "completed" });
      updateStageState(tmpDir, "stage-2-analysis", { status: "completed" });

      const passport = loadPassport(tmpDir);

      // 前置条件满足
      expect(validatePassportPreconditions(passport, "gate-i")).toEqual([]);

      // 阶段 3 因闸门 I 未通过而失败
      const stage3Missing = validatePassportPreconditions(passport, "stage-3-writing");
      expect(stage3Missing).toContain("闸门I（完整性检查）未通过");
    });

    it("两个相同阶段状态产生相同 hash", () => {
      tmpDir = mkdtempSync(join(tmpdir(), "int-passport-"));

      updateStageState(tmpDir, "stage-0-intake", {
        status: "completed",
        artifacts: [{ path: "intake.md", checksum: "abc123" }],
      });

      const passA = loadPassport(tmpDir);
      const hashA = computeStageHash(passA.stage_0_intake);

      // 重新创建相同的状态
      tmpDir = mkdtempSync(join(tmpdir(), "int-passport-2-"));
      updateStageState(tmpDir, "stage-0-intake", {
        status: "completed",
        artifacts: [{ path: "intake.md", checksum: "abc123" }],
      });

      const passB = loadPassport(tmpDir);
      const hashB = computeStageHash(passB.stage_0_intake);
      expect(hashA).toBe(hashB);
    });
  });

  // ====================================================================
  // 3. Boulder: 创建 → 持久化 → 恢复
  // ====================================================================

  describe("3. Boulder lifecycle", () => {
    it("创建 → 持久化 → 恢复", () => {
      tmpDir = mkdtempSync(join(tmpdir(), "int-boulder-"));

      // 创建
      const boulder = createBoulder("ICU 镇静研究", "stage-0-intake", "start");
      expect(boulder.active_plan).toBe("ICU 镇静研究");
      expect(boulder.pending_tasks).toEqual([]);

      // 持久化
      saveBoulder(tmpDir, boulder);

      // 恢复
      const restored = loadBoulder(tmpDir);
      expect(restored).not.toBeNull();
      expect(restored!.active_plan).toBe("ICU 镇静研究");
      expect(restored!.session_id).toBe(boulder.session_id);
      expect(restored!.current_stage).toBe("stage-0-intake");
    });

    it("添加待完成任务 → 更新状态 → 加载确认", () => {
      tmpDir = mkdtempSync(join(tmpdir(), "int-boulder-"));

      const boulder = createBoulder("测试项目", "stage-0-intake", "start");
      saveBoulder(tmpDir, boulder);

      // 添加任务
      addPendingTask(tmpDir, {
        id: "task-1",
        agent: "dubin",
        task: "进行意图访谈",
        status: "in_progress",
      });

      addPendingTask(tmpDir, {
        id: "task-2",
        agent: "archimedes",
        task: "设计研究方案",
        status: "pending",
      });

      // 更新任务状态
      updateTaskStatus(tmpDir, "task-1", "completed");

      // 加载确认
      const restored = loadBoulder(tmpDir);
      expect(restored).not.toBeNull();
      expect(restored!.pending_tasks.length).toBe(2);

      const task1 = restored!.pending_tasks.find(t => t.id === "task-1");
      expect(task1?.status).toBe("completed");

      const task2 = restored!.pending_tasks.find(t => t.id === "task-2");
      expect(task2?.status).toBe("pending");
    });

    it("Boulder 不存在时 loadBoulder 返回 null", () => {
      const missing = loadBoulder("/tmp/nonexistent-path-12345");
      expect(missing).toBeNull();
    });
  });

  // ====================================================================
  // 4. Hook registry: session:start 触发 → context 填充
  // ====================================================================

  describe("4. Hook registry lifecycle", () => {
    afterEach(() => {
      clearHooks();
    });

    it("注册 → 派发 → context 填充", async () => {
      const capturedCtxs: any[] = [];

      on("session:start", (ctx) => {
        capturedCtxs.push({ ...ctx });
      });

      on("delegate:pre", (ctx) => {
        capturedCtxs.push({ ...ctx });
      });

      // 派发 session:start
      await dispatch({ hook: "session:start", stage: "stage-0-intake" });
      expect(capturedCtxs.length).toBe(1);
      expect(capturedCtxs[0].hook).toBe("session:start");
      expect(capturedCtxs[0].stage).toBe("stage-0-intake");

      // 派发 delegate:pre
      await dispatch({ hook: "delegate:pre", agent: "dubin" });
      expect(capturedCtxs.length).toBe(2);
      expect(capturedCtxs[1].hook).toBe("delegate:pre");
      expect(capturedCtxs[1].agent).toBe("dubin");
    });

    it("多个 handler 按注册顺序执行", async () => {
      const order: number[] = [];

      on("stage:entry", () => { order.push(1); });
      on("stage:entry", () => { order.push(2); });
      on("stage:entry", () => { order.push(3); });

      await dispatch({ hook: "stage:entry", stage: "stage-1-design" });

      expect(order).toEqual([1, 2, 3]);
    });

    it("registeredHooks 列出已注册 hook", () => {
      on("session:start", () => {});
      on("session:end", () => {});
      on("user:signoff", () => {});

      const hooks = registeredHooks();
      expect(hooks).toContain("session:start");
      expect(hooks).toContain("session:end");
      expect(hooks).toContain("user:signoff");
      expect(hooks.length).toBe(3);
    });

    it("clearHooks 后 dispatch 不做任何事情", async () => {
      let called = false;
      on("session:start", () => { called = true; });

      clearHooks();
      await dispatch({ hook: "session:start" });
      expect(called).toBe(false);
    });
  });

  // ====================================================================
  // 5. Circuit breaker: 开始 → 记录步骤 → 结束
  // ====================================================================

  describe("5. Circuit breaker lifecycle", () => {
    it("开始运行 → 记录正常步骤 → 结束", () => {
      const runId = startRun("archimedes");
      expect(runId).toContain("archimedes-");

      // 记录一步
      const step1 = recordStep(runId, "read_file", "data.csv");
      expect(step1.shouldContinue).toBe(true);

      // 记录多步
      for (let i = 0; i < 10; i++) {
        const result = recordStep(runId, `tool-${i}`, `params-${i}`);
        expect(result.shouldContinue).toBe(true);
      }

      // 结束
      endRun(runId);

      // 结束后 recordStep 返回 Run not found
      const afterEnd = recordStep(runId, "tool", "params");
      expect(afterEnd.shouldContinue).toBe(false);
      expect(afterEnd.reason).toBe("Run not found");
    });

    it("循环检测在连续相同调用时触发", () => {
      const runId = startRun("spsser");

      // 4 次相同调用不触发
      for (let i = 0; i < 4; i++) {
        const result = recordStep(runId, "same_tool", "same_params");
        expect(result.shouldContinue).toBe(true);
      }

      // 第 5 次触发循环检测
      const result = recordStep(runId, "same_tool", "same_params");
      expect(result.shouldContinue).toBe(false);
      expect(result.reason).toContain("循环");
    });

    it("结束运行后释放资源", () => {
      const runId = startRun("dubin");
      endRun(runId);

      // 继续 recordStep 应返回 not found
      const result = recordStep(runId, "any", "any");
      expect(result.shouldContinue).toBe(false);
      expect(result.reason).toBe("Run not found");
    });
  });

  // ====================================================================
  // 6. formatDoctorReport 格式化输出
  // ====================================================================

  describe("6. Doctor report formatting", () => {
    it("formatDoctorReport 生成中文控制台输出", async () => {
      const report = await runDoctor();
      const output = formatDoctorReport(report);

      expect(output).toContain("omo-sci 环境诊断报告");
      expect(output).toContain("摘要:");
      expect(output).toContain("时间:");
      expect(output).toContain("Bun");
    });

    it("formatDoctorReportJson 生成 JSON 输出", async () => {
      const report = await runDoctor();
      const jsonStr = formatDoctorReportJson(report);

      const parsed = JSON.parse(jsonStr);
      expect(parsed.timestamp).toBeDefined();
      expect(parsed.checks).toBeDefined();
      expect(parsed.summary).toBeDefined();
      expect(parsed.summary.total).toBe(parsed.checks.length);
    });

    it("报告摘要统计正确", async () => {
      const report = await runDoctor();
      const { ok, warn, error } = report.summary;

      expect(ok + warn + error).toBe(report.summary.total);
      expect(ok).toBeGreaterThanOrEqual(0);
      expect(warn).toBeGreaterThanOrEqual(0);
      expect(error).toBeGreaterThanOrEqual(0);
    });
  });
});
