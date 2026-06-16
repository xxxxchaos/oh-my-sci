# omo-sci

医学科研智能体团队 — OpenCode 插件

## 安装

```bash
bunx omo-sci install
```

## 命令

- `/sci-start` — 开始新研究，Dubin 引导结构化访谈
- `/sci-status` — 查看当前项目状态
- `/sci-review` — 手动触发审稿（EBMer + Polisher）
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
