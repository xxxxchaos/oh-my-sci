/**
 * omo-sci — OpenCode 插件入口
 *
 * 导出 OmoSciPlugin 函数，供 OpenCode 在启动时加载。
 * OpenCode 通过 package.json#main 定位 src/index.ts，用 Bun 直接加载 TypeScript。
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
  passportRecordGate,
  passportStatus,
} from './plugin-tools';

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
    },
  };
};

export default OmoSciPlugin;
