/**
 * hooks/session 模块测试
 *
 * session.ts 使用模块级代码自动注册 hook handler。
 * 由于全局 registry 和 mock.module 可能被其他测试文件修改，
 * 这里在 beforeEach 中重置状态并重新注册 handler。
 */
import { describe, it, expect, mock, beforeEach, afterEach } from 'bun:test';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createRequire } from 'node:module';
import { clearHooks, dispatch } from '../../src/hooks/registry';
import { loadPassport } from '../../src/state/passport';
import { createBoulder } from '../../src/state/boulder';
import { DEFAULT_CONFIG } from '../../src/constants';
import type { HookContext } from '../../src/types';

const _require = createRequire(import.meta.url);

describe('session hooks', () => {
  let tmpDir: string;
  let origCwd: () => string;

  beforeEach(() => {
    // 覆盖其他测试文件遗留的 mock.module（如 registry.test.ts 设置的 disabled_hooks）
    mock.module('../../src/config', () => ({
      loadConfig: () => ({ ...DEFAULT_CONFIG }),
    }));

    // 重置注册表并重新注册 session hooks
    clearHooks();
    const sessionPath = _require.resolve('../../src/hooks/session');
    delete _require.cache[sessionPath];
    _require(sessionPath);

    // 设置临时目录并 mock process.cwd
    tmpDir = mkdtempSync(join(tmpdir(), 'session-hooks-test-'));
    origCwd = process.cwd.bind(process);
    process.cwd = () => tmpDir;
  });

  afterEach(() => {
    process.cwd = origCwd;
    if (tmpDir) {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  // ────────────────────────────────────────────────────────────
  // session:start
  // ────────────────────────────────────────────────────────────

  it('session:start 在不存在的项目目录创建 boulder', async () => {
    const ctx: HookContext = { hook: 'session:start' };
    await dispatch(ctx);

    // boulder 被创建
    expect(ctx.boulder).toBeDefined();
    expect(ctx.boulder!.session_id).toMatch(/^session_\d+_/);
    expect(ctx.boulder!.current_stage).toBe('stage-0-intake');
    expect(ctx.boulder!.active_plan).toBe('未命名研究');

    // passport 被加载
    expect(ctx.passport).toBeDefined();
    expect(ctx.passport!.pipeline.current_stage).toBe('stage-0-intake');

    // metadata 标记非恢复
    expect(ctx.metadata?.resumed).toBe(false);

    // 文件被持久化到磁盘
    expect(existsSync(join(tmpDir, '.omo-sci', 'boulder.json'))).toBe(true);
  });

  // ────────────────────────────────────────────────────────────
  // session:end
  // ────────────────────────────────────────────────────────────

  it('session:end 持久化 passport + boulder', async () => {
    const passport = loadPassport(tmpDir);
    passport.project.title = 'Session End Test';
    const boulder = createBoulder('Session End Test', 'stage-1-design', 'phase-1a');

    const ctx: HookContext = {
      hook: 'session:end',
      passport,
      boulder,
    };
    await dispatch(ctx);

    // 验证文件被创建
    expect(existsSync(join(tmpDir, '.omo-sci', 'passport.json'))).toBe(true);
    expect(existsSync(join(tmpDir, '.omo-sci', 'boulder.json'))).toBe(true);

    // 验证内容一致
    const savedPassport = JSON.parse(
      readFileSync(join(tmpDir, '.omo-sci', 'passport.json'), 'utf-8'),
    );
    const savedBoulder = JSON.parse(
      readFileSync(join(tmpDir, '.omo-sci', 'boulder.json'), 'utf-8'),
    );

    expect(savedPassport.project.title).toBe('Session End Test');
    expect(savedBoulder.active_plan).toBe('Session End Test');
    expect(savedBoulder.current_stage).toBe('stage-1-design');
  });

  // ────────────────────────────────────────────────────────────
  // session:resume
  // ────────────────────────────────────────────────────────────

  it('session:resume 找不到 boulder 时 metadata 含 resume_error', async () => {
    const ctx: HookContext = { hook: 'session:resume' };
    await dispatch(ctx);

    expect(ctx.metadata?.resume_error).toBe('No saved session found.');
    expect(ctx.boulder).toBeUndefined();
  });

  // ────────────────────────────────────────────────────────────
  // session:interrupt
  // ────────────────────────────────────────────────────────────

  it('session:interrupt 持久化状态', async () => {
    const passport = loadPassport(tmpDir);
    passport.project.title = '中断测试';
    const boulder = createBoulder('中断测试', 'stage-2-analysis', 'phase-2a');
    boulder.pending_tasks.push({
      id: 'task-interrupt-01',
      agent: 'spsser',
      task: '数据分析',
      status: 'in_progress',
    });

    const ctx: HookContext = {
      hook: 'session:interrupt',
      passport,
      boulder,
    };
    await dispatch(ctx);

    // 验证持久化
    expect(existsSync(join(tmpDir, '.omo-sci', 'passport.json'))).toBe(true);
    expect(existsSync(join(tmpDir, '.omo-sci', 'boulder.json'))).toBe(true);

    const savedBoulder = JSON.parse(
      readFileSync(join(tmpDir, '.omo-sci', 'boulder.json'), 'utf-8'),
    );
    expect(savedBoulder.pending_tasks).toHaveLength(1);
    expect(savedBoulder.pending_tasks[0].id).toBe('task-interrupt-01');
    expect(savedBoulder.pending_tasks[0].agent).toBe('spsser');
    expect(savedBoulder.pending_tasks[0].status).toBe('in_progress');
  });
});
