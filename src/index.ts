/**
 * omo-sci — OpenCode 插件入口
 *
 * 导出 OmoSciPlugin 函数。安装器从 runtime-entry.ts 打包本模块，
 * OpenCode 在启动时从项目 `.opencode/plugins/omo-sci.js` 加载。
 *
 * @opencode-ai/plugin 已确认发布在公共 npm registry（见 docs/dev/opencode-integration-notes.md
 * 的更新记录），因此这里直接使用官方 `tool()` helper 和 `Plugin` 类型，
 * 不再用裸对象 + JSDoc 的推测形态。
 *
 * @see docs/dev/opencode-integration-notes.md
 */

import { tool, type Plugin } from '@opencode-ai/plugin';
import { runDoctor, formatDoctorReport } from './doctor';
import {
  passportAdvanceStage,
  passportRecordClaim,
  passportRecordArtifact,
  passportRecordGate,
  passportRecordWisdom,
  passportStatus,
} from './plugin-tools';

const PASSPORT_PATH_FRAGMENT = '.omo-sci/passport.json';
const DIRECT_MUTATION_TOOLS = new Set(['write', 'edit', 'apply_patch', 'patch']);

function protectsPassport(toolName: string, args: unknown): boolean {
  const serialized = JSON.stringify(args ?? {}).replaceAll('\\', '/');
  if (!serialized.includes(PASSPORT_PATH_FRAGMENT)) return false;
  if (DIRECT_MUTATION_TOOLS.has(toolName)) return true;
  // Reading through the dedicated read tool is safe. Shell access to the
  // Passport is denied because redirection and script-based writes are hard
  // to distinguish reliably at this boundary.
  return toolName === 'bash';
}

export const OmoSciPlugin: Plugin = async () => {
  return {
    tool: {
      'sci-doctor': tool({
        description: '运行 omo-sci 环境诊断——检查 Bun、Git、OpenCode 和配置状态',
        args: {},
        async execute() {
          const report = await runDoctor();
          return formatDoctorReport(report);
        },
      }),
      'passport-status': passportStatus,
      'passport-advance-stage': passportAdvanceStage,
      'passport-record-gate': passportRecordGate,
      'passport-record-claim': passportRecordClaim,
      'passport-record-artifact': passportRecordArtifact,
      'passport-record-wisdom': passportRecordWisdom,
    },
    'tool.execute.before': async (input, output) => {
      if (protectsPassport(input.tool, output.args)) {
        throw new Error(
          '禁止直接修改 .omo-sci/passport.json。请使用 passport-* 工具；读取状态请使用 passport-status 或 read 工具。',
        );
      }
    },
  };
};

export default OmoSciPlugin;
