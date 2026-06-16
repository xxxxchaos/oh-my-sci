# 文献工具包

> 搜索策略 + 筛选分类 + 证据景观 + 使用规范

## 证据景观快速摸底

在确定研究问题前，用 mini-scoping search 了解证据分布（约 15 分钟）：

**快速摸底**：`unified_search(query="<核心 P> AND <核心 I>", limit=20)`，关注命中量（<100 冷门 / 100-1000 适中 / >5000 成熟）、近 3 年趋势、主要研究类型分布。

**查重**：PROSPERO (`site:crd.york.ac.uk/prospero`) + ClinicalTrials.gov (`site:clinicaltrials.gov`)——已有高度相似注册研究需讨论差异化空间。

**AI 辅助缺口识别**：从 3-5 篇最新/高引论文的 Discussion "limitations/future research" 段落提取共识性空白。区分显性缺口（论文明确说需要研究）和隐性缺口（跨文献推理发现）。

**输出证据景观简报**：检索概述 + 已注册同类研究 + 主要缺口 + 可行性初步判断。

## 文献分类与标记

### 四色用途标注

| 标签 | 用途 | 引用位置 |
|------|------|---------|
| 🔴 effect-anchor | 效应量锚点 | Discussion 对比 |
| 🔵 pico-reference | PICO 核心参考 | Introduction / Methods |
| 🟡 gap-support | 研究缺口支撑 | Introduction 缺口段 |
| 🟢 methods-reference | 方法学参考 | Methods 段 |

### 相关度分类

- 必读：直接相关，需提取效应量
- 可读：部分相关，供参考
- 跳过：不相关

## 文献矩阵规范

矩阵文件：`01_design/Literature_Matrix.md`

每篇文献最低字段：
- PMID（8 位数字）+ DOI（如有）
- 来源数据库 + 发表年份
- 四色用途标签 + 预期引用位置（IMRaD 章节）
- 关键效应量（如适用）
- 一行摘要

建议最终矩阵规模：小型 20-25 篇，中大型 25-35 篇。

## 文献弹药库覆盖度

在提议收敛前自查：

| 写作需求 | 覆盖标准 |
|---------|---------|
| Introduction 背景 | ≥2 篇指南/大综述 |
| Introduction 缺口 | ≥3 篇 🟡 缺口支撑 |
| Methods 操作 | ≥3 篇 🟢 方法学参考 |
| Methods 统计 | ≥2 篇统计方法学文献 |
| Discussion 对比 | 每种用途 ≥3 篇 🔴/🔵 |
| Discussion 局限性 | ≥2 篇指出竞争方法局限性的研究 |

底线：每个 IMRaD 段的每个主张至少有一篇引用支撑。

## 文献饱和度判断

连续两轮定向搜索中，新发现文献 < 本轮命中数的 20% 且 < 5 篇 → 文献饱和。

## 搜索负约束

- 严禁编造 PMID、DOI、期刊名、页码、作者名
- 严禁声称有文献支撑而实际未检索到
- 严禁凭训练记忆补全文献摘要或数据
- 引用必须附 PMID + 来源数据库 + 发表年份
