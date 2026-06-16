/**
 * omo-sci — OpenCode 插件入口
 *
 * 导出 OmoSciPlugin 函数，供 OpenCode 在启动时加载。
 *
 * OpenCode 通过 package.json#main 定位 src/index.ts，
 * 用 Bun 直接加载 TypeScript。
 *
 * 注意：@opencode-ai/plugin 类型包未发布到 npm，
 * 因此插件函数不使用 TypeScript 类型标注，改用 JSDoc 注释描述接口。
 *
 * @see docs/dev/opencode-integration-notes.md
 */

// 必须最先导入 hooks 注册模块，确保所有 22 个 lifecycle hooks
// 在插件初始化前完成注册。模块副作用使各 hook 文件调用 on() 进行注册。
import './hooks/index.ts';

import { runDoctor, formatDoctorReport } from "./doctor";

/**
 * AGENT_MANIFEST — omo-sci 智能体注册清单
 *
 * 供 OpenCode 加载时识别所有可用 agent 及其元信息。
 * 每个 agent 对应 .opencode/agents/<name>.md 中的定义。
 */
export const AGENT_MANIFEST = [
  {
    name: 'dubin',
    type: 'primary' as const,
    category: 'agent-orchestration' as const,
    promptFile: './agents/dubin',
  },
  {
    name: 'archimedes',
    type: 'subagent' as const,
    category: 'deep-reasoning' as const,
    promptFile: './agents/archimedes',
  },
  {
    name: 'irber',
    type: 'subagent' as const,
    category: 'agent-orchestration' as const,
    promptFile: './agents/irber',
  },
  {
    name: 'pubmeder',
    type: 'subagent' as const,
    category: 'fast-search' as const,
    promptFile: './agents/pubmeder',
  },
  {
    name: 'spsser',
    type: 'subagent' as const,
    category: 'deep-reasoning' as const,
    promptFile: './agents/spsser',
  },
  {
    name: 'writer',
    type: 'subagent' as const,
    category: 'chinese-writing' as const,
    promptFile: './agents/writer',
  },
  {
    name: 'submitter',
    type: 'subagent' as const,
    category: 'agent-orchestration' as const,
    promptFile: './agents/submitter',
  },
  {
    name: 'ebmer',
    type: 'subagent' as const,
    category: 'methodical-review' as const,
    promptFile: './agents/ebmer',
  },
  {
    name: 'polisher',
    type: 'subagent' as const,
    category: 'chinese-writing' as const,
    promptFile: './agents/polisher',
  },
];

/**
 * OmoSciPlugin — OpenCode 插件入口函数
 *
 * 注册 `sci-doctor` 自定义工具，供 agent 调用环境诊断。
 *
 * @param {Object} ctx - OpenCode 插件上下文
 * @param {unknown} ctx.project - 当前项目信息
 * @param {unknown} ctx.client - OpenCode SDK 客户端，用于与 AI 交互
 * @param {Function} ctx.$ - Bun 的 shell API，用于执行命令
 * @param {string} ctx.directory - 插件目录路径
 * @param {string} ctx.worktree - 工作树路径
 * @returns {Promise<{tool?: Record<string, {description: string, execute: Function}>}>} 插件钩子对象
 */
export const OmoSciPlugin = async (ctx: any): Promise<any> => {
  return {
    tool: {
      "sci-doctor": {
        description:
          "Run omo-sci environment diagnostics — check Bun, Git, OpenCode, and config status",
        /**
         * 执行 sci-doctor 工具
         *
         * @param {Object} _args - 工具参数（sci-doctor 无参数）
         * @param {Object} _context - 执行上下文
         * @returns {Promise<string>} 环境诊断报告
         */
        async execute(_args: any, _context: any): Promise<string> {
          const report = await runDoctor();
          return formatDoctorReport(report);
        },
      },
    },
  };
};

export default OmoSciPlugin;
