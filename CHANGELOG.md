# Changelog

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
