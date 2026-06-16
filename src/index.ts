/**
 * omo-sci — OpenCode 插件入口
 *
 * 导出 OmoSciPlugin 函数，供 OpenCode 在启动时加载。
 *
 * @see docs/dev/opencode-integration-notes.md
 */

import { runDoctor, formatDoctorReport } from "./doctor";

export interface PluginContext {
  project: unknown;
  client: unknown;
  $: (strings: TemplateStringsArray, ...values: unknown[]) => Promise<unknown>;
  directory: string;
  worktree: string;
}

export interface PluginHooks {
  event?: (input: { event: { type: string } }) => Promise<void> | void;
  tool?: Record<
    string,
    {
      description: string;
      args?: Record<string, unknown>;
      execute: (args: Record<string, unknown>, context: PluginContext) => Promise<string>;
    }
  >;
}

/**
 * OmoSciPlugin — OpenCode 插件入口函数
 *
 * 注册 `sci-doctor` 自定义工具，供 agent 调用。
 */
export const OmoSciPlugin = async (ctx: PluginContext): Promise<PluginHooks> => {
  return {
    tool: {
      "sci-doctor": {
        description: "Run omo-sci environment diagnostics — check Bun, Git, OpenCode, and config status",
        async execute(_args: Record<string, unknown>, _context: PluginContext): Promise<string> {
          const report = await runDoctor();
          return formatDoctorReport(report);
        },
      },
    },
  };
};

export default OmoSciPlugin;
