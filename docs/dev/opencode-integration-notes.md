# OpenCode 集成契约

> 最后更新: 2026-07-19
> 来源: 本机 OpenCode 1.18.3 真实 TUI 验收、`@opencode-ai/plugin`/`@opencode-ai/sdk` 类型定义，以及 https://opencode.ai/docs/plugins/
> 状态: 当前安装契约已在真实 OpenCode 会话验证；历史 npm 包名方案仅保留作机制说明

## 插件加载机制

### 项目本地插件（omo-sci 当前方案）

OpenCode 启动时会自动扫描项目 `.opencode/plugins/` 和用户级 `~/.config/opencode/plugins/`。这里的 JavaScript/TypeScript 模块不需要写入 `opencode.json` 的 `plugin` 数组。

`omo-sci install` 会用 Bun 把 `src/runtime-entry.ts` 及依赖打成自包含 ESM，并写到：

```text
.opencode/plugins/omo-sci.js
```

这样 CLI 可以通过 GitHub 或 Bun 全局链接安装，OpenCode runtime 仍能从项目目录确定性加载同版本插件。安装或升级后必须重启已打开的 OpenCode 会话。

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

**真实验收发现**：`bun install -g .` 或 `bun install -g github:...` 只保证终端里存在全局 CLI，不保证包已进入 OpenCode 自己的 npm 插件缓存。因此 `plugin: ["omo-sci"]` 在 GitHub beta / Bun 全局安装场景会出现“命令和 agent 存在，但自定义 Passport 工具缺失”的半安装状态。omo-sci 不再使用这种注册方式；安装器会清理旧声明。

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

返回的 hooks 对象支持（完整列表见本机 `node_modules/@opencode-ai/plugin/dist/index.d.ts` 的 `Hooks` 接口）：
| Hook | 签名 | 说明 |
|------|------|------|
| `event` | `(input: { event: Event }) => Promise<void>` | 通用事件处理，`Event` 是 SDK 真实广播的事件联合类型（见下方「已确认的运行时事件」） |
| `tool` | `Record<string, ToolDefinition>` | 注册自定义工具，用 `tool()` helper 定义 |
| `"tool.execute.before"` / `"tool.execute.after"` | `(input, output) => Promise<void>` | 每次工具调用前后触发，可读写 `output.args`/`output.output`/`output.metadata`。**已确认可以观察和修改参数/结果；能否用 throw 拒绝调用未经证实**——已发布的第三方插件（如 oh-my-openagent）都只用它做记录/通知，没有用来否决调用 |
| `"permission.ask"` | `(input: Permission, output: { status: "ask"\|"deny"\|"allow" }) => Promise<void>` | 拦截触发权限确认的操作（如 agent 配置 `edit: ask` 时的编辑动作），可设置 `status: "deny"` 真正拒绝。**只对 `ask` 权限模式的操作生效**，agent 配置为 `allow` 的操作不会走这个钩子 |
| `"shell.env"` | `(input, output) => Promise<void>` | 环境变量注入 |
| `"experimental.session.compacting"` / `"experimental.compaction.autocontinue"` | `(input, output) => Promise<void>` | 会话压缩前后钩子——对应此前设计但已删除的 `quality:compaction_pre/post` |
| `"experimental.chat.system.transform"` | `(input, output: { system: string[] }) => Promise<void>` | 可修改发给模型的 system prompt——理论上可以用来自动注入 Material Passport 摘要，本轮未实现 |
| `"chat.message"` / `"chat.params"` | — | 新消息到达时 / 修改发给 LLM 的参数 |

### 已确认的运行时事件（`event` hook 的 `Event.type`）

来自 `@opencode-ai/sdk` 的 `gen/types.gen.d.ts`，这些不是猜测出来的名字，是 SDK 真实定义的事件类型：

- `session.created` / `session.updated` / `session.deleted` / `session.idle` / `session.status` / `session.compacted` / `session.error` / `session.diff`
- `message.updated` / `message.removed` / `message.part.updated` / `message.part.removed`
- `permission.updated` / `permission.replied`
- `file.edited` / `file.watcher.updated`

这些是此前被删除的 `hooks/session.ts` 等模块想要模拟、但凭空发明名字的那类信号的**真实版本**。如果要复活会话状态自动保存，应该订阅这些真实事件，而不是重新设计一套自定义 hook 名。

### 已确认：可编程终止会话

`ctx.client`（`PluginInput.client`，即 `createOpencodeClient()` 返回值）暴露 `client.session.abort(...)`（`@opencode-ai/sdk` 的 `SessionAbortData`/`SessionAbortResponses`）。即使 `tool.execute.before` 的 throw 语义未经证实，插件仍然有一条确定可行的路径：在 `event` 或 `tool.execute.before` 里累计步数/循环特征，超限时调用 `client.session.abort()` 强制结束整个会话——用"总闸"代替"精确拦截单次调用"。本轮未实现，留给后续熔断器复活时使用。

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

### 2026-07-07 更新：@opencode-ai/plugin 已确认发布在 npm

`npm view @opencode-ai/plugin version` 返回真实结果（截至本次调研 latest 为 `1.17.14`，与本机 OpenCode CLI 版本 1.17.13 同步发布），2026-06-16 记录的"不存在于 npm registry 中"已经过时。已在 `package.json` 中把它加为正式 `dependencies`（`^1.0.0`），`src/index.ts` 和 `src/plugin-tools.ts` 直接 `import { tool, type Plugin } from '@opencode-ai/plugin'`，不再使用下方的"推测形态"。

`tool()` helper 本身只是一个恒等函数（`dist/tool.js`：`export function tool(input) { return input; }`），不做运行时 zod 校验——校验由 OpenCode 宿主在调用 `execute()` 之前完成。这意味着单元测试可以直接用普通对象调用 `execute(args, context)`，不需要真的跑一遍 zod parse。

以下「推测形态」章节保留作历史记录，不再是当前实现。

### 2026-06-16 的推测形态（已废弃，见上）

当时判断 `@opencode-ai/plugin` 不可用，因此使用**裸对象形态**注册工具：

```typescript
// 已废弃的旧形态
export const OmoSciPlugin = async (ctx) => {
  return {
    tool: {
      "sci-doctor": {
        description: "工具描述文字",
        async execute(args, context) {
          return "结果"
        },
      },
    },
  }
}
```

现在的形态见本文档「Passport 强制工具」章节和 `src/index.ts`/`src/plugin-tools.ts` 源码。

## OpenCode 运行时注册策略

### 三个注册要素

OpenCode 需要以下三个要素才能识别 omo-sci：

| 要素 | 注册方式 | 文件 |
|---|---|---|
| 插件 (plugin) | 项目本地自包含 ESM，OpenCode 自动扫描 | `.opencode/plugins/omo-sci.js` |
| 命令 (command) | `.opencode/commands/*.md` 文件声明 | `sci-doctor.md`, `sci-status.md` |
| Agent | `.opencode/agents/*.md` 文件声明 | `dubin.md` |

### `opencode.json` 兼容策略

新项目不需要为 omo-sci 创建 `opencode.json`。如果项目已有该文件，安装器只移除旧版 `plugin` 数组里的 `omo-sci`，保留 MCP、主题、其他插件和其余字段；卸载器也执行同样的兼容清理。

### 验证命令

以下命令可用于验证 OpenCode 集成状态（仅列出已验证可行的 CLI 命令）：

```bash
# 验证 dubin agent 是否可被 OpenCode 识别（已验证通过）
opencode agent list | rg dubin
# 预期输出: dubin (primary) 或类似行

# 验证安装清单和运行时 bundle 版本
omo-sci doctor
# 预期：模板、CLI 与 OpenCode 运行时插件版本一致

# 验证本地插件代码是否被 OpenCode 真实加载
# 在 OpenCode TUI 中输入以下命令并确认输出：
#   /sci-doctor           — 验证 sci-doctor 工具是否注册
#   /sci-status           — 验证 sci-status 命令是否生效
#   /@dubin <你的问题>    — 验证 dubin agent 是否可被调用
#   要求 Dubin 调用 passport-status，界面应出现同名自定义工具
#   明确签核 Stage 0 后，应出现 passport-advance-stage
#   要求直接 edit .omo-sci/passport.json，应被运行时 hook 拒绝
```

> **注意**: `opencode command list` 子命令在当前 OpenCode CLI 中不可用，使用 TUI 中的 `/` 命令执行作为替代验收方式。

以上 Passport 三项已于 2026-07-19 在 OpenCode 1.18.3 真实会话通过；日志确认调用的是自定义工具而非 Bash 同名字符串，直接 edit 的错误也成功传回模型。

### 已知限制

- 运行时 bundle 是安装时快照；CLI、agent 或插件代码升级后必须重新运行 `omo-sci install` 并重启 OpenCode
- 命令通过 `.opencode/commands/*.md` 文件声明，需要 OpenCode 在启动时扫描这些文件
- `tool.execute.before` 中 throw 拒绝 edit/write/bash 直接操作 Passport 已在真实 TUI 验证；它是防绕过的补充，自定义 `passport-*` 工具自身仍负责 schema、前置条件和原子写入
- TUI 的模型行为和 MCP 结果具有非确定性，不能由单元测试替代；长期验收规则见 `docs/testing/real-tui-acceptance.md`

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

## Passport 强制工具

在 `src/plugin-tools.ts` 里用官方 `tool()` helper 注册 Passport 工具，把阶段推进、产物、主张、经验和闸门记录从"提示词约定"升级为"工具调用强制"：

| 工具 | 作用 | 强制点 |
|---|---|---|
| `passport-status` | 只读，返回当前阶段/闸门/数据溯源标签摘要 | 无（只读） |
| `passport-advance-stage` | 把 passport 推进到目标阶段 | 内部调用 `validatePassportPreconditions()`（`src/state/passport.ts` 已有且已测试的纯函数），前置条件不满足直接 `throw`，OpenCode 会把这次工具调用标记为失败 |
| `passport-record-gate` | 记录闸门 I/II 检查结果 | 同上，额外校验进入该闸门的前置条件（如闸门 I 要求阶段 2 已完成） |
| `passport-record-claim` | 记录主张/引用核验状态 | Gate 通过前拒绝空记录以及 `missing`/`conflict` |
| `passport-record-artifact` | 登记真实产物及 SHA-256 | 拒绝缺失、空文件、越界路径和登记后被修改的文件 |
| `passport-record-wisdom` | 记录跨会话经验 | 统一写入结构化 `wisdom_collected` |

设计要点：
- `throw` 在自定义工具的 `execute()` 里必定导致调用失败——这是标准 tool-calling 框架的基本契约，不依赖上面「已知限制」里提到的、尚未证实的 `tool.execute.before` 拦截语义
- `passportAdvanceStage` 有一个时序细节：目标阶段的前置条件（如"上一阶段已完成"）在这次调用之前必然不成立，因为"完成当前阶段"和"推进"是同一次调用要做的两件事。解决方式是先在内存里构造一份"当前阶段已标记完成"的候选 passport，据此校验目标阶段的前置条件，通过后才真正持久化——这样既不会误拒正常的逐阶段推进，也不会放行跳级（因为只有 `current_stage` 被标记完成，中间被跳过的阶段仍是 `pending`）
- 所有写工具先验证 Passport schema；Dubin/EBMer 的提示词要求使用专用工具，运行时 hook 进一步阻止 edit/write/bash 绕过工具直接改 JSON

2026-07-19 真实 TUI 已验证 `passport-status`、`passport-advance-stage` 的注册与执行，以及直接 edit Passport 的拒绝和错误传递。Gate/claim/artifact 仍由单元测试覆盖，需随以后阶段 2-3 的 L3 验收继续观察模型是否主动正确调用。

## 冻结的集成形态（基于 Phase 0 验证，工具注册部分已被上一节取代）

### `src/index.ts` 导出形态

`src/index.ts` 导出 `OmoSciPlugin`，类型标注为 `@opencode-ai/plugin` 的 `Plugin`。

```typescript
// src/index.ts — 插件入口（当前实现）
import { tool, type Plugin } from '@opencode-ai/plugin';

export const OmoSciPlugin: Plugin = async () => {
  return {
    tool: {
      'sci-doctor': tool({ description: '...', args: {}, async execute() { /* ... */ } }),
      'passport-status': passportStatus,
      'passport-advance-stage': passportAdvanceStage,
      'passport-record-gate': passportRecordGate,
      'passport-record-claim': passportRecordClaim,
      'passport-record-artifact': passportRecordArtifact,
      'passport-record-wisdom': passportRecordWisdom,
    },
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
    "@opencode-ai/plugin": "^1.0.0", // tool() helper + Plugin 类型，已确认发布在 npm
    "jsonc-parser": "^3.0.0"
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "@types/bun": "latest"
  }
}
```

### 集成总结

```
omo-sci 安装包
  ├── src/index.ts                    ← 导出 OmoSciPlugin
  ├── src/runtime-entry.ts            ← bundle 单一入口
  ├── bin/omo-sci.ts                  ← CLI
  └── .opencode/{commands,agents}/    ← 模板源

安装后的研究项目
  └── .opencode/
      ├── plugins/omo-sci.js          ← OpenCode 实际加载的自包含运行时
      ├── commands/*.md
      └── agents/*.md
```

插件本身只提供运行时能力和自定义工具。命令和 agent 的声明存在于 OpenCode 配置层，是项目级别的。

---

## 参考链接

- [Plugins 文档](https://opencode.ai/docs/plugins/)
- [Commands 文档](https://opencode.ai/docs/commands/)
- [Agents 文档](https://opencode.ai/docs/agents/)
- [Config 文档](https://opencode.ai/docs/config/)
- [SDK npm 包](https://www.npmjs.com/package/@opencode-ai/sdk)
