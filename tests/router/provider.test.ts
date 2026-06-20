/**
 * provider.ts 测试
 */
import { describe, it, expect } from 'bun:test';
import { PROVIDER_REGISTRY, getAvailableModels, PROVIDER_TO_AUTH_NAME, toAuthModelKey } from '../../src/router/provider';
import type { ProviderId } from '../../src/types';

describe('provider', () => {
  describe('PROVIDER_REGISTRY', () => {
    it('包含 deepseek 提供商', () => {
      const entry = PROVIDER_REGISTRY['deepseek'];
      expect(entry).toBeDefined();
      expect(entry!.name).toContain('DeepSeek');
    });

    it('deepseek 包含 2 个模型', () => {
      expect(PROVIDER_REGISTRY['deepseek']!.models.length).toBe(2);
    });

    it('qwen-bailian 包含 Plus 和 Max', () => {
      const modelIds = PROVIDER_REGISTRY['qwen-bailian']!.models.map(model => model.model_id);
      expect(modelIds).toContain('qwen3.7-plus');
      expect(modelIds).toContain('qwen3.7-max');
    });

    it('Kimi 注册 K2.6 和 K2.7 Code', () => {
      const modelIds = PROVIDER_REGISTRY['kimi']!.models.map(model => model.model_id);
      expect(modelIds).toContain('kimi-k2.6');
      expect(modelIds).toContain('kimi-k2.7-code');
    });
  });

  describe('PROVIDER_TO_AUTH_NAME', () => {
    it('将 zhipu 映射到 zhipuai-coding-plan', () => {
      expect(PROVIDER_TO_AUTH_NAME['zhipu']).toBe('zhipuai-coding-plan');
    });

    it('将 kimi 映射到 kimi-for-coding', () => {
      expect(PROVIDER_TO_AUTH_NAME['kimi']).toBe('kimi-for-coding');
    });

    it('将 minimax 映射到 minimax-cn-coding-plan', () => {
      expect(PROVIDER_TO_AUTH_NAME['minimax']).toBe('minimax-cn-coding-plan');
    });

    it('映射与 AUTH_PROVIDER_MAP 可逆', () => {
      // 验证 opencode-go 和 deepseek 双向一致
      expect(PROVIDER_TO_AUTH_NAME['opencode-go']).toBe('opencode-go');
      expect(PROVIDER_TO_AUTH_NAME['deepseek']).toBe('deepseek');
    });
  });

  describe('toAuthModelKey', () => {
    it('转换 zhipu 内部 provider 为 auth 名', () => {
      expect(toAuthModelKey('zhipu/glm-5.2')).toBe('zhipuai-coding-plan/glm-5.2');
    });

    it('转换 minimax 内部 provider 为 auth 名', () => {
      expect(toAuthModelKey('minimax/minimax-m3')).toBe('minimax-cn-coding-plan/MiniMax-M3');
    });

    it('转换 kimi 内部 provider 为 auth 名', () => {
      expect(toAuthModelKey('kimi/kimi-k2.7-code')).toBe('kimi-for-coding/kimi-k2.7-code');
    });

    it('opencode-go 保持不变', () => {
      expect(toAuthModelKey('opencode-go/qwen3.7-max')).toBe('opencode-go/qwen3.7-max');
    });

    it('deepseek 保持不变', () => {
      expect(toAuthModelKey('deepseek/deepseek-v4-pro')).toBe('deepseek/deepseek-v4-pro');
    });

    it('不认识的 provider 保持原样', () => {
      expect(toAuthModelKey('unknown-provider/some-model')).toBe('unknown-provider/some-model');
    });

    it('没有 / 的字符串保持原样', () => {
      expect(toAuthModelKey('just-a-string')).toBe('just-a-string');
    });
  });

  describe('getAvailableModels', () => {
    it('合并多个 provider 的模型', () => {
      const ids: ProviderId[] = ['deepseek', 'qwen-bailian'];
      const models = getAvailableModels(ids);
      expect(models.length).toBe(4); // 2 + 2
    });

    it('在空 provider 列表时返回空数组', () => {
      const models = getAvailableModels([]);
      expect(models).toEqual([]);
    });

    it('忽略不存在的 provider 而不报错', () => {
      const models = getAvailableModels(['deepseek', 'glm' as ProviderId]);
      // glm 在注册表中没有条目，但不应报错
      expect(models.length).toBe(2);
    });
  });
});
