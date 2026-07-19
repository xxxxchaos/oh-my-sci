import { afterEach, describe, expect, it } from 'bun:test';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { sciStart } from '../src/commands/sci-start';
import { loadBoulder } from '../src/state/boulder';
import { loadPassport } from '../src/state/passport';

describe('sci-start', () => {
  let projectDir: string | undefined;

  afterEach(() => {
    if (projectDir) rmSync(projectDir, { recursive: true, force: true });
  });

  it('在干净项目中创建可恢复的 Passport 和 Boulder 会话', () => {
    projectDir = mkdtempSync(join(tmpdir(), 'omo-sci-start-'));

    const opening = sciStart(projectDir);

    expect(opening.length).toBeGreaterThan(0);
    expect(existsSync(join(projectDir, '.omo-sci', 'passport.json'))).toBe(true);
    expect(existsSync(join(projectDir, '.omo-sci', 'boulder.json'))).toBe(true);
    expect(loadPassport(projectDir).pipeline.current_stage).toBe('stage-0-intake');
    expect(loadBoulder(projectDir)?.current_stage).toBe('stage-0-intake');
  });
});
