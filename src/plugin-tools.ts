/**
 * omo-sci OpenCode 插件工具 — 把 Material Passport 的阶段推进 / 闸门检查
 * 从"提示词约定"升级为"工具调用强制"。
 *
 * 此前 Dubin/EBMer 靠提示词里的文字要求推进阶段、记录闸门结果，
 * AI 完全可能走神跳过检查而不被发现。这里注册的三个工具都是真正
 * 可失败的函数调用：前置条件不满足时 execute() 会 throw，OpenCode
 * 会把这次工具调用标记为失败并把错误信息返回给 AI ——不是"建议
 * 不要跳过"，而是"跳过了就会报错"。
 *
 * 所有校验逻辑复用 src/state/passport.ts 里已有且已测试的纯函数
 * （validatePassportPreconditions/updateStageState），本文件只负责
 * 把它们包装成 OpenCode tool() 定义，不重新实现校验规则。
 */

import { tool } from '@opencode-ai/plugin';
import {
  loadPassport,
  savePassport,
  stageToKey,
  updateStageState,
  validatePassportPreconditions,
} from './state/passport';
import type { AgentName, GateReport, MaterialPassport, StageId, StageState } from './types';

const STAGE_IDS = [
  'stage-0-intake',
  'stage-1-design',
  'stage-2-analysis',
  'stage-3-writing',
  'stage-4-submission',
  'stage-5-summary',
] as const;

const GATE_IDS = ['gate-i', 'gate-ii'] as const;

export const passportStatus = tool({
  description:
    '读取当前 Material Passport 的阶段进度、闸门状态、数据溯源标签。在决定是否可以推进阶段或记录闸门前，应先调用此工具确认现状。',
  args: {},
  async execute(_args, context) {
    const passport = loadPassport(context.directory);
    const lines: string[] = [
      `当前阶段: ${passport.pipeline.current_stage}`,
      `数据溯源标签: ${passport.data_provenance}`,
      '',
      '阶段状态:',
    ];
    for (const stage of STAGE_IDS) {
      const state = passport[stageToKey(stage)] as StageState;
      lines.push(`  ${stage}: ${state.status}`);
    }
    lines.push('', '闸门状态:');
    for (const gate of GATE_IDS) {
      const key = stageToKey(gate) as 'integrity_gate_1' | 'integrity_gate_2';
      const report = passport[key] as GateReport | undefined;
      lines.push(`  ${gate}: ${report?.status ?? 'not_run'}`);
    }
    return lines.join('\n');
  },
});

export const passportAdvanceStage = tool({
  description:
    '把 Material Passport 推进到目标研究阶段。会校验目标阶段的前置条件（如上一阶段是否已完成、完整性闸门是否已通过），不满足时直接拒绝执行并说明缺什么——不会静默跳过，也不能被提示词绕过。',
  args: {
    target_stage: tool.schema.enum(STAGE_IDS),
    summary: tool.schema
      .string()
      .min(1)
      .describe('当前阶段完成情况的简要总结（中文），会写入 wisdom 记录供后续复盘'),
  },
  async execute(args, context) {
    const dir = context.directory;
    const passport = loadPassport(dir);
    const targetStage = args.target_stage as StageId;
    const currentStage = passport.pipeline.current_stage;

    // "完成当前阶段"和"进入目标阶段"是同一次调用要做的两件事：
    // 目标阶段的前置条件（如"上一阶段已完成"）在这次调用之前必然
    // 不成立。所以先在内存里模拟"当前阶段已完成"，再据此校验目标
    // 阶段的前置条件——既不误拒正常的逐阶段推进，也不放行跳级
    // （因为只有 currentStage 被标记完成，中间被跳过的阶段依然是
    // pending，precondition 检查会照样失败）。
    const candidate: MaterialPassport = JSON.parse(JSON.stringify(passport));
    if (currentStage !== targetStage) {
      const currentKey = stageToKey(currentStage);
      if (currentKey !== 'integrity_gate_1' && currentKey !== 'integrity_gate_2') {
        (candidate[currentKey] as StageState).status = 'completed';
      }
    }

    const missing = validatePassportPreconditions(candidate, targetStage);
    if (missing.length > 0) {
      throw new Error(
        `无法推进到阶段 "${targetStage}"，前置条件未满足：\n- ${missing.join('\n- ')}`,
      );
    }

    if (currentStage !== targetStage) {
      updateStageState(dir, currentStage, {
        status: 'completed',
        completed_at: new Date().toISOString(),
      });
    }

    const updated = loadPassport(dir);
    updated.pipeline.current_stage = targetStage;

    const targetKey = stageToKey(targetStage);
    if (targetKey !== 'integrity_gate_1' && targetKey !== 'integrity_gate_2') {
      const targetState = updated[targetKey] as StageState;
      if (targetState.status === 'pending') {
        targetState.status = 'in_progress';
        targetState.started_at = new Date().toISOString();
      }
    }

    updated.wisdom_collected.push({
      type: 'decision',
      content: args.summary,
      created_at: new Date().toISOString(),
      agent: context.agent as AgentName,
    });

    savePassport(dir, updated);

    return `✅ 已推进到阶段 "${targetStage}"（上一阶段 "${currentStage}" 标记为已完成）。`;
  },
});

export const passportRecordGate = tool({
  description:
    '记录完整性闸门（闸门I/闸门II）的检查结果。会先校验是否满足进入该闸门的前置条件，不满足时拒绝执行。闸门记录为 failed 时，依赖该闸门通过的后续阶段（如论文撰写、投稿）将继续被 passport-advance-stage 拒绝，直到重新检查通过。',
  args: {
    gate: tool.schema.enum(GATE_IDS),
    status: tool.schema.enum(['passed', 'failed']),
    report_path: tool.schema.string().min(1).describe('完整性检查报告的项目内相对路径'),
    claim_sample_rate: tool.schema
      .union([tool.schema.literal(0.3), tool.schema.literal(1.0)])
      .describe('抽样率：0.3 为常规抽检，1.0 为全量核查（闸门II终审固定使用 1.0）'),
  },
  async execute(args, context) {
    const dir = context.directory;
    const gate = args.gate as StageId;
    const passport = loadPassport(dir);

    const missing = validatePassportPreconditions(passport, gate);
    if (missing.length > 0) {
      throw new Error(`无法记录 "${args.gate}"，前置条件未满足：\n- ${missing.join('\n- ')}`);
    }

    updateStageState(dir, gate, {
      status: args.status === 'passed' ? 'completed' : 'failed',
      completed_at: new Date().toISOString(),
    });

    const updated = loadPassport(dir);
    const key = stageToKey(gate) as 'integrity_gate_1' | 'integrity_gate_2';
    const report = updated[key] as GateReport;
    report.report_path = args.report_path;
    report.claim_sample_rate = args.claim_sample_rate;
    savePassport(dir, updated);

    if (args.status === 'failed') {
      return `⚠️ ${args.gate} 已记录为未通过。报告: ${args.report_path}。在问题解决并重新调用本工具记录 passed 之前，依赖此闸门的后续阶段会被拒绝。`;
    }
    return `✅ ${args.gate} 已通过并记录。报告: ${args.report_path}`;
  },
});
