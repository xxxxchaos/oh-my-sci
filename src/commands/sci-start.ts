/**
 * sci-start 命令处理器 — Phase 2 入口
 *
 * 启动 Dubin 研究引擎：创建/加载 Passport、创建 Boulder 会话、
 * 加载研究者画像、初始化访谈状态机并返回开场提示。
 */

import { createInterview, getNextPrompt } from '../orchestrator/interview';
import { createBoulder, saveBoulder } from '../state/boulder';
import { loadPassport, savePassport } from '../state/passport';
import { loadProfile } from '../state/evolution';

export function sciStart(projectDir?: string): string {
  const dir = projectDir ?? process.cwd();

  // Create or load passport
  const passport = loadPassport(dir);
  const isNew = passport.stage_0_intake.status === 'pending';

  if (isNew) {
    passport.pipeline.current_stage = 'stage-0-intake';
    passport.project.title = passport.project.title || '新研究';
  }

  // Create fresh boulder session
  const boulder = createBoulder(
    passport.project.title || '新研究',
    isNew ? 'stage-0-intake' : passport.pipeline.current_stage,
    'GREETING',
  );
  saveBoulder(dir, boulder);
  savePassport(dir, passport);

  // Load researcher profile for personalized greeting
  const profile = loadProfile();

  // Start interview
  const interview = createInterview();
  const openingPrompt = getNextPrompt(interview);

  // Add personalization if profile exists
  if (profile.total_projects_completed > 0) {
    return `欢迎回来！这是你的第 ${profile.total_projects_completed + 1} 个研究项目。\n\n${openingPrompt}`;
  }
  return openingPrompt;
}
