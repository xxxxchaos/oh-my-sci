/**
 * Stage 生命周期钩子
 *
 * 阶段进入、退出、闸门检查、通过、失败。
 * 当前为轻量实现，记录 metadata，具体逻辑在 Phase 2 补全。
 */

import type { HookContext } from '../types';
import { on } from './registry';

on('stage:entry', async (ctx) => {
  ctx.metadata = {
    ...ctx.metadata,
    stage_entry: true,
    entered_stage: ctx.stage,
  };
});

on('stage:exit', async (ctx) => {
  ctx.metadata = {
    ...ctx.metadata,
    stage_exit: true,
    exited_stage: ctx.stage,
  };
});

on('stage:gate_check', async (ctx) => {
  ctx.metadata = {
    ...ctx.metadata,
    gate_check: true,
    checked_stage: ctx.stage,
  };
});

on('stage:gate_pass', async (ctx) => {
  ctx.metadata = {
    ...ctx.metadata,
    gate_pass: true,
    passed_stage: ctx.stage,
  };
});

on('stage:gate_fail', async (ctx) => {
  ctx.metadata = {
    ...ctx.metadata,
    gate_fail: true,
    failed_stage: ctx.stage,
  };
});
