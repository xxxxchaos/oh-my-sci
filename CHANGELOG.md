# Changelog

## v0.2.0 (2026-07-08)

Agent 提示词质量优化 + 主张验证工具化，源于对 Claude Science 的调研和对 9 个 agent 提示词的系统性审读。

### 提示词修复（零代码风险）

- 新增统一的文件产物路径约定（`Study_Blueprint.md`/`SAP.md`/`Review_Reports/` 等固定根目录文件名），写入 Dubin 及全部子 agent 提示词，解决"文件写哪、下一步去哪找"的隐患
- 修正 Dubin 提示词里的"后台并行搜索"表述——委派子 agent 是阻塞等待，不是真正的后台并发
- 修正 Wisdom 系统描述，对齐真实实现：`wisdom.ts`（独立 markdown 文件）已在 v0.1.19 删除，Wisdom 记录实际走 Material Passport 的 `wisdom_collected` 结构化数组
- Submitter/Archimedes 增加期刊数据反幻觉硬约束：影响因子/接受率/审稿周期必须来自当次真实检索并标注时间，查不到就写"请自行核实"，不允许凭记忆给数值；Archimedes 只给期刊档次方向，具体推荐交给 Submitter
- Archimedes/IRBer/Writer/Submitter 补充输出骨架示例，提升国产模型的格式稳定性
- 修正 Polisher 的句长量化标准（中文按字数、英文按词数，此前"35 个词"对中文语义不明）
- 新增 `src/agents/shared.ts` 收拢禁用词列表为单一数据源——此前 Writer 和 Polisher 各抄一份，已经出现过一个词的差异

### 主张验证工具化

- 新增 `passport-record-claim` 工具：记录一条主张（论文关键陈述或参考文献引用）的证据验证结果，写入 Material Passport 的 `claim_evidence_map`。EBMer 验证主张、Writer 审计参考文献时都需要调用，参考文献审计复用 `evidence_type: "literature"`
- `passport-record-gate` 记录 `passed` 时新增校验：`claim_evidence_map` 不能为空、不能有 `missing`/`conflict` 状态的主张，否则拒绝——此前"30%/100% 关键主张验证"完全依赖 EBMer 自觉，现在没有真实记录就无法把闸门标记为通过
- EBMer/Writer 提示词同步更新为调用 `passport-record-claim`，而不是只在 Markdown 报告里叙述"已验证"
- 新增测试覆盖：claim_evidence_map 为空/存在未验证主张时拒绝记录闸门通过、`passport-record-claim` 的记录与去重更新行为

### 验证

- `bun run typecheck` ✅、`bun test` ✅ 187/187、`bun pm pack --dry-run` ✅
- 尚未验收：真实 OpenCode TUI 会话中 EBMer/Writer 是否会按提示词实际调用 `passport-record-claim`

## v0.1.19 (2026-07-07，第三部分)

架构通电：把 Material Passport 的阶段推进/闸门检查从"提示词约定"升级为"工具调用强制"，这是本轮重构最终交付的产品价值——此前 AI 只是被提示词要求推进阶段、记录闸门结果，完全可能走神跳过而不被发现；现在这些操作是真正会失败的工具调用。

- 调研确认 `@opencode-ai/plugin` 已发布在公共 npm registry（此前文档记录为未发布，已过时），加为正式 `dependencies`
- 新增 `src/plugin-tools.ts`：用官方 `tool()` helper 注册 `passport-status`（只读状态查询）、`passport-advance-stage`（推进阶段，前置条件不满足则 throw）、`passport-record-gate`（记录闸门I/II结果，前置条件不满足则 throw）
- `src/index.ts` 改用官方 `Plugin`/`tool()` 类型，不再是裸对象 + JSDoc 的推测形态；`sci-doctor` 工具同步迁移
- `src/agents/dubin.ts`、`src/agents/ebmer.ts` 更新提示词，要求调用上述工具而不是直接改 `passport.json`；同时删除对已废弃的 22-hook 系统的过时引用（`delegate:post`/`stage:exit`/`stage:gate_fail` 钩子名）
- 新增 `tests/plugin-tools.test.ts`：核心断言是前置条件不满足时必须 throw（不能跳过阶段、不能绕过未通过的闸门）
- 更新 `docs/dev/opencode-integration-notes.md`：记录调研发现的真实 OpenCode 运行时事件（`session.created`/`session.idle`/`session.compacted` 等）、`tool.execute.before/after` 的已知边界（能观察修改，能否用 throw 拦截未经证实）、`client.session.abort()` 可编程终止会话的确认能力；顺带修正一处已经过时的风险标注（`opencode.json` 合并逻辑早已修复，文档没同步）
- **尚未验收**：真实 OpenCode TUI 会话中 AI 是否会按提示词实际调用这些工具、失败时错误信息能否完整传导。需要人工跑一遍 `/sci-start` 验证，见 `docs/dev/opencode-integration-notes.md` 的验证命令章节
- `bun run typecheck` ✅、`bun test` ✅ 183/183、`bun pm pack --dry-run` ✅

## v0.1.19 (2026-07-07)

架构清理：删除从未被生产代码调用的模块（"仓库里没通电的设备"），使代码规模与实际运行的功能保持一致。

- 删除 22 个 lifecycle hooks 系统（`src/hooks/*`）及其 dispatch 机制：注册后从未被生产代码触发
- 删除 `src/safety/`（circuit-breaker、usage-tracker、content-guard、sprint-contract）：零调用者，熔断/用量追踪/内容安全/盲审合同均未接入实际运行路径
- 删除 `src/orchestrator/delegation.ts`、`src/orchestrator/summarizer.ts`：零调用者
- 删除 `src/state/wisdom.ts`：零调用者
- 删除 `src/router/fallback.ts`：零调用者
- 删除 `src/environment/check.ts`、`src/environment/reporter.ts`：零调用者（`doctor --models` 走的是 `model-version-check.ts`，不经过这两个文件）
- 删除 `src/commands/sci-doctor.ts`：CLI 直接使用 `src/doctor.ts`，这层包装从未被引用
- 删除 `src/index.ts` 中未被消费的 `AGENT_MANIFEST` 常量
- `src/types.ts` 同步删除 `HookName`/`HookContext`/`HookHandler` 类型及 `OmoSciConfig.disabled_hooks` 字段
- 同步删除对应测试：`tests/hooks/`、`tests/safety/`、`tests/integration/phase1.test.ts`、`tests/orchestrator/{delegation,summarizer}.test.ts`、`tests/state/wisdom.test.ts`、`tests/router/fallback.test.ts`、`tests/environment/reporter.test.ts`
- 本次清理不改变任何用户可见行为（CLI、agent 提示词、安装流程、Material Passport 读写均未改动）
- 代码量从约 10144 行降至 7192 行；测试数从 281 降至 164（全部为已确认存活路径）

架构并档：agent 的分类/显示名/模型链此前分散在 5 处定义（`src/types.ts`、`src/model-config.ts`、`src/router/categories.ts`、`scripts/generate-agent-configs.ts` 各有一份），其中 EBMer 的分类在两处互相矛盾。收敛为单一数据源。

- 新增 `src/registry.ts`：`AGENT_REGISTRY` 作为唯一数据源，包含每个 agent 的分类、显示名、描述、模型优先链、权限；同时提供 `buildAgentFrontmatter()` 供生成脚本和测试共用
- `src/types.ts` 删除未被任何代码使用的 `AGENT_CATEGORY` 常量（该文件自述"纯类型文件"，这个值导出本就是违规写入）
- `src/model-config.ts` 删除自带的 `AGENT_CATEGORIES`（与 types.ts 版本冲突的那份），改为从 registry 读取
- `src/router/categories.ts` 删除 `AGENT_DISPLAY_NAMES`、`AGENT_FALLBACK_ORDERS`（agent 级映射，已迁入 registry），保留 `CATEGORY_LABELS`/`DEFAULT_FALLBACK_ORDERS`/`DEFAULT_MODEL_DENYLIST`（分类级配置，概念不同，供 `install.ts` 使用）
- `scripts/generate-agent-configs.ts` 删除自带的 `CATEGORY_DEFAULT_MODEL`/`CATEGORY_FALLBACKS`/`agents` 数组/`getPermissions()`，改为读取 registry
- `src/environment/model-version-check.ts`、`src/commands/sci-agent.ts` 改为从 registry 导入 `AGENT_CATEGORY`/`AGENT_DISPLAY_NAMES`
- 新增 `tests/registry.test.ts`：断言 registry 数据完整性，并新增"漂移守卫"测试——用 registry 重新渲染每个 agent 的 frontmatter，必须与仓库里已提交的 `.opencode/agents/*.md` 逐字节一致，防止未来再次出现生成脚本与实际生效配置脱节
- **修正了真实存在的默认模板错误**（此前 5 处映射打架导致的后果）：重新生成 `.opencode/agents/*.md` 后，irber 默认模型从 `qwen3.7-plus` 改为 `qwen3.7-max`，spsser 从 `qwen3.7-max` 改为 `deepseek-v4-pro`，writer 从 `glm-5.2` 改为 `qwen3.7-plus`，另有 4 个 agent 的 fallback 顺序/供应商前缀订正。**这些修正对已安装用户无影响**——`omo-sci install` 每次都会用 `applyAgentModelPlan()` 按 `AGENT_FALLBACK_ORDERS`（本次迁入 registry 的那份）重写这些字段，此前的错误只存在于仓库里的默认模板文本，从未被真实安装流程读取
- `bun run typecheck` ✅、`bun test` ✅ 176/176

## v0.1.18 (2026-06-20)

- 根据 `模型调研-moonshot.pdf` 更新默认模型矩阵：Qwen 3.7 Plus/Max 负责长程编排和研究设计，MiniMax M3/Kimi K2.6 负责文献检索，DeepSeek V4 Pro 负责统计代码，GLM-5.2 负责审稿和中文规范文本
- 新增 agent 级模型推荐矩阵，不再只按粗粒度能力分类写入 agent frontmatter
- provider 选择改为模型自家 provider 优先，`opencode-go` 自动作为兜底，减少 OpenCode Go 额度消耗
- `qwen-bailian` 注册 `qwen3.7-plus`，并补充面板说明
- 安装完成提示改为先运行 `omo-sci configure` 选择 provider，再运行 `omo-sci agent` 检查各 agent 模型
- Pubmeder 文献源分层：`unified_search` / PubMed 作为必选 MCP；CNKI、Consensus、Cochrane、Exa、Zotero、browser 作为可选增强源
- 安装配置和默认配置不再把 CNKI / Consensus 当作必需依赖，降低朋友初次安装门槛
- `doctor` 增加 MCP 依赖声明：明确 PubMed 是核心依赖，可选工具缺失不阻塞核心流程
- 修正 `doctor --models` 对 `MCP 必选/unified_search` 的误导性警告：必选 MCP 已声明时显示为通过，仅在文案中提醒真实可用性由 OpenCode runtime 决定
- Pubmeder / Dubin 提示词增加数据库覆盖级别声明，避免把 Consensus 语义检索误写成系统综述级传统数据库检索
- README 和安装指南同步更新 PubMed 必选、CNKI/Consensus 可选的安装预期

## v0.1.17 (2026-06-18)

- 修复 v0.1.16 推荐模型只停留在文案的问题：`generateConfig()` 现在按能力分类推荐矩阵排序 fallback chain
- 默认 `opencode-go` 安装时，Dubin/IRBer/Submitter 使用 `qwen3.7-plus`，Pubmeder 使用 `minimax-m3 -> kimi-k2.6`
- 注册 Kimi K2.6，并从非编程 agent 默认链中移除 `kimi-k2.7-code`
- `doctor --models` 现在同时识别 omo-sci 内部 provider 名和 OpenCode auth provider 名，修复 `zhipuai-coding-plan` / `minimax-cn-coding-plan` 误报
- 模型版本检查改为按 agent/category 限定，`qwen3.7-max -> qwen3.7-plus` 只对编排层提示
- 更新 `.opencode/agents/*.md` 默认 frontmatter，并增加测试锁定 v0.1.17 推荐路由

## v0.1.16 (2026-06-17)

- REQ-01: Pubmeder 两阶段搜索 — 阶段0快速摸底(MiniMax M3) + 阶段1深度检索(Kimi K2.6)
- REQ-02: 编排层 Max→Plus — Dubin/IRBer/Submitter 默认用 Qwen 3.7 Plus
- REQ-03: `doctor --models` 增加模型版本检查，自动提示可用升级

## v0.1.15 (2026-06-17)

- P0-1 (ISSUE-04): Provider 名称映射 — 写入 agent .md 时自动转换缩写为 auth.json 实际名
- P0-2 (ISSUE-02): Dubin 透明度规则 — IRON RULES 新增第8条"如实报告执行路径"
- P1 (REQ-04): Kimi K2.7 Code 过滤 — 非编程 agent 禁止，编排层警告
- chinese-writing 默认升级为 GLM-5.2

## v0.1.14 (2026-06-17)

- CJK 排版改用两行格式（纯 ASCII agent 名 + 缩进中文）
- isCustom 改为检测 model_fallback 是否存在

## v0.1.13 (2026-06-17)

- 面板宽度 56→64，agent 排序与 1-9 数字一致，已自定义 agent 前显示 ✓

## v0.1.12 (2026-06-17)

- 修复 omo-sci 只读取自己配置中的 provider、忽略 OpenCode 已登录 provider 的问题
- `collectConfiguredProviders()` 现在自动从 `~/.local/share/opencode/auth.json` 发现可用 provider
- 新增 `AUTH_PROVIDER_MAP` 映射表（OpenCode auth ID → omo-sci ProviderId）

## v0.1.11 (2026-06-17)

- 模型选择面板重构为两层：第一层选模型族（按 model_id 去重），第二层选 provider 来源
- 新增翻页支持（每页 5 个模型，N 下一页 / P 上一页）
- 未配置 provider 的模型也会显示，标注"需先运行 omo-sci configure"
- 修复只有已配置 provider 模型才显示的问题——现在展示 PROVIDER_REGISTRY 全部模型

## v0.1.10 (2026-06-17)

- 修复直连 API 模型不显示的问题——collectAllModels 补充 PROVIDER_REGISTRY 完整模型

## v0.1.9 (2026-06-17)

- 修复同一模型多个 provider 的识别问题（如 deepseek-v4-pro 可来自 opencode-go 订阅或 deepseek API）
- 模型选择面板按来源分组：`★ 订阅` vs `── 按量 API`，每组显示资费说明
- MODEL_DESCRIPTIONS 扩展至 13 条，覆盖所有 provider 变体（含 providerDesc 字段标注来源与资费）
- OpenCode Go provider registry 补充 glm-5.1、minimax-m3、deepseek-v4-flash

## v0.1.8 (2026-06-17)

- 新增 `omo-sci --version` / `-v` / `version` 查看版本号
- `omo-sci agent` 交互式面板重构：
  - 无子命令时进入全屏信息面板（agent 分配表 + providers + quota 一目了然）
  - 按数字 [1-9] 选择 agent → 进入模型选择面板（含中文模型描述和推荐说明）
  - [A] 全部切换、[R] 恢复默认、[P] 查看模型池、[Q] 退出
  - 每个模型附带中文描述（优势 + 注意事项），帮助初学者选型
  - 非交互环境自动降级为简洁表格输出
- `omo-sci agent set/reset/providers` 子命令保留为高级用法

## v0.1.7 (2026-06-17)

- 新增 `omo-sci agent` 命令：一站式查看和切换 agent 模型分配
  - `omo-sci agent` — 查看 9 个 agent 的当前模型、分类和 fallback 链
  - `omo-sci agent providers` — 按能力分类列出可用模型池
  - `omo-sci agent set <agent> <model>` — 切换单个 agent 的模型
  - `omo-sci agent set all <model>` — 全部切为同一模型
  - `omo-sci agent reset` — 恢复为分类路由默认分配
- 新增 `/sci-agent` OpenCode 命令：在 TUI 中查看和切换 agent 模型
- 新增项目级 `CLAUDE.md`：迭代工作流规则，确保 CHANGELOG/log/handoff 及时更新

## v0.1.6 (2026-06-17)

- 推荐安装方式改为全局安装：`bun install -g github:xxxxchaos/oh-my-sci`
- 安装后统一使用短命令：`omo-sci install`、`omo-sci setup`、`omo-sci doctor --models`
- CLI 安装完成后的下一步提示改为全局命令，避免继续复制 `bunx github:...`
- README 和安装指南增加 Bun 全局 bin PATH 提醒：`export PATH="$HOME/.bun/bin:$PATH"`
- `bunx github:...` 保留为免安装临时用法，不再作为推荐主路径

## v0.1.5 (2026-06-17)

- 清理 GitHub beta 命令体验：继续使用简洁的 `bunx github:xxxxchaos/oh-my-sci ...`，不强制带版本 tag
- 保留关键说明：`bunx github:...` 是临时执行，不会把 `omo-sci` 注册到 shell PATH
- 安装完成后的下一步提示改为 `bunx github:xxxxchaos/oh-my-sci setup/configure/doctor`
- 将 GitHub release notes 改为中文表达
- 将 `CONTRIBUTORS.md` 改为中文，并明确列出 Codex

## v0.1.4 (2026-06-17)

- 修正 GitHub beta 使用说明：`bunx github:... install` 是临时执行，不会把 `omo-sci` 注册到 shell PATH
- README、安装指南和 CLI 帮助曾改为带 tag 的 GitHub beta 命令，例如 `bunx github:xxxxchaos/oh-my-sci#v0.1.4 setup`
- 安装完成后的下一步提示同时给出 GitHub beta 命令和全局安装后的 `omo-sci` 简写
- 避免用户在安装后直接运行 `omo-sci setup` 遇到 `command not found`

## v0.1.3 (2026-06-17)

- 新增 `omo-sci uninstall`，支持 `--dry-run` 预览、交互确认、`--yes` 一键卸载
- 卸载只删除 omo-sci 生成的 9 个 agent、4 个 command、全局配置和 `opencode.json` 中的 `omo-sci` 插件项，默认保留 Dubin 进化记忆
- 新增 `omo-sci setup` 向导菜单，把安装、配置、状态、诊断、卸载集中到一个入口
- `omo-sci configure` 无参数时进入 provider/quota 选择向导，降低朋友试用门槛
- 改善 `omo-sci config` 未安装提示，改为 GitHub beta 安装命令
- `install` 现在会合并已有 `opencode.json` 的 plugin 数组，不再覆盖其他插件和字段
- README、安装指南、贡献者说明和 GitHub release 信息同步完善

## v0.1.2 (2026-06-17)

- 简化安装命令：`omo-sci install` 现在可零参数运行
- 安装默认使用 `opencode-go` 和 5 亿 token 本地提醒额度，先生成一套可运行配置
- 新增 `omo-sci configure` / `omo-sci setup`，用于安装后配置或更新 providers 与 quota
- README 和安装/模型配置指南改为“两段式”：先安装，再配置模型
- 保留高级用法：`install --providers ... --quota ...` 仍可一次完成安装和配置

## v0.1.1 (2026-06-16)

- 安装时输出 9 个 agent 的模型分配计划，明确实际写入 `.opencode/agents/*.md` 的 `model` / `model_fallback`
- fresh install 后根据用户选择的 providers 重写 agent frontmatter，避免 Archimedes/SPSSer 等 agent 优先调用用户未配置的模型
- 新增 `doctor --models` 静态检查，标记当前项目 agent 模型链与 `~/.config/opencode/omo-sci.jsonc` 不一致的情况
- 新增 `src/model-config.ts` 统一维护 agent → capability category → model chain 映射
- 补充模型配置和安装指南，说明 OpenCode 实际运行以 agent frontmatter 为准
- 测试增加到 255 pass，覆盖安装模型计划、frontmatter 重写和模型链不一致检查

## v0.1.0 (2026-06-16)

- 初始版本
- 9 agent 医学科研智能体团队
- 6 阶段 + 2 闸门流水线
- 6 能力分类路由
- 22 生命周期钩子
- Material Passport + Boulder + Wisdom 状态系统
- Dubin 进化记忆系统
- 熔断器 + 内容安全 + 用量监控
- 国内 7 大模型提供商支持
