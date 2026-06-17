# omo-sci

> 医学科研 AI 智能体团队 — OpenCode 中文科研工作流插件

omo-sci 是一个运行在 [OpenCode](https://opencode.ai) 里的插件。你把一个临床困惑告诉它，它组织一支 AI 智能体团队，帮你一步步推进：理清研究问题 → 设计研究方案 → 做统计分析 → 写论文初稿 → 审稿润色 → 准备投稿材料。

它不是"一个聊天机器人回答你的问题"，而是"一支分工明确的 AI 研究团队在和你协作"。主编排者 **Dubin** 负责和你对话、拆解任务，其他 8 个专业 agent 各司其职（设计、搜索、统计、写作、审稿、投稿）。

---

## 运行环境

| 必需 | 说明 |
|------|------|
| [Bun](https://bun.sh) ≥ 1.2 | JavaScript 运行时，安装 omo-sci 用 |
| [OpenCode](https://opencode.ai) CLI | AI 编码终端，omo-sci 的宿主平台 |
| Git | 版本管理 |
| 至少一个可用的模型 provider | 例如 OpenCode Go、DeepSeek API 等 |

**可选但推荐：**

- R ≥ 4.3（统计分析阶段需要）
- MCP 文献检索工具（PubMed、CNKI、Cochrane、Exa 等）

---

## 快速开始

**1. 安装 CLI：**

```bash
bun install -g github:xxxxchaos/oh-my-sci
```

如果提示找不到 `omo-sci` 命令：

```bash
export PATH="$HOME/.bun/bin:$PATH"
```

**2. 进入你的研究项目目录，安装插件：**

```bash
cd ~/my-research-project
omo-sci install
```

**3. 启动 OpenCode，开始研究：**

```bash
opencode .
```

在 OpenCode 里输入 `/sci-start`，Dubin 会用中文引导你。例如你可以说：

> 我想研究 ICU 脓毒性休克患者中，颈动脉多普勒指标联合被动抬腿试验预测液体反应性的准确性。

接下来 Dubin 会逐步追问你的研究对象、干预方案、结局指标、数据条件等。

**这 3 步就够你开始用了。** 下面的内容是进阶参考。

---

## Agent 团队

| Agent | 角色 | 干什么 |
|-------|------|--------|
| Dubin | 主编排者 | 和你对话、澄清问题、拆解任务、汇总结果 |
| Archimedes | 研究设计师 | PICO 框架、FINER 评估、研究类型、样本量、偏倚控制 |
| IRBer | 计划审查员 | 方案质量、伦理风险、可行性预审 |
| Pubmeder | 文献搜索员 | PubMed/CNKI/Cochrane/Exa/Consensus 多源检索 |
| SPSSer | 统计分析师 | SAP 撰写、R 分析、诊断检查、敏感性分析 |
| Writer | 论文写作者 | 中英文初稿、结构化写作、参考文献验证 |
| Submitter | 投稿协调员 | 期刊匹配、投稿包、格式检查 |
| EBMer | 方法学审稿人 | Sprint Contract 盲审、方法学与数据一致性 |
| Polisher | 逻辑审稿人 | 去 AI 味、逻辑链、语言质量和一致性 |

---

## 核心命令速查

### OpenCode 斜杠命令（在 OpenCode TUI 里输入）

| 命令 | 用途 |
|------|------|
| `/sci-start` | 启动 Dubin 研究引擎，开始一个新项目 |
| `/sci-status` | 查看当前项目进展（阶段、待办任务） |
| `/sci-doctor` | 环境诊断 |
| `/sci-agent` | 查看和切换各 agent 的模型 |
| `/sci-usage` | 查看 token 用量 |

### CLI 命令（在终端里输入）

| 命令 | 用途 |
|------|------|
| `omo-sci install` | 在当前目录安装插件 |
| `omo-sci setup` | 向导菜单（安装、配置、诊断、卸载） |
| `omo-sci agent` | **交互式面板** — 查看/切换 9 个 agent 的模型 |
| `omo-sci doctor` | 环境诊断 |
| `omo-sci doctor --models` | 检查 agent 模型链是否一致 |
| `omo-sci configure --providers opencode-go,deepseek --quota 500000000` | 配置模型 provider |
| `omo-sci status` | 查看项目状态 |
| `omo-sci start` | 启动 Dubin 研究引擎 |
| `omo-sci uninstall` | 卸载（先预览再确认） |
| `omo-sci --version` | 查看版本号 |

---

## 典型操作示例

### 安装后验证一切正常

```bash
# 确认版本
omo-sci --version

# 环境诊断
omo-sci doctor

# 检查 agent 模型配置
omo-sci agent

# 确认 OpenCode 能看到 9 个 agent
opencode agent list | grep -E "dubin|archimedes|irber|pubmeder|spsser|writer|submitter|ebmer|polisher"
```

### 切换 agent 模型

```bash
# 进入交互面板（推荐，数字选择）
omo-sci agent

# 或直接命令行切换
omo-sci agent set dubin deepseek/deepseek-v4-pro    # 单个切换
omo-sci agent set all opencode-go/qwen3.7-max        # 全部切换
omo-sci agent reset                                   # 恢复默认
```

### 配置模型 provider

```bash
# 指定你实际拥有的 provider
omo-sci configure --providers opencode-go,deepseek --quota 500000000
```

omo-sci 会自动从 OpenCode 已登录的 provider 中读取可用模型，所以即使只配了 `opencode-go`，面板里也能看到 DeepSeek、Kimi、智谱等直接 API 模型（标注为"需先配置"）。

### 完整研究流程

```bash
# 1. 创建研究目录
mkdir sepsis-study && cd sepsis-study

# 2. 安装 omo-sci
omo-sci install

# 3. 启动 OpenCode
opencode .

# 4. TUI 中输入 /sci-start，Dubin 开始访谈
# 5. 完成阶段 0（意图访谈）→ 阶段 1（研究设计）→ 阶段 2（分析）...
```

---

## 卸载

```bash
omo-sci uninstall          # 预览后确认
omo-sci uninstall --yes    # 一键卸载
omo-sci uninstall --dry-run # 只预览不删除
```

卸载会删除 omo-sci 生成的 agent/command 文件和全局配置，保留你的研究数据和 Dubin 记忆。

---

## 当前限制

- **beta 阶段** — 适合实测和反馈，不建议直接用于正式伦理提交或未复核的论文投稿
- `doctor --models` 是静态检查，不发起真实 API 请求
- MCP 工具（文献数据库等）依赖你的本机配置
- 生成的所有内容（方案、统计、论文）必须由研究者复核
- IRBer/EBMer 的意见不是正式伦理批准

---

## 反馈

这是一个面向真实医学科研场景的早期项目。欢迎反馈任何体验问题：

- 哪一步卡住了？
- Dubin 问得是否清楚？
- 研究蓝图像不像真实可执行的方案？
- agent 的模型配置或调用体验哪里不顺？

如果你跑出了一个测试项目，建议记录：安装命令、provider、OpenCode 版本、卡住的地方、生成的关键文件和你觉得最需要改进的地方。

---

## 更多文档

- [安装指南](docs/guide/installation.md)
- [模型配置指南](docs/guide/model-setup.md)
- [快速开始](docs/guide/quickstart.md)
- [贡献者](CONTRIBUTORS.md)
