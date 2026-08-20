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
 * 内部 provider → 内部 model_id（小写）→ 该 provider 对应 auth 服务下的真实 model_id。
 *
 * 只在 auth 服务的模型命名和我们的内部命名不一致时才需要在这里登记：
 * - minimax-cn-coding-plan 把 minimax-m3 大小写成 MiniMax-M3
 * - kimi-for-coding（套餐订阅）不是按"代号"命名模型，是按"档位"命名——
 *   kimi-k2.7-code 对应它的 kimi-for-coding 标准档，kimi-k3 对应它的 k3 档。
 *   kimi-k2.6 在这个套餐里没有对应档位，所以不登记在这里（也不出现在
 *   PROVIDER_REGISTRY['kimi'] 的模型列表里，避免生成一个套餐里根本不存在的模型名）。
 */
const MODEL_ID_TO_AUTH_ID: Partial<Record<string, Record<string, string>>> = {
  minimax: { 'minimax-m3': 'MiniMax-M3' },
  kimi: { 'kimi-k2.7-code': 'kimi-for-coding', 'kimi-k3': 'k3' },
};

/**
 * 将内部 provider/model 键转为 OpenCode auth 实际键
 */
export function toAuthModelKey(internalKey: string): string {
  const parts = internalKey.split('/');
  if (parts.length === 2) {
    const [provider, modelId] = parts;
    const authProvider = PROVIDER_TO_AUTH_NAME[provider] ?? provider;
    const authModel = MODEL_ID_TO_AUTH_ID[provider]?.[modelId.toLowerCase()] ?? modelId;
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
    name: '阿里百炼 (Qwen 3.7 / 3.8)',
    models: [
      { provider: 'qwen-bailian', model_id: 'qwen3.7-plus', context_window: 1_000_000, max_output: 128_000 },
      { provider: 'qwen-bailian', model_id: 'qwen3.7-max', context_window: 1_000_000, max_output: 128_000 },
      { provider: 'qwen-bailian', model_id: 'qwen3.8-max', context_window: 1_000_000, max_output: 128_000 },
    ],
  },
  'zhipu': {
    name: '智谱开放平台 (GLM-5.2 / 5.3)',
    models: [
      { provider: 'zhipu', model_id: 'glm-5.2', context_window: 1_000_000, max_output: 128_000 },
      { provider: 'zhipu', model_id: 'glm-5.3', context_window: 1_000_000, max_output: 128_000 },
    ],
  },
  'kimi': {
    // 实际路由到 Kimi For Coding 套餐订阅（见 PROVIDER_TO_AUTH_NAME），
    // 不是官方按量计费的开放平台——这个套餐只提供 K2.7 Code 和 K3 两档，
    // 没有独立的 K2.6 档位，所以这里不登记 kimi-k2.6（想用 K2.6 走 opencode-go）。
    name: 'Kimi 编程套餐 (Kimi For Coding)',
    models: [
      { provider: 'kimi', model_id: 'kimi-k2.7-code', context_window: 262_144, max_output: 32_768 },
      { provider: 'kimi', model_id: 'kimi-k3', context_window: 1_048_576, max_output: 131_072 },
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
      { provider: 'opencode-go', model_id: 'qwen3.8-max', context_window: 1_000_000, max_output: 128_000 },
      { provider: 'opencode-go', model_id: 'deepseek-v4-pro', context_window: 1_000_000, max_output: 128_000 },
      { provider: 'opencode-go', model_id: 'glm-5.1', context_window: 1_000_000, max_output: 128_000 },
      { provider: 'opencode-go', model_id: 'glm-5.2', context_window: 1_000_000, max_output: 128_000 },
      { provider: 'opencode-go', model_id: 'glm-5.3', context_window: 1_000_000, max_output: 128_000 },
      { provider: 'opencode-go', model_id: 'kimi-k2.6', context_window: 256_000, max_output: 128_000 },
      { provider: 'opencode-go', model_id: 'kimi-k2.7-code', context_window: 256_000, max_output: 128_000 },
      { provider: 'opencode-go', model_id: 'kimi-k3', context_window: 1_048_576, max_output: 131_072 },
      { provider: 'opencode-go', model_id: 'minimax-m3', context_window: 1_000_000, max_output: 128_000 },
      { provider: 'opencode-go', model_id: 'deepseek-v4-flash', context_window: 1_000_000, max_output: 128_000 },
    ],
  },
};

export const MODEL_HOME_PROVIDER: Record<string, ProviderId> = {
  'qwen3.7-plus': 'qwen-bailian',
  'qwen3.7-max': 'qwen-bailian',
  'qwen3.8-max': 'qwen-bailian',
  'deepseek-v4-pro': 'deepseek',
  'deepseek-v4-flash': 'deepseek',
  'glm-5.2': 'zhipu',
  'glm-5.1': 'zhipu',
  'glm-5.3': 'zhipu',
  // kimi-k2.6 没有单独登记 home provider：'kimi' 套餐订阅不提供这一档，
  // 只能通过 opencode-go 使用，走 opencode-go 的默认排序即可。
  'kimi-k2.7-code': 'kimi',
  'kimi-k3': 'kimi',
  'minimax-m3': 'minimax',
  'hy3': 'tencent-hy',
};

export function getAvailableModels(providerIds: ProviderId[]): ModelSpec[] {
  return providerIds.flatMap(id => PROVIDER_REGISTRY[id]?.models ?? []);
}

/** 从 PROVIDER_REGISTRY keys 派生的可用提供商列表 */
export const PROVIDER_WHITELIST = Object.keys(PROVIDER_REGISTRY) as ProviderId[];

/**
 * 把用户输入的 provider 字符串规范化为内部 ProviderId。
 *
 * 用户在 `opencode auth login` 里看到的名字是 OpenCode 实际的 auth provider
 * 名（如 "zhipuai-coding-plan"、"kimi-for-coding"），跟我们的内部简称
 * （"zhipu"、"kimi"）不一样——真实发生过用户直接把 auth 名传给
 * `omo-sci configure --providers` 导致报错的情况。这里接受两种写法：
 * - 内部简称：原样返回
 * - OpenCode auth provider 名：反查 PROVIDER_TO_AUTH_NAME 转回内部简称
 * 两种都不匹配时原样返回，交给调用方的白名单校验给出报错提示。
 */
export function normalizeProviderId(input: string): string {
  const trimmed = input.trim();
  if (PROVIDER_WHITELIST.includes(trimmed as ProviderId)) return trimmed;
  const matched = Object.entries(PROVIDER_TO_AUTH_NAME).find(
    ([, authName]) => authName.toLowerCase() === trimmed.toLowerCase(),
  );
  return matched ? matched[0] : trimmed;
}
