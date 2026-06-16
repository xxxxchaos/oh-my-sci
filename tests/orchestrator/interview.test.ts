/**
 * interview 状态机测试
 */
import { describe, it, expect } from 'bun:test';
import {
  createInterview,
  getNextPrompt,
  processUserInput,
  type InterviewContext,
} from '../../src/orchestrator/interview';

describe('interview', () => {
  describe('createInterview', () => {
    it('创建默认初始状态为 GREETING', () => {
      const ctx = createInterview();
      expect(ctx.state).toBe('GREETING');
      expect(ctx.pico).toEqual({});
      expect(ctx.finerNotes).toEqual([]);
      expect(ctx.userConfirmed).toBe(false);
    });
  });

  describe('getNextPrompt', () => {
    it('GREETING 状态返回欢迎提示', () => {
      const ctx = createInterview();
      const prompt = getNextPrompt(ctx);
      expect(prompt).toContain('欢迎');
      expect(prompt).toContain('Dubin');
    });

    it('INTENT_CLASSIFICATION 状态返回研究类型选项', () => {
      const ctx: InterviewContext = {
        state: 'INTENT_CLASSIFICATION',
        pico: {},
        finerNotes: [],
        userConfirmed: false,
      };
      const prompt = getNextPrompt(ctx);
      expect(prompt).toContain('研究类型');
      expect(prompt).toContain('A)');
      expect(prompt).toContain('D)');
    });

    it('PICO_EXTRACTION 按缺失字段依次提示', () => {
      const ctx: InterviewContext = {
        state: 'PICO_EXTRACTION',
        pico: {},
        finerNotes: [],
        userConfirmed: false,
      };
      // 全部为空 → population
      expect(getNextPrompt(ctx)).toContain('病人群');

      // 填了 population → intervention
      ctx.pico.population = '脓毒症患者';
      expect(getNextPrompt(ctx)).toContain('干预');

      // 填了 intervention → comparison
      ctx.pico.intervention = '瑞马唑仑';
      expect(getNextPrompt(ctx)).toContain('对照组');

      // 填了 comparison → outcome
      ctx.pico.comparison = '丙泊酚';
      expect(getNextPrompt(ctx)).toContain('结局指标');

      // 全部填完 → 确认总结
      ctx.pico.outcome = '28天死亡率';
      const prompt = getNextPrompt(ctx);
      expect(prompt).toContain('总结一下');
      expect(prompt).toContain('脓毒症患者');
      expect(prompt).toContain('瑞马唑仑');
      expect(prompt).toContain('丙泊酚');
      expect(prompt).toContain('28天死亡率');
    });

    it('FEASIBILITY_DISCUSSION 返回可行性提示', () => {
      const ctx: InterviewContext = {
        state: 'FEASIBILITY_DISCUSSION',
        pico: { population: 'a', intervention: 'b', comparison: 'c', outcome: 'd' },
        finerNotes: [],
        userConfirmed: false,
      };
      const prompt = getNextPrompt(ctx);
      expect(prompt).toContain('可行性');
    });

    it('CONFIRMATION 返回确认提示', () => {
      const ctx: InterviewContext = {
        state: 'CONFIRMATION',
        pico: { population: 'P', intervention: 'I', comparison: 'C', outcome: 'O' },
        finerNotes: [],
        researchType: '原始研究',
        userConfirmed: false,
      };
      const prompt = getNextPrompt(ctx);
      expect(prompt).toContain('总结一下');
      expect(prompt).toContain('原始研究');
      expect(prompt).toContain('P / I / C / O');
    });

    it('COMPLETED 返回空字符串', () => {
      const ctx: InterviewContext = {
        state: 'COMPLETED',
        pico: {},
        finerNotes: [],
        userConfirmed: true,
      };
      expect(getNextPrompt(ctx)).toBe('');
    });
  });

  describe('processUserInput — 完整访谈流程', () => {
    it('从 GREETING 到 INTENT_CLASSIFICATION', () => {
      const ctx = createInterview();
      const result = processUserInput(ctx, '我想研究脓毒症');
      expect(result.ctx.state).toBe('INTENT_CLASSIFICATION');
      expect(result.ctx.specialty).toBe('重症医学/脓毒症');
      expect(result.nextPrompt).toContain('研究类型');
    });

    it('选择 A（原始研究）进入 PICO_EXTRACTION', () => {
      const ctx = createInterview();
      // GREETING → INTENT
      let r = processUserInput(ctx, '我想做临床研究');
      expect(r.ctx.state).toBe('INTENT_CLASSIFICATION');

      // INTENT → PICO (选 A)
      r = processUserInput(r.ctx, 'A');
      expect(r.ctx.state).toBe('PICO_EXTRACTION');
      expect(r.ctx.researchType).toBe('原始研究');
      expect(r.nextPrompt).toContain('病人群');
    });

    it('选择 D（不确定）触发 Pubmeder 后台委派', () => {
      const ctx = createInterview();
      ctx.specialty = '重症医学';
      let r = processUserInput(ctx, '不确定');
      expect(r.ctx.state).toBe('INTENT_CLASSIFICATION');
      r = processUserInput(r.ctx, 'D');
      expect(r.ctx.state).toBe('PICO_EXTRACTION');
      expect(r.ctx.researchType).toBe('探索中');
      expect(r.shouldDelegate).toBeDefined();
      expect(r.shouldDelegate!.agent).toBe('pubmeder');
    });

    it('逐项填充 PICO', () => {
      const ctx: InterviewContext = {
        state: 'PICO_EXTRACTION',
        pico: {},
        finerNotes: [],
        userConfirmed: false,
      };

      // 填 population
      let r = processUserInput(ctx, '脓毒症休克患者');
      expect(r.ctx.pico.population).toBe('脓毒症休克患者');
      expect(r.ctx.state).toBe('PICO_EXTRACTION');

      // 填 intervention
      r = processUserInput(r.ctx, '限制性液体复苏');
      expect(r.ctx.pico.intervention).toBe('限制性液体复苏');
      expect(r.ctx.state).toBe('PICO_EXTRACTION');

      // 填 comparison
      r = processUserInput(r.ctx, '常规液体复苏');
      expect(r.ctx.pico.comparison).toBe('常规液体复苏');
      expect(r.ctx.state).toBe('PICO_EXTRACTION');

      // 填 outcome → 自动推进到 FEASIBILITY_DISCUSSION
      r = processUserInput(r.ctx, '28天死亡率');
      expect(r.ctx.pico.outcome).toBe('28天死亡率');
      expect(r.ctx.state).toBe('FEASIBILITY_DISCUSSION');
      expect(r.nextPrompt).toContain('可行性');
    });

    it('FEASIBILITY → CONFIRMATION', () => {
      const ctx: InterviewContext = {
        state: 'FEASIBILITY_DISCUSSION',
        pico: { population: 'P', intervention: 'I', comparison: 'C', outcome: 'O' },
        finerNotes: [],
        userConfirmed: false,
      };
      const r = processUserInput(ctx, '大约200例，从电子病历系统提取');
      expect(r.ctx.state).toBe('CONFIRMATION');
      expect(r.ctx.finerNotes).toContain('大约200例，从电子病历系统提取');
      expect(r.nextPrompt).toContain('总结一下');
    });

    it('CONFIRMATION 确认后进入 COMPLETED', () => {
      const ctx: InterviewContext = {
        state: 'CONFIRMATION',
        pico: { population: 'P', intervention: 'I', comparison: 'C', outcome: 'O' },
        finerNotes: ['200例'],
        researchType: '原始研究',
        userConfirmed: false,
      };
      const r = processUserInput(ctx, '是，继续');
      expect(r.ctx.state).toBe('COMPLETED');
      expect(r.ctx.userConfirmed).toBe(true);
    });

    it('CONFIRMATION 不确认时停留在原状态', () => {
      const ctx: InterviewContext = {
        state: 'CONFIRMATION',
        pico: { population: 'P', intervention: 'I', comparison: 'C', outcome: 'O' },
        finerNotes: [],
        userConfirmed: false,
      };
      const r = processUserInput(ctx, '我再想想');
      expect(r.ctx.state).toBe('CONFIRMATION');
      expect(r.ctx.userConfirmed).toBe(false);
    });

    it('COMPLETED 状态不继续转换', () => {
      const ctx: InterviewContext = {
        state: 'COMPLETED',
        pico: { population: 'P', intervention: 'I', comparison: 'C', outcome: 'O' },
        finerNotes: [],
        userConfirmed: true,
      };
      const r = processUserInput(ctx, '是');
      expect(r.ctx.state).toBe('COMPLETED');
    });
  });

  describe('processUserInput — 专业字段提取', () => {
    it('识别 sepsis 关键词', () => {
      const ctx = createInterview();
      const result = processUserInput(ctx, 'sepsis患者');
      expect(result.ctx.specialty).toBe('重症医学/脓毒症');
    });

    it('识别 Intent 关键词', () => {
      const ctx = createInterview();
      let r = processUserInput(ctx, '你好');
      expect(r.ctx.state).toBe('INTENT_CLASSIFICATION');

      r = processUserInput(r.ctx, 'RCT');
      expect(r.ctx.researchType).toBe('原始研究');
      expect(r.ctx.state).toBe('PICO_EXTRACTION');
    });

    it('自由文本研究类型', () => {
      const ctx = createInterview();
      let r = processUserInput(ctx, '你好');
      r = processUserInput(r.ctx, '病例对照研究');
      expect(r.ctx.researchType).toBe('病例对照研究');
      expect(r.ctx.state).toBe('PICO_EXTRACTION');
    });
  });
});
