/**
 * 委派引擎 — 创建和准备子 agent 任务
 *
 * 负责：
 * - 创建 DelegationTask（包含 agent、task、上下文）
 * - 为每个子 agent 提取并截断上下文（只传完成任务所需的最少信息）
 * - 为不同 agent 类型添加角色专属前缀
 */

import type { AgentName } from '../types';

// ====================================================================
// Types
// ====================================================================

export interface DelegationTask {
  id: string;
  agent: AgentName;
  task: string;
  context: string; // trimmed context payload for the sub-agent
  modelHint?: string; // optional model override
}

// ====================================================================
// Internal — 防碰撞计数器
// ====================================================================

let taskSequenceCounter = 0;

/** 生成全局唯一的任务 ID */
function generateTaskId(agent: AgentName): string {
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  const seq = (++taskSequenceCounter) % 100000;
  return `${agent}-${ts}-${rand}-${seq}`;
}

// ====================================================================
// Factory
// ====================================================================

/**
 * 创建委派任务
 *
 * 任务 ID 由 agent 名、毫秒时间戳、随机字符串和递增计数器组成，
 * 确保同一 agent 在同一毫秒内创建多个任务时 ID 不会碰撞。
 *
 * @param agent  目标子 agent 名称
 * @param task   具体任务描述
 * @param context 上下文信息（raw，extractAgentContext 会做截断）
 */
export function createDelegationTask(
  agent: AgentName,
  task: string,
  context: string,
): DelegationTask {
  return { id: generateTaskId(agent), agent, task, context };
}

// ====================================================================
// extractAgentContext — 最小上下文提取
// ====================================================================

/**
 * 为指定子 agent 提取并截断上下文
 *
 * 确保子 agent 只收到完成任务所需的最少信息。
 * 对于 Phase 2，简单地截断到 maxChars 并在前面加上 agent 专属前缀。
 *
 * @param fullContext 完整上下文
 * @param agent       目标 agent
 * @param maxChars    最大字符数（默认 4000）
 */
export function extractAgentContext(
  fullContext: string,
  agent: AgentName,
  maxChars: number = 4000,
): string {
  const prefix = getAgentContextPrefix(agent);
  const body =
    fullContext.length > maxChars - prefix.length
      ? fullContext.slice(0, maxChars - prefix.length) + '\n...(truncated)'
      : fullContext;
  return prefix + body;
}

// ====================================================================
// Agent Context Prefixes
// ====================================================================

const AGENT_CONTEXT_PREFIXES: Record<AgentName, string> = {
  dubin: '',
  archimedes:
    '[Archimedes] 你收到一个研究设计任务。基于以下信息设计研究蓝图：\n',
  irber:
    '[IRBer] 你收到一个方案审查任务。请审查以下研究方案的质量：\n',
  pubmeder:
    '[Pubmeder] 你收到一个文献搜索任务。请多源检索以下主题：\n',
  spsser:
    '[SPSSer] 你收到一个统计分析任务。基于以下分析摘要制定SAP并执行分析：\n',
  writer:
    '[Writer] 你收到一个论文写作任务。基于分析摘要生成初稿：\n',
  submitter:
    '[Submitter] 你收到一个投稿任务。基于以下信息匹配期刊并准备材料：\n',
  ebmer:
    '[EBMer] 你收到一个方法学审稿任务。采用Sprint Contract协议审查：\n',
  polisher:
    '[Polisher] 你收到一个逻辑审稿任务。审查以下稿件的语言与一致性：\n',
};

function getAgentContextPrefix(agent: AgentName): string {
  return AGENT_CONTEXT_PREFIXES[agent];
}
