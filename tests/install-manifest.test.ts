import { afterEach, describe, expect, it } from 'bun:test';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  findEffectiveInstall,
  OMO_SCI_VERSION,
  readInstallManifest,
  writeInstallManifest,
} from '../src/install-manifest';
import { checkProjectInstall } from '../src/doctor';
import {
  RUNTIME_PLUGIN_MARKER,
  runtimePluginPath,
} from '../src/runtime-plugin';

describe('install manifest', () => {
  let root = '';

  afterEach(() => {
    if (root) rmSync(root, { recursive: true, force: true });
  });

  it('写入并发现当前目录安装', () => {
    root = mkdtempSync(join(tmpdir(), 'omo-sci-manifest-'));
    mkdirSync(join(root, '.opencode'), { recursive: true });
    writeInstallManifest(root);
    mkdirSync(join(root, '.opencode', 'plugins'), { recursive: true });
    writeFileSync(
      runtimePluginPath(root),
      `// ${RUNTIME_PLUGIN_MARKER}\n// package-version: ${OMO_SCI_VERSION}\n`,
    );

    expect(readInstallManifest(root)?.package_version).toBe(OMO_SCI_VERSION);
    const effective = findEffectiveInstall(root);
    expect(effective?.root).toBe(root);
    expect(effective?.inherited).toBe(false);
    expect(checkProjectInstall(root).status).toBe('ok');
  });

  it('缺少运行时插件时明确报错，而不是把 CLI/模板安装误报为可用', () => {
    root = mkdtempSync(join(tmpdir(), 'omo-sci-manifest-'));
    mkdirSync(join(root, '.opencode'), { recursive: true });
    writeInstallManifest(root);

    const check = checkProjectInstall(root);
    expect(check.status).toBe('error');
    expect(check.message).toContain('Passport 工具不会注册');
  });

  it('子目录能识别继承父目录安装', () => {
    root = mkdtempSync(join(tmpdir(), 'omo-sci-manifest-'));
    const child = join(root, 'projects', '00');
    mkdirSync(join(root, '.opencode'), { recursive: true });
    mkdirSync(child, { recursive: true });
    writeInstallManifest(root);

    const effective = findEffectiveInstall(child);
    expect(effective?.root).toBe(root);
    expect(effective?.inherited).toBe(true);
    expect(checkProjectInstall(child).message).toContain('继承父目录');
  });

  it('版本不一致时 doctor 警告', () => {
    root = mkdtempSync(join(tmpdir(), 'omo-sci-manifest-'));
    mkdirSync(join(root, '.opencode'), { recursive: true });
    writeInstallManifest(root);
    const manifestPath = join(root, '.opencode', 'omo-sci-install.json');
    const manifest = readInstallManifest(root)!;
    writeFileSync(manifestPath, JSON.stringify({ ...manifest, package_version: '0.1.0' }));

    const check = checkProjectInstall(root);
    expect(check.status).toBe('warn');
    expect(check.message).toContain('模板 0.1.0');
    expect(check.message).toContain(`CLI ${OMO_SCI_VERSION}`);
  });

  it('无清单旧模板会被识别并提示更新', () => {
    root = mkdtempSync(join(tmpdir(), 'omo-sci-manifest-'));
    mkdirSync(join(root, '.opencode', 'agents'), { recursive: true });
    mkdirSync(join(root, '.opencode', 'commands'), { recursive: true });
    writeFileSync(join(root, '.opencode', 'agents', 'dubin.md'), 'legacy');
    writeFileSync(join(root, '.opencode', 'commands', 'sci-start.md'), 'legacy');

    const check = checkProjectInstall(root);
    expect(check.status).toBe('warn');
    expect(check.message).toContain('无版本清单的旧安装');
  });
});
