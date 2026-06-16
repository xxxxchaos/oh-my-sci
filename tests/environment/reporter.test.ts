/**
 * reporter 模块测试
 */
import { describe, it, expect } from 'bun:test';
import { formatDoctorReport } from '../../src/environment/reporter';
import type { CheckResult } from '../../src/environment/reporter';

describe('formatDoctorReport', () => {
  it('输出包含标题头', () => {
    const results: CheckResult[] = [];
    const report = formatDoctorReport(results);

    expect(report).toContain('╭─────────────────────────────────────────╮');
    expect(report).toContain('omo-sci 环境诊断报告');
    expect(report).toContain('╰─────────────────────────────────────────╯');
  });

  it('包含 ✓ / ✗ 符号', () => {
    const results: CheckResult[] = [
      { category: 'API', name: '分类: fast-search', status: 'pass', message: '1 模型。主: test-model' },
      { category: 'API', name: '分类: deep-reasoning', status: 'fail', message: '无已配置模型。' },
    ];
    const report = formatDoctorReport(results);

    expect(report).toContain('✓');
    expect(report).toContain('✗');
  });

  it('包含 ⚠ 警告符号', () => {
    const results: CheckResult[] = [
      { category: 'Software', name: 'R', status: 'warn', message: '运行 `which r` 验证。' },
    ];
    const report = formatDoctorReport(results);

    expect(report).toContain('⚠');
  });

  it('包含 ? 未知符号', () => {
    const results: CheckResult[] = [
      { category: 'MCP', name: 'unified_search', status: 'unknown', message: '需 OpenCode host runtime 检查' },
    ];
    const report = formatDoctorReport(results);

    expect(report).toContain('?');
  });

  it('包含正确的计数 (全部 pass)', () => {
    const results: CheckResult[] = [
      { category: 'API', name: 'fast-search', status: 'pass', message: 'OK' },
      { category: 'API', name: 'deep-reasoning', status: 'pass', message: 'OK' },
    ];
    const report = formatDoctorReport(results);

    expect(report).toContain('总体: 2/2 项就绪');
    expect(report).not.toContain('项缺失');
  });

  it('包含正确的计数 (存在 fail)', () => {
    const results: CheckResult[] = [
      { category: 'API', name: 'fast-search', status: 'pass', message: 'OK' },
      { category: 'API', name: 'deep-reasoning', status: 'fail', message: '无已配置模型。' },
    ];
    const report = formatDoctorReport(results);

    expect(report).toContain('总体: 1/2 项就绪');
    expect(report).toContain('1 项缺失');
  });

  it('按 category 分组显示', () => {
    const results: CheckResult[] = [
      { category: 'MCP', name: 'tool_a', status: 'pass', message: 'OK' },
      { category: 'API', name: 'classifier', status: 'pass', message: 'OK' },
    ];
    const report = formatDoctorReport(results);

    expect(report).toContain('MCP (1/1 就绪)');
    expect(report).toContain('API (1/1 就绪)');
  });

  it('混合所有状态时计数正确', () => {
    const results: CheckResult[] = [
      { category: 'A', name: 'pass', status: 'pass', message: 'ok' },
      { category: 'A', name: 'fail', status: 'fail', message: 'no' },
      { category: 'A', name: 'warn', status: 'warn', message: 'maybe' },
      { category: 'A', name: 'unknown', status: 'unknown', message: '?' },
    ];
    const report = formatDoctorReport(results);

    expect(report).toContain('总体: 1/4 项就绪');
    expect(report).toContain('1 项缺失');
  });
});
