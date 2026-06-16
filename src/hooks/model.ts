/**
 * Model 生命周期钩子
 *
 * 模型选择、降级回退。
 * 当前为轻量实现，记录 metadata，具体逻辑在 Phase 2 补全。
 */

import type { HookContext } from '../types';
import { on } from './registry';

on('model:select', async (ctx) => {
  ctx.metadata = {
    ...ctx.metadata,
    model_select: true,
  };
});

on('model:fallback', async (ctx) => {
  ctx.metadata = {
    ...ctx.metadata,
    model_fallback: true,
  };
});
