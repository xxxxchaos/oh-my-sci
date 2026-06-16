/**
 * usage-tracker 模块测试
 */
import { describe, it, expect, afterEach } from 'bun:test';
import { mkdtempSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { recordUsage, getQuotaWarning } from '../../src/safety/usage-tracker';
import { DEFAULT_CONFIG } from '../../src/constants';

/** 构建合法的 OmoSciConfig JSON 字符串（测试用，无需 JSONC 兼容） */
function buildMinimalConfig(currentUsage = 0): string {
  const config: Record<string, unknown> = {
    router: {
      categories: {},
      concurrency: { max_total_agents: 8 },
    },
    safety: DEFAULT_CONFIG.safety,
    usage: {
      token_quota: DEFAULT_CONFIG.usage.token_quota,
      current_usage: currentUsage,
      quota_reset_date: '2026-07-01',
    },
    environment: DEFAULT_CONFIG.environment,
  };
  return JSON.stringify(config, null, 2) + '\n';
}

describe('usage-tracker', () => {
  let tmpDir: string;

  afterEach(() => {
    if (tmpDir) {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  describe('recordUsage (with temp config isolation)', () => {
    it('正确累加 input + output tokens', () => {
      tmpDir = mkdtempSync(join(tmpdir(), 'usage-tracker-'));
      const configPath = join(tmpDir, 'test-config.jsonc');
      writeFileSync(configPath, buildMinimalConfig(0), 'utf-8');

      const result = recordUsage({
        timestamp: '2026-06-16T00:00:00Z',
        agent: 'dubin',
        stage: 'stage-0-intake',
        input_tokens: 100_000,
        output_tokens: 50_000,
      }, configPath);
      expect(result.currentUsage).toBe(150_000);
    });

    it('50% 用量返回 light 警告', () => {
      tmpDir = mkdtempSync(join(tmpdir(), 'usage-tracker-'));
      const configPath = join(tmpDir, 'test-config.jsonc');
      writeFileSync(configPath, buildMinimalConfig(0), 'utf-8');

      const result = recordUsage({
        timestamp: '2026-06-16T00:00:00Z',
        agent: 'writer',
        stage: 'stage-3-writing',
        input_tokens: 250_000_000,
        output_tokens: 0,
      }, configPath);
      expect(result.warningLevel).toBe('light');
      expect(result.quotaPercent).toBe(50);
    });

    it('80% 用量返回 moderate 警告', () => {
      tmpDir = mkdtempSync(join(tmpdir(), 'usage-tracker-'));
      const configPath = join(tmpDir, 'test-config.jsonc');
      writeFileSync(configPath, buildMinimalConfig(0), 'utf-8');

      const result = recordUsage({
        timestamp: '2026-06-16T00:00:00Z',
        agent: 'archimedes',
        stage: 'stage-2-analysis',
        input_tokens: 400_000_000,
        output_tokens: 0,
      }, configPath);
      expect(result.warningLevel).toBe('moderate');
      expect(result.quotaPercent).toBe(80);
    });

    it('100% 用量返回 critical 警告', () => {
      tmpDir = mkdtempSync(join(tmpdir(), 'usage-tracker-'));
      const configPath = join(tmpDir, 'test-config.jsonc');
      writeFileSync(configPath, buildMinimalConfig(0), 'utf-8');

      const result = recordUsage({
        timestamp: '2026-06-16T00:00:00Z',
        agent: 'spsser',
        stage: 'stage-2-analysis',
        input_tokens: 500_000_000,
        output_tokens: 0,
      }, configPath);
      expect(result.warningLevel).toBe('critical');
      expect(result.quotaPercent).toBe(100);
    });

    it('0% 用量返回 none', () => {
      tmpDir = mkdtempSync(join(tmpdir(), 'usage-tracker-'));
      const configPath = join(tmpDir, 'test-config.jsonc');
      writeFileSync(configPath, buildMinimalConfig(0), 'utf-8');

      const result = recordUsage({
        timestamp: '2026-06-16T00:00:00Z',
        agent: 'dubin',
        stage: 'stage-0-intake',
        input_tokens: 0,
        output_tokens: 0,
      }, configPath);
      expect(result.warningLevel).toBe('none');
      expect(result.quotaPercent).toBe(0);
    });

    it('写入 temp config 后 current_usage 正确持久化', () => {
      tmpDir = mkdtempSync(join(tmpdir(), 'usage-tracker-'));
      const configPath = join(tmpDir, 'test-config.jsonc');
      writeFileSync(configPath, buildMinimalConfig(1000), 'utf-8');

      recordUsage({
        timestamp: '2026-06-16T00:00:00Z',
        agent: 'dubin',
        stage: 'stage-0-intake',
        input_tokens: 5000,
        output_tokens: 3000,
      }, configPath);

      // 从文件重新读取验证持久化
      const raw = require('node:fs').readFileSync(configPath, 'utf-8');
      expect(raw).toContain('"current_usage": 9000');
    });

    it('config 文件不存在时不创建新文件（不污染真实路径）', () => {
      tmpDir = mkdtempSync(join(tmpdir(), 'usage-tracker-'));
      const nonExistentPath = join(tmpDir, 'nonexistent', 'nested', 'config.jsonc');

      // 确认父目录不存在
      expect(existsSync(join(tmpDir, 'nonexistent'))).toBe(false);

      const result = recordUsage({
        timestamp: '2026-06-16T00:00:00Z',
        agent: 'dubin',
        stage: 'stage-0-intake',
        input_tokens: 100_000,
        output_tokens: 0,
      }, nonExistentPath);

      // 文件不应被创建
      expect(existsSync(nonExistentPath)).toBe(false);
      // 但用量仍应计算（纯内存更新）
      expect(result.currentUsage).toBe(100_000);
    });

    it('不传 configPath 时使用默认路径（测试不污染真实 config）', () => {
      tmpDir = mkdtempSync(join(tmpdir(), 'usage-tracker-'));
      const configPath = join(tmpDir, 'test-config.jsonc');
      writeFileSync(configPath, buildMinimalConfig(0), 'utf-8');

      // 验证指定临时路径时正常记录
      const result = recordUsage({
        timestamp: '2026-06-16T00:00:00Z',
        agent: 'dubin',
        stage: 'stage-0-intake',
        input_tokens: 10,
        output_tokens: 5,
      }, configPath);
      expect(result.currentUsage).toBe(15);
    });
  });

  describe('getQuotaWarning', () => {
    it('返回正确的警告文案', () => {
      expect(getQuotaWarning('light')).toContain('50%');
      expect(getQuotaWarning('moderate')).toContain('MiniMax');
      expect(getQuotaWarning('critical')).toContain('额度已用完');
    });

    it('空字符串兜底', () => {
      expect(getQuotaWarning('none' as any)).toBe('');
    });
  });
});
