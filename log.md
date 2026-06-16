# omo-sci 开发日志

> 项目: omo-sci — 医学科研智能体团队 OpenCode 插件
> 开始: 2026-06-16
> 方式: Subagent-Driven Development

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
