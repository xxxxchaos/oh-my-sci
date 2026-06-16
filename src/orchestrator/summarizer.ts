/**
 * 结果汇总器 — 汇总子 agent 产出，提取 learnings
 *
 * 负责：
 * - 将单个子 agent 的结果格式化为人类可读的摘要
 * - 从子 agent 输出中提取 learnings（正则匹配标记行）
 * - 整理过程中产生的错误信息
 */

// ====================================================================
// Types
// ====================================================================

export interface SubAgentResult {
  agent: string;
  task: string;
  output: string;
  learnings: string[];
  errors: string[];
}

// ====================================================================
// summarizeResult — 生成人类可读的汇总报告
// ====================================================================

/**
 * 将 SubAgentResult 格式化为 Markdown 摘要
 *
 * 格式：
 * - 标题（agent + task）
 * - 错误列表（如有）
 * - learnings 列表（如有）
 * - 完整产出
 */
export function summarizeResult(result: SubAgentResult): string {
  const lines: string[] = [];
  lines.push(`## ${result.agent} 完成: ${result.task}`);

  if (result.errors.length > 0) {
    lines.push(`\n### 遇到问题`);
    for (const e of result.errors) {
      lines.push(`- ${e}`);
    }
  }

  if (result.learnings.length > 0) {
    lines.push(`\n### 学到的`);
    for (const l of result.learnings) {
      lines.push(`- ${l}`);
    }
  }

  lines.push(`\n### 产出`);
  lines.push(result.output);

  return lines.join('\n');
}

// ====================================================================
// extractLearnings — 从输出文本中提取 learnings
// ====================================================================

/**
 * 从子 agent 输出文本中提取 learnings
 *
 * 启发式方法：匹配以下前缀开头的行：
 * - "Lesson:"
 * - "学到了:"
 * - 以 📝 开头
 *
 * @param output 子 agent 输出的原始文本
 * @returns 提取出的 learning 条目列表
 */
export function extractLearnings(output: string): string[] {
  const learnings: string[] = [];
  for (const line of output.split('\n')) {
    const trimmed = line.trim();
    if (
      trimmed.startsWith('Lesson:') ||
      trimmed.startsWith('📝') ||
      trimmed.startsWith('学到了:')
    ) {
      learnings.push(
        trimmed.replace(/^(Lesson:|📝|学到了:)\s*/, ''),
      );
    }
  }
  return learnings;
}
