# Changelog

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
