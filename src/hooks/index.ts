/**
 * omo-sci 生命周期钩子统一注册入口
 *
 * 通过模块副作用导入，自动注册所有 22 个 lifecycle hooks。
 * 必须被 src/index.ts 在插件初始化前导入，确保 hooks 在 runtime 中可用。
 *
 * 导入完成后自动保存默认 hooks 快照，供 restoreDefaultHooks() 恢复。
 *
 * === 注册的 hook 列表（22 个）===
 * session:*       4 个 (start/end/resume/interrupt)
 * stage:*         5 个 (entry/exit/gate_check/gate_pass/gate_fail)
 * delegate:*      3 个 (pre/post/error)
 * model:*         2 个 (select/fallback)
 * quality:*       4 个 (loop_detect/compaction_pre/compaction_post/token_warn)
 * review:*        2 个 (phase1/phase2)
 * user:*          2 个 (signoff/clarify)
 * total:         22 个
 */

import './session';
import './stage';
import './delegation';
import './model';
import './quality';
import './review';
import './user';
import { snapshotDefaultHooks } from './registry';

// 所有 hook 注册完成后保存快照，允许测试在 clearHooks() 后恢复默认状态
snapshotDefaultHooks();
