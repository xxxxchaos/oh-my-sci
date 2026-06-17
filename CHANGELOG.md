# Changelog

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
