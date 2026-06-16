/**
 * Quality 生命周期钩子
 *
 * 循环检测、上下文压缩、Token 用量警告。
 */

import type { HookContext } from '../types';
import { loadConfig } from '../config';
import { on } from './registry';

on('quality:loop_detect', async (ctx) => {
  ctx.metadata = {
    ...ctx.metadata,
    loop_detected: true,
    loop_stage: ctx.stage,
  };
});

on('quality:compaction_pre', async (ctx) => {
  ctx.metadata = {
    ...ctx.metadata,
    compaction_pre: true,
    compaction_stage: ctx.stage,
    preserved_constraints: ['stage_mandatory_fields', 'gate_requirements', 'artifact_integrity'],
  };
});

on('quality:compaction_post', async (ctx) => {
  ctx.metadata = {
    ...ctx.metadata,
    compaction_post: true,
    compaction_stage: ctx.stage,
    constraints_intact: true,
  };
});

on('quality:token_warn', async (ctx) => {
  const config = loadConfig();
  const usage = config.usage;
  const percentage = usage.token_quota > 0
    ? Math.round((usage.current_usage / usage.token_quota) * 10000) / 100
    : 0;
  ctx.metadata = {
    ...ctx.metadata,
    token_warn: true,
    current_usage: usage.current_usage,
    token_quota: usage.token_quota,
    usage_percentage: percentage,
  };
});
