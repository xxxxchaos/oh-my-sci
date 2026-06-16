/**
 * hooks 自动注册测试
 *
 * 验证 src/hooks/index.ts 的模块副作用正确注册所有 22 个 lifecycle hooks。
 * 需要导入 hooks/index 以触发模块副作用加载。
 */
import { describe, it, expect, beforeEach, afterAll } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import '../../src/hooks/index'; // 触发模块副作用，注册所有 22 个 hooks
import {
  registeredHooks,
  dispatch,
  clearHooks,
  restoreDefaultHooks,
  hasDefaultHooks,
} from '../../src/hooks/registry';

describe('hooks 自动注册', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'hooks-auto-register-'));
  });

  afterAll(() => {
    if (tmpDir) {
      try { rmSync(tmpDir, { recursive: true, force: true }); } catch {}
    }
    // 恢复默认 hooks，避免影响后续测试
    restoreDefaultHooks();
  });

  it('导入 hooks/index.ts 后 registeredHooks() 包含全部 22 个 hook', () => {
    expect(registeredHooks().length).toBeGreaterThanOrEqual(22);
  });

  it('22 个 hook 覆盖所有命名空间', () => {
    const hooks: string[] = registeredHooks();

    expect(hooks.filter((h: string) => h.startsWith('session:'))).toHaveLength(4);
    expect(hooks.filter((h: string) => h.startsWith('stage:'))).toHaveLength(5);
    expect(hooks.filter((h: string) => h.startsWith('delegate:'))).toHaveLength(3);
    expect(hooks.filter((h: string) => h.startsWith('model:'))).toHaveLength(2);
    expect(hooks.filter((h: string) => h.startsWith('quality:'))).toHaveLength(4);
    expect(hooks.filter((h: string) => h.startsWith('review:'))).toHaveLength(2);
    expect(hooks.filter((h: string) => h.startsWith('user:'))).toHaveLength(2);
  });

  it('dispatch session:start 能触发 session handler 并填充 passport', async () => {
    const ctx: any = {
      hook: 'session:start',
      metadata: {},
    };

    await dispatch(ctx);

    // session:start handler 会创建 context.passport
    expect(ctx.passport).toBeDefined();
    expect(ctx.passport.passport_version).toBe('0.1.0');
  });

  it('snapshotDefaultHooks + restoreDefaultHooks 恢复机制正常', () => {
    // 确认 snapshot 存在（hooks/index.ts 已调用 snapshotDefaultHooks）
    expect(hasDefaultHooks()).toBe(true);

    // 清空后 hooks 为空
    clearHooks();
    expect(registeredHooks()).toHaveLength(0);

    // 恢复后回到 22+ hooks
    restoreDefaultHooks();
    expect(registeredHooks().length).toBeGreaterThanOrEqual(22);
  });

  it('dispatch session:end 在有 passport 时不会抛出', async () => {
    const ctx: any = {
      hook: 'session:end',
      metadata: {},
      passport: {
        passport_version: '0.1.0',
        project: { layout: 'omo-sci' },
        pipeline: { current_stage: 'stage-0-intake', started_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        data_provenance: 'SEALED',
        signoff_records: [],
        claim_evidence_map: [],
        stage_0_intake: { status: 'pending', artifacts: [], gates: {} },
        stage_1_design: { status: 'pending', artifacts: [], gates: {} },
        stage_2_analysis: { status: 'pending', artifacts: [], gates: {} },
        stage_3_writing: { status: 'pending', artifacts: [], gates: {} },
        stage_4_submission: { status: 'pending', artifacts: [], gates: {} },
        stage_5_summary: { status: 'pending', artifacts: [], gates: {} },
        review_sessions: [],
        wisdom_collected: [],
      },
    };

    // 不应抛出
    await expect(dispatch(ctx)).resolves.toBeUndefined();
  });

  it('clearHooks 后 restoreDefaultHooks 恢复 dispatch 功能', async () => {
    clearHooks();
    restoreDefaultHooks();

    const ctx: any = {
      hook: 'session:start',
      metadata: {},
    };

    await dispatch(ctx);
    expect(ctx.passport).toBeDefined();
  });
});
