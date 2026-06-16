# omo-sci 进度交接

> 最后更新: 2026-06-16 17:25
> 当前阶段: Phase 1 (核心骨架) → Phase 2 (Agent 团队)
> 状态: ✅ Phase 1 闸门审查已修复（6 个问题全部闭环），可进入 Phase 2

## 进度摘要

| 阶段 | 状态 | 完成/总任务 |
|------|------|------------|
| Phase 0 | ✅ 完成 | 1/1 |
| Phase 1 | ⚠️ 需修复后放行 | 14/14 |
| Phase 2 | ⏳ 暂缓开始 | 0/6 |
| Phase 3 | ⏳ 未开始 | 0/4 |
| Phase 4 | ⏳ 未开始 | 0/5 |

## Phase 1 产出

| 模块 | 文件 | 说明 |
|------|------|------|
| 类型系统 | `src/types.ts` | Agent/Category/Pipeline/State/Hook/Router/Config |
| 配置 | `src/config.ts`, `src/constants.ts` | JSONC 配置加载/验证/合并 |
| 路由 | `src/router/` | provider registry + 6 category fallback chains |
| 状态 | `src/state/` | Passport/Boulder/Wisdom (含 hash/schema 验证) |
| 钩子 | `src/hooks/` | 22 hooks: registry + session/stage/delegation/model/quality/review/user |
| 环境 | `src/environment/` | Doctor check + formatted report |
| 安全 | `src/safety/` | Circuit breaker + usage tracker |
| 安装 | `src/install.ts` | config generator + installer |
| 命令 | `src/commands/` | sci-doctor/status/usage/start |
| 入口 | `src/index.ts`, `bin/omo-sci.ts` | Plugin entry + CLI |
| 参考 | `references/` | opensci 领域知识文件 |
| 测试 | `tests/` | 141 tests, 0 fail |

## 当前任务

Phase 2: Agent 团队 (Tasks 15-20) — 闸门审查已修复，可以开始。

## Codex Phase 1 闸门审查 (2026-06-16 21:35)

### 结论

暂不建议直接进入 Phase 2。Phase 1 的主体完成度高，上次 Task 5 的 hash/config/provider 问题已经基本收口；但目前仍有 2 个 P1 问题会影响 Phase 2 的运行时可靠性。先修复 P1，再进入 Agent prompt / Dubin 状态机 / delegation engine。

### P1 必须修复

1. **22 个 lifecycle hooks 没有统一自动注册入口，运行时实际为空** ✅ 已修复
   - 位置: `src/hooks/*.ts`, `src/hooks/registry.ts`, `src/index.ts`
   - 现状: 具体 hook 文件通过模块副作用调用 `on(...)` 注册；但 `src/index.ts` 没有 import `src/hooks/session.ts`、`stage.ts`、`delegation.ts` 等模块，也没有 `registerAllHooks()` 入口。
   - Codex 复现: 执行 `bun -e "import './src/index.ts'; import { registeredHooks } from './src/hooks/registry.ts'; console.log(registeredHooks())"` 输出 `[]`。
   - 风险: Phase 2 如果只加载 OpenCode plugin 或 registry，`session:start`、`stage:entry`、`delegate:*`、`quality:*` 等 hook 都不会生效。现在的 tests 多数是手动 `on(...)` 或在 `tests/hooks/session.test.ts` 手动 require `session.ts`，没有覆盖插件启动后的真实注册状态。
   - 修复要求:
     - 新增 `src/hooks/index.ts` 或 `registerAllHooks()`，显式导入/注册所有 22 个 hook。
     - `src/index.ts` 在插件初始化时调用或导入该统一入口。
     - 新增测试: import plugin entry 后 `registeredHooks()` 至少包含 22 个 hook 名；`dispatch({hook:'session:start'})` 能触发真实 session handler。
     - 避免测试之间 `clearHooks()` 把全局默认 hooks 清掉后不恢复。
   - 修复方式:
     - 创建 `src/hooks/index.ts` 导入所有 hook 模块副作用
     - `src/index.ts` 顶部 `import './hooks/index.ts'`
     - `registry.ts` 新增 `snapshotDefaultHooks()` / `restoreDefaultHooks()` / `hasDefaultHooks()`
     - `hooks/index.ts` 末尾调用 `snapshotDefaultHooks()`
     - 测试文件 `afterAll` 改用 `restoreDefaultHooks()` 而非 `clearHooks()`
     - 新增 `tests/hooks/auto-register.test.ts` (5 tests)

2. **`usage-tracker` 测试/实现仍可能污染真实用户配置** ✅ 已修复
   - 位置: `src/safety/usage-tracker.ts`, `tests/safety/usage-tracker.test.ts`
   - 现状: `recordUsage()` 固定读写 `OMO_SCI_CONFIG_PATH`，如果用户真实存在 `~/.config/opencode/omo-sci.jsonc`，测试会直接累加真实 `usage.current_usage`。
   - Codex 当前环境没有该文件，所以本次未触发；但这是和早期 install 测试污染同类的问题。
   - 修复要求:
     - 给 `recordUsage()` 增加可选 `configPath` 或存储 adapter 参数，测试必须用临时 JSONC 文件。
     - 或用 env 注入测试路径，避免任何测试写入真实 home config。
     - 增加测试断言: 写入 temp config 后 current_usage 正确持久化；没有 config 文件时不创建/不污染真实路径。
   - 修复方式:
     - `recordUsage()` 增加可选 `configPath?: string` 参数
     - config 文件不存在时不创建新文件（仅在已存在时持久化）
     - 测试全部使用 `mkdtempSync` + 临时 JSON 文件
     - 新增 `config 文件不存在时不创建新文件` 测试

### P2 建议修正

3. **Passport schema validation 仍偏浅** ✅ 已修复
   - 位置: `src/state/passport.ts`
   - 现状: `validatePassportSchema()` 只校验 `passport_version`、`project.layout`、`pipeline.current_stage`、`signoff_records`、`review_sessions`。设计/计划中要求至少覆盖 `data_provenance`、6 个 stage block、gate report shape 等关键字段。
   - 风险: Phase 2 跨会话恢复时，损坏或旧版本 passport 仍可能被当作合法对象。
   - 建议: 补充校验 `data_provenance`、`claim_evidence_map`、6 个 `stage_*` 的 `status/artifacts/gates`、`integrity_gate_1/2` 的 `GateReport` shape。`loadPassport()` 可以继续不 throw，但需要暴露 warnings 给 doctor/status。
   - 修复方式:
     - 增强 `validatePassportSchema()`: 校验 data_provenance 标签值、6 个 stage_* 的 status/artifacts/gates、integrity_gate_1/2 的 GateReport 字段、claim_evidence_map 元素结构
     - 新增 12 个验证测试

4. **`sci-status` 语义分裂** ✅ 已修复
   - 位置: `bin/omo-sci.ts`, `src/status.ts`, `src/commands/sci-status.ts`, `.opencode/commands/sci-status.md`
   - 现状: `src/commands/sci-status.ts` 实现的是项目 Passport/Boulder 状态；但 CLI `omo-sci status` 仍调用旧 `src/status.ts`，展示的是安装配置状态。`.opencode/commands/sci-status.md` 让 Dubin 执行 `bun run bin/omo-sci.ts status`，所以用户看到的不是项目状态。
   - 建议: 拆成 `omo-sci status` = 项目状态，`omo-sci config/status` = 安装配置；或让 `/sci-status` 调用新的 `getProjectStatus()/formatProjectStatus()`。
   - 修复方式:
     - `omo-sci status` 改为调用 `getProjectStatus()` / `formatProjectStatus()`
     - 新增 `omo-sci config` 展示旧安装配置状态
     - `status --project <dir>` 支持指定项目目录

5. **OpenCode 集成文档仍有过期验证命令** ✅ 已修复
   - 位置: `docs/dev/opencode-integration-notes.md`
   - 现状: 文档仍写 `opencode command list | grep sci-doctor`，但当前 OpenCode CLI help 中没有 `command list` 子命令。
   - Codex 复验: `opencode agent list | rg dubin` 现在能匹配 `dubin (primary)`，agent 识别已改善；但 command/plugin tool 的 runtime 验收仍未闭环。
   - 建议: 移除不可运行命令，改成实际 TUI 验收步骤或可执行 CLI 检查；继续把 plugin tool 裸对象形态标为 runtime 待验收。
   - 修复方式:
     - 移除 `opencode command list` 不可运行命令
     - 改为 TUI 验收步骤描述
     - 标注 plugin tool 裸对象形态 = "typecheck 通过，runtime 待验收"

6. **`opencode.json`/install 覆盖策略仍有后续风险** ⚠️ 已标注风险
   - 位置: `src/install.ts`
   - 现状: install 会直接写 `{ "plugin": ["omo-sci"] }` 到项目 `opencode.json`，覆盖已有 OpenCode 配置。
   - 建议: Phase 2 前至少在 handoff/log 保留风险；正式使用前需要 merge existing `plugin`/`agent`/`command` 配置。
   - 状态: ⚠️ 已标注风险，未修改代码（Phase 2 前不需要正式 merge logic）

### 已收口的上次 P1

- `computeStageHash` 已改为递归 stable stringify；Codex 复验嵌套 key 顺序无关、checksum 变化会改变 hash。
- install/config/router schema 已统一到 `OmoSciConfig` 新结构；安装测试覆盖 `loadConfig(configPath)` 后 fallback_chain 可用。
- provider whitelist 已从 `PROVIDER_REGISTRY` 派生。
- `opencode agent list | rg dubin` 当前能看到 `dubin (primary)`。

### Codex 已复跑验证

- `/Users/dr.xie/.bun/bin/bun run typecheck` 通过。
- `/Users/dr.xie/.bun/bin/bun test` 通过，141/141。
- `computeStageHash` 手工复验通过。
- `bun run bin/omo-sci.ts status/usage/start` 均可运行，但 `status` 当前是安装状态，不是项目状态。
- `opencode agent list | rg dubin` 匹配 `dubin (primary)`。
- import plugin entry 后 `registeredHooks()` 返回 `[]`，确认 hook 自动注册问题存在。

### 建议 Claude Code 下一步顺序

1. ~~修复 hook 统一注册入口，并让 plugin 初始化后 22 个 hooks 可见。~~ ✅ 已完成
2. ~~修复 `usage-tracker` 的真实配置污染风险和测试隔离。~~ ✅ 已完成
3. ~~Passport schema validation 补充。~~ ✅ 已完成
4. ~~`sci-status` 语义修正。~~ ✅ 已完成
5. ~~更新 `docs/dev/opencode-integration-notes.md` 中过期的验证命令。~~ ✅ 已完成
6. 进入 Phase 2 Task 15: Dubin 主编排 agent prompt 和状态机。

## 测试

`bun test`: 166/166 通过。闸门审查已修复 — hook 自动注册 22 个（含快照恢复机制）、usage-tracker 隔离、passport 增强校验全部覆盖。
