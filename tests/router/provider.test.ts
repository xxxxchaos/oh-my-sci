/**
 * provider.ts 测试
 */
import { describe, it, expect } from 'bun:test';
import {
  PROVIDER_REGISTRY,
  getAvailableModels,
  PROVIDER_TO_AUTH_NAME,
  toAuthModelKey,
  canonicalModelKey,
} from '../../src/router/provider';
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

    it('qwen-bailian 包含 Plus、Max 和 3.8-Max', () => {
      const modelIds = PROVIDER_REGISTRY['qwen-bailian']!.models.map(model => model.model_id);
      expect(modelIds).toContain('qwen3.7-plus');
      expect(modelIds).toContain('qwen3.7-max');
      expect(modelIds).toContain('qwen3.8-max');
    });

    it('Kimi 注册 K2.7 Code 和 K3，不含套餐里没有的 K2.6', () => {
      const modelIds = PROVIDER_REGISTRY['kimi']!.models.map(model => model.model_id);
      expect(modelIds).toContain('kimi-k2.7-code');
      expect(modelIds).toContain('kimi-k3');
      expect(modelIds).not.toContain('kimi-k2.6');
    });

    it('智谱注册 GLM-5.2 和 GLM-5.3', () => {
      const modelIds = PROVIDER_REGISTRY['zhipu']!.models.map(model => model.model_id);
      expect(modelIds).toContain('glm-5.2');
      expect(modelIds).toContain('glm-5.3');
    });

    it('opencode-go 含 2026-08 新发布的四款旗舰模型', () => {
      const modelIds = PROVIDER_REGISTRY['opencode-go']!.models.map(model => model.model_id);
      expect(modelIds).toContain('kimi-k3');
      expect(modelIds).toContain('glm-5.3');
      expect(modelIds).toContain('qwen3.8-max');
      expect(modelIds).toContain('deepseek-v4-pro');
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

    it('转换 kimi 内部 provider 为 auth 名，并把代号翻译成套餐档位名', () => {
      // kimi-for-coding 套餐用"档位名"而不是"代号"命名模型：
      // kimi-k2.7-code 对应它的标准档 kimi-for-coding，kimi-k3 对应它的 k3 档。
      // 这是此前被发现的真实命名不匹配 bug 的修复——以前这里直接把内部代号
      // kimi-k2.7-code 原样传给套餐 auth，套餐根本不认识这个模型名。
      expect(toAuthModelKey('kimi/kimi-k2.7-code')).toBe('kimi-for-coding/kimi-for-coding');
      expect(toAuthModelKey('kimi/kimi-k3')).toBe('kimi-for-coding/k3');
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

  describe('canonicalModelKey 与 toAuthModelKey 的往返一致性（doctor --models 依赖此行为）', () => {
    it('kimi-for-coding 套餐档位名能正确识别回 kimi 内部模型', () => {
      // model-config.ts 的 checkInstalledAgentModels() 会把
      // canonicalModelKey(internalKey) 和 canonicalModelKey(toAuthModelKey(internalKey))
      // 都加入白名单；这里验证真实安装后 agent 文件里会出现的
      // "kimi-for-coding/kimi-for-coding" 和 "kimi-for-coding/k3"
      // 能被正确识别为合法的 kimi 模型，不会被 doctor 误报成未知模型。
      expect(canonicalModelKey('kimi-for-coding/kimi-for-coding')).toBe(
        canonicalModelKey(toAuthModelKey('kimi/kimi-k2.7-code')),
      );
      expect(canonicalModelKey('kimi-for-coding/k3')).toBe(
        canonicalModelKey(toAuthModelKey('kimi/kimi-k3')),
      );
    });
  });

  describe('getAvailableModels', () => {
    it('合并多个 provider 的模型', () => {
      const ids: ProviderId[] = ['deepseek', 'qwen-bailian'];
      const models = getAvailableModels(ids);
      expect(models.length).toBe(5); // 2 + 3（qwen-bailian 含 qwen3.8-max）
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
