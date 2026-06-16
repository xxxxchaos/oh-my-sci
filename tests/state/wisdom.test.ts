/**
 * wisdom 系统测试
 */
import { describe, it, expect, afterEach } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  loadWisdom,
  saveWisdomEntry,
} from '../../src/state/wisdom';
import type { WisdomEntry } from '../../src/state/wisdom';

describe('wisdom 系统', () => {
  let tmpDir: string;

  afterEach(() => {
    if (tmpDir) {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  describe('save ~ load 往返', () => {
    it('保存一条 learning 后能正确加载', () => {
      tmpDir = mkdtempSync(join(tmpdir(), 'wisdom-test-'));
      const entry: WisdomEntry = {
        type: 'learning',
        content: '使用 PSM 时必须报告卡钳值',
        source: 'ebmer',
        timestamp: '2026-06-16T10:00:00.000Z',
      };

      saveWisdomEntry(tmpDir, entry);
      const loaded = loadWisdom(tmpDir);

      expect(loaded.learnings).toHaveLength(1);
      expect(loaded.learnings[0].content).toBe('使用 PSM 时必须报告卡钳值');
      expect(loaded.learnings[0].source).toBe('ebmer');
      expect(loaded.learnings[0].timestamp).toBe('2026-06-16');
    });

    it('保存多条不同 type 的 wisdom', () => {
      tmpDir = mkdtempSync(join(tmpdir(), 'wisdom-test-'));

      saveWisdomEntry(tmpDir, { type: 'learning', content: 'L1', source: 'a', timestamp: '2026-01-01' });
      saveWisdomEntry(tmpDir, { type: 'decision', content: 'D1', source: 'b', timestamp: '2026-01-02' });
      saveWisdomEntry(tmpDir, { type: 'gotcha', content: 'G1', source: 'c', timestamp: '2026-01-03' });
      saveWisdomEntry(tmpDir, { type: 'problem', content: 'P1', source: 'd', timestamp: '2026-01-04' });

      const loaded = loadWisdom(tmpDir);
      expect(loaded.learnings).toHaveLength(1);
      expect(loaded.decisions).toHaveLength(1);
      expect(loaded.gotchas).toHaveLength(1);
      expect(loaded.problems).toHaveLength(1);
    });

    it('追加同类型 wisdom 到同一文件', () => {
      tmpDir = mkdtempSync(join(tmpdir(), 'wisdom-test-'));

      saveWisdomEntry(tmpDir, { type: 'learning', content: '第一条学习', source: 'ebmer', timestamp: '2026-01-01' });
      saveWisdomEntry(tmpDir, { type: 'learning', content: '第二条学习', source: 'polisher', timestamp: '2026-02-01' });

      const loaded = loadWisdom(tmpDir);
      expect(loaded.learnings).toHaveLength(2);
      expect(loaded.learnings[0].content).toBe('第一条学习');
      expect(loaded.learnings[1].content).toBe('第二条学习');
    });

    it('调用 loadWisdom 但目录不存在时返回空数组', () => {
      tmpDir = mkdtempSync(join(tmpdir(), 'wisdom-test-'));
      const path = join(tmpDir, 'nonexistent');
      const loaded = loadWisdom(path);
      expect(loaded.learnings).toHaveLength(0);
      expect(loaded.decisions).toHaveLength(0);
      expect(loaded.gotchas).toHaveLength(0);
      expect(loaded.problems).toHaveLength(0);
    });
  });
});
