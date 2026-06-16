# omo-sci

医学科研智能体团队 — OpenCode 插件

## 安装

```bash
bunx omo-sci install --providers opencode-go,deepseek --quota 500000000
```

安装时会打印 9 个 agent 的模型分配计划，并写入当前项目的 `.opencode/agents/*.md`。

安装后建议先检查环境和模型配置：

```bash
omo-sci doctor --models
```

## 命令

- `/sci-start` — 开始新研究，Dubin 引导结构化访谈
- `/sci-status` — 查看当前项目状态
- `/sci-usage` — 查看 token 用量明细
- `/sci-doctor` — 环境诊断

## 项目结构

```
omo-sci/
├── src/          # 插件源码
├── bin/          # CLI 入口
├── .opencode/    # OpenCode agent/command 定义
├── docs/         # 文档
└── references/   # 医学科研领域知识（继承 opensci/codexsci）
```
