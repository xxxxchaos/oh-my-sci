/**
 * delegation 委派引擎测试
 */
import { describe, it, expect } from 'bun:test';
import {
  createDelegationTask,
  extractAgentContext,
  type DelegationTask,
} from '../../src/orchestrator/delegation';

describe('delegation', () => {
  describe('createDelegationTask', () => {
    it('创建 DelegationTask 包含 id/agent/task/context', () => {
      const task = createDelegationTask(
        'pubmeder',
        '搜索瑞马唑仑相关文献',
        'PICO: 脓毒症患者, 瑞马唑仑, 丙泊酚, 28天死亡率',
      );
      expect(task.agent).toBe('pubmeder');
      expect(task.task).toBe('搜索瑞马唑仑相关文献');
      expect(task.context).toContain('PICO');
      expect(task.id).toContain('pubmeder-');
    });

    it('不同 agent 创建不同 id', () => {
      const a = createDelegationTask('archimedes', '设计研究', 'ctx');
      const b = createDelegationTask('spsser', '统计分析', 'ctx');
      expect(a.id).toContain('archimedes-');
      expect(b.id).toContain('spsser-');
      expect(a.id).not.toBe(b.id);
    });

    it('支持 modelHint', () => {
      const task: DelegationTask = {
        id: 'test-1',
        agent: 'pubmeder',
        task: '搜索',
        context: 'ctx',
        modelHint: 'deepseek-chat',
      };
      expect(task.modelHint).toBe('deepseek-chat');
    });
  });

  describe('extractAgentContext', () => {
    it('为不同 agent 加上正确的前缀', () => {
      const ctx = extractAgentContext('研究问题: 某药物疗效', 'archimedes');
      expect(ctx).toContain('[Archimedes]');
      expect(ctx).toContain('研究蓝图');
      expect(ctx).toContain('研究问题: 某药物疗效');
    });

    it('pubmeder 前缀包含文献搜索', () => {
      const ctx = extractAgentContext('脓毒症液体复苏', 'pubmeder');
      expect(ctx).toContain('[Pubmeder]');
      expect(ctx).toContain('文献搜索');
    });

    it('dubin 前缀为空字符串', () => {
      const ctx = extractAgentContext('test context', 'dubin');
      expect(ctx).toBe('test context');
    });

    it('上下文超出 maxChars 时截断并附加标记', () => {
      const longCtx = 'x'.repeat(6000);
      const result = extractAgentContext(longCtx, 'pubmeder', 500);
      // 总长度 = prefix + (maxChars - prefix.length) + '\n...(truncated)'
      //          = maxChars + '\n...(truncated)'.length
      const truncMarker = '\n...(truncated)';
      expect(result.length).toBe(500 + truncMarker.length);
      expect(result).toContain('(truncated)');
    });

    it('短上下文不截断', () => {
      const result = extractAgentContext('短文本', 'spsser', 4000);
      expect(result).toContain('短文本');
      expect(result).not.toContain('(truncated)');
    });

    it('每个 agent 都有对应前缀', () => {
      const agents: Array<Parameters<typeof extractAgentContext>[1]> = [
        'dubin',
        'archimedes',
        'irber',
        'pubmeder',
        'spsser',
        'writer',
        'submitter',
        'ebmer',
        'polisher',
      ];
      for (const agent of agents) {
        const ctx = extractAgentContext('test', agent);
        expect(ctx).toBeTruthy();
        // dubin 没有前缀，其他都有
        if (agent !== 'dubin') {
          // 以 [ 开头的 agent 标识
          expect(ctx).toMatch(/\[/);
        }
      }
    });
  });
});
