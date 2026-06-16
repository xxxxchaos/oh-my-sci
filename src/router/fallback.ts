/**
 * omo-sci 分类路由 — Fallback 解析
 *
 * 根据能力分类从用户配置中解析 fallback 链，提供模型降级支持。
 */

import type { CapabilityCategory, ModelSpec, RouterConfig } from '../types';
import { loadConfig } from '../config';

export function resolveModel(category: CapabilityCategory, config?: RouterConfig): ModelSpec | null {
  const cfg = config ?? loadConfig().router;
  return cfg.categories[category]?.fallback_chain[0] ?? null;
}

export function resolveFallbackChain(category: CapabilityCategory, config?: RouterConfig): ModelSpec[] {
  const cfg = config ?? loadConfig().router;
  return cfg.categories[category]?.fallback_chain ?? [];
}

export function isCategoryAvailable(category: CapabilityCategory, config?: RouterConfig): boolean {
  return resolveModel(category, config) !== null;
}
