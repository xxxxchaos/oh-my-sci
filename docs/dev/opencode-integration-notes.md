# OpenCode 集成契约

> 最后更新: 2026-06-16
> 来源: https://opencode.ai/docs/plugins/ + /docs/commands/ + /docs/agents/ + /docs/config/
> 状态: Phase 0 验证通过

## 插件加载机制

### npm 包作为插件

OpenCode 通过 `opencode.json` 中的 `plugin` 数组声明的 npm 包名加载插件：

```jsonc
{
  "plugin": ["omo-sci", "opencode-helicone-session"]
}
```

- OpenCode 在启动时自动用 Bun 安装 npm 插件，依赖缓存到 `~/.cache/opencode/node_modules/`
- 支持 scoped 包（`@scope/package`）和本地路径
- 插件是 **JavaScript/TypeScript 模块**，默认入口由 Node.js 模块解析决定（`package.json#main` 或 `#exports`）

### 插件入口导出

插件模块导出**一个或多个函数**。每个函数名成为钩子命名空间。函数签名：

```typescript
// 类型来自 @opencode-ai/plugin（CLI 内置，未发布到 npm）
import type { Plugin } from "@opencode-ai/plugin"

export const MyPlugin: Plugin = async (ctx) => {
  // ctx: { project, client, $, directory, worktree }
  return {
    // hooks 对象
  }
}
```

`ctx` 参数：
| 字段 | 类型 | 说明 |
|------|------|------|
| `project` | object | 当前项目信息 |
| `client` | object | OpenCode SDK 客户端，用于与 AI 交互 |
| `$` | function | Bun 的 shell API，用于执行命令 |
| `directory` | string | 插件目录路径 |
| `worktree` | string | 工作树路径 |

返回的 hooks 对象支持：
| Hook | 签名 | 说明 |
|------|------|------|
| `event` | `(input) => void` | 通用事件处理 |
| `"tool.execute.before"` | `(input, output) => void` | 工具执行前拦截 |
| `"tool.execute.after"` | `(input, output) => void` | 工具执行后拦截 |
| `"shell.env"` | `(input, output) => void` | 环境变量注入 |
| `"experimental.session.compacting"` | `(input, output) => void` | 会话压缩钩子 |
| `tool` | `Record<string, ToolDef>` | 注册自定义工具 |

### 自定义工具注册

通过 `tool` 属性**编程式注册**自定义工具，工具可被 agent 调用：

```typescript
import { tool } from "@opencode-ai/plugin"

export const MyPlugin: Plugin = async (ctx) => {
  return {
    tool: {
      mytool: tool({
        description: "工具描述",
        args: { foo: tool.schema.string() },
        async execute(args, context) {
          return `Hello ${args.foo}`
        }
      })
    }
  }
}
```

- 插件工具同名时覆盖内置工具
- tool helper 的 `schema` 提供 `.string()`、`.number()` 等类型方法

### 关键发现：@opencode-ai/plugin 包未发布到 npm

截至 2026-06-16，`@opencode-ai/plugin` **不存在于 npm registry 中**。该类型包是 OpenCode CLI 内置的，在 `.opencode/plugins/` 目录下的文件中可直接 import。

对于发布为 npm 包的插件，我们有两种方案：

1. **省略类型导入** — 在 `src/index.ts` 中直接导出函数，不使用 `Plugin` 类型标注
2. **本地类型存根** — 在项目中定义自己的 Plugin 类型

**本项目的选择：方案 1（见下文「冻结的集成形态」）**

### 推测形态（typecheck 通过，runtime 待验收）

由于不能 import `tool()` helper，本项目使用**裸对象形态**注册工具：

```typescript
// src/index.ts — 推测形态（typecheck 通过，runtime 待验收）
export const OmoSciPlugin = async (ctx) => {
  return {
    tool: {
      "sci-doctor": {
        description: "工具描述文字",
        async execute(args, context) {
          // 执行逻辑
          return "结果"
        },
      },
    },
  }
}
```

**形态差异**：
| 官方形态 (不可用) | 本项目替代形态 (推测，待验收) |
|---|---|
| `tool({ description, args, execute })` | 裸对象 `{ description, execute }` |
| `tool.schema.string()` 参数定义 | 无参数定义，不使用 `args` schema |
| `Plugin` 类型标注 | JSDoc 注释描述接口 |
| `import { tool } from "@opencode-ai/plugin"` | 无外部依赖 |

**验证状态**：该形态在 typecheck 和 test 中通过，但需在 OpenCode runtime 中真实验收。Runtime 验收需要在 OpenCode TUI 中执行 `/sci-doctor` 并确认输出，这是本地环境依赖的步骤，当前 CI 中无法自动覆盖。

## OpenCode 运行时注册策略

### 三个注册要素

OpenCode 需要以下三个要素才能识别 omo-sci：

| 要素 | 注册方式 | 文件 |
|---|---|---|
| 插件 (plugin) | `opencode.json` 中 `plugin: ["omo-sci"]` | 项目根目录 `opencode.json` |
| 命令 (command) | `.opencode/commands/*.md` 文件声明 | `sci-doctor.md`, `sci-status.md` |
| Agent | `.opencode/agents/*.md` 文件声明 | `dubin.md` |

### `opencode.json` 写入策略

`omo-sci install` 会在项目根目录写入 `opencode.json`：

```json
{
  "plugin": ["omo-sci"]
}
```

**注意事项**：
- 如果项目已有 `opencode.json`（例如同时安装了多个 OpenCode 插件），`install()` 当前会覆盖该文件
- 后续需要支持合并读取已有 `opencode.json` 的 plugin 数组
- 全局 `~/.config/opencode/opencode.json` 同样可以注册插件，但本项目优先使用项目级配置

### 验证命令

安装后，可用以下命令验证集成是否生效：

```bash
# 验证 dubin agent 是否可被 OpenCode 识别
opencode agent list | grep dubin

# 验证 sci-doctor 命令是否可被 OpenCode 识别
opencode command list | grep sci-doctor

# 验证 sci-status 命令是否可被 OpenCode 识别
opencode command list | grep sci-status
```

### 已知限制

- OpenCode runtime 对 `opencode.json` 中 `plugin` 数组的加载机制依赖 npm 包名解析，需要 `omo-sci` 包在 npm 上可访问，或通过本地路径加载
- 当前未在 OpenCode runtime 中完全验证插件加载 + tool 注册 + agent 识别的端到端流程
- 命令通过 `.opencode/commands/*.md` 文件声明，需要 OpenCode 在启动时扫描这些文件

## 自定义命令

### 定义方式（二选一）

**A. JSON 配置**（在 `opencode.json` 中）：

```jsonc
{
  "command": {
    "sci-doctor": {
      "template": "运行 omo-sci 环境检测工具。执行: bun run bin/omo-sci.ts doctor",
      "description": "omo-sci 环境诊断",
      "agent": "dubin"
    }
  }
}
```

**B. Markdown 文件**（在 `.opencode/commands/` 或 `~/.config/opencode/commands/` 中）：

文件名（不带 `.md`）即命令名。frontmatter 存放属性，body 为 prompt 模板。例如 `sci-doctor.md`：

```markdown
---
description: omo-sci 环境诊断
agent: dubin
---
运行 omo-sci 环境检测工具。执行: bun run bin/omo-sci.ts doctor
```

### 命令参数

| 占位符 | 说明 |
|--------|------|
| `$ARGUMENTS` | 完整参数字符串 |
| `$1`, `$2`, `$3` | 位置参数 |
| `` `command` `` | Shell 输出注入 |
| `@filename` | 文件内容自动包含 |

### 命令执行方式

- 用户输入 `/sci-doctor` 触发
- 模板作为 prompt 发送给 LLM
- 不支持编程式命令注册——命令只能通过配置或文件定义

## Agent 配置

### 定义方式（二选一）

**A. JSON 配置**：

```jsonc
{
  "agent": {
    "dubin": {
      "description": "医学科研主编排者——帮你从临床困惑到完整研究方案",
      "mode": "primary",
      "model": "deepseek/deepseek-v4-pro",
      "prompt": "你是一个重症医学导师型主编排者...",
      "permission": {
        "read": "allow",
        "edit": "ask",
        "bash": "allow",
        "glob": "allow",
        "grep": "allow"
      }
    }
  }
}
```

**B. Markdown 文件**（推荐，可与 npm 包独立发布）：

```markdown
---
description: 医学科研主编排者
mode: primary
model: deepseek/deepseek-v4-pro
permission:
  read: allow
  edit: ask
  bash: allow
---
你是 Dubin，一个重症医学导师型主编排者...
```

### Agent 字段

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `description` | string | 是 | 用途说明 |
| `mode` | `"primary" \| "subagent" \| "all"` | 否 | 默认 `"all"` |
| `model` | string | 否 | `provider/model-id` 格式 |
| `prompt` | string | 否 | 系统提示词 |
| `temperature` | number | 否 | 0.0-1.0 |
| `top_p` | number | 否 | 0.0-1.0 |
| `steps` | number | 否 | 最大迭代次数 |
| `permission` | object | 否 | 权限控制 |
| `disable` | boolean | 否 | 隐藏 |
| `hidden` | boolean | 否 | 从 `@` 自动补全隐藏 |
| `color` | string | 否 | 十六进制色或主题 token |

### Agent 选择方式

- **Primary agents**：Tab 键循环切换
- **Subagents**：`@` 提及自动调用

## 冻结的集成形态（基于 Phase 0 验证）

### `src/index.ts` 导出形态

`src/index.ts` 导出**一个或多个 OpenCode 插件函数**。这些函数是异步的，接收 ctx 对象，返回 hooks 对象。不需要 `@opencode-ai/plugin` 类型包。

```typescript
// src/index.ts — 插件入口
export const OmoSciPlugin = async (ctx: {
  project: unknown;
  client: unknown;
  $: (strings: TemplateStringsArray, ...values: unknown[]) => Promise<unknown>;
  directory: string;
  worktree: string;
}) => {
  return {
    // 可选的 hooks
    // tool: { ... }
    // event: async ({ event }) => { ... }
  };
};
```

### 命令注册方式

**命令不通过编程式注册**，而是通过 `.opencode/commands/` 目录下的 Markdown 文件声明。这些文件是 OpenCode 配置的一部分，随项目共享。

### Agent 注册方式

**Agent 不通过编程式注册**，而是通过 `.opencode/agents/` 目录下的 Markdown 文件或 `opencode.json` 中的 `agent` 对象声明。

### `package.json` 需要的字段

```jsonc
{
  "name": "omo-sci",          // 插件 npm 包名
  "version": "0.1.0",
  "type": "module",            // ESM
  "main": "src/index.ts",      // 插件入口（Bun 可直接加载 TS）
  "bin": {                     // CLI 二进制
    "omo-sci": "./bin/omo-sci.ts"
  },
  "dependencies": {
    // 运行时依赖
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "@types/bun": "latest"
  }
}
```

### 集成总结

```
omo-sci (npm 包)
  ├── src/index.ts              ← 导出 OmoSciPlugin 函数
  ├── bin/omo-sci.ts            ← CLI 二进制入口
  ├── .opencode/commands/       ← 命令 Markdown 文件
  │   └── sci-doctor.md
  └── .opencode/agents/         ← Agent Markdown 文件
      └── dubin.md

opencode.json 中配置:
  { "plugin": ["omo-sci"] }
```

插件本身只提供运行时能力和自定义工具。命令和 agent 的声明存在于 OpenCode 配置层，是项目级别的。

---

## 参考链接

- [Plugins 文档](https://opencode.ai/docs/plugins/)
- [Commands 文档](https://opencode.ai/docs/commands/)
- [Agents 文档](https://opencode.ai/docs/agents/)
- [Config 文档](https://opencode.ai/docs/config/)
- [SDK npm 包](https://www.npmjs.com/package/@opencode-ai/sdk)
