# 模型配置指南

omo-sci 使用**能力分类路由 + agent 级推荐矩阵**来为不同任务自动选择模型。系统先按 6 个能力分类组织可用模型池，再按 9 个 agent 的实际职责写入不同的 `model` / `model_fallback`。

需要注意的是，OpenCode 实际运行 agent 时读取的是当前项目 `.opencode/agents/*.md` 里的 `model` / `model_fallback` frontmatter。`omo-sci install` 会根据你选择的 provider 生成 `~/.config/opencode/omo-sci.jsonc`，再把同一条模型链写入 9 个 agent 文件，避免出现“配置里选了 A，运行时却调用 B”的情况。

## 能力分类

| 分类 | 适用场景 | 推荐模型 |
|------|----------|----------|
| `agent-orchestration` | Dubin / IRBer / Submitter 编排、对话和任务委派 | Qwen 3.7 Plus, Qwen 3.7 Max, Kimi K2.6 |
| `deep-reasoning` | Archimedes / SPSSer 研究设计、统计推理和代码 | Qwen 3.7 Max, DeepSeek V4 Pro |
| `chinese-writing` | Writer / Polisher 中文论文撰写润色 | Qwen 3.7 Plus, GLM-5.2, Kimi K2.6 |
| `fast-search` | PubMed、CNKI、Consensus 等高频文献搜索 | MiniMax M3, Kimi K2.6, Qwen 3.7 Plus |
| `long-context` | 长文档、完整文献和项目级上下文 | Qwen 3.7 Plus, MiniMax M3, GLM-5.2 |
| `methodical-review` | EBMer 方法学审查、系统评价和结构化意见 | GLM-5.2, Qwen 3.7 Max, DeepSeek V4 Pro |

## 支持的模型提供商

omo-sci 支持国内 7 大模型提供商：

| 提供商 | Provider ID | 需要 API Key |
|--------|-------------|-------------|
| DeepSeek | `deepseek` | `DEEPSEEK_API_KEY` |
| 阿里通义千问 | `qwen-bailian` | `QWEN_API_KEY` |
| 智谱 | `zhipu` | `ZHIPU_API_KEY` |
| MiniMax | `minimax` | `MINIMAX_API_KEY` |
| 月之暗面 Kimi | `kimi` | `KIMI_API_KEY` |
| 腾讯混元 | `tencent-hy` | `TENCENT_API_KEY` |
| OpenCode Go | `opencode-go` | 无需额外配置 |

## 配置方法

配置文件位于 `~/.config/opencode/omo-sci.jsonc`，JSONC 格式（支持注释）。当前项目的 `.opencode/agents/*.md` 会保存安装时生成的实际运行模型。

安装时会显示模型分配计划，例如：

```text
模型分配计划（将写入 .opencode/agents/*.md）:
  Agent        Category              Primary model                    Fallback
  dubin        agent-orchestration   qwen-bailian/qwen3.7-plus        qwen-bailian/qwen3.7-max -> opencode-go/kimi-k2.6
  archimedes   deep-reasoning        qwen-bailian/qwen3.7-max         qwen-bailian/qwen3.7-plus -> deepseek/deepseek-v4-pro
```

默认安装会先使用 `opencode-go` 生成可运行配置，但它只是兜底。建议安装后立刻运行 `configure`，优先选择你实际拥有的模型自家 API 或 token plan：

```bash
omo-sci configure --providers qwen-bailian,zhipu,kimi,minimax,deepseek --quota 500000000
```

模型选择规则是：先按 agent 职责选择模型，再优先使用该模型的自家 provider；如果用户没有配置对应 provider，则自动回退到 `opencode-go`。

### 示例配置

```jsonc
{
  "router": {
    "categories": {
      "agent-orchestration": {
        "category": "agent-orchestration",
        "fallback_chain": [
          { "provider": "qwen-bailian", "model_id": "qwen3.7-plus", "context_window": 1000000, "max_output": 128000 },
          { "provider": "qwen-bailian", "model_id": "qwen3.7-max", "context_window": 1000000, "max_output": 128000 }
        ],
        "concurrency_limit": 2
      },
      "deep-reasoning": {
        "category": "deep-reasoning",
        "fallback_chain": [
          { "provider": "qwen-bailian", "model_id": "qwen3.7-max", "context_window": 1000000, "max_output": 128000 },
          { "provider": "deepseek", "model_id": "deepseek-v4-pro", "context_window": 1000000, "max_output": 128000 }
        ],
        "concurrency_limit": 2
      },
      "chinese-writing": {
        "category": "chinese-writing",
        "fallback_chain": [
          { "provider": "qwen-bailian", "model_id": "qwen3.7-plus", "context_window": 1000000, "max_output": 128000 },
          { "provider": "zhipu", "model_id": "glm-5.2", "context_window": 1000000, "max_output": 128000 }
        ],
        "concurrency_limit": 2
      },
      "fast-search": {
        "category": "fast-search",
        "fallback_chain": [
          { "provider": "minimax", "model_id": "minimax-m3", "context_window": 1000000, "max_output": 128000 },
          { "provider": "kimi", "model_id": "kimi-k2.6", "context_window": 256000, "max_output": 128000 }
        ],
        "concurrency_limit": 4
      },
      "long-context": {
        "category": "long-context",
        "fallback_chain": [
          { "provider": "qwen-bailian", "model_id": "qwen3.7-plus", "context_window": 1000000, "max_output": 128000 },
          { "provider": "minimax", "model_id": "minimax-m3", "context_window": 1000000, "max_output": 128000 }
        ],
        "concurrency_limit": 2
      },
      "methodical-review": {
        "category": "methodical-review",
        "fallback_chain": [
          { "provider": "zhipu", "model_id": "glm-5.2", "context_window": 1000000, "max_output": 128000 },
          { "provider": "qwen-bailian", "model_id": "qwen3.7-max", "context_window": 1000000, "max_output": 128000 }
        ],
        "concurrency_limit": 2
      }
    },
    "concurrency": {
      "max_total_agents": 8
    }
  },
  "safety": {
    "max_step": 50,
    "max_time_minutes": 30,
    "loop_detect_threshold": 5
  },
  "usage": {
    "token_quota": 500000000,
    "current_usage": 0,
    "quota_reset_date": "2026-06-01"
  }
}
```

## Fallback 链配置

每个分类的 `fallback_chain` 是按优先级排列的模型列表：

1. 当首选模型不可用时（网络错误、配额耗尽等），自动依次尝试 fallback
2. 可配置 1-3 个模型作为 fallback 链
3. 仅配置一个模型时，该模型不可用则任务失败

## 环境变量

在 `.env` 文件或 shell 环境中配置 API Key：

```bash
# DeepSeek
DEEPSEEK_API_KEY=sk-your-key

# 阿里通义千问
QWEN_API_KEY=your-key

# 智谱
ZHIPU_API_KEY=your-key

# MiniMax
MINIMAX_API_KEY=your-key

# Kimi
KIMI_API_KEY=your-key

# 腾讯混元
TENCENT_API_KEY=your-key
```

## 验证配置

运行以下命令验证模型配置是否正确：

```bash
omo-sci doctor --models
```

`doctor --models` 会检查当前项目 `.opencode/agents/*.md` 中的模型链是否都出现在 omo-sci 配置里。如果某个 agent 引用了你没有配置的模型，会显示警告。

更深一层的 API smoke test 仍建议手动执行一次小请求或在 OpenCode 中跑一次简短 agent 调用，因为静态检查只能确认配置一致，不能保证远端 API 当前可用、余额充足或网络稳定。

## 重要提示

- **建议优先配置模型自家 provider**，例如 Qwen 走 `qwen-bailian`、GLM 走 `zhipu`、Kimi 走 `kimi`、MiniMax 走 `minimax`、DeepSeek 走 `deepseek`
- `opencode-go` 会自动作为兜底，避免没有自家 provider 时 agent 无法启动
- OpenCode 运行时以 `.opencode/agents/*.md` 的 `model` / `model_fallback` 为准
- 同一提供商可在多个分类中复用
- fallback 链越长，容错性越好，但首次调用延迟可能增加
- 修改配置后需重启 OpenCode 会话才能生效
