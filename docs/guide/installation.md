# omo-sci 安装指南

## 系统要求

- **Bun** >= 1.1.x（运行时和包管理）
- **OpenCode** >= 0.6.x（智能体宿主 CLI）
- **Node.js** >= 20.x（Bun 自带兼容，部分工具链需 Node）
- 操作系统：macOS、Linux、Windows（WSL2 推荐）

## 安装 omo-sci

```bash
# 在你的项目目录中安装 omo-sci
bunx github:xxxxchaos/oh-my-sci install
```

安装时会先使用默认 provider `opencode-go` 生成一套可运行配置，并输出“模型分配计划”表，明确每个 agent 实际写入 `.opencode/agents/*.md` 的 `model` 和 `model_fallback`。安装完成后，OpenCode 会自动加载 omo-sci 插件和 9 个医学科研 agent。

将来发布到 npm 后，也可以使用 `bunx omo-sci install`。

如果不熟悉命令行，安装后运行：

```bash
bunx github:xxxxchaos/oh-my-sci setup
```

这个向导会集中提供安装、模型配置、状态检查、环境诊断和卸载入口。

注意：GitHub beta 阶段的 `bunx github:...` 是临时执行，不会把 `omo-sci` 命令永久安装到 shell PATH。除非你另行做了全局安装，否则后续命令都继续使用 `bunx github:xxxxchaos/oh-my-sci ...`。

如果你要指定自己的模型 provider，在安装后运行：

```bash
bunx github:xxxxchaos/oh-my-sci configure
bunx github:xxxxchaos/oh-my-sci configure --providers opencode-go,deepseek --quota 500000000
```

## 验证安装

运行环境诊断工具：

```bash
bunx github:xxxxchaos/oh-my-sci doctor
bunx github:xxxxchaos/oh-my-sci doctor --models
# 或通过 OpenCode TUI 输入 /sci-doctor
```

系统会检查：

- Bun 版本
- Git 可用性
- OpenCode 配置
- omo-sci 配置文件完整性
- 当前项目 agent 模型链与 omo-sci 配置是否一致（`--models`）
- 必需 MCP 工具就绪状态

## 模型配置

omo-sci 使用 6 个能力分类路由，每个分类需要至少配置一个模型。

查看当前配置：

```bash
bunx github:xxxxchaos/oh-my-sci config
```

首次安装时会生成默认配置文件 `~/.config/opencode/omo-sci.jsonc`。
同时会把每个 agent 的实际运行模型写入当前项目的 `.opencode/agents/*.md`。如果后续修改 provider 或 quota，运行 `bunx github:xxxxchaos/oh-my-sci configure --providers ... --quota ...` 即可重写配置。建议在安装或配置后运行 `doctor --models`，确认 agent 文件没有引用你未配置或不可用的模型，详情见 [模型配置指南](./model-setup.md)。

## 快速上手

安装并配置好模型后，在项目目录中运行：

```
/sci-start
```

Dubin 会引导你完成意图访谈 — 只需用自然语言描述你的研究计划。

## 卸载

```bash
# 先预览将删除/更新的文件
bunx github:xxxxchaos/oh-my-sci uninstall --dry-run

# 交互确认卸载
bunx github:xxxxchaos/oh-my-sci uninstall

# 非交互一键卸载
bunx github:xxxxchaos/oh-my-sci uninstall --yes
```

默认会删除当前项目中 omo-sci 生成的 agent/command、从 `opencode.json` 移除 `omo-sci` 插件项，并删除全局配置 `~/.config/opencode/omo-sci.jsonc`。Dubin 进化记忆目录默认保留；如需同时删除，运行 `bunx github:xxxxchaos/oh-my-sci uninstall --profile`。

## 常见问题

**Q: 安装后 agent 不显示？**
A: 确保 opencode.json 中包含 `"plugin": ["omo-sci"]`。重启 OpenCode 会话。

**Q: MCP 工具找不到？**
A: 运行 `bunx github:xxxxchaos/oh-my-sci doctor` 检查环境。确保已配置 PubMed Search MCP 等必要工具。

**Q: 配置修改后不生效？**
A: omo-sci 在启动时读取配置。重启 OpenCode 会话或重新加载插件。

**Q: 某个 agent 调用了我没有配置的模型？**
A: 重新运行 `bunx github:xxxxchaos/oh-my-sci configure`，或手动检查 `.opencode/agents/*.md`。`doctor --models` 会标记 agent frontmatter 中不在 omo-sci 配置里的模型。
