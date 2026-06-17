---
description: "omo-sci agent 管理 — 查看当前项目所有 agent 的模型分配和可用 provider"
agent: dubin
---

用户想看当前各 agent 用的是什么模型 provider。

请根据用户的提问执行以下操作：

**查看 agent 模型分配：**
```bash
bun run bin/omo-sci.ts agent
```

**查看可用 provider：**
```bash
bun run bin/omo-sci.ts agent providers
```

用中文向用户解释结果，特别是：
- 当前各 agent 的模型是否可用
- 哪些 agent 的模型不在 omo-sci 配置中（可能不可用）
- 如何切换模型

**切换单个 agent 的模型：**
```bash
bun run bin/omo-sci.ts agent set dubin opencode-go/deepseek-v4-pro
```

**将所有 agent 切换为同一模型：**
```bash
bun run bin/omo-sci.ts agent set all opencode-go/deepseek-v4-pro
```

**恢复为默认分配（按分类路由）：**
```bash
bun run bin/omo-sci.ts agent reset
```
