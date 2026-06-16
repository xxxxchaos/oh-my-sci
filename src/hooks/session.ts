/**
 * Session 生命周期钩子
 *
 * 管理会话启动、结束、中断恢复。
 */

import type { HookContext } from '../types';
import { loadPassport, savePassport } from '../state/passport';
import { loadBoulder, saveBoulder, createBoulder } from '../state/boulder';
import { on } from './registry';

on('session:start', async (ctx) => {
  const dir = process.cwd();
  ctx.passport = loadPassport(dir);
  const existing = loadBoulder(dir);
  if (existing) {
    ctx.boulder = existing;
    ctx.metadata = { ...ctx.metadata, resumed: true, resume_stage: existing.current_stage };
  } else {
    const b = createBoulder(ctx.passport.project.title || '未命名研究', ctx.passport.pipeline.current_stage, 'start');
    saveBoulder(dir, b);
    ctx.boulder = b;
    ctx.metadata = { ...ctx.metadata, resumed: false };
  }
});

on('session:end', async (ctx) => {
  const dir = process.cwd();
  if (ctx.passport) savePassport(dir, ctx.passport);
  if (ctx.boulder) saveBoulder(dir, ctx.boulder);
});

on('session:resume', async (ctx) => {
  const boulder = loadBoulder(process.cwd());
  if (!boulder) {
    ctx.metadata = { ...ctx.metadata, resume_error: 'No saved session found.' };
    return;
  }
  ctx.boulder = boulder;
  ctx.passport = loadPassport(process.cwd());
  ctx.metadata = {
    ...ctx.metadata,
    resume_stage: boulder.current_stage,
    pending_tasks: boulder.pending_tasks.filter(t => t.status !== 'completed'),
  };
});

on('session:interrupt', async (ctx) => {
  const dir = process.cwd();
  if (ctx.passport) savePassport(dir, ctx.passport);
  if (ctx.boulder) saveBoulder(dir, ctx.boulder);
});
