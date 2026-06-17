# omo-sci

医学科研智能体团队，运行在 OpenCode 里的中文科研工作流插件。

omo-sci 的目标是把一个临床研究想法，逐步推进成可执行的研究方案、统计分析计划、论文初稿和投稿材料。它不是单个聊天助手，而是一组分工明确的 agent：Dubin 负责和你对话、拆解任务和把关节奏，其他 specialist agent 负责研究设计、文献检索、统计分析、写作、审稿和投稿准备。

> 当前版本：v0.1.1 beta。适合朋友小范围实测和反馈，不建议直接用于正式伦理提交、临床决策或未复核的论文投稿。

## 它能做什么

- 从一句临床困惑开始，引导你澄清研究问题和 PICO。
- 生成研究蓝图，包括研究类型、纳排标准、结局指标、样本量思路和偏倚控制。
- 起草统计分析计划，包括变量清单、主分析、敏感性分析和缺失值处理。
- 帮你组织文献检索、论文写作、逻辑润色、方法学审查和投稿准备。
- 用 Material Passport / Boulder 记录项目阶段、闸门状态和中断恢复信息。
- 在安装时按你实际拥有的模型 provider 生成每个 agent 的运行模型，避免 agent 调用你没配置的模型。

## Agent 团队

| Agent | 角色 | 主要任务 |
|------|------|----------|
| Dubin | 主编排者 | 和用户对话、澄清问题、拆解任务、汇总结果 |
| Archimedes | 研究设计师 | PICO、FINER、研究类型、样本量、偏倚控制 |
| IRBer | 计划审查员 | 方案质量、伦理风险、可行性预审 |
| Pubmeder | 文献搜索员 | PubMed/CNKI/Cochrane/Exa/Consensus 检索思路 |
| SPSSer | 统计分析师 | SAP、R 分析、诊断、敏感性分析 |
| Writer | 论文写作者 | 中英文初稿、结构化写作、参考文献审计 |
| Submitter | 投稿协调员 | 期刊匹配、投稿包、格式检查 |
| EBMer | 方法学审稿人 | Sprint Contract、方法学盲审、主张证据一致性 |
| Polisher | 逻辑审稿人 | 去 AI 味、逻辑链、语言质量和一致性 |

## 系统要求

- Bun >= 1.2
- OpenCode CLI
- Git
- Node.js >= 20（多数情况下 Bun 环境已足够）
- 可用的模型 provider，例如 `opencode-go`、`deepseek`、`qwen-bailian`、`minimax` 等

可选但推荐：

- R >= 4.3，用于后续统计分析阶段
- 文献检索相关 MCP 工具，例如 PubMed、CNKI、Exa、Consensus

## 快速安装

在你要开展研究项目的目录里运行：

```bash
bunx github:xxxxchaos/oh-my-sci install
```

参数说明：

- 默认会先用 `opencode-go` 生成一套可运行配置。
- 如果你要指定自己的模型 provider，可以在安装后运行 `omo-sci configure`。
- 将来发布到 npm 后，同样可以使用 `bunx omo-sci install`。

```bash
omo-sci configure --providers opencode-go,deepseek --quota 500000000
```

`configure` 参数说明：

- `--providers`：你实际可用的模型 provider，逗号分隔。只配置自己能调用的 provider。
- `--quota`：月 token 配额，用于本地用量提醒。

安装时会打印一张模型分配表，例如：

```text
模型分配计划（将写入 .opencode/agents/*.md）:
  Agent        Category              Primary model                    Fallback
  dubin        agent-orchestration   opencode-go/qwen3.7-max          deepseek/deepseek-v4-pro
  archimedes   deep-reasoning        deepseek/deepseek-v4-pro         opencode-go/qwen3.7-max
```

这张表很重要：OpenCode 实际运行 agent 时读取的是当前项目 `.opencode/agents/*.md` 里的 `model` / `model_fallback`，不是只看全局配置文件。

## 验证安装

安装完成后先运行：

```bash
omo-sci doctor
omo-sci doctor --models
```

`doctor --models` 会检查当前项目 agent 文件里的模型链，是否都出现在 omo-sci 配置中。如果看到某个 agent 引用了你没有配置的模型，建议重新运行 install 并调整 `--providers`。

也可以检查 OpenCode 是否能看到 agent：

```bash
opencode agent list
```

你应该能看到 `dubin`、`archimedes`、`irber`、`pubmeder`、`spsser`、`writer`、`submitter`、`ebmer`、`polisher`。

## 开始一个研究项目

进入你的研究项目目录，启动 OpenCode：

```bash
opencode .
```

在 OpenCode 里输入：

```text
/sci-start
```

Dubin 会用中文引导你描述临床问题，例如：

```text
我想研究 ICU 脓毒性休克患者中，颈动脉多普勒指标联合被动抬腿试验预测液体反应性的准确性。
```

接下来它会逐步追问研究对象、干预/暴露、对照、结局、数据条件、可行性和你希望先生成什么产物。

## 常用命令

| 命令 | 用途 |
|------|------|
| `/sci-start` | 启动 Dubin 研究引擎 |
| `/sci-status` | 查看当前项目 Passport / Boulder 状态 |
| `/sci-usage` | 查看 token 用量和配额 |
| `/sci-doctor` | 环境诊断 |

CLI 也可以直接运行：

```bash
omo-sci start
omo-sci status
omo-sci usage
omo-sci doctor --models
```

## 典型工作流

1. 安装 omo-sci 并确认模型配置。
2. 用 `/sci-start` 启动 Dubin。
3. 完成阶段 0：研究意图访谈和 PICO 澄清。
4. 生成阶段 1：研究蓝图和方案审查意见。
5. 进入阶段 2：统计分析计划和数据分析准备。
6. 后续推进论文写作、审稿、润色和投稿准备。

目前 beta 版本更适合先跑前几个阶段，重点观察访谈体验、研究蓝图质量、统计分析计划质量和模型配置体验。

## 模型配置

omo-sci 支持以下 provider：

| Provider | 说明 |
|----------|------|
| `opencode-go` | OpenCode Go 包月/内置模型 |
| `deepseek` | DeepSeek 官方或兼容 API |
| `qwen-bailian` | 阿里百炼 Qwen |
| `zhipu` | 智谱 |
| `kimi` | Kimi |
| `minimax` | MiniMax |
| `tencent-hy` | 腾讯混元 |

如果只想用一个 provider，例如只用 Qwen：

```bash
omo-sci configure --providers qwen-bailian --quota 500000000
```

这样 9 个 agent 都会写入 Qwen 模型，不会默认去调用 DeepSeek 或其他 provider。

更多说明见：

- [安装指南](docs/guide/installation.md)
- [模型配置指南](docs/guide/model-setup.md)
- [快速开始](docs/guide/quickstart.md)

## 当前限制

- `doctor --models` 当前是静态检查，不会默认发起真实 API 请求；它能发现配置不一致，但不能保证远端 API 当前一定可用。
- MCP 工具和数据库检索能力依赖你的本机 OpenCode/MCP 配置。
- 生成的研究方案、统计分析计划和论文内容必须由研究者复核。
- IRBer / EBMer 的意见不是正式伦理批准，也不能替代真实 IRB / Ethics Committee 审查。
- 本项目不提供临床诊疗建议，不应用于临床决策。

## 开发

```bash
bun install
bun run typecheck
bun test
```

项目结构：

```text
omo-sci/
├── src/          # 插件源码
├── bin/          # CLI 入口
├── .opencode/    # OpenCode agent/command 定义
├── docs/         # 文档
└── references/   # 医学科研领域知识参考
```

## 反馈

这是一个面向真实医学科研场景的早期 beta。欢迎反馈：

- 哪个阶段卡住了？
- Dubin 问得是否清楚？
- 研究蓝图是否像真实可执行方案？
- 统计分析计划是否足够严谨？
- 哪个 agent 的模型配置或调用体验不顺？

如果你在本地跑出了一个测试项目，建议记录：安装命令、provider、OpenCode 版本、卡住的步骤、生成的关键文件和你认为最需要改进的地方。
