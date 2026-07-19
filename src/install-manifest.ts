import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import packageJson from '../package.json';

export const OMO_SCI_VERSION = packageJson.version;
export const INSTALL_MANIFEST_NAME = 'omo-sci-install.json';

export interface InstallManifest {
  package_version: string;
  installed_at: string;
  install_root: string;
  template_schema: number;
}

export interface EffectiveInstall {
  root: string;
  inherited: boolean;
  manifest: InstallManifest | null;
  legacy: boolean;
}

export function installManifestPath(projectDir: string): string {
  return join(resolve(projectDir), '.opencode', INSTALL_MANIFEST_NAME);
}

export function writeInstallManifest(projectDir: string): InstallManifest {
  const root = resolve(projectDir);
  const manifest: InstallManifest = {
    package_version: OMO_SCI_VERSION,
    installed_at: new Date().toISOString(),
    install_root: root,
    template_schema: 3,
  };
  writeFileSync(installManifestPath(root), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  return manifest;
}

export function readInstallManifest(projectDir: string): InstallManifest | null {
  const path = installManifestPath(projectDir);
  if (!existsSync(path)) return null;
  try {
    const value = JSON.parse(readFileSync(path, 'utf8')) as InstallManifest;
    if (!value.package_version || !value.install_root || typeof value.template_schema !== 'number') {
      return null;
    }
    return value;
  } catch {
    return null;
  }
}

export function findEffectiveInstall(startDir: string): EffectiveInstall | null {
  const start = resolve(startDir);
  let current = start;

  while (true) {
    const manifest = readInstallManifest(current);
    if (manifest) {
      return { root: current, inherited: current !== start, manifest, legacy: false };
    }

    const legacyDubin = join(current, '.opencode', 'agents', 'dubin.md');
    const legacyStart = join(current, '.opencode', 'commands', 'sci-start.md');
    if (existsSync(legacyDubin) && existsSync(legacyStart)) {
      return { root: current, inherited: current !== start, manifest: null, legacy: true };
    }

    const parent = dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}
