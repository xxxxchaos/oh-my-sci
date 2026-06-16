# omo-sci 进度交接

> 最后更新: 2026-06-16 19:10
> 当前阶段: Phase 1 (核心骨架)
> 状态: 🔄 进行中 — Task 5 需先修复 Codex 审查问题，再继续 Task 6

## 进度摘要

| 阶段 | 状态 | 完成/总任务 |
|------|------|------------|
| Phase 0 | ✅ 完成 | 1/1 |
| Phase 1 | 🔄 进行中 | 5/14 |
| Phase 2 | ⏳ 未开始 | 0/6 |
| Phase 3 | ⏳ 未开始 | 0/4 |
| Phase 4 | ⏳ 未开始 | 0/5 |

## 已完成任务

- Task 0: OpenCode 集成验证 ✅ (含 Codex 审查修复)
- Task 1: 项目脚手架 ✅
- Task 2: Shared types (src/types.ts, 376行) ✅
- Task 3: Constants + config loader ✅
- Task 4: Category router (3 source, 3 test files) ✅
- Task 5: Material Passport + Boulder (状态系统) ⚠️ 需修复

## 当前任务

Task 5 修复: Passport hash、配置契约、provider registry、schema validation

## 下一步

Task 6-8: 钩子系统 (registry + session hooks + 其他钩子) — 等 Task 5 修复后继续
Task 9: 环境检查器
Task 10: 安全机制

## Codex 审查意见 (2026-06-16 19:10)

### 结论

暂不建议继续 Task 6。`bun test` 和 `typecheck` 通过，但 Task 5 还有影响后续状态机和模型路由的 P1 问题。先修复以下问题，再进入 Hook registry。

### P1 必须修复

1. **`computeStageHash` 会忽略 artifact/gate 的嵌套内容**
   - 位置: `src/state/passport.ts`
   - 当前实现使用 `JSON.stringify(stage, Object.keys(stage).sort())`。这个 replacer 会把嵌套对象中不在顶层白名单里的字段丢掉。
   - Codex 实测: 两个不同 `artifacts[].path/checksum` 的 stage 得到同一个 hash；序列化结果变成 `{"artifacts":[{}],"gates":{},"status":"completed"}`。
   - 风险: 破坏设计文档要求的“阶段完成后 hash，下一阶段入口验证”；artifact 或 gate report 被篡改可能 hash 不变。
   - 修复要求: 实现递归 stable stringify/canonical JSON；测试必须覆盖嵌套 artifact 字段变化、`gates` / `GateReport` 字段变化、对象 key 顺序不同但语义相同 hash 相同。

2. **install 生成的配置与 `loadConfig()` 读取的配置不是同一套契约**
   - 位置: `src/install.ts`, `src/constants.ts`, `src/config.ts`, `src/types.ts`
   - `install()` 写入 `~/.config/opencode/omo-sci/omo-sci.jsonc`；`loadConfig()` 默认读 `~/.config/opencode/omo-sci.jsonc`。
   - 更深层问题: `install()` 写旧 shape: `providers/quota/modelMapping`；`loadConfig()` 期待新 shape: `router/safety/usage/environment`。
   - 风险: 安装后 router 仍会拿到默认空 `fallback_chain`，模型路由不可用。
   - 修复要求: 统一配置路径和 schema；建议让 install 直接生成 `OmoSciConfig` 新结构，至少包含可用的 `router.categories.*.fallback_chain`、`safety`、`usage`、`environment`。

3. **provider whitelist 与 router registry 不一致**
   - 位置: `src/install.ts`, `src/router/provider.ts`, `src/types.ts`
   - `install.ts` 允许 `glm/openai/anthropic/google`，但 `PROVIDER_REGISTRY` 没有这些条目。
   - `PROVIDER_REGISTRY` 支持 `zhipu/kimi/tencent-hy/opencode-go`，但 `install.ts` 会拒绝它们。
   - 风险: 用户安装成功但模型路由不可用，或已实现 provider 不能安装。
   - 修复要求: 以 `ProviderId` + `PROVIDER_REGISTRY` 为单一事实源；install whitelist 应从 registry 派生，或者显式保证二者完全一致。

4. **Passport 缺少 schema validation**
   - 位置: `src/state/passport.ts`
   - 计划要求 “Missing required fields should return validation errors”，但 `loadPassport()` 目前只是 `JSON.parse` 后直接 cast。
   - 风险: 损坏、旧版本或字段缺失的 `passport.json` 会被当作合法对象，后续 hook/session 恢复时才失败。
   - 修复要求: 增加 `validatePassportSchema(passport): string[]` 或等价函数；至少校验 `passport_version`、`project.layout`、`pipeline.current_stage`、`signoff_records`、`data_provenance`、6 个 stage block、gate report shape。`loadPassport()` 不一定要 throw，但不能静默忽略验证错误。

### P2 需要澄清/修正

5. **OpenCode runtime 仍未闭环，文档措辞偏乐观**
   - 位置: `docs/dev/opencode-integration-notes.md`
   - 文档写“已验证的 tool 注册替代形态”，但同段又说只通过 typecheck/test，仍需 runtime 验证。
   - Codex 复跑 `/Users/dr.xie/.opencode/bin/opencode agent list 2>&1 | rg -n "dubin|sci-doctor|sci-status" -i` 未匹配。
   - `opencode command list` 不是当前 CLI 可用子命令，文档中的验证命令需要更新。
   - 修复要求: 把 runtime 部分标记为“待验收”；补充实际可运行的 OpenCode 验收命令，或说明当前 CLI 不支持 command list。

### Codex 已复跑验证

- `/Users/dr.xie/.bun/bin/bun run typecheck` 通过。
- `/Users/dr.xie/.bun/bin/bun test` 通过，71/71。
- install 测试隔离已修复，空 provider / invalid provider / invalid quota 测试已覆盖。
- `computeStageHash` 嵌套内容碰撞问题已用 Bun one-liner 复现。
- `opencode agent list | rg dubin` 仍未匹配。

### 建议 Claude Code 下一步顺序

1. 修复 `computeStageHash` 的递归稳定序列化，并补充碰撞回归测试。
2. 统一配置路径和 schema，让 `install()` 生成 `loadConfig()` 能直接消费的 `OmoSciConfig`。
3. 统一 provider whitelist 与 `PROVIDER_REGISTRY`。
4. 增加 Passport schema validation 和测试。
5. 修正 OpenCode 集成文档的“已验证”措辞和验收命令。
6. 全部通过后再继续 Task 6 Hook registry。

## 测试覆盖

bun test: 71/71 通过 (9 test files)，但存在上述 P1 逻辑问题，不能仅凭测试通过放行。
