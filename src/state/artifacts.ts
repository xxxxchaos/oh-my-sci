import { createHash } from 'node:crypto';
import { existsSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { isAbsolute, relative, resolve } from 'node:path';
import type { MaterialPassport, StageArtifact, StageId, StageState } from '../types';
import { computeStageHash, savePassport, stageToKey } from './passport';

export const REQUIRED_STAGE_ARTIFACTS: Partial<Record<StageId, readonly string[]>> = {
  'stage-1-design': [
    'Study_Blueprint.md',
    'Literature_Matrix.md',
    'Search_Plan.md',
    'Review_Reports/Stage_1_IRBer_Report.md',
  ],
  'stage-2-analysis': ['SAP.md', 'Analysis_Summary.md'],
  'stage-3-writing': [
    'Manuscript_Final.md',
    'Review_Reports/EBMer_Review.md',
    'Review_Reports/Polisher_Review.md',
  ],
  'stage-4-submission': [
    'submission_package/Cover_Letter.md',
    'submission_package/Checklist.md',
  ],
  'stage-5-summary': ['Process_Summary.md'],
};

function stageState(passport: MaterialPassport, stage: StageId): StageState {
  const key = stageToKey(stage);
  if (key === 'integrity_gate_1' || key === 'integrity_gate_2') {
    throw new Error(`闸门 ${stage} 不登记阶段产物`);
  }
  return passport[key] as StageState;
}

export function normalizeArtifactPath(projectDir: string, artifactPath: string): {
  relativePath: string;
  absolutePath: string;
} {
  if (!artifactPath.trim()) throw new Error('产物路径不能为空');
  if (isAbsolute(artifactPath)) throw new Error('产物路径必须是项目内相对路径');

  const root = realpathSync(resolve(projectDir));
  const absolutePath = resolve(root, artifactPath);
  const relativePath = relative(root, absolutePath).replaceAll('\\', '/');
  if (relativePath === '..' || relativePath.startsWith('../')) {
    throw new Error('产物路径不能越过项目根目录');
  }
  if (!existsSync(absolutePath)) throw new Error(`产物不存在: ${relativePath}`);

  const realArtifact = realpathSync(absolutePath);
  const realRelative = relative(root, realArtifact).replaceAll('\\', '/');
  if (realRelative === '..' || realRelative.startsWith('../')) {
    throw new Error('产物真实路径不能越过项目根目录');
  }

  const stat = statSync(realArtifact);
  if (!stat.isFile()) throw new Error(`产物不是普通文件: ${relativePath}`);
  if (stat.size === 0) throw new Error(`产物为空文件: ${relativePath}`);
  return { relativePath, absolutePath: realArtifact };
}

export function checksumFile(path: string): string {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

export function recordStageArtifact(
  projectDir: string,
  passport: MaterialPassport,
  path: string,
  description?: string,
): StageArtifact {
  const state = stageState(passport, passport.pipeline.current_stage);
  const normalized = normalizeArtifactPath(projectDir, path);
  const artifact: StageArtifact = {
    path: normalized.relativePath,
    checksum: checksumFile(normalized.absolutePath),
    ...(description ? { description } : {}),
  };

  const index = state.artifacts.findIndex(item => item.path === artifact.path);
  if (index >= 0) state.artifacts[index] = artifact;
  else state.artifacts.push(artifact);
  state.hash = computeStageHash(state);
  savePassport(projectDir, passport);
  return artifact;
}

export function validateStageArtifacts(
  projectDir: string,
  passport: MaterialPassport,
  stage: StageId,
): string[] {
  if (stage === 'gate-i' || stage === 'gate-ii') return [];
  const state = stageState(passport, stage);
  const errors: string[] = [];

  for (const requiredPath of REQUIRED_STAGE_ARTIFACTS[stage] ?? []) {
    if (!state.artifacts.some(item => item.path === requiredPath)) {
      errors.push(`缺少已登记的必需产物: ${requiredPath}`);
    }
  }

  for (const artifact of state.artifacts) {
    try {
      const normalized = normalizeArtifactPath(projectDir, artifact.path);
      if (checksumFile(normalized.absolutePath) !== artifact.checksum) {
        errors.push(`产物登记后已发生变化，请重新登记: ${artifact.path}`);
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }
  return errors;
}
