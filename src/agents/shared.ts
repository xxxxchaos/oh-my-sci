/**
 * omo-sci agent 提示词共享片段
 *
 * 供多个 agent 的 PROMPT 模板字符串通过 ${} 插值引用，避免同一份内容
 * 抄成多份而不知不觉产生差异（例如曾经 writer.ts 和 polisher.ts 的
 * 禁用词列表就出现过一个词的差异）。
 */

/** 稿件正文/Methods 中绝对不能出现的 AI 相关词汇 */
export const BANNED_AI_TERMS = [
  'MCP', 'API', 'Claude', 'GPT', 'ChatGPT', 'LLM',
  '大型语言模型', 'AI 助手', 'AI 工具', '深度求索', '通义千问', '智谱清言',
  '自动化工具', '大模型',
] as const;

export const BANNED_AI_TERMS_LIST = BANNED_AI_TERMS.join(', ');
