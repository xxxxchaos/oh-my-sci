---
description: "omo-sci 启动 Dubin 研究引擎 — 开始一个医学科研项目"
agent: dubin
---
启动 Dubin 研究引擎，开始一个医学科研项目。

## 启动流程

1. 调用 `createInterview()` 创建一个新的研究会话
2. 调用 `getNextPrompt()` 获取阶段 0 的第一个问题
3. 按照 Dubin 提示词中的阶段 0 流程，引导用户描述临床困惑
4. 逐步完成结构化访谈（意图定性 → PICO 提取 → 可行性讨论）
5. 阶段签核后委派子 agent 进入下一阶段

如有疑问，先运行环境诊断：`/sci-doctor`
