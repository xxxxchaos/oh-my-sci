/**
 * omo-sci 模型提供商注册表
 *
 * 定义所有支持的模型提供商及其模型规格。
 * 供分类路由系统查询可用模型。
 */

import type { ProviderId, ModelSpec } from '../types';

export const PROVIDER_REGISTRY: Partial<Record<ProviderId, {
  name: string;
  models: ModelSpec[];
}>> = {
  'deepseek': {
    name: 'DeepSeek (官方API / 中转站)',
    models: [
      { provider: 'deepseek', model_id: 'deepseek-v4-pro', context_window: 1_000_000, max_output: 128_000 },
      { provider: 'deepseek', model_id: 'deepseek-v4-flash', context_window: 1_000_000, max_output: 128_000 },
    ],
  },
  'qwen-bailian': {
    name: '阿里百炼 (Qwen 3.7-Max)',
    models: [{ provider: 'qwen-bailian', model_id: 'qwen3.7-max', context_window: 1_000_000, max_output: 128_000 }],
  },
  'zhipu': {
    name: '智谱开放平台 (GLM-5.2)',
    models: [{ provider: 'zhipu', model_id: 'glm-5.2', context_window: 1_000_000, max_output: 128_000 }],
  },
  'kimi': {
    name: 'Kimi 开放平台 (Kimi K2.7)',
    models: [{ provider: 'kimi', model_id: 'kimi-k2.7-code', context_window: 256_000, max_output: 128_000 }],
  },
  'minimax': {
    name: 'MiniMax (Token Plan / API)',
    models: [{ provider: 'minimax', model_id: 'minimax-m3', context_window: 1_000_000, max_output: 128_000 }],
  },
  'tencent-hy': {
    name: '腾讯混元 (Hy3)',
    models: [{ provider: 'tencent-hy', model_id: 'hy3', context_window: 256_000, max_output: 128_000 }],
  },
  'opencode-go': {
    name: 'OpenCode Go (包月订阅)',
    models: [
      { provider: 'opencode-go', model_id: 'qwen3.7-max', context_window: 1_000_000, max_output: 128_000 },
      { provider: 'opencode-go', model_id: 'deepseek-v4-pro', context_window: 1_000_000, max_output: 128_000 },
      { provider: 'opencode-go', model_id: 'kimi-k2.7-code', context_window: 256_000, max_output: 128_000 },
    ],
  },
};

export function getAvailableModels(providerIds: ProviderId[]): ModelSpec[] {
  return providerIds.flatMap(id => PROVIDER_REGISTRY[id]?.models ?? []);
}

/** 从 PROVIDER_REGISTRY keys 派生的可用提供商列表 */
export const PROVIDER_WHITELIST = Object.keys(PROVIDER_REGISTRY) as ProviderId[];
