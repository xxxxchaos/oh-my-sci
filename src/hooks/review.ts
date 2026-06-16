/**
 * Review 生命周期钩子
 *
 * 审稿 Phase 1（双盲）和 Phase 2（可见作者信息）。
 */

import type { HookContext } from '../types';
import { on } from './registry';

on('review:phase1', async (ctx) => {
  ctx.metadata = {
    ...ctx.metadata,
    review_phase: 'phase1',
    paper_visible: false,
  };
});

on('review:phase2', async (ctx) => {
  ctx.metadata = {
    ...ctx.metadata,
    review_phase: 'phase2',
    paper_visible: true,
  };
});
