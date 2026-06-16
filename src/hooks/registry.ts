/**
 * omo-sci 生命周期钩子注册表
 *
 * 管理 Hook 的注册、派发、清理。
 */

import type { HookName, HookHandler, HookContext } from '../types';
import { loadConfig } from '../config';

type HookMap = Map<HookName, HookHandler[]>;
let hookRegistry: HookMap = new Map();

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
