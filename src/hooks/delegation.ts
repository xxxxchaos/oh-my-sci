/**
 * Delegation 生命周期钩子
 *
 * 子 agent 委派前、后、出错。
 * 当前为轻量实现，记录 metadata，具体逻辑在 Phase 2 补全。
 */

import type { HookContext } from '../types';
import { on } from './registry';

on('delegate:pre', async (ctx) => {
  ctx.metadata = {
    ...ctx.metadata,
    delegate_pre: true,
    delegate_agent: ctx.agent,
  };
});

on('delegate:post', async (ctx) => {
  ctx.metadata = {
    ...ctx.metadata,
    delegate_post: true,
    delegate_agent: ctx.agent,
  };
});

on('delegate:error', async (ctx) => {
  ctx.metadata = {
    ...ctx.metadata,
    delegate_error: true,
    delegate_agent: ctx.agent,
  };
});
