/**
 * omo-sci 配置加载器
 *
 * 从 JSONC 文件加载用户配置，与默认配置深度合并后返回。
 * 不依赖任何 OpenCode 运行时。
 */

import { readFileSync, existsSync } from 'node:fs';
import { parse } from 'jsonc-parser';
import type { OmoSciConfig } from './types';
import { DEFAULT_CONFIG, OMO_SCI_CONFIG_PATH } from './constants';

// ====================================================================
// 工具函数
// ====================================================================

/** 判断是否为纯对象（非数组、非 null） */
function isPlainObject(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null && !Array.isArray(val);
}

/**
 * 深度合并两个对象
 *
 * - 嵌套对象递归合并
 * - 数组直接替换（不做数组合并）
 * - 标量值直接替换
 *
 * @param target 基准对象
 * @param source 覆盖对象
 * @returns 合并后的新对象
 */
export function deepMerge<T>(
  target: T,
  source: Partial<T>,
): T {
  const output: any = { ...(target as any) };

  for (const key of Object.keys(source as any)) {
    const srcVal = (source as any)[key];
    if (srcVal === undefined) continue;

    if (isPlainObject(srcVal) && isPlainObject(output[key])) {
      output[key] = deepMerge(output[key], srcVal);
    } else {
      output[key] = srcVal;
    }
  }

  return output as T;
}

// ====================================================================
// 公开 API
// ====================================================================

/**
 * 加载 omo-sci 配置
 *
 * 从指定路径（默认 ~/.config/opencode/omo-sci.jsonc）读取 JSONC 文件，
 * 与默认配置深度合并后返回完整配置。
 *
 * @param configPath 配置文件路径（可选，默认使用 OMO_SCI_CONFIG_PATH）
 * @returns 合并后的完整配置
 */
export function loadConfig(configPath?: string): OmoSciConfig {
  const path = configPath ?? OMO_SCI_CONFIG_PATH;

  if (!existsSync(path)) {
    return structuredClone(DEFAULT_CONFIG);
  }

  try {
    const content = readFileSync(path, 'utf-8');
    const parsed = parse(content);

    if (parsed === undefined) {
      return structuredClone(DEFAULT_CONFIG);
    }

    return deepMerge(structuredClone(DEFAULT_CONFIG), parsed as Partial<OmoSciConfig>);
  } catch {
    return structuredClone(DEFAULT_CONFIG);
  }
}

/**
 * 验证配置，返回警告列表
 *
 * - 检查每个 category 的 fallback_chain 是否为空
 *
 * @param config 待验证的配置
 * @returns 警告字符串数组（无警告时为空数组）
 */
export function validateConfig(config: OmoSciConfig): string[] {
  const warnings: string[] = [];

  for (const [category, catConfig] of Object.entries(config.router.categories)) {
    if (catConfig.fallback_chain.length === 0) {
      warnings.push(
        `分类 "${category}" 的 fallback_chain 为空，模型降级时可能无法正常工作`,
      );
    }
  }

  return warnings;
}
