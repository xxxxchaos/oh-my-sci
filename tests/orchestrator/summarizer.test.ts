/**
 * summarizer 结果汇总器测试
 */
import { describe, it, expect } from 'bun:test';
import {
  summarizeResult,
  extractLearnings,
  type SubAgentResult,
} from '../../src/orchestrator/summarizer';

describe('summarizer', () => {
  describe('summarizeResult', () => {
    it('生成包含 agent 名称和 task 的摘要', () => {
      const result: SubAgentResult = {
        agent: 'Pubmeder',
        task: '脓毒症液体复苏文献搜索',
        output: '找到 15 篇相关文献',
        learnings: [],
        errors: [],
      };
      const summary = summarizeResult(result);
      expect(summary).toContain('Pubmeder');
      expect(summary).toContain('脓毒症液体复苏文献搜索');
      expect(summary).toContain('找到 15 篇相关文献');
    });

    it('包含错误列表', () => {
      const result: SubAgentResult = {
        agent: 'SPSSer',
        task: '主分析',
        output: '分析完成',
        learnings: [],
        errors: ['CNKI 搜索超时', '样本量不足'],
      };
      const summary = summarizeResult(result);
      expect(summary).toContain('遇到问题');
      expect(summary).toContain('CNKI 搜索超时');
      expect(summary).toContain('样本量不足');
    });

    it('包含 learnings', () => {
      const result: SubAgentResult = {
        agent: 'Archimedes',
        task: '研究设计',
        output: '蓝图完成',
        learnings: ['PSM 适合观察性研究', '效应量需来自文献'],
        errors: [],
      };
      const summary = summarizeResult(result);
      expect(summary).toContain('学到的');
      expect(summary).toContain('PSM 适合观察性研究');
    });

    it('无错误和 learnings 时跳过对应段落', () => {
      const result: SubAgentResult = {
        agent: 'Writer',
        task: '生成初稿',
        output: '初稿完成',
        learnings: [],
        errors: [],
      };
      const summary = summarizeResult(result);
      expect(summary).not.toContain('遇到问题');
      expect(summary).not.toContain('学到的');
      expect(summary).toContain('初稿完成');
    });
  });

  describe('extractLearnings', () => {
    it('提取以 "Lesson:" 开头的行', () => {
      const output = `一些文字
Lesson: PSM 匹配后应使用条件 logistic 回归
其他内容
Lesson: 效应量应来自系统评价`;
      const learnings = extractLearnings(output);
      expect(learnings).toHaveLength(2);
      expect(learnings[0]).toBe('PSM 匹配后应使用条件 logistic 回归');
      expect(learnings[1]).toBe('效应量应来自系统评价');
    });

    it('提取中文 "学到了:" 开头的行', () => {
      const output = `学到了: 这是重要经验
无关行
学到了: 另一个经验`;
      const learnings = extractLearnings(output);
      expect(learnings).toHaveLength(2);
      expect(learnings[0]).toBe('这是重要经验');
    });

    it('提取以 📝 开头的行', () => {
      const output = `📝 这是一个 learning 条目
普通行
📝 另一个 learning`;
      const learnings = extractLearnings(output);
      expect(learnings).toHaveLength(2);
      expect(learnings[0]).toBe('这是一个 learning 条目');
      expect(learnings[1]).toBe('另一个 learning');
    });

    it('无匹配时返回空数组', () => {
      const output = '没有任何特殊标记的行\n纯文本内容';
      const learnings = extractLearnings(output);
      expect(learnings).toEqual([]);
    });

    it('混合前缀正确提取', () => {
      const output = `Lesson: A
学到了: B
📝 C
普通行`;
      const learnings = extractLearnings(output);
      expect(learnings).toEqual(['A', 'B', 'C']);
    });
  });
});
