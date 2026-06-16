export interface CheckResult {
  category: string;
  name: string;
  status: 'pass' | 'fail' | 'warn' | 'unknown';
  message: string;
}

function statusIcon(status: CheckResult['status']): string {
  switch (status) { case 'pass': return '✓'; case 'fail': return '✗'; case 'warn': return '⚠'; default: return '?'; }
}

export function formatDoctorReport(results: CheckResult[]): string {
  const lines: string[] = [];
  lines.push('╭─────────────────────────────────────────╮');
  lines.push('│        omo-sci 环境诊断报告              │');
  lines.push(`│        ${new Date().toISOString().slice(0, 16).replace('T', ' ')}                  │`);
  lines.push('╰─────────────────────────────────────────╯');
  lines.push('');

  const grouped = new Map<string, CheckResult[]>();
  for (const r of results) { const list = grouped.get(r.category) ?? []; list.push(r); grouped.set(r.category, list); }

  let passCount = 0, failCount = 0, warnCount = 0;
  for (const [category, items] of grouped) {
    const catPass = items.filter(i => i.status === 'pass').length;
    lines.push(`${category} (${catPass}/${items.length} 就绪)`);
    for (const item of items) {
      lines.push(`  ${statusIcon(item.status)} ${item.name.padEnd(30)} ${item.message}`);
      switch (item.status) { case 'pass': passCount++; break; case 'fail': failCount++; break; case 'warn': warnCount++; break; }
    }
    lines.push('');
  }
  const total = results.length;
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  lines.push(` 总体: ${passCount}/${total} 项就绪`);
  if (failCount > 0) lines.push(` ⚠ ${failCount} 项缺失，请按上述建议修复`);
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  return lines.join('\n');
}
