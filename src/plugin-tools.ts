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
  computeStageHash,
  savePassport,
  stageToKey,
  updateStageState,
  validatePassportPreconditions,
  validatePassportSchema,
} from './state/passport';
import {
  checksumFile,
  normalizeArtifactPath,
  recordStageArtifact,
  validateStageArtifacts,
} from './state/artifacts';
import type {
  AgentName,
  ClaimEvidenceMap,
  GateReport,
  MaterialPassport,
  StageId,
  StageState,
} from './types';

const STAGE_IDS = [
  'stage-0-intake',
  'stage-1-design',
  'stage-2-analysis',
  'stage-3-writing',
  'stage-4-submission',
  'stage-5-summary',
] as const;

const GATE_IDS = ['gate-i', 'gate-ii'] as const;
const PIPELINE_IDS = [...STAGE_IDS, ...GATE_IDS] as const;

function isGate(stage: StageId): stage is (typeof GATE_IDS)[number] {
  return (GATE_IDS as readonly string[]).includes(stage);
}

const EVIDENCE_TYPES = ['analysis_result', 'literature', 'guideline', 'journal_instruction'] as const;
const VERIFICATION_STATUSES = ['verified', 'missing', 'conflict', 'not_applicable'] as const;
const WISDOM_TYPES = ['learning', 'decision', 'gotcha', 'problem'] as const;

function assertPassportSchema(passport: MaterialPassport): void {
  const validation = validatePassportSchema(passport);
  if (!validation.valid) {
    throw new Error(
      `Material Passport schema 无效，已停止写入以避免扩大损坏：\n- ${validation.errors.join('\n- ')}`,
    );
  }
}

/**
 * 检查 claim_evidence_map 是否健康，可以支撑一次闸门"通过"的记录。
 *
 * 规则：
 * - 至少要有一条记录（闸门要求抽样/全量验证关键主张，一条都没记录
 *   说明验证工作根本没通过工具做，不能只凭 EBMer 口头说"都验证过了"）
 * - 不能有任何 verification_status 为 missing/conflict 的记录
 *   （EBMer 发现了问题却还想把闸门记成 passed，这里会拦下来）
 */
function checkClaimEvidenceHealth(passport: MaterialPassport): string[] {
  const issues: string[] = [];
  if (passport.claim_evidence_map.length === 0) {
    issues.push('claim_evidence_map 为空——没有通过 passport-record-claim 记录任何主张验证结果');
    return issues;
  }
  const bad = passport.claim_evidence_map.filter(
    (c) => c.verification_status === 'missing' || c.verification_status === 'conflict',
  );
  if (bad.length > 0) {
    issues.push(
      `存在 ${bad.length} 条未通过验证的主张：${bad.map((c) => `${c.claim_id}(${c.verification_status})`).join(', ')}`,
    );
  }
  return issues;
}

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
    target_stage: tool.schema.enum(PIPELINE_IDS),
    summary: tool.schema
      .string()
      .min(1)
      .describe('当前阶段完成情况的简要总结（中文），会写入 wisdom 记录供后续复盘'),
    user_confirmation: tool.schema
      .string()
      .min(1)
      .optional()
      .describe('离开普通阶段时必填：用户明确同意推进的原话或忠实摘要；从已通过的闸门进入下一阶段时不填'),
    risks_acknowledged: tool.schema
      .array(tool.schema.string())
      .optional()
      .describe('签核时已向用户说明并获知悉的风险；没有风险时传空数组'),
  },
  async execute(args, context) {
    const dir = context.directory;
    const passport = loadPassport(dir);
    assertPassportSchema(passport);
    const targetStage = args.target_stage as StageId;
    const currentStage = passport.pipeline.current_stage;

    if (currentStage === targetStage) {
      return `当前已处于阶段 "${targetStage}"，未重复推进。`;
    }

    if (!isGate(currentStage) && !args.user_confirmation) {
      throw new Error(
        `无法离开阶段 "${currentStage}"：缺少用户明确签核。请先向用户说明阶段结论和风险，并把用户确认原话传入 user_confirmation。`,
      );
    }

    if (currentStage !== targetStage) {
      const artifactErrors = validateStageArtifacts(dir, passport, currentStage);
      if (artifactErrors.length > 0) {
        throw new Error(
          `无法完成阶段 "${currentStage}"，产物校验未通过：\n- ${artifactErrors.join('\n- ')}`,
        );
      }
    }

    // "完成当前阶段"和"进入目标阶段"是同一次调用要做的两件事：
    // 目标阶段的前置条件（如"上一阶段已完成"）在这次调用之前必然
    // 不成立。所以先在内存里模拟"当前阶段已完成"，再据此校验目标
    // 阶段的前置条件——既不误拒正常的逐阶段推进，也不放行跳级
    // （因为只有 currentStage 被标记完成，中间被跳过的阶段依然是
    // pending，precondition 检查会照样失败）。
    const candidate: MaterialPassport = JSON.parse(JSON.stringify(passport));
    if (currentStage !== targetStage) {
      const currentKey = stageToKey(currentStage);
      if (!isGate(currentStage)) {
        (candidate[currentKey] as StageState).status = 'completed';
      }
    }

    const missing = validatePassportPreconditions(candidate, targetStage);
    if (missing.length > 0) {
      throw new Error(
        `无法推进到阶段 "${targetStage}"，前置条件未满足：\n- ${missing.join('\n- ')}`,
      );
    }

    if (!isGate(currentStage)) {
      updateStageState(dir, currentStage, {
        status: 'completed',
        completed_at: new Date().toISOString(),
      });
    }

    const updated = loadPassport(dir);
    if (!isGate(currentStage)) {
      const completedKey = stageToKey(currentStage);
      const completedState = updated[completedKey] as StageState;
      completedState.hash = computeStageHash(completedState);
    }
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
    if (!isGate(currentStage)) {
      updated.signoff_records.push({
        stage: currentStage,
        signed_at: new Date().toISOString(),
        summary: args.summary,
        risks_acknowledged: args.risks_acknowledged ?? [],
        user_confirmation: args.user_confirmation!,
      });
    }

    savePassport(dir, updated);

    return `✅ 已推进到阶段 "${targetStage}"（上一阶段 "${currentStage}" 标记为已完成）。`;
  },
});

export const passportRecordArtifact = tool({
  description:
    '验证一个真实存在的阶段产物并登记到 Material Passport。只接受项目内相对路径；文件必须存在、非空且为普通文件。工具会计算 SHA-256，阶段推进时会重新核对。没有成功调用本工具，不得向用户宣称文件已完成。',
  args: {
    path: tool.schema.string().min(1).describe('项目根目录内的相对路径，如 Study_Blueprint.md'),
    description: tool.schema.string().optional().describe('产物用途的简短说明'),
  },
  async execute(args, context) {
    const passport = loadPassport(context.directory);
    assertPassportSchema(passport);
    const artifact = recordStageArtifact(
      context.directory,
      passport,
      args.path,
      args.description,
    );
    return `已验证并登记产物: ${artifact.path}\nSHA-256: ${artifact.checksum}`;
  },
});

export const passportRecordClaim = tool({
  description:
    '记录一条主张（论文中的关键陈述、或一条参考文献引用）的证据验证结果，写入 Material Passport 的 claim_evidence_map。EBMer 做 12 模式检查/抽样验证主张时、Writer 做参考文献审计时都应该调用——参考文献审计用 evidence_type: "literature"，claim_id 可以用 PMID/DOI 之类的引用标识。重复调用同一个 claim_id 会更新而不是重复添加。',
  args: {
    claim_id: tool.schema.string().min(1).describe('主张的唯一标识，如 "C1" 或引用的 PMID/DOI'),
    claim_text: tool.schema.string().min(1).describe('主张的原文或引用文本'),
    manuscript_location: tool.schema.string().optional().describe('在稿件中的位置，如 "Discussion 第 2 段"'),
    evidence_type: tool.schema.enum(EVIDENCE_TYPES),
    evidence_ids: tool.schema.array(tool.schema.string()).describe('支撑证据的 ID 列表，如分析结果行号、PMID、指南编号'),
    verification_status: tool.schema.enum(VERIFICATION_STATUSES),
  },
  async execute(args, context) {
    const dir = context.directory;
    const passport = loadPassport(dir);
    assertPassportSchema(passport);

    const entry: ClaimEvidenceMap = {
      claim_id: args.claim_id,
      claim_text: args.claim_text,
      manuscript_location: args.manuscript_location,
      evidence_type: args.evidence_type,
      evidence_ids: args.evidence_ids,
      verification_status: args.verification_status,
    };

    const existingIndex = passport.claim_evidence_map.findIndex((c) => c.claim_id === args.claim_id);
    if (existingIndex >= 0) {
      passport.claim_evidence_map[existingIndex] = entry;
    } else {
      passport.claim_evidence_map.push(entry);
    }

    savePassport(dir, passport);

    const total = passport.claim_evidence_map.length;
    return `✅ 已记录主张 "${args.claim_id}"（${args.verification_status}）。当前 claim_evidence_map 共 ${total} 条记录。`;
  },
});

export const passportRecordGate = tool({
  description:
    '记录完整性闸门（闸门I/闸门II）的检查结果。会先校验是否满足进入该闸门的前置条件，不满足时拒绝执行。记录 passed 时还会检查 claim_evidence_map：必须至少有一条记录、且不能有 missing/conflict 状态的主张，否则拒绝——不能只凭口头说"都验证过了"就把闸门记成通过。闸门记录为 failed 时，依赖该闸门通过的后续阶段（如论文撰写、投稿）将继续被 passport-advance-stage 拒绝，直到重新检查通过。',
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
    assertPassportSchema(passport);

    if (passport.pipeline.current_stage !== gate) {
      throw new Error(
        `无法记录 "${args.gate}"：当前流程位于 "${passport.pipeline.current_stage}"。请先用 passport-advance-stage 正式进入该闸门。`,
      );
    }

    const missing = validatePassportPreconditions(passport, gate);
    if (missing.length > 0) {
      throw new Error(`无法记录 "${args.gate}"，前置条件未满足：\n- ${missing.join('\n- ')}`);
    }

    if (args.status === 'passed') {
      const claimIssues = checkClaimEvidenceHealth(passport);
      if (claimIssues.length > 0) {
        throw new Error(
          `无法把 "${args.gate}" 记录为 passed，主张验证不完整：\n- ${claimIssues.join('\n- ')}\n请先用 passport-record-claim 记录主张验证结果。`,
        );
      }
    }

    const normalizedReport = normalizeArtifactPath(dir, args.report_path);
    const reportChecksum = checksumFile(normalizedReport.absolutePath);

    updateStageState(dir, gate, {
      status: args.status === 'passed' ? 'completed' : 'failed',
      completed_at: new Date().toISOString(),
    });

    const updated = loadPassport(dir);
    const key = stageToKey(gate) as 'integrity_gate_1' | 'integrity_gate_2';
    const report = updated[key] as GateReport;
    report.report_path = normalizedReport.relativePath;
    report.report_checksum = reportChecksum;
    report.claim_sample_rate = args.claim_sample_rate;
    savePassport(dir, updated);

    if (args.status === 'failed') {
      return `⚠️ ${args.gate} 已记录为未通过。报告: ${normalizedReport.relativePath}。在问题解决并重新调用本工具记录 passed 之前，依赖此闸门的后续阶段会被拒绝。`;
    }
    return `✅ ${args.gate} 已通过并记录。报告: ${normalizedReport.relativePath}`;
  },
});

export const passportRecordWisdom = tool({
  description:
    '把本阶段真正值得跨会话保留的方法经验、决策、踩坑或问题写入 Material Passport。不要用它记录普通进度流水账。',
  args: {
    type: tool.schema.enum(WISDOM_TYPES),
    content: tool.schema.string().min(1).describe('可复用的经验、决策理由、踩坑或问题及处理方式'),
  },
  async execute(args, context) {
    const passport = loadPassport(context.directory);
    assertPassportSchema(passport);
    passport.wisdom_collected.push({
      type: args.type,
      content: args.content,
      created_at: new Date().toISOString(),
      agent: context.agent as AgentName,
    });
    savePassport(context.directory, passport);
    return `已记录 ${args.type} wisdom。当前共 ${passport.wisdom_collected.length} 条。`;
  },
});
