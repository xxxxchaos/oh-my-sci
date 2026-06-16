/**
 * evolution 进化记忆系统测试
 */
import { describe, it, expect, afterEach } from 'bun:test';
import { mkdtempSync, existsSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  loadProfile,
  saveProfile,
  loadProjectHistory,
  appendProjectHistory,
  appendEvolutionDiary,
  digestCompletedProject,
  type ResearcherProfile,
  type ProjectHistoryEntry,
} from '../../src/state/evolution';

describe('evolution 进化记忆系统', () => {
  let tmpDir: string;

  afterEach(() => {
    if (tmpDir) {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  // ── Researcher Profile ──

  describe('researcher profile', () => {
    it('profile 目录为空时返回默认画像', () => {
      tmpDir = mkdtempSync(join(tmpdir(), 'evo-test-'));
      const profile = loadProfile(tmpDir);
      expect(profile.total_projects_completed).toBe(0);
      expect(profile.identity).toEqual({});
      expect(profile.research_preferences).toEqual({});
      expect(profile.interaction_preferences).toEqual({});
      expect(profile.learned_patterns).toEqual({});
      expect(profile.domain_evolution).toEqual({});
    });

    it('saveProfile 后能正确加载', () => {
      tmpDir = mkdtempSync(join(tmpdir(), 'evo-test-'));
      const profile: ResearcherProfile = {
        last_updated: new Date().toISOString(),
        total_projects_completed: 1,
        identity: {
          specialty: '重症医学',
          institution_type: '三级甲等医院',
        },
        research_preferences: {
          preferred_study_types: ['RCT', '队列研究'],
        },
        interaction_preferences: {
          detail_level: 'moderate',
          explain_jargon: true,
          offer_options_when: 'stuck_only',
        },
        learned_patterns: {},
        domain_evolution: {},
      };

      saveProfile(profile, tmpDir);
      const loaded = loadProfile(tmpDir);
      expect(loaded.total_projects_completed).toBe(1);
      expect(loaded.identity.specialty).toBe('重症医学');
      expect(loaded.research_preferences.preferred_study_types).toEqual([
        'RCT',
        '队列研究',
      ]);
      expect(loaded.interaction_preferences.detail_level).toBe('moderate');
    });

    it('saveProfile 自动更新 last_updated', () => {
      tmpDir = mkdtempSync(join(tmpdir(), 'evo-test-'));
      const profile: ResearcherProfile = {
        last_updated: '2020-01-01T00:00:00.000Z',
        total_projects_completed: 0,
        identity: {},
        research_preferences: {},
        interaction_preferences: {},
        learned_patterns: {},
        domain_evolution: {},
      };

      saveProfile(profile, tmpDir);
      const loaded = loadProfile(tmpDir);
      expect(loaded.last_updated).not.toBe('2020-01-01T00:00:00.000Z');
      expect(loaded.last_updated).toBeTruthy();
    });
  });

  // ── Project History ──

  describe('project history', () => {
    it('history 文件不存在时返回空数组', () => {
      tmpDir = mkdtempSync(join(tmpdir(), 'evo-test-'));
      const history = loadProjectHistory(tmpDir);
      expect(history).toEqual([]);
    });

    it('追加一条记录后能正确加载', () => {
      tmpDir = mkdtempSync(join(tmpdir(), 'evo-test-'));
      const entry: ProjectHistoryEntry = {
        id: 'proj-001',
        title: '重症患者镇静药物对比研究',
        type: 'RCT',
        main_finding: '瑞马唑仑比丙泊酚谵妄发生率更低',
        status: 'completed',
        started_at: '2026-06-01T00:00:00.000Z',
        completed_at: '2026-06-10T00:00:00.000Z',
        key_decisions: ['使用 PSM 匹配', '按 ITT 分析'],
        lessons_carried_forward: ['PSM 卡钳值需在方法中明确报告'],
      };

      appendProjectHistory(entry, tmpDir);
      const history = loadProjectHistory(tmpDir);
      expect(history).toHaveLength(1);
      expect(history[0].id).toBe('proj-001');
      expect(history[0].title).toBe('重症患者镇静药物对比研究');
      expect(history[0].key_decisions).toEqual(['使用 PSM 匹配', '按 ITT 分析']);
    });

    it('追加多条记录按顺序保存', () => {
      tmpDir = mkdtempSync(join(tmpdir(), 'evo-test-'));
      appendProjectHistory(
        {
          id: '1',
          title: '项目一',
          type: '队列研究',
          status: 'completed',
          started_at: '2026-01-01',
          completed_at: '2026-01-10',
          key_decisions: [],
          lessons_carried_forward: [],
        },
        tmpDir,
      );
      appendProjectHistory(
        {
          id: '2',
          title: '项目二',
          type: '横断面研究',
          status: 'completed',
          started_at: '2026-02-01',
          completed_at: '2026-02-10',
          key_decisions: [],
          lessons_carried_forward: [],
        },
        tmpDir,
      );

      const history = loadProjectHistory(tmpDir);
      expect(history).toHaveLength(2);
      expect(history[0].id).toBe('1');
      expect(history[1].id).toBe('2');
    });
  });

  // ── Evolution Diary ──

  describe('evolution diary', () => {
    it('首次追加创建 evolution.md 文件', () => {
      tmpDir = mkdtempSync(join(tmpdir(), 'evo-test-'));
      appendEvolutionDiary('这是一个测试条目', tmpDir);

      const filePath = join(tmpDir, 'evolution.md');
      expect(existsSync(filePath)).toBe(true);
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toContain('# Dubin 进化日志');
      expect(content).toContain('这是一个测试条目');
    });

    it('追加条目时自动插入日期标题', () => {
      tmpDir = mkdtempSync(join(tmpdir(), 'evo-test-'));
      appendEvolutionDiary('今天学到了一些新东西', tmpDir);

      const filePath = join(tmpDir, 'evolution.md');
      const content = readFileSync(filePath, 'utf-8');
      const today = new Date().toISOString().slice(0, 10);
      expect(content).toContain(`## ${today}`);
      expect(content).toContain('今天学到了一些新东西');
    });

    it('追加多条条目', () => {
      tmpDir = mkdtempSync(join(tmpdir(), 'evo-test-'));
      appendEvolutionDiary('第一条', tmpDir);
      appendEvolutionDiary('第二条', tmpDir);

      const filePath = join(tmpDir, 'evolution.md');
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toContain('第一条');
      expect(content).toContain('第二条');
    });
  });

  // ── digestCompletedProject ──

  describe('digestCompletedProject', () => {
    it('项目完成后 total_projects_completed 递增', async () => {
      tmpDir = mkdtempSync(join(tmpdir(), 'evo-test-'));

      // 先从空目录初始化
      const initial = loadProfile(tmpDir);
      initial.total_projects_completed = 0;
      saveProfile(initial, tmpDir);

      await digestCompletedProject(
        tmpDir,
        {
          id: 'proj-002',
          title: '测试项目',
          type: '病例对照研究',
          mainFinding: '主要发现',
          keyDecisions: ['决策A'],
          lessons: ['经验A', '经验B'],
        },
        tmpDir,
      );

      const updated = loadProfile(tmpDir);
      expect(updated.total_projects_completed).toBe(1);
    });

    it('项目完成后追加历史记录和进化日志', async () => {
      tmpDir = mkdtempSync(join(tmpdir(), 'evo-test-'));

      await digestCompletedProject(
        tmpDir,
        {
          id: 'proj-003',
          title: '含教训和决策的项目',
          type: '系统评价',
          mainFinding: '某项干预有效',
          keyDecisions: ['固定效应模型', '发表偏倚评估'],
          lessons: ['搜索策略需包含中英文数据库', '建议注册 PROSPERO'],
        },
        tmpDir,
      );

      // 验证历史记录
      const history = loadProjectHistory(tmpDir);
      const entry = history.find((h) => h.id === 'proj-003');
      expect(entry).toBeDefined();
      expect(entry?.lessons_carried_forward).toContain(
        '搜索策略需包含中英文数据库',
      );
      expect(entry?.key_decisions).toContain('固定效应模型');

      // 验证进化日志
      const logPath = join(tmpDir, 'evolution.md');
      expect(existsSync(logPath)).toBe(true);
      const logContent = readFileSync(logPath, 'utf-8');
      expect(logContent).toContain('含教训和决策的项目');
      expect(logContent).toContain('搜索策略需包含中英文数据库');
      expect(logContent).toContain('固定效应模型');
    });

    it('无 lessons 和 keyDecisions 时不产生进化日志条目', async () => {
      tmpDir = mkdtempSync(join(tmpdir(), 'evo-test-'));

      await digestCompletedProject(
        tmpDir,
        {
          id: 'proj-004',
          title: '空项目',
          type: '综述',
          mainFinding: '',
          keyDecisions: [],
          lessons: [],
        },
        tmpDir,
      );

      // 验证 profile 已更新
      const profile = loadProfile(tmpDir);
      expect(profile.total_projects_completed).toBe(1);

      // 验证历史记录存在
      const history = loadProjectHistory(tmpDir);
      expect(history).toHaveLength(1);
      expect(history[0].id).toBe('proj-004');

      // 验证无 lessons 时 evolution.md 不应包含 lessons 相关行
      const logPath = join(tmpDir, 'evolution.md');
      if (existsSync(logPath)) {
        const logContent = readFileSync(logPath, 'utf-8');
        expect(logContent).not.toMatch(/学到了/);
      }
    });
  });
});
