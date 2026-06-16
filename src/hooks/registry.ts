/**
 * omo-sci 生命周期钩子注册表
 *
 * 管理 Hook 的注册、派发、清理、快照。
 *
 * == 快照机制 ==
 * 在默认 hooks 全部注册完成后（src/hooks/index.ts 导入完毕），调用方
 * 应调用 snapshotDefaultHooks() 保存一份快照。测试中 clearHooks() 后
 * 如需恢复默认 hooks，调用 restoreDefaultHooks()。
 */

import type { HookName, HookHandler, HookContext } from '../types';
import { loadConfig } from '../config';

type HookMap = Map<HookName, HookHandler[]>;
let hookRegistry: HookMap = new Map();
let defaultSnapshot: HookMap | null = null;

/**
 * Register a handler for a lifecycle hook.
 * Multiple handlers can be registered for the same hook.
 */
export function on(hook: HookName, handler: HookHandler): void {
  const handlers = hookRegistry.get(hook) ?? [];
  handlers.push(handler);
  hookRegistry.set(hook, handlers);
}

/**
 * Dispatch a hook event to all registered handlers.
 * Handlers are called in registration order.
 * If a hook is disabled in config, it is skipped.
 */
export async function dispatch(ctx: HookContext): Promise<void> {
  const config = loadConfig();
  if (config.disabled_hooks?.includes(ctx.hook)) {
    return;
  }
  const handlers = hookRegistry.get(ctx.hook) ?? [];
  for (const handler of handlers) {
    await handler(ctx);
  }
}

/**
 * Remove all registered handlers. Used in testing.
 */
export function clearHooks(): void {
  hookRegistry = new Map();
}

/**
 * Get the list of all registered hook names.
 */
export function registeredHooks(): HookName[] {
  return Array.from(hookRegistry.keys());
}

/**
 * 保存当前注册表状态为默认快照。
 *
 * 在 src/hooks/index.ts 被导入后调用一次，将已注册的 22 个 hooks
 * 持久化为可恢复的默认状态。
 */
export function snapshotDefaultHooks(): void {
  defaultSnapshot = new Map();
  for (const [hook, handlers] of hookRegistry.entries()) {
    defaultSnapshot.set(hook, [...handlers]);
  }
}

/**
 * 恢复注册表到默认快照状态。
 *
 * 测试清空 hooks 后调用，确保后续测试或功能不受影响。
 */
export function restoreDefaultHooks(): void {
  if (!defaultSnapshot) return;
  hookRegistry = new Map();
  for (const [hook, handlers] of defaultSnapshot.entries()) {
    hookRegistry.set(hook, [...handlers]);
  }
}

/**
 * 检查当前注册表是否与默认快照一致。
 */
export function hasDefaultHooks(): boolean {
  if (!defaultSnapshot) return false;
  const currentKeys = new Set(registeredHooks());
  const defaultKeys = new Set(defaultSnapshot.keys());
  if (currentKeys.size !== defaultKeys.size) return false;
  for (const key of defaultKeys) {
    if (!currentKeys.has(key)) return false;
  }
  return true;
}
