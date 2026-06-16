/**
 * Wisdom system — 跨会话经验积累
 *
 * 4 类 wisdom：learning / decision / gotcha / problem
 * 持久化到 .omo-sci/wisdom/*.md 文件，支持增量追加。
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

export interface WisdomEntry {
  type: 'learning' | 'decision' | 'gotcha' | 'problem';
  content: string;
  source: string;  // which agent/task produced this
  timestamp: string;
}

export function loadWisdom(projectDir: string): { learnings: WisdomEntry[]; decisions: WisdomEntry[]; gotchas: WisdomEntry[]; problems: WisdomEntry[] } {
  const dir = join(projectDir, '.omo-sci', 'wisdom');
  return {
    learnings: parseWisdomFile(dir, 'learnings.md'),
    decisions: parseWisdomFile(dir, 'decisions.md'),
    gotchas: parseWisdomFile(dir, 'gotchas.md'),
    problems: parseWisdomFile(dir, 'problems.md'),
  };
}

export function saveWisdomEntry(projectDir: string, entry: WisdomEntry): void {
  const dir = join(projectDir, '.omo-sci', 'wisdom');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  const fileName = `${entry.type}s.md`;
  const filePath = join(dir, fileName);
  const line = `- [${entry.timestamp.slice(0, 10)}] [${entry.source}] ${entry.content}\n`;

  if (existsSync(filePath)) {
    writeFileSync(filePath, line, { flag: 'a' });
  } else {
    writeFileSync(filePath, `# ${entry.type}s\n\n${line}`);
  }
}

function parseWisdomFile(dir: string, fileName: string): WisdomEntry[] {
  const path = join(dir, fileName);
  if (!existsSync(path)) return [];
  const content = readFileSync(path, 'utf-8');
  const entries: WisdomEntry[] = [];
  for (const line of content.split('\n')) {
    const match = line.match(/^- \[(\d{4}-\d{2}-\d{2})\] \[([^\]]+)\] (.+)$/);
    if (match) {
      entries.push({
        type: fileName.replace('.md', '').replace('s', '') as WisdomEntry['type'],
        content: match[3] ?? '',
        source: match[2] ?? '',
        timestamp: match[1] ?? '',
      });
    }
  }
  return entries;
}
