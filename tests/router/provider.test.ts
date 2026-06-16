/**
 * provider.ts 测试
 */
import { describe, it, expect } from 'bun:test';
import { PROVIDER_REGISTRY, getAvailableModels } from '../../src/router/provider';
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

    it('qwen-bailian 包含 1 个模型', () => {
      expect(PROVIDER_REGISTRY['qwen-bailian']!.models.length).toBe(1);
    });
  });

  describe('getAvailableModels', () => {
    it('合并多个 provider 的模型', () => {
      const ids: ProviderId[] = ['deepseek', 'qwen-bailian'];
      const models = getAvailableModels(ids);
      expect(models.length).toBe(3); // 2 + 1
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
