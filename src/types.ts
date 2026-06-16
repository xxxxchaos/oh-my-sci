/**
 * omo-sci 共享类型定义
 *
 * 这是整个项目的类型基础。纯类型文件，不 import 任何有副作用的模块。
 */

// ====================================================================
// Agent & Category Types
// ====================================================================

/** 9 个 agent 的名称联合类型 */
export type AgentName =
  | 'dubin'
  | 'archimedes'
  | 'irber'
  | 'pubmeder'
  | 'spsser'
  | 'writer'
  | 'submitter'
  | 'ebmer'
  | 'polisher';

/** 6 个能力分类 */
export type CapabilityCategory =
  | 'agent-orchestration'
  | 'deep-reasoning'
  | 'chinese-writing'
  | 'fast-search'
  | 'long-context'
  | 'methodical-review';

/** Agent → 能力分类映射表 */
export const AGENT_CATEGORY: Record<AgentName, CapabilityCategory> = {
  dubin: 'agent-orchestration',
  archimedes: 'deep-reasoning',
  irber: 'agent-orchestration',
  pubmeder: 'fast-search',
  spsser: 'deep-reasoning',
  writer: 'chinese-writing',
  submitter: 'agent-orchestration',
  ebmer: 'deep-reasoning',
  polisher: 'chinese-writing',
} as const;

/** 7 个模型提供商 */
export type ProviderId =
  | 'deepseek'
  | 'qwen-bailian'
  | 'glm'
  | 'minimax'
  | 'openai'
  | 'anthropic'
  | 'google';

// ====================================================================
// Pipeline Types
// ====================================================================

/** 6 个流水线阶段 + 2 个完整性闸门 */
export type StageId =
  | 'stage-0-intake'
  | 'stage-1-design'
  | 'stage-2-analysis'
  | 'stage-3-writing'
  | 'stage-4-submission'
  | 'stage-5-summary'
  | 'gate-i'
  | 'gate-ii';

/** 阶段状态枚举 */
export type StageStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

/** 阶段产物（仅存相对路径和 checksum，不内联大文件） */
export interface StageArtifact {
  path: string;
  checksum: string;
  description?: string;
}

/** 单个阶段的完整状态 */
export interface StageState {
  status: StageStatus;
  started_at?: string;
  completed_at?: string;
  artifacts: StageArtifact[];
  gates: Record<string, GateReport>;
  /** 阶段完成时对当前 block 的 sha256 哈希，下一阶段入口验证 */
  hash?: string;
}

/** 数据标签 */
export type DataLabel = 'SEALED' | 'real' | 'simulated';

/** 闸门模式状态 */
export type GateModeStatus =
  | 'CLEAR'
  | 'SUSPECTED'
  | 'INSUFFICIENT_EVIDENCE'
  | 'OVERRIDDEN';

/** 闸门整体状态 */
export type GateStatus = 'not_run' | 'passed' | 'failed';

/** 用户签核记录 */
export interface SignoffRecord {
  stage: StageId;
  signed_at: string;
  summary: string;
  risks_acknowledged: string[];
  user_confirmation: string;
}

/** 闸门覆盖记录 */
export interface GateOverride {
  mode: string;
  reason: string;
  approved_by_user: boolean;
}

/** 完整性闸门报告 */
export interface GateReport {
  status: GateStatus;
  checked_at: string;
  claim_sample_rate: 0.3 | 1.0;
  retry_count: number;
  modes: Record<string, GateModeStatus>;
  overrides: GateOverride[];
  report_path: string;
}

/** 主张-证据映射 */
export interface ClaimEvidenceMap {
  claim_id: string;
  claim_text: string;
  manuscript_location?: string;
  evidence_type: 'analysis_result' | 'literature' | 'guideline' | 'journal_instruction';
  evidence_ids: string[];
  verification_status: 'verified' | 'missing' | 'conflict' | 'not_applicable';
}

// ====================================================================
// State Types
// ====================================================================

/** 项目信息 */
export interface ProjectInfo {
  layout: 'omo-sci' | 'codexsci-legacy';
  title?: string;
  description?: string;
  pico?: string;
  target_journal?: string;
}

/** 流水线追踪信息 */
export interface PipelineState {
  current_stage: StageId;
  started_at: string;
  updated_at: string;
}

/** Wisdom 条目 */
export interface WisdomEntry {
  type: 'learning' | 'decision' | 'gotcha' | 'problem';
  content: string;
  created_at: string;
  agent?: AgentName;
}

/** 审稿会话 */
export interface ReviewSession {
  session_id: string;
  phase: 'phase1' | 'phase2';
  reviewer: AgentName;
  started_at: string;
  completed_at?: string;
  report_path?: string;
}

/**
 * Material Passport — 跨会话状态核心文件
 *
 * JSON 格式，每阶段写入对应 schema 字段，下一阶段验证前置条件。
 * 约 2-5K tokens，新会话启动时必读。
 */
export interface MaterialPassport {
  /** schema 版本，支持后续 migration */
  passport_version: string;
  /** 项目信息 */
  project: ProjectInfo;
  /** 流水线追踪 */
  pipeline: PipelineState;
  /** 用户签核记录 */
  signoff_records: SignoffRecord[];
  /** 数据溯源标签 */
  data_provenance: DataLabel;
  /** 闸门 I 报告（完整性检查，不可跳过） */
  integrity_gate_1?: GateReport;
  /** 闸门 II 报告（终审，零容忍） */
  integrity_gate_2?: GateReport;
  /** 主张-证据映射列表 */
  claim_evidence_map: ClaimEvidenceMap[];
  /** 阶段 0: 意图访谈 */
  stage_0_intake: StageState;
  /** 阶段 1: 研究设计 */
  stage_1_design: StageState;
  /** 阶段 2: 数据分析 */
  stage_2_analysis: StageState;
  /** 阶段 3: 论文撰写 */
  stage_3_writing: StageState;
  /** 阶段 4: 投稿 */
  stage_4_submission: StageState;
  /** 阶段 5: 过程总结 */
  stage_5_summary: StageState;
  /** 审稿会话列表 */
  review_sessions: ReviewSession[];
  /** Wisdom 收集 */
  wisdom_collected: WisdomEntry[];
}

/** 待完成任务 */
export interface PendingTask {
  id: string;
  agent: AgentName;
  task: string;
  status: StageStatus;
}

/**
 * Boulder 系统 — 当前会话状态
 *
 * 追踪当前会话状态：活跃计划、session ID、当前阶段/Phase、
 * 待完成任务列表、审稿状态。支持跨会话中断和恢复。
 */
export interface BoulderState {
  active_plan: string;
  session_id: string;
  started_at: string;
  current_stage: StageId;
  current_phase?: string;
  pending_tasks: PendingTask[];
  review_state?: {
    phase1_complete: boolean;
    phase2_complete: boolean;
  };
}

// ====================================================================
// Hook Types
// ====================================================================

/** 22 个生命周期钩子 */
export type HookName =
  | 'session:start'
  | 'session:end'
  | 'session:resume'
  | 'session:interrupt'
  | 'stage:entry'
  | 'stage:exit'
  | 'stage:gate_check'
  | 'stage:gate_pass'
  | 'stage:gate_fail'
  | 'delegate:pre'
  | 'delegate:post'
  | 'delegate:error'
  | 'model:select'
  | 'model:fallback'
  | 'quality:loop_detect'
  | 'quality:compaction_pre'
  | 'quality:compaction_post'
  | 'quality:token_warn'
  | 'review:phase1'
  | 'review:phase2'
  | 'user:signoff'
  | 'user:clarify';

/** 钩子上下文 */
export interface HookContext {
  hook: HookName;
  agent?: AgentName;
  stage?: StageId;
  passport?: MaterialPassport;
  boulder?: BoulderState;
  metadata?: Record<string, unknown>;
}

/** 钩子处理器签名 */
export type HookHandler = (ctx: HookContext) => Promise<void> | void;

// ====================================================================
// Router Types
// ====================================================================

/** 模型规格 */
export interface ModelSpec {
  provider: ProviderId;
  model_id: string;
  context_window: number;
  max_output: number;
}

/** 能力分类配置 */
export interface CategoryConfig {
  category: CapabilityCategory;
  fallback_chain: ModelSpec[];
  concurrency_limit: number;
}

/** 分类路由配置 */
export interface RouterConfig {
  categories: Record<CapabilityCategory, CategoryConfig>;
  concurrency: { max_total_agents: number };
}

// ====================================================================
// Safety Types
// ====================================================================

/** 熔断器和安全机制配置 */
export interface SafetyConfig {
  /** 子 agent 最大执行步数 */
  max_step: number;
  /** 子 agent 最大执行时间（分钟） */
  max_time_minutes: number;
  /** 循环检测阈值（连续相同工具+参数步数） */
  loop_detect_threshold: number;
}

/** 用量监控配置 */
export interface UsageConfig {
  /** 月配额（token 数） */
  token_quota: number;
  /** 当前用量 */
  current_usage: number;
  /** 配额重置日期 (YYYY-MM-DD) */
  quota_reset_date: string;
}

/** 环境就绪检查配置 */
export interface EnvironmentConfig {
  /** 必需 MCP 工具列表 */
  mcp_required: string[];
  /** 可选 MCP 工具列表 */
  mcp_optional: string[];
  /** 推荐 R 包列表 */
  r_packages: string[];
  /** 必需软件列表 */
  software: string[];
}

// ====================================================================
// Config Types
// ====================================================================

/**
 * omo-sci 完整配置
 *
 * 写入 ~/.config/opencode/omo-sci/omo-sci.jsonc，安装时生成。
 */
export interface OmoSciConfig {
  $schema?: string;
  /** 分类路由配置 */
  router: RouterConfig;
  /** 禁用的 agent 列表 */
  disabled_agents?: AgentName[];
  /** 禁用的钩子列表 */
  disabled_hooks?: HookName[];
  /** 安全机制配置 */
  safety: SafetyConfig;
  /** 用量监控配置 */
  usage: UsageConfig;
  /** 环境就绪检查配置 */
  environment: EnvironmentConfig;
}
