# omo-sci 项目规则

> 适用: Claude Code 及所有 AI agent

## 技术栈

- 运行环境: Bun (路径 `/Users/dr.xie/.bun/bin/bun`)
- 语言: TypeScript strict mode
- 测试: `bun test`
- 类型检查: `bun run typecheck`
- 平台: OpenCode 插件

## 每次迭代必做

1. **CHANGELOG.md** — 新增版本条目，写清楚做了什么、对用户有什么影响
2. **log.md** — 追加时间戳记录：改了哪些文件、测试结果、提交 hash
3. **handoff.md** — 更新当前版本、验证状态、已知事项。面向下一个接手的 agent/人
4. **package.json** — 更新 version 字段

## 提交与推送

```bash
git add -A
git commit -m "feat: <简短描述>"
git push origin main
```

- 禁止提交: `sci-test00/`、`.omo-sci/`、`实测记录.md`、`node_modules/`（已在 .gitignore）
- GitHub: `https://github.com/xxxxchaos/oh-my-sci`

## 关键文件索引

| 文件 | 用途 |
|------|------|
| `src/types.ts` | 所有 TypeScript 接口定义 |
| `src/agents/*.ts` | 9 个 agent 的系统提示词（源码） |
| `.opencode/agents/*.md` | 9 个 agent 的 OpenCode 配置（含 model、完整 prompt） |
| `.opencode/commands/*.md` | 4 个斜杠命令定义 |
| `scripts/generate-agent-configs.ts` | 从 TS 生成 .md |
| `bin/omo-sci.ts` | CLI 入口 |
| `src/install.ts` | 安装 + 配置生成 |
| `src/model-config.ts` | agent 模型映射逻辑 |
| `src/state/passport.ts` | Material Passport |
| `src/orchestrator/interview.ts` | Dubin 访谈状态机 |
| `src/safety/` | 熔断器、用量追踪、内容安全、Sprint Contract |

## 设计文档

- `docs/superpowers/specs/2026-06-16-omo-sci-design.md` — 完整设计文档
- `docs/superpowers/plans/2026-06-16-omo-sci-implementation.md` — 实现计划
- `docs/guide/` — 用户文档（安装/快速开始/模型配置）
- `实测记录.md` — 本地实测反馈（不提交到 GitHub）

## Codex 协作

- 每轮 Codex 审查后，审查意见会写入 `handoff.md`
- 修复完成后更新 `handoff.md` 标记已关闭
- 关键节点（Phase 完成、重大功能）提醒用户让 Codex 审查
