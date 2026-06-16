/**
 * hooks/registry 模块测试
 */
import { describe, it, expect, mock, beforeEach, afterAll } from 'bun:test';
import { on, dispatch, clearHooks, registeredHooks } from '../../src/hooks/registry';
import type { HookName } from '../../src/types';
import { DEFAULT_CONFIG } from '../../src/constants';

describe('hooks registry', () => {
  // 每个测试前重置注册表
  beforeEach(() => {
    clearHooks();
  });

  afterAll(() => {
    clearHooks();
  });

  it('on + dispatch: 注册的 handler 在 dispatch 时被调用', async () => {
    const handler = mock(() => {});
    on('session:start', handler);

    await dispatch({ hook: 'session:start' });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({ hook: 'session:start' });
  });

  it('多个 handler 按注册顺序调用', async () => {
    const calls: number[] = [];
    on('session:start', () => {
      calls.push(1);
    });
    on('session:start', () => {
      calls.push(2);
    });

    await dispatch({ hook: 'session:start' });

    expect(calls).toEqual([1, 2]);
  });

  it('clearHooks 清除所有注册的 handler', async () => {
    const handler = mock(() => {});
    on('session:start', handler);

    clearHooks();
    await dispatch({ hook: 'session:start' });

    expect(handler).not.toHaveBeenCalled();
  });

  it('registeredHooks 返回已注册的 hook 名列表', () => {
    on('session:start', () => {});
    on('stage:entry', () => {});
    on('delegate:pre', () => {});

    const hooks = registeredHooks();
    expect(hooks).toContain('session:start');
    expect(hooks).toContain('stage:entry');
    expect(hooks).toContain('delegate:pre');
    expect(hooks.length).toBe(3);
  });

  it('dispatch 不调用已禁用的 hook', async () => {
    // 模拟 loadConfig 返回带 disabled_hooks 的配置
    mock.module('../../src/config', () => ({
      loadConfig: () => ({
        ...DEFAULT_CONFIG,
        disabled_hooks: ['session:start'] as HookName[],
      }),
    }));

    // 动态 import 以使用被 mock 的 config 模块
    const { on: dynOn, dispatch: dynDispatch, clearHooks: dynClear } = await import(
      '../../src/hooks/registry'
    );

    dynClear();

    const handler = mock(() => {});
    dynOn('session:start', handler);

    await dynDispatch({ hook: 'session:start' });

    expect(handler).not.toHaveBeenCalled();

    // 验证非禁用 hook 仍然可以调用
    const activeHandler = mock(() => {});
    dynOn('stage:entry', activeHandler);
    await dynDispatch({ hook: 'stage:entry' });

    expect(activeHandler).toHaveBeenCalledTimes(1);
  });
});
