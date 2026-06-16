/**
 * Boulder 会话状态系统测试
 */
import { describe, it, expect, afterEach } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  createBoulder,
  loadBoulder,
  saveBoulder,
  addPendingTask,
  updateTaskStatus,
} from '../../src/state/boulder';
import type { PendingTask } from '../../src/types';

describe('Boulder 会话状态系统', () => {
  let tmpDir: string;

  afterEach(() => {
    if (tmpDir) {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  // ──────────────────────────────────────────────────────────
  // createBoulder
  // ──────────────────────────────────────────────────────────

  describe('createBoulder', () => {
    it('生成正确的结构', () => {
      const boulder = createBoulder('脓毒症生物标志物研究', 'stage-0-intake', 'phase-0-interview');

      expect(boulder.active_plan).toBe('脓毒症生物标志物研究');
      expect(boulder.current_stage).toBe('stage-0-intake');
      expect(boulder.current_phase).toBe('phase-0-interview');
      expect(boulder.pending_tasks).toEqual([]);
      expect(boulder.session_id).toBeDefined();
      expect(boulder.session_id).toMatch(/^session_\d+_/);
      expect(boulder.started_at).toBeDefined();
      expect(() => new Date(boulder.started_at)).not.toThrow();
    });

    it('每次创建生成唯一的 session_id', () => {
      const a = createBoulder('plan-a', 'stage-0-intake', 'phase-0');
      const b = createBoulder('plan-b', 'stage-0-intake', 'phase-0');
      expect(a.session_id).not.toBe(b.session_id);
    });

    it('review_state 默认未定义', () => {
      const boulder = createBoulder('test', 'stage-0-intake', 'phase-0');
      expect(boulder.review_state).toBeUndefined();
    });
  });

  // ──────────────────────────────────────────────────────────
  // 加载→保存往返
  // ──────────────────────────────────────────────────────────

  describe('加载→保存往返', () => {
    it('文件不存在时返回 null', () => {
      tmpDir = mkdtempSync(join(tmpdir(), 'boulder-test-'));
      const result = loadBoulder(tmpDir);
      expect(result).toBeNull();
    });

    it('保存后重新加载数据一致', () => {
      tmpDir = mkdtempSync(join(tmpdir(), 'boulder-test-'));

      const boulder = createBoulder('测试项目', 'stage-1-design', 'phase-1a');
      saveBoulder(tmpDir, boulder);

      const reloaded = loadBoulder(tmpDir);
      expect(reloaded).not.toBeNull();
      expect(reloaded!.active_plan).toBe('测试项目');
      expect(reloaded!.current_stage).toBe('stage-1-design');
      expect(reloaded!.current_phase).toBe('phase-1a');
      expect(reloaded!.session_id).toBe(boulder.session_id);
    });
  });

  // ──────────────────────────────────────────────────────────
  // addPendingTask / updateTaskStatus
  // ──────────────────────────────────────────────────────────

  describe('addPendingTask', () => {
    it('添加任务到当前 Boulder', () => {
      tmpDir = mkdtempSync(join(tmpdir(), 'boulder-test-'));

      const boulder = createBoulder('测试项目', 'stage-0-intake', 'phase-0');
      saveBoulder(tmpDir, boulder);

      const task: PendingTask = {
        id: 'task-001',
        agent: 'pubmeder',
        task: '搜索脓毒症生物标志物的文献',
        status: 'pending',
      };

      const updated = addPendingTask(tmpDir, task);
      expect(updated.pending_tasks).toHaveLength(1);
      expect(updated.pending_tasks[0].id).toBe('task-001');
      expect(updated.pending_tasks[0].agent).toBe('pubmeder');
      expect(updated.pending_tasks[0].status).toBe('pending');

      // 验证持久化
      const reloaded = loadBoulder(tmpDir);
      expect(reloaded!.pending_tasks).toHaveLength(1);
    });

    it('可添加多个任务', () => {
      tmpDir = mkdtempSync(join(tmpdir(), 'boulder-test-'));

      const boulder = createBoulder('测试项目', 'stage-1-design', 'phase-1b');
      saveBoulder(tmpDir, boulder);

      addPendingTask(tmpDir, {
        id: 'task-001',
        agent: 'archimedes',
        task: '生成研究蓝图',
        status: 'in_progress',
      });
      addPendingTask(tmpDir, {
        id: 'task-002',
        agent: 'pubmeder',
        task: '深度文献搜索',
        status: 'pending',
      });

      const reloaded = loadBoulder(tmpDir);
      expect(reloaded!.pending_tasks).toHaveLength(2);
    });

    it('当 Boulder 不存在时抛出错误', () => {
      tmpDir = mkdtempSync(join(tmpdir(), 'boulder-test-'));

      expect(() =>
        addPendingTask(tmpDir, {
          id: 'task-001',
          agent: 'dubin',
          task: 'test',
          status: 'pending',
        }),
      ).toThrow('没有找到 boulder 状态');
    });
  });

  describe('updateTaskStatus', () => {
    it('更新任务状态', () => {
      tmpDir = mkdtempSync(join(tmpdir(), 'boulder-test-'));

      const boulder = createBoulder('测试项目', 'stage-0-intake', 'phase-0');
      boulder.pending_tasks.push({
        id: 'task-001',
        agent: 'pubmeder',
        task: '文献搜索',
        status: 'in_progress',
      });
      saveBoulder(tmpDir, boulder);

      // 更新为 completed
      updateTaskStatus(tmpDir, 'task-001', 'completed');

      const reloaded = loadBoulder(tmpDir);
      expect(reloaded!.pending_tasks[0].status).toBe('completed');
    });

    it('任务不存在时抛出错误', () => {
      tmpDir = mkdtempSync(join(tmpdir(), 'boulder-test-'));

      const boulder = createBoulder('test', 'stage-0-intake', 'phase-0');
      saveBoulder(tmpDir, boulder);

      expect(() => updateTaskStatus(tmpDir, 'nonexistent', 'completed')).toThrow(
        '未找到任务',
      );
    });

    it('当 Boulder 不存在时抛出错误', () => {
      tmpDir = mkdtempSync(join(tmpdir(), 'boulder-test-'));

      expect(() => updateTaskStatus(tmpDir, 'task-001', 'completed')).toThrow(
        '没有找到 boulder 状态',
      );
    });
  });

  // ──────────────────────────────────────────────────────────
  // review_state
  // ──────────────────────────────────────────────────────────

  describe('review_state', () => {
    it('设置 review_state 后保存加载正确', () => {
      tmpDir = mkdtempSync(join(tmpdir(), 'boulder-test-'));

      const boulder = createBoulder('测试项目', 'stage-3-writing', 'phase-3b');
      boulder.review_state = {
        phase1_complete: true,
        phase2_complete: false,
      };
      saveBoulder(tmpDir, boulder);

      const reloaded = loadBoulder(tmpDir);
      expect(reloaded!.review_state).toBeDefined();
      expect(reloaded!.review_state!.phase1_complete).toBe(true);
      expect(reloaded!.review_state!.phase2_complete).toBe(false);
    });
  });
});
