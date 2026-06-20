# omo-sci 安装指南

## 系统要求

- **Bun** >= 1.1.x（运行时和包管理）
- **OpenCode** >= 0.6.x（智能体宿主 CLI）
- **Node.js** >= 20.x（Bun 自带兼容，部分工具链需 Node）
- 操作系统：macOS、Linux、Windows（WSL2 推荐）

## 安装 omo-sci

```bash
# 先全局安装 omo-sci CLI
bun install -g github:xxxxchaos/oh-my-sci
```

如果安装后提示找不到 `omo-sci`，先把 Bun 的全局 bin 目录加入 PATH：

```bash
export PATH="$HOME/.bun/bin:$PATH"
```

然后进入你的项目目录，安装 omo-sci 到当前项目：

```bash
omo-sci install
```

安装时会先使用 `opencode-go` 作为兜底生成一套可运行配置，并输出“模型分配计划”表，明确每个 agent 实际写入 `.opencode/agents/*.md` 的 `model` 和 `model_fallback`。安装完成后，建议先运行 `omo-sci configure` 选择你自己的模型 provider，再运行 `omo-sci agent` 检查各 agent 分配。

将来发布到 npm 后，也可以使用 `bunx omo-sci install`。

如果不熟悉命令行，安装后运行：

```bash
omo-sci setup
```

这个向导会集中提供安装、模型配置、状态检查、环境诊断和卸载入口。

临时体验、不想全局安装时，也可以使用：

```bash
bunx github:xxxxchaos/oh-my-sci install
```

但 `bunx github:...` 不会把 `omo-sci` 注册到 PATH，后续命令也需要继续写完整的 `bunx github:xxxxchaos/oh-my-sci ...`。

如果你要指定自己的模型 provider，在安装后运行：

```bash
omo-sci configure
omo-sci configure --providers qwen-bailian,zhipu,kimi,minimax,deepseek --quota 500000000
```

## 验证安装

运行环境诊断工具：

```bash
omo-sci doctor
omo-sci doctor --models
# 或通过 OpenCode TUI 输入 /sci-doctor
```

系统会检查：

- Bun 版本
- Git 可用性
- OpenCode 配置
- omo-sci 配置文件完整性
- 当前项目 agent 模型链与 omo-sci 配置是否一致（`--models`）
- MCP 工具声明：PubMed MCP（`unified_search`）为必选；CNKI、Consensus、Cochrane、Exa 等为可选增强源

## 模型配置

omo-sci 使用 6 个能力分类路由，每个分类需要至少配置一个模型。

查看当前配置：

```bash
omo-sci config
```

首次安装时会生成默认配置文件 `~/.config/opencode/omo-sci.jsonc`。
同时会把每个 agent 的实际运行模型写入当前项目的 `.opencode/agents/*.md`。如果后续修改 provider 或 quota，运行 `omo-sci configure --providers ... --quota ...` 即可重写配置。建议在安装或配置后运行 `doctor --models`，确认 agent 文件没有引用你未配置或不可用的模型，详情见 [模型配置指南](./model-setup.md)。

## 快速上手

安装并配置好模型后，在项目目录中运行：

```
/sci-start
```

Dubin 会引导你完成意图访谈 — 只需用自然语言描述你的研究计划。

## 卸载

```bash
# 先预览将删除/更新的文件
omo-sci uninstall --dry-run

# 交互确认卸载
omo-sci uninstall

# 非交互一键卸载
omo-sci uninstall --yes
```

默认会删除当前项目中 omo-sci 生成的 agent/command、从 `opencode.json` 移除 `omo-sci` 插件项，并删除全局配置 `~/.config/opencode/omo-sci.jsonc`。Dubin 进化记忆目录默认保留；如需同时删除，运行 `omo-sci uninstall --profile`。

## 常见问题

**Q: 安装后 agent 不显示？**
A: 确保 opencode.json 中包含 `"plugin": ["omo-sci"]`。重启 OpenCode 会话。

**Q: MCP 工具找不到？**
A: 运行 `omo-sci doctor` 检查环境。PubMed MCP（默认工具名 `unified_search`）是 Pubmeder 的核心依赖；CNKI 和 Consensus 是可选增强源，没装也可以继续用 PubMed 核心检索。

**Q: 配置修改后不生效？**
A: omo-sci 在启动时读取配置。重启 OpenCode 会话或重新加载插件。

**Q: 某个 agent 调用了我没有配置的模型？**
A: 重新运行 `omo-sci configure`，或手动检查 `.opencode/agents/*.md`。`doctor --models` 会标记 agent frontmatter 中不在 omo-sci 配置里的模型。
