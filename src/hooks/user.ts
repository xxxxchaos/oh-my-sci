/**
 * User 生命周期钩子
 *
 * 用户签核和澄清请求。
 */

import type { HookContext } from '../types';
import { on } from './registry';

on('user:signoff', async (ctx) => {
  ctx.metadata = {
    ...ctx.metadata,
    awaiting_signoff: true,
    signoff_stage: ctx.stage,
  };
});

on('user:clarify', async (ctx) => {
  ctx.metadata = {
    ...ctx.metadata,
    awaiting_clarification: true,
    clarify_stage: ctx.stage,
  };
});
