/**
 * sci-start 命令处理器 (Phase 2 stub)
 *
 * Phase 2 的入口点，当前返回占位信息。
 */

export function sciStart(): string {
  return [
    "╔══════════════════════════════════════════╗",
    "║     omo-sci — Dubin 研究引擎             ║",
    "╚══════════════════════════════════════════╝",
    "",
    "  Dubin 正在启动...",
    "",
    "  该功能将在 Phase 2 中实现。",
    "  Phase 2 将包含:",
    "    - Dubin agent 编排系统",
    "    - 从临床困惑到研究方案的全流程引导",
    "    - 子 agent 委派与团队协作",
    "    - Material Passport 驱动的阶段管理",
    "",
    "  敬请期待。",
    "",
  ].join("\n");
}
