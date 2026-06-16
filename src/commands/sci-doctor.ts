/**
 * sci-doctor 命令处理器
 *
 * 调用 runAllChecks + formatDoctorReport，输出环境诊断报告。
 * 可在 CLI 和 OpenCode 插件中复用。
 */

import { runDoctor, formatDoctorReport, formatDoctorReportJson } from "../doctor";

export interface DoctorCommandOptions {
  json?: boolean;
}

/**
 * 执行环境诊断并返回格式化报告
 */
export async function sciDoctor(options?: DoctorCommandOptions): Promise<string> {
  const report = await runDoctor();
  return options?.json ? formatDoctorReportJson(report) : formatDoctorReport(report);
}
