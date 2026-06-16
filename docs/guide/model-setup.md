# 模型配置指南

omo-sci 使用**能力分类路由**（Capability-based Routing）来为不同任务自动选择最优模型。系统将模型按照 6 个能力分类组织，每个分类可以配置独立的模型，并支持 fallback 链。

## 能力分类

| 分类 | 适用场景 | 推荐模型 |
|------|----------|----------|
| `agent-orchestration` | 编排 Durbin、Irber 等 agent 对话流程 | DeepSeek-Chat, GPT-4o |
| `deep-reasoning` | Archimedes、SPSSer 等需深度推理的任务 | DeepSeek-Reasoner, o1 |
| `chinese-writing` | Writer、Polisher 中文论文撰写润色 | GLM-4, Qwen-Max |
| `fast-search` | PubMed、CNKI 等高频文献搜索 | DeepSeek-Chat, Qwen-Turbo |
| `long-context` | 处理长文档、完整文献回顾 | Kimi-K2.6, Gemini-1.5-Pro |
| `methodical-review` | EBMer 方法论审查、系统评价 | DeepSeek-Reasoner, Claude-Sonnet |

## 支持的模型提供商

omo-sci 支持国内 7 大模型提供商：

| 提供商 | Provider ID | 需要 API Key |
|--------|-------------|-------------|
| DeepSeek | `deepseek` | `DEEPSEEK_API_KEY` |
| 阿里通义千问 | `qwen-bailian` | `QWEN_API_KEY` |
| 智谱 | `glm` / `zhipu` | `ZHIPU_API_KEY` |
| MiniMax | `minimax` | `MINIMAX_API_KEY` |
| 月之暗面 Kimi | `kimi` | `KIMI_API_KEY` |
| 腾讯混元 | `tencent-hy` | `TENCENT_API_KEY` |
| OpenCode Go | `opencode-go` | 无需额外配置 |

## 配置方法

配置文件位于 `~/.config/opencode/omo-sci.jsonc`，JSONC 格式（支持注释）。

### 示例配置

```jsonc
{
  "router": {
    "categories": {
      "agent-orchestration": {
        "category": "agent-orchestration",
        "fallback_chain": [
          { "provider": "deepseek", "model_id": "deepseek-chat", "context_window": 128000, "max_output": 4096 },
          { "provider": "qwen-bailian", "model_id": "qwen-max", "context_window": 128000, "max_output": 4096 }
        ],
        "concurrency_limit": 2
      },
      "deep-reasoning": {
        "category": "deep-reasoning",
        "fallback_chain": [
          { "provider": "deepseek", "model_id": "deepseek-reasoner", "context_window": 128000, "max_output": 4096 }
        ],
        "concurrency_limit": 2
      },
      "chinese-writing": {
        "category": "chinese-writing",
        "fallback_chain": [
          { "provider": "glm", "model_id": "glm-4", "context_window": 128000, "max_output": 4096 },
          { "provider": "qwen-bailian", "model_id": "qwen-max", "context_window": 128000, "max_output": 4096 }
        ],
        "concurrency_limit": 2
      },
      "fast-search": {
        "category": "fast-search",
        "fallback_chain": [
          { "provider": "deepseek", "model_id": "deepseek-chat", "context_window": 128000, "max_output": 4096 }
        ],
        "concurrency_limit": 4
      },
      "long-context": {
        "category": "long-context",
        "fallback_chain": [
          { "provider": "kimi", "model_id": "kimi-k2.6", "context_window": 256000, "max_output": 4096 }
        ],
        "concurrency_limit": 2
      },
      "methodical-review": {
        "category": "methodical-review",
        "fallback_chain": [
          { "provider": "deepseek", "model_id": "deepseek-reasoner", "context_window": 128000, "max_output": 4096 }
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
bun run bin/omo-sci.ts doctor
```

如果配置正确，doctor 报告中会显示各分类的模型就绪状态。

## 重要提示

- **至少为每个分类配置一个模型**，否则对应 agent 无法工作
- 同一提供商可在多个分类中复用
- fallback 链越长，容错性越好，但首次调用延迟可能增加
- 修改配置后需重启 OpenCode 会话才能生效
