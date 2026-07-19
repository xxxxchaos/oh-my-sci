import { describe, expect, it } from 'bun:test';
import { OmoSciPlugin } from '../src/index';

describe('OpenCode plugin entry', () => {
  it('注册全部诊断与 Passport 强制工具', async () => {
    const plugin = await OmoSciPlugin({} as never);
    expect(Object.keys(plugin.tool ?? {}).sort()).toEqual([
      'passport-advance-stage',
      'passport-record-artifact',
      'passport-record-claim',
      'passport-record-gate',
      'passport-record-wisdom',
      'passport-status',
      'sci-doctor',
    ]);
    expect(typeof plugin['tool.execute.before']).toBe('function');
    await expect(
      plugin['tool.execute.before']!(
        { tool: 'edit', sessionID: 's', callID: 'c' },
        { args: { filePath: '/tmp/project/.omo-sci/passport.json' } },
      ),
    ).rejects.toThrow('禁止直接修改');
  });
});
