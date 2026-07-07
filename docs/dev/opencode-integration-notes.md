# OpenCode 集成契约

> 最后更新: 2026-07-07
> 来源: 本机已安装 OpenCode CLI（v1.17.13）的 `@opencode-ai/plugin`/`@opencode-ai/sdk` 类型定义（`npm view` 已确认发布在公共 npm registry，latest 1.17.14）+ 2026-06-16 版 https://opencode.ai/docs/plugins/ 等文档
> 状态: 2026-06-16 的部分结论已过时，见下方「2026-07-07 更新」章节

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
- 全局 `~/.config/opencode/opencode.json` 同样可以注册插件，但本项目优先使用项目级配置

> **P2-6 已修复（2026-07-07 复核确认）**：本节此前记录"`install()` 直接写入会覆盖已有配置"的风险。复核 `src/install.ts` 的 `mergeOpencodeConfig()` 发现该函数已经会读取已有 `opencode.json`、保留其余字段、把 `plugin` 数组去重合并后再写入——这个风险已经不存在，只是文档没有同步更新。

### 验证命令

以下命令可用于验证 OpenCode 集成状态（仅列出已验证可行的 CLI 命令）：

```bash
# 验证 dubin agent 是否可被 OpenCode 识别（已验证通过）
opencode agent list | rg dubin
# 预期输出: dubin (primary) 或类似行

# 验证本地插件代码是否可被 OpenCode 加载
# 在 OpenCode TUI 中输入以下命令并确认输出：
#   /sci-doctor           — 验证 sci-doctor 工具是否注册
#   /sci-status           — 验证 sci-status 命令是否生效
#   /@dubin <你的问题>    — 验证 dubin agent 是否可被调用
#
# 验证 Passport 强制工具（2026-07-07 新增，尚未做过）：
#   /sci-start 走一遍到阶段 0 完成，观察 Dubin 是否真的调用了
#   passport-advance-stage 而不是自己改 passport.json；
#   故意在 passport.json 里把 stage_0_intake.status 改回 pending，
#   再让 Dubin 尝试推进阶段，确认工具调用报错、AI 能看到错误信息
#   并如实告诉用户，而不是假装成功。
#
# 注意: TUI 验收是本地环境依赖的步骤，当前 CI 中无法自动覆盖。
```

> **注意**: `opencode command list` 子命令在当前 OpenCode CLI 中不可用，使用 TUI 中的 `/` 命令执行作为替代验收方式。

### 已知限制

- OpenCode runtime 对 `opencode.json` 中 `plugin` 数组的加载机制依赖 npm 包名解析，需要 `omo-sci` 包在 npm 上可访问，或通过本地路径加载
- 当前未在 OpenCode runtime 中完全验证插件加载 + tool 注册 + agent 识别的端到端流程
- 命令通过 `.opencode/commands/*.md` 文件声明，需要 OpenCode 在启动时扫描这些文件
- plugin tool 已改用官方 `tool()` helper（见 `src/plugin-tools.ts`），typecheck 和单元测试通过；但和 2026-06-16 时一样，**尚未在真实 OpenCode TUI 会话里验证 `passport-advance-stage`/`passport-record-gate` 被 AI 实际调用、报错能正确传导给 AI**。这是本地环境依赖的步骤，CI 中无法自动覆盖，需要人工在 OpenCode TUI 里跑一遍 `/sci-start` 流程验收
- `tool.execute.before` 里 throw 能否直接拒绝内置工具（bash/edit/write）调用，未经证实（见上文「已确认的运行时事件」表格）。当前 Passport 强制工具走的是"注册全新自定义工具，内部逻辑 throw"这条已确认可行的路径，没有依赖这个未证实的假设

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

## Passport 强制工具（2026-07-07，第一个"通电"实现）

在 `src/plugin-tools.ts` 里用官方 `tool()` helper 注册了三个工具，把 Material Passport 的阶段推进/闸门检查从"提示词约定"升级为"工具调用强制"：

| 工具 | 作用 | 强制点 |
|---|---|---|
| `passport-status` | 只读，返回当前阶段/闸门/数据溯源标签摘要 | 无（只读） |
| `passport-advance-stage` | 把 passport 推进到目标阶段 | 内部调用 `validatePassportPreconditions()`（`src/state/passport.ts` 已有且已测试的纯函数），前置条件不满足直接 `throw`，OpenCode 会把这次工具调用标记为失败 |
| `passport-record-gate` | 记录闸门 I/II 检查结果 | 同上，额外校验进入该闸门的前置条件（如闸门 I 要求阶段 2 已完成） |

设计要点：
- `throw` 在自定义工具的 `execute()` 里必定导致调用失败——这是标准 tool-calling 框架的基本契约，不依赖上面「已知限制」里提到的、尚未证实的 `tool.execute.before` 拦截语义
- `passportAdvanceStage` 有一个时序细节：目标阶段的前置条件（如"上一阶段已完成"）在这次调用之前必然不成立，因为"完成当前阶段"和"推进"是同一次调用要做的两件事。解决方式是先在内存里构造一份"当前阶段已标记完成"的候选 passport，据此校验目标阶段的前置条件，通过后才真正持久化——这样既不会误拒正常的逐阶段推进，也不会放行跳级（因为只有 `current_stage` 被标记完成，中间被跳过的阶段仍是 `pending`）
- Dubin/EBMer 的提示词已更新为要求调用这些工具而不是直接改 `passport.json`（见 `src/agents/dubin.ts`「Passport 工具」小节、`src/agents/ebmer.ts`「记录闸门结果」小节）

**尚未验收**：真实 OpenCode TUI 会话里，AI 是否会按提示词要求实际调用这些工具、调用失败时错误信息能否完整传给 AI。这需要人工在 OpenCode TUI 跑一遍 `/sci-start` 完整流程验证。

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
