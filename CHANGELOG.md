# Changelog

## v0.2.2-local.202608201700 (2026-08-20)

模型矩阵更新（2026-08 国产模型密集发布：Kimi K3、GLM-5.3、Qwen 3.8-Max、DeepSeek V4 正式版）+ 修复一个独立的、更早就存在的 Kimi 套餐订阅命名不匹配 bug。本版本是紧急修复，尚未 push 或发布 Release；不含另一批仍标注"待复测"的提示词精修 WIP。

### 新模型接入

- 核实方式：直接读取本机 OpenCode 的模型目录缓存（`~/.cache/opencode/models.json`），不采信第三方博客文章里的具体模型 ID 字符串
- DeepSeek V4 Pro/Flash 正式版：模型 ID 未变（`deepseek-v4-pro`/`deepseek-v4-flash`），仓库里原有配置已经是对的，不需要改
- 新增：`qwen-bailian`/`opencode-go` 注册 `qwen3.8-max`；`zhipu`/`opencode-go` 注册 `glm-5.3`；`kimi`/`opencode-go` 注册 `kimi-k3`
- 这些新增只是让模型"可被选用"（`omo-sci agent providers` 可见、`omo-sci agent set` 可切换），**不改变任何 agent 的默认推荐模型**——刚发布的模型缺乏实测评估，默认值维持不动
- `doctor --models` 新增 GLM-5.2→5.3、Kimi K2.6→K3 的提示，仅供参考，不标记为"过期需升级"

### 修复：Kimi 套餐订阅模型命名不匹配（独立 bug，可能早于本次模型发布就存在）

排查用户反馈的运行时 404 报错时顺带发现：`kimi` provider 路由到的 `kimi-for-coding`（Kimi 编程套餐订阅）和官方按量计费的开放平台（`moonshotai-cn`）是两个不同产品，套餐订阅按"档位名"命名模型（`kimi-for-coding`/`k3`），不是按"代号"命名（`kimi-k2.6`/`kimi-k2.7-code`）。此前 `toAuthModelKey()` 把内部代号原样传给套餐 auth，套餐根本不认识这些模型名——任何真正走独立 `kimi` provider（而非 `opencode-go`）配置的用户，写入 agent 文件的 `kimi-for-coding/kimi-k2.7-code` 这类值实际上从未被套餐订阅正确识别过。

- `src/router/provider.ts`：`toAuthModelKey()` 从内联的 minimax 特例改为通用的 `MODEL_ID_TO_AUTH_ID` 翻译表，新增 kimi 的翻译：`kimi-k2.7-code → kimi-for-coding`（套餐标准档），`kimi-k3 → k3`（套餐 K3 档）
- `kimi-k2.6` 在套餐订阅里没有对应档位，从 `PROVIDER_REGISTRY['kimi']` 移除（想用 K2.6 请走 `opencode-go`，不受影响）；同步移除 `MODEL_HOME_PROVIDER` 里对应的过期条目
- `PROVIDER_REGISTRY['kimi'].name` 从"Kimi 开放平台"改为"Kimi 编程套餐 (Kimi For Coding)"，避免显示名继续暗示这是按量计费的开放平台
- 新增测试锁定翻译行为，以及 `canonicalModelKey`/`toAuthModelKey` 的往返一致性（`doctor --models` 依赖这条一致性才能正确识别真实安装后的 agent 文件，不会误报未知模型）

### 验证

- `bun run typecheck` ✅、`bun test` 209/209 ✅

## v0.2.2-local.202607192234 (2026-07-19)

基于固定 VV-ECMO 案例完成首轮真实 OpenCode TUI Stage 0/Stage 1 验收。本版本仍是本地候选版，尚未 push 或发布 Release。

### OpenCode 运行时与 Passport

- 修复全局 Bun 链接包无法被 OpenCode 的 npm 插件缓存解析，导致 Passport 工具没有注册的问题：`omo-sci install` 现在把自包含运行时 bundle 写入项目 `.opencode/plugins/omo-sci.js`
- 安装时移除旧 `opencode.json` 中失效的 `plugin: ["omo-sci"]` 声明；新项目不再为 omo-sci 创建 `opencode.json`，保留用户已有配置和其他插件
- `doctor` 独立校验模板、CLI 和运行时插件版本；缺少 runtime plugin 不再误报安装可用
- 新增 `passport-record-wisdom`；所有 Passport 写工具先做完整 schema 校验，畸形签核记录会停止写入
- 运行时 `tool.execute.before` 拦截 edit/write/patch/bash 直接操作 `.omo-sci/passport.json`，只能使用 `passport-*` 工具修改审计状态
- 卸载同步清理生成的运行时插件；安装完成提示明确插件路径并提醒重启已有 OpenCode 会话

### Agent 行为与科学性

- Pubmeder Stage 0 快搜增加 90 秒目标、3 分钟硬上限、最多 2 次 PubMed + 1 次可选源、禁止取全文/写文件，以及结构化 `QUICK_SEARCH_HANDOFF`
- Dubin 汇总快搜时必须保留 3-5 个 PMID/DOI/NCT，并通过专用工具记录 wisdom，禁止直接编辑 Passport
- Archimedes 增加时间依赖治疗设计约束：post-baseline 启动时间不得作为普通基线 Cox/RCS 暴露；明确 estimand、grace period、CCW 方差和事件数降级规则
- IRBer 增加引用身份一致性、时间依赖治疗、复合终点、模型复杂度和审查结论一致性检查
- IRBer、EBMer、Polisher 明确为“只写自身审查报告”，允许写报告但禁用 bash；注册表回归测试锁定权限和关键提示词

### 长期验收

- 新增 `docs/testing/real-tui-acceptance.md`，建立 L1 单元/类型、L2 安装/运行时、L3 固定 TUI、L4 探索性实测四层闭环
- 新增固定 VV-ECMO 基准案例和本轮原始失败记录，明确 P0/P1/P2、指标、目录命名和“模型行为至少复测两次”规则
- 真实复验已确认：`passport-status`、`passport-advance-stage` 在 OpenCode 中实际注册并执行；直接编辑 Passport 被 hook 拒绝；签核字段、风险数组和 wisdom 写入有效 schema

### 验证

- `bun run typecheck`：通过
- `bun test`：205/205 通过
- `bun pm pack --dry-run`：通过
- `omo-sci install --project-dir ~/opencode/medical` 后 `doctor` 14/14 通过；子目录新 OpenCode 会话完成 Passport 工具和直接编辑拦截冒烟
- 待 L3 行为复测：Stage 0 快搜预算和 Stage 1 方法学修订属于模型行为，需用同一固定案例各再跑两次后才能宣告稳定关闭

## v0.2.2-local.202607182252 (2026-07-18)

根据 v0.2.1 首次真实 OpenCode TUI 验收结果，修复混合安装、Passport 未生效和产物虚报问题。本版本仅作为本地验收版，尚未发布 GitHub Release。

### 安装与启动可靠性

- 5 个斜杠命令模板统一调用全局 `omo-sci` CLI，不再依赖普通项目中不存在的 `bin/omo-sci.ts`
- 安装时写入 `.opencode/omo-sci-install.json`，记录模板版本、安装根目录和 schema；`doctor` / `status` 会明确提示当前模板是本地安装、继承父目录、旧版或与 CLI 版本不一致
- `/sci-start` 必须先成功执行 `omo-sci start` 才能开始访谈；干净项目启动会真实创建 `.omo-sci/passport.json` 和 `boulder.json`
- 卸载同步删除安装 manifest 和全部 5 个命令模板；补上此前遗漏的 `sci-agent.md`

### Passport 与产物真实性

- 新增 `passport-record-artifact`：只登记项目内真实、非空普通文件，并计算 SHA-256；文件缺失、越界、为空或登记后被修改时拒绝阶段推进
- 为 Stage 1-5 定义必需产物清单。Stage 1 现在必须真实存在并登记研究蓝图、文献矩阵、搜索计划和 IRBer 审查报告
- 阶段推进必须保存用户确认和已知风险；同一句明确确认不会重复索要
- 修正阶段 hash 把旧 hash 自身再次参与计算造成的不稳定问题
- 闸门报告必须真实存在、非空且位于项目内，并保存 checksum

### 闸门状态机与 Agent 行为

- 修复 `Stage 2 → Gate I → Stage 3` / `Stage 3 → Gate II → Stage 4` 的循环依赖：Gate 现在是可正式进入的流水线节点，只有闸门工具记录 passed 后才能进入下一普通阶段
- `passport-record-gate` 只允许在当前流程已进入对应 Gate 时调用；Gate 到下一阶段的自动迁移不会伪造第二次用户签核
- Dubin 在宣布子 agent 完成前必须 Read 真实文件并调用产物登记工具；Pubmeder 深搜必须落盘 `Literature_Matrix.md` 和 `Search_Plan.md`
- 修正 Gate I “读正文”的时序矛盾：写作前只审 SAP、分析摘要、表图和诊断结果，Gate II 才审完整正文
- Pubmeder 快搜结果保留 3-5 个可核查 ID 和覆盖限制，并降低未经系统检索的“研究空白”断言强度

### 验证

- `bun test`：200/200 通过
- `bun run typecheck`：通过
- `bun pm pack --dry-run`：通过（59 个文件）
- 干净临时目录完成全局 CLI 版本、安装、启动、Passport/Boulder 创建、状态、doctor 模板来源和卸载 manifest 清理冒烟
- 待完成：在不继承旧 `.opencode` 的目录重新做一次真实 OpenCode TUI Stage 0 → Stage 1 验收

## v0.2.1 (2026-07-08)

修复 `/sci-start` 启动即报错的 bug（实测反馈：v0.1.18 使用中发现，v0.2.0 仍未修复）。

### 问题

`.opencode/commands/sci-start.md` 里给 Dubin 的启动指令写成"调用 `createInterview()`""调用 `getNextPrompt()`""运行 `/sci-doctor`"——这三者都不是 Dubin 能调用的东西：前两个是 `src/orchestrator/interview.ts` 里的纯 TypeScript 内部函数，从未注册为 Dubin 的工具；`/sci-doctor` 是给用户在聊天框里输入的斜杠命令，Dubin 自己没有触发它的能力。Dubin 的提示词要求"不编造调用结果"，于是每次 `/sci-start` 开场都会先声明这几个 API 不存在，然后才勉强以角色身份开始对话——体验上像是"启动就报错"。

其余 4 个命令文件（`sci-doctor.md`/`sci-status.md`/`sci-usage.md`/`sci-agent.md`）都遵循正确模式：指示 Dubin 用 bash 工具执行 `bun run bin/omo-sci.ts <子命令>`。唯独 `sci-start.md` 没有遵循这个模式。

### 修复

- `.opencode/commands/sci-start.md`：改为指示 Dubin 执行 `bun run bin/omo-sci.ts start`（该 CLI 子命令已存在，`bin/omo-sci.ts:99` 的 `case "start"` 内部会调用 `createInterview()`/`getNextPrompt()` 并返回开场提示文本），把输出结果作为对用户说的第一句话；`/sci-doctor` 改为"命令报错时建议用户自行运行"，不再要求 Dubin 自己执行

### 验证

- `bun run typecheck` ✅

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
