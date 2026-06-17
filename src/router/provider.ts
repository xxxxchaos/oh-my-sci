/**
 * omo-sci 模型提供商注册表
 *
 * 定义所有支持的模型提供商及其模型规格。
 * 供分类路由系统查询可用模型。
 */

import type { ProviderId, ModelSpec } from '../types';

/**
 * omo-sci 内部 ProviderId → OpenCode auth.json 中的实际 provider 名
 * （用于写入 agent .md，确保 OpenCode 能正确路由）
 */
export const PROVIDER_TO_AUTH_NAME: Record<string, string> = {
  deepseek: 'deepseek',
  'qwen-bailian': 'qwen-bailian',
  zhipu: 'zhipuai-coding-plan',
  kimi: 'kimi-for-coding',
  minimax: 'minimax-cn-coding-plan',
  'opencode-go': 'opencode-go',
  'tencent-hy': 'tencent-hy',
};

/**
 * 将内部 provider/model 键转为 OpenCode auth 实际键
 */
export function toAuthModelKey(internalKey: string): string {
  const parts = internalKey.split('/');
  if (parts.length === 2) {
    const authProvider = PROVIDER_TO_AUTH_NAME[parts[0]] ?? parts[0];
    const authModel = parts[0] === 'minimax' && parts[1].toLowerCase() === 'minimax-m3'
      ? 'MiniMax-M3'
      : parts[1];
    return `${authProvider}/${authModel}`;
  }
  return internalKey;
}

/**
 * 将模型键转成用于比较的 canonical key。
 * OpenCode agent 文件可能使用 auth provider 名和 provider 原始大小写。
 */
export function canonicalModelKey(modelKey: string): string {
  const parts = modelKey.trim().split('/');
  if (parts.length !== 2) return modelKey.trim().toLowerCase();
  const provider = parts[0];
  const internalProvider =
    Object.entries(PROVIDER_TO_AUTH_NAME).find(([, authName]) => authName === provider)?.[0] ?? provider;
  return `${internalProvider.toLowerCase()}/${parts[1].toLowerCase()}`;
}

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
    name: 'Kimi 开放平台',
    models: [
      { provider: 'kimi', model_id: 'kimi-k2.6', context_window: 256_000, max_output: 128_000 },
      { provider: 'kimi', model_id: 'kimi-k2.7-code', context_window: 256_000, max_output: 128_000 },
    ],
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
      { provider: 'opencode-go', model_id: 'qwen3.7-plus', context_window: 1_000_000, max_output: 128_000 },
      { provider: 'opencode-go', model_id: 'deepseek-v4-pro', context_window: 1_000_000, max_output: 128_000 },
      { provider: 'opencode-go', model_id: 'glm-5.1', context_window: 1_000_000, max_output: 128_000 },
      { provider: 'opencode-go', model_id: 'glm-5.2', context_window: 1_000_000, max_output: 128_000 },
      { provider: 'opencode-go', model_id: 'kimi-k2.6', context_window: 256_000, max_output: 128_000 },
      { provider: 'opencode-go', model_id: 'kimi-k2.7-code', context_window: 256_000, max_output: 128_000 },
      { provider: 'opencode-go', model_id: 'minimax-m3', context_window: 1_000_000, max_output: 128_000 },
      { provider: 'opencode-go', model_id: 'deepseek-v4-flash', context_window: 1_000_000, max_output: 128_000 },
    ],
  },
};

export function getAvailableModels(providerIds: ProviderId[]): ModelSpec[] {
  return providerIds.flatMap(id => PROVIDER_REGISTRY[id]?.models ?? []);
}

/** 从 PROVIDER_REGISTRY keys 派生的可用提供商列表 */
export const PROVIDER_WHITELIST = Object.keys(PROVIDER_REGISTRY) as ProviderId[];
