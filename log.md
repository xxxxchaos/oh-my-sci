# omo-sci 开发日志

> 项目: omo-sci — 医学科研智能体团队 OpenCode 插件
> 开始: 2026-06-16
> 方式: Subagent-Driven Development

---


## 2026-06-16 22:00 — Codex Phase 1 闸门审查修复 ✅

### P1-1: Hook 统一自动注册 ✅
- 创建 `src/hooks/index.ts` 导入所有 22 个 hook 模块（模块副作用自动调用 `on()`）
- `src/index.ts` 顶部导入 `./hooks/index.ts`
- `registry.ts` 新增 `snapshotDefaultHooks()` / `restoreDefaultHooks()` / `hasDefaultHooks()`
- `hooks/index.ts` 末尾调用 `snapshotDefaultHooks()` 保存快照
- 测试文件 `afterAll` 统一改用 `restoreDefaultHooks()` 而非 `clearHooks()`
- 新增 `tests/hooks/auto-register.test.ts`（6 个测试）
- 验证: 导入 plugin entry 后 `registeredHooks()` → 22

### P1-2: Usage-tracker 配置污染 ✅
- `recordUsage()` 增加可选 `configPath?: string` 参数
- 配置文件不存在时不创建/不污染真实路径
- 测试全部改用 `mkdtempSync` + 临时 JSON 文件
- 新增「无 config 文件时不创建」测试断言

### P2-3: Passport schema validation 增强 ✅
- 补充: data_provenance 标签值校验（SEALED/real/simulated）
- 6 个 stage\_* block: status 枚举、artifacts 数组、gates 对象校验
- integrity\_gate\_1/2: GateReport 各字段校验
- claim\_evidence\_map: 元素结构校验（claim\_id, evidence\_type, verification\_status）
- 新增 12 个验证测试

### P2-4: sci-status 语义分裂 ✅
- `omo-sci status` → 调用 `getProjectStatus()` / `formatProjectStatus()` 显示项目状态
- 新增 `omo-sci config` 显示安装配置状态
- `status` 支持 `--project <dir>` 参数

### P2-5: OpenCode 集成文档更新 ✅
- 移除 `opencode command list | grep sci-doctor` 等不可运行命令
- 改为 TUI 验收步骤说明
- 标注 plugin tool 裸对象形态 = "typecheck 通过，runtime 待验收"

### P2-6: opencode.json 覆盖风险 ✅
- handoff.md 和 opencode-integration-notes.md 中标注风险
- 未修改代码（Phase 2 前不需要正式 merge logic）

### 验证结果
- `bun run typecheck` ✅ 通过
- `bun test` ✅ 166/166 通过
- `bun run bin/omo-sci.ts status` ✅ 项目状态正常
- `bun run bin/omo-sci.ts config` ✅ 配置状态正常

---

## 2026-06-16 16:30 — Phase 0 Task 0: OpenCode 集成验证 ✅

### 操作
- WebFetch 获取 https://opencode.ai/docs/plugins/, /docs/commands/, /docs/agents/, /docs/config/ 四个页面
- 创建项目骨架: package.json, tsconfig.json, bunfig.toml, .gitignore
- 创建 CLI 入口 bin/omo-sci.ts
- 创建 src/index.ts (插件入口), src/doctor.ts, src/install.ts, src/status.ts
- 创建 .opencode/commands/sci-doctor.md, .opencode/agents/dubin.md
- 创建 docs/dev/opencode-integration-notes.md 记录集成契约

### 关键发现
- `@opencode-ai/plugin` 类型包**未发布到 npm**，是 CLI 内置的
- OpenCode 插件通过 `opencode.json` 注册，导出 register 函数
- 命令和 agent 通过 `.opencode/` 目录的 .md 文件声明
- 命令不能编程式注册——必须生成命令文件

### 测试结果
- `bun run typecheck` ✅ 通过
- `bun test` ✅ 15/15 通过
- `bun run bin/omo-sci.ts install --no-tui --providers deepseek --quota 200000000` ✅ 写入配置
- `bun run bin/omo-sci.ts doctor` ✅ 输出环境诊断

### 新增文件 (12)
src/index.ts, src/doctor.ts, src/install.ts, src/status.ts, bin/omo-sci.ts, package.json, tsconfig.json, bunfig.toml, .gitignore, docs/dev/opencode-integration-notes.md, .opencode/commands/sci-doctor.md, .opencode/commands/sci-status.md, .opencode/agents/dubin.md

---

## 2026-06-16 17:30 — Codex 审查问题修复 ✅

### 修复清单

#### 1. Install 测试污染真实用户配置
- `src/install.ts`: `install()` 函数增加可选 `installConfig` 参数（`configDir` 和 `projectDir`），默认值不变
- `tests/install.test.ts`: 使用 `mkdtempSync` + `rmSync` 临时目录隔离，结束后清理
- 删除被污染的 `~/.config/opencode/omo-sci/omo-sci.jsonc`

#### 2. OpenCode runtime 加载策略
- `src/install.ts`: 安装时同时写入项目级 `opencode.json`（`{ "plugin": ["omo-sci"] }`）
- `docs/dev/opencode-integration-notes.md`: 补充 OpenCode 运行时注册策略章节

#### 3. Plugin tool 注册形态
- `src/index.ts`: 改用 JSDoc 注释 + `any` 类型标注，移除 TypeScript 接口依赖
- `docs/dev/opencode-integration-notes.md`: 记录已验证的裸对象 tool 注册替代形态

#### 4. Dubin agent 医学安全边界
- `.opencode/agents/dubin.md`: 追加 7 条 IRON RULES 医学安全边界规则
- `src/install.ts` 中的 dubin agent 模板同步更新

#### 5. Doctor 状态语义修正
- `src/doctor.ts`:
  - `checkR()`: R 未安装返回 `warn` + 提示 "阶段 2 数据分析需要 R >= 4.3"
  - `checkConfigDir()`: 未配置返回 `warn` 而非 `ok`

#### 6. CLI 和 install 校验一致
- `src/install.ts`:
  - `PROVIDER_WHITELIST` 常量（7 个提供商）
  - `VALID_QUOTAS` 常量（3 个配额值）
  - `install()` 内部校验：providers 非空、provider whitelist、quota 枚举值
  - 校验失败时抛出明确 Error 消息

#### 7. 补充 `.opencode/commands/sci-status.md` — 已存在且内容完整

### 验证结果
- `bun run typecheck` ✅ 通过
- `bun test` ✅ 17/17 通过（新增 2 个校验测试）
- 污染配置已清除


## 2026-06-16 17:15 — Codex 审查修复 ✅

### 阻断问题修复
1. Install 测试隔离: install() 增加可选 installConfig 参数，测试用临时目录
2. OpenCode runtime 注册: install() 写入 opencode.json { "plugin": ["omo-sci"] }
3. Plugin tool 注册: 改用 JSDoc + any，记录裸对象替代形态

### 高优先级修复
4. Dubin agent 补 7 条医学安全 IRON RULES
5. Doctor R 未安装改为 warn
6. install() 内部增加 provider whitelist + quota 验证

### 测试
- bun test: 17/17 通过 (含 2 个新增校验测试)
- bun run typecheck: 通过
- 污染配置已清除

## 2026-06-16 17:45 — Task 1: 项目脚手架 ✅
- 创建 bunfig.toml (Bun test preload)
- 创建 README.md
- 创建 tests/setup.ts
- package.json 增加 jsonc-parser 依赖 + test:watch 脚本
- typecheck ✅, bun test 17/17 ✅
- 提交: ab8cc60

## 2026-06-16 18:00 — Task 2: Shared types ✅
- 创建 src/types.ts (376行)
- 含所有 Agent/Category/Pipeline/State/Hook/Router/Config 类型
- DataLabel, GateReport, SignoffRecord, ClaimEvidenceMap 与设计文档一致
- MaterialPassport layout 支持 'omo-sci' | 'codexsci-legacy'
- typecheck ✅, bun test 17/17 ✅
- 提交: 5d3053a

## 2026-06-16 18:15 — Task 3: Constants and config loader ✅
- 创建 src/constants.ts, src/config.ts
- 创建 tests/config.test.ts (3 tests)
- 修复 types.ts 中的 Config 接口以匹配
- typecheck ✅, bun test 21/21 ✅
- 提交: 7d6ca16

## 2026-06-16 18:30 — Task 4: Category router ✅
- 创建 src/router/provider.ts, categories.ts, fallback.ts
- 创建 tests/router/ (3 test files)
- types.ts 补全 ProviderId (zhipu, kimi, tencent-hy, opencode-go)
- typecheck ✅, bun test 35/35 ✅ (7 test files)

## 2026-06-16 18:45 — Task 5: Material Passport state system ✅
- 创建 src/state/passport.ts — DEFAULT_PASSPORT, load/save, updateStageState, validatePassportPreconditions, computeStageHash
- 创建 src/state/boulder.ts — createBoulder, load/save, addPendingTask, updateTaskStatus
- 创建 tests/state/passport.test.ts (22 tests), tests/state/boulder.test.ts (14 tests)
- Gate-i/Gate-ii 映射到 GateReport 类型
- typecheck ✅, bun test 71/71 ✅

## 2026-06-16 19:30 — Codex Task 5 审查修复 ✅
### 修复内容
- P1-1: computeStageHash 替换为递归 stableStringify，+4 碰撞测试
- P1-2: 统一配置路径为 .config/opencode/omo-sci.jsonc，install() 生成完整 OmoSciConfig
- P1-3: PROVIDER_WHITELIST 从 PROVIDER_REGISTRY 派生，删除硬编码
- P1-4: 新增 validatePassportSchema()，loadPassport 加载后自动验证
- P2-5: OpenCode 集成文档措辞修正为"推测形态，runtime 待验收"

### 测试: typecheck ✅, bun test 82/82 ✅
### 提交: d6f5704 (12 files, +308/-89)

## 2026-06-16 19:50 — Task 6: Hook registry ✅
- 创建 src/hooks/registry.ts, tests/hooks/registry.test.ts (5 tests)
- 提交: 968c953

## 2026-06-16 20:10 — Task 7-8: 全部 22 个钩子 ✅
- 创建 src/hooks/session.ts, stage.ts, delegation.ts, model.ts, quality.ts, review.ts, user.ts
- 创建 tests/hooks/session.test.ts (4 tests)
- typecheck ✅, bun test 91/91 ✅
- 提交: 90e70e5

## 2026-06-16 20:15 — Task 9: Environment checker ✅
- 创建 src/environment/reporter.ts, check.ts, tests/environment/reporter.test.ts
- typecheck ✅, bun test 99/99 ✅

## 2026-06-16 20:30 — Task 10: Safety ✅
- 创建 src/safety/circuit-breaker.ts, usage-tracker.ts + 测试 (14 tests)
- 修复 config.ts 浅拷贝→structuredClone
- typecheck ✅, bun test 114/114 ✅

## 2026-06-16 20:50 — Tasks 11-14: Phase 1 收尾 ✅
- Task 11: generateConfig 独立导出 + 7 新测试
- Task 12: 创建 src/commands/sci-doctor, sci-status, sci-usage, sci-start + .opencode/ 命令文件 + bin/omo-sci.ts 更新
- Task 13: 复制 7 个 opensci references
- Task 14: 创建 tests/integration/phase1.test.ts (6 integration tests)
- typecheck ✅, bun test 141/141 ✅
- 提交: 0d31bfc (17 files, +1924/-28)

## 🎉 Phase 1 完成
- 总测试: 141/141 通过
- 总源文件: 30+ TypeScript 文件
- 提交数: ~10 commits
