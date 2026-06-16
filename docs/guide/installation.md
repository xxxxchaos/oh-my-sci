# omo-sci 安装指南

## 系统要求

- **Bun** >= 1.1.x（运行时和包管理）
- **OpenCode** >= 0.6.x（智能体宿主 CLI）
- **Node.js** >= 20.x（Bun 自带兼容，部分工具链需 Node）
- 操作系统：macOS、Linux、Windows（WSL2 推荐）

## 安装 omo-sci

```bash
# 在你的项目目录中安装 omo-sci
bunx omo-sci install --providers opencode-go,deepseek --quota 500000000
```

安装时会输出一张“模型分配计划”表，明确每个 agent 实际写入 `.opencode/agents/*.md` 的 `model` 和 `model_fallback`。安装完成后，OpenCode 会自动加载 omo-sci 插件和 9 个医学科研 agent。

## 验证安装

运行环境诊断工具：

```bash
bun run bin/omo-sci.ts doctor
bun run bin/omo-sci.ts doctor --models
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
bun run bin/omo-sci.ts config
```

首次安装时会生成默认配置文件 `~/.config/opencode/omo-sci.jsonc`。
同时会把每个 agent 的实际运行模型写入当前项目的 `.opencode/agents/*.md`。建议在安装后运行 `doctor --models`，确认 agent 文件没有引用你未配置或不可用的模型，详情见 [模型配置指南](./model-setup.md)。

## 快速上手

安装并配置好模型后，在项目目录中运行：

```
/sci-start
```

Dubin 会引导你完成意图访谈 — 只需用自然语言描述你的研究计划。

## 卸载

```bash
# 移除 omo-sci 生成的配置文件
rm -rf ~/.config/opencode/omo-sci-profile/
rm ~/.config/opencode/omo-sci.jsonc

# 从项目 opencode.json 中移除 omo-sci plugin 条目
```

## 常见问题

**Q: 安装后 agent 不显示？**
A: 确保 opencode.json 中包含 `"plugin": ["omo-sci"]`。重启 OpenCode 会话。

**Q: MCP 工具找不到？**
A: 运行 `bun run bin/omo-sci.ts doctor` 检查环境。确保已配置 PubMed Search MCP 等必要工具。

**Q: 配置修改后不生效？**
A: omo-sci 在启动时读取配置。重启 OpenCode 会话或重新加载插件。

**Q: 某个 agent 调用了我没有配置的模型？**
A: 重新运行 `omo-sci install --providers <你的 provider 列表> --quota <额度>`，或手动检查 `.opencode/agents/*.md`。`doctor --models` 会标记 agent frontmatter 中不在 omo-sci 配置里的模型。
