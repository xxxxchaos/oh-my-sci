# omo-sci 设计文档

> 版本: v0.1.0-draft  
> 日期: 2026-06-16  
> 状态: 设计阶段，待实现

## 项目定位

omo-sci 是一个 OpenCode 插件，为中国医学科研工作者提供 AI 智能体团队，协作完成从选题设计、文献检索、统计分析、论文撰写到投稿的全流程工作。

核心洞察：医学研究者不擅长写 AI 提示词，但他们擅长描述临床困惑。omo-sci 的主编排 agent（Dubin）充当人类用户与专项子 agent 之间的桥梁——用户用自己的语言交流，Dubin 负责翻译成研究任务并编排整个流程。

参考 [oh-my-openagent](https://github.com/code-yeongyu/oh-my-openagent) 的多 agent 编排设计哲学，但针对医学科研垂类场景精简。6 个能力分类 + 9 个专项 agent + 22 个生命周期钩子，远轻于 OMO 的 54 个钩子 + 11 个通用 agent。适配国内主流大模型（DeepSeek V4 Pro、Qwen 3.7-Max、GLM-5.2、Kimi K2.7、MiniMax M3、腾讯混元 Hy3）。

对现存 opensci / codexsci 工作流的继承：复用 `~/.claude/skills/opensci/` 中的 6 阶段流水线、Material Passport schema、Integrity Gates、Sprint Contract 双盲审协议、12 模式临床失败检查表；同时兼容 `~/.codex/skills/codexsci/` 中已经沉淀的 PubMed、项目目录和写作规则。omo-sci 的升级点不是重写这些契约，而是从单 agent 角色切换模式升级为可被 OpenCode 加载的多 agent 协同编排。

---

## 一、整体架构

```
 omo-sci (OpenCode 插件)
 ═══════════════════════════════════════════════════════════

 ┌─────────────────────────────────────────────────────────┐
 │                    用户界面层                            │
 │  OpenCode TUI / CLI  ←→  主编排者（结构化访谈对话）       │
 └────────────────────────┬────────────────────────────────┘
                          │
 ┌────────────────────────┴────────────────────────────────┐
 │                  编排引擎核心                             │
 │                                                         │
 │  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐  │
 │  │ 访谈状态机   │  │ 流水线状态机  │  │ 分类路由器    │  │
 │  │ (理解需求)   │  │ (6阶段+2闸门) │  │ (模型→角色映射)│  │
 │  └─────────────┘  └──────────────┘  └───────────────┘  │
 │                                                         │
 │  ┌──────────────────────────────────────────────────┐   │
 │  │              跨会话状态层                          │   │
 │  │  Material Passport  │  Boulder  │  Wisdom 系统    │   │
 │  └──────────────────────────────────────────────────┘   │
 └────────────────────────┬────────────────────────────────┘
                          │
 ┌────────────────────────┴────────────────────────────────┐
 │                    Agent 团队层 (9 agents)               │
 │                                                         │
 │  编排层              规划层           专项层       审稿层│
 │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
 │  │ Dubin    │ │Archimedes│ │Pubmeder  │ │EBMer     │  │
 │  │ 主编排者  │ │ 研究设计师│ │ 文献搜索员│ │方法学审稿│  │
 │  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
 │               ┌──────────┐ ┌──────────┐ ┌──────────┐  │
 │               │IRBer     │ │SPSSer    │ │Polisher  │  │
 │               │ 计划审查员│ │ 统计分析师│ │逻辑审稿人│  │
 │               └──────────┘ └──────────┘ └──────────┘  │
 │                              ┌──────────┐              │
 │                              │Writer    │              │
 │                              │ 论文写作者│              │
 │                              └──────────┘              │
 │                              ┌──────────┐              │
 │                              │Submitter │              │
 │                              │ 投稿协调员│              │
 │                              └──────────┘              │
 └─────────────────────────────────────────────────────────┘
```

### 核心设计原则

1. **主编排者 = 唯一的用户界面** — 所有用户交互经 Dubin。子 agent 不直接与用户对话。
2. **分类路由而非固定模型** — Agent 绑定能力分类，不绑定具体模型名。安装时收集用户 API 来源，自动生成 fallback 链。
3. **独立上下文的审稿层** — EBMer 和 Polisher 拥有独立上下文，采用 Sprint Contract 两阶段盲审协议。
4. **约 20 个生命周期钩子** — 只保留医学科研流水线必需的事件钩子。
5. **每阶段结束 = 人类签核** — 不自动跨阶段跳转。
6. **并行执行控制** — 仅同阶段内的独立子任务可并行（搜索、敏感性分析、审稿）。
7. **环境就绪检查** — 安装时和每阶段入口检查 MCP 工具、R 环境、依赖软件。

### v0.1 可实现性边界

v0.1 优先交付可验证的垂直切片，而不是一次性完成全部科研流水线：

1. **先证明 OpenCode 集成** — 插件能被 OpenCode 加载，命令能在 TUI 中执行，至少 1 个 Dubin agent 能被配置和调用。
2. **先固化状态契约** — Material Passport、Boulder、GateReport、SignoffRecord 的 schema 和验证规则先于完整 agent prompt 实现。
3. **先跑通阶段 0-1** — `/sci-start` → Dubin 访谈 → Pubmeder 初搜 → 研究蓝图 → Gate → 用户签核。
4. **Phase 2+ 再扩统计和投稿** — SPSSer、Writer、Submitter 的完整实现建立在阶段 0-1 的状态机和证据链稳定之后。
5. **任何阶段都可降级为人类可读清单** — 如果 MCP、模型 API 或 OpenCode 插件能力不足，必须输出可人工继续的 Markdown 交付物，而不是静默失败。

---

## 二、Agent 团队

### 命名与角色

| 名称 | 角色 | 寓意 |
|------|------|------|
| **Dubin** | 主编排者 | 中国重症医学导师型人格原型——幽默、直率、循证、说人话 |
| **Archimedes** | 研究设计师 | 阿基米德——"给我一个支点，我就能撬动研究方案" |
| **IRBer** | 计划审查员 | IRB（伦理审查委员会）——每项研究启动前的质量闸门 |
| **Pubmeder** | 文献搜索员 | PubMed + 人——医学科研人员一看就懂的文献搜索专家 |
| **SPSSer** | 统计分析师 | SPSS + 人——中国医生最熟悉的统计软件 |
| **Writer** | 论文写作者 | 写手——简单到不需要解释 |
| **Submitter** | 投稿协调员 | 投稿人——把论文精准投送到对的期刊 |
| **EBMer** | 方法学审稿人 | Evidence-Based Medicine——循证医学，方法学的根基 |
| **Polisher** | 逻辑审稿人 | 抛光者——论文逻辑与语言的最后打磨 |

### Dubin 角色设定

Dubin 是一个“重症医学导师型主编排者”的虚构人格。它可以吸收中国临床导师常见的直率、循证、接地气风格，但公开发布版本不得暗示真实个人授权、代言或身份复刻。核心风格：

- **接地气、说人话** — 不端着，不堆砌术语。能把复杂的研究方法论翻译成临床医生秒懂的语言
- **善用比喻讲故事** — "这个统计问题，就好像拿大炮打蚊子——管用吗？也许管用，但没必要"
- **真诚承认不知道** — "这个问题我现在拿不准，让 Pubmeder 查一下"
- **鼓励用户自己表达** — 用户用临床语言描述困惑，Dubin 翻译成研究问题。选择题只在用户卡住时提供
- **核心信条**：
  1. "永远问自己一句话：我们在研究什么？为什么研究这个？"
  2. "治疗病人，不要治那个数字" → 研究的是临床问题，不是统计数字
  3. "如果你不知道该怎么做，你就什么都别做" → 拿不准时停下来
  4. "常见的就是常见的，别想那些少见的" → 抓住研究主干
  5. "做检查前先想：结果会改变你的决策吗？" → 每步分析都要有意义

### Agent 职责边界

| Agent | 主要职责 | 禁止行为 | 必须写入状态 |
|------|----------|----------|--------------|
| Dubin | 用户访谈、任务拆解、调和冲突、签核展示 | 不直接伪造文献或统计结果；不绕过用户签核 | 当前阶段、用户决策、委派摘要 |
| Archimedes | PICO/FINER/研究蓝图/样本量依据 | 不输出未经证据支撑的效应量 | `stage1.framework`、`finer_scores`、设计产物索引 |
| IRBer | 方案质量、伦理风险、可行性预审 | 不声称等同真实伦理委员会批准 | 审查意见、阻塞项、override 理由 |
| Pubmeder | 多源检索、证据矩阵、引用验证 | 不创造 PMID/DOI/CNKI ID；不把摘要推断成全文结论 | 检索式、数据库覆盖、证据 ID |
| SPSSer | SAP、R 分析、诊断和敏感性分析 | 不读取 SEALED 数据；不隐瞒异常诊断 | SAP、脚本、sessionInfo、诊断报告 |
| Writer | 基于已签核结果写作 | 不新增未验证主张；不改变数据口径 | 稿件版本、引用审计状态 |
| Submitter | 期刊匹配、投稿包、格式转换 | 不自动提交；不填写未经用户确认的作者/利益冲突信息 | 期刊选择、投稿清单 |
| EBMer | 方法学审稿、12 模式检查 | 不参与初稿生成，保持独立上下文 | Gate 报告、失败模式 |
| Polisher | 逻辑、语言、AI 味、数据一致性 | 不改写统计含义；不美化过度结论 | 语言审查报告、修改摘要 |

---

## 三、分类路由系统

### 能力分类定义

| 分类 | 适用 Agent | 要求 | fallback 链 |
|------|-----------|------|------------|
| `agent-orchestration` | Dubin, IRBer, Submitter | MCP-Atlas ≥ 70, Terminal-Bench ≥ 65 | Qwen 3.7-Max > DeepSeek V4 Pro > Kimi K2.7 |
| `deep-reasoning` | Archimedes, SPSSer, EBMer | 数学推理 ≥ 85, GPQA Diamond ≥ 88 | DeepSeek V4 Pro > Qwen 3.7-Max > Kimi K2.7 |
| `chinese-writing` | Writer, Polisher | 中文语义 ≥ 70, 长文本结构好 | GLM-5.2 > Qwen 3.7-Max > 混元 Hy3 |
| `fast-search` | Pubmeder | 工具调用稳、速度快、成本低 | MiniMax M3 > Kimi K2.7 > DeepSeek V4 Pro |
| `long-context` | Pubmeder(深度搜索), Writer(引用验证) | 1M 上下文, 长文本信息检索准 | MiniMax M3 > GLM-5.2 > Qwen 3.7-Max |
| `methodical-review` | EBMer(审稿模式) | 保守推理、不放过细节 | DeepSeek V4 Pro > Qwen 3.7-Max |

### 运行时路由

```
Dubin 委派 SPSSer:
  1. 查分类表: SPSSer → deep-reasoning
  2. 查 fallback 链: DeepSeek V4 Pro > Qwen 3.7-Max > Kimi K2.7
  3. 检测可用性: 检查 API 状态 + 配额 + 并发数
     → 可用: 使用，记录 model:select 钩子
     → 不可用: 触发 model:fallback，通知 Dubin
  4. 熔断检查: 循环 > 50 步？终止
```

### 安装时配置

安装程序交互式询问用户的模型 API 来源和月用量额度，自动生成每个分类的 fallback 链和 `~/.config/opencode/omo-sci.jsonc`。

---

## 四、流水线（6 阶段 + 2 闸门）

### 阶段 0: 意图访谈 (Dubin 主导)

Dubin 发起结构化访谈。用户用自己的语言描述临床困惑或研究兴趣。Dubin 逐步引导：研究意图定性 → PICO 框架提取 → 可行性讨论。Pubmeder 后台并行初搜，结果自然融入对话。

产出：PICO 摘要 + 证据景观仪表盘  
Gate：用户确认研究框架 ✔

### 阶段 1: 研究设计冲刺

- Phase 1a: Dubin 委派 Archimedes 生成研究蓝图初稿
- Phase 1b: Dubin 委派 Pubmeder 并行深度搜索（spawn 4 个临时子搜索: PubMed/CNKI/Cochrane/Exa）
- Phase 1c: Archimedes 整合证据 → 最终研究蓝图 → IRBer 审查计划质量

产出：`01_design/Study_Blueprint.md` + `Literature_Matrix.md` + `Search_Plan.md`  
Gate：FINER + 6 项质量门控（文献覆盖度、时效性、无编造引用）  
签核：用户确认研究蓝图 ✔

### 阶段 2: 数据分析

- Step 1: SPSSer 撰写 SAP → IRBer 审查 → 用户签核
- Step 2: SPSSer 主分析 + 并行 spawn 3 个敏感性分析（PSM/IPTW/MICE）
- Step 3: 8 项诊断自查 → Tables + Figures（含 flowchart R 包的 Figure 1）
- Step 4: Dubin 生成分析摘要卡片

产出：`02_analysis/Analysis_Summary.md` + Tables + Figures + SAP.md  
Gate：data_label 一致性验证 + 8 项诊断全部通过  
签核：用户确认分析结果 ✔

### 闸门 I: 完整性检查（不可跳过）

EBMer 方法学审查 → 12 模式临床失败检查 → data_label 一致性 → 30% 关键主张抽样验证。FAIL → 修复（max 3 轮）。ALL CLEAR → 进入阶段 3。

### 阶段 3: 论文撰写 + 内部审稿

- Phase 3a: Writer 根据分析摘要生成初稿（中文/英文，目标期刊格式）
- Phase 3b: Dubin 并行委派 EBMer（方法学盲审）+ Polisher（逻辑/语言审查）
- Phase 3c: Writer 根据审稿意见修订 → Dubin 调和冲突意见 → 定稿
- Phase 3d: Writer 参考文献审计（验证每条引用的可验证 ID，如 PMID/DOI/PMCID/CNKI ID/NCT ID）

产出：`03_manuscript/Manuscript_Final.md` + `Review_Reports/`  
Gate：Sprint Contract 通过 + 参考文献全部可验证  
签核：用户确认定稿 ✔

### 闸门 II: 终审（零容忍）

EBMer 重跑 12 模式检查 + 100% 主张验证。Polisher 逐句重扫去 AI 味 + 数据一致性。任何 FAIL → 修订 → 重新过闸。ALL CLEAR → 进入阶段 4。

### 阶段 4: 投稿

- Phase 4a: Submitter → 期刊匹配分析
- Phase 4b: Submitter → 生成投稿材料包（Cover Letter、图文摘要、补充材料、26 项检查清单）
- Phase 4c: Submitter → DOCX 格式转换（Pandoc + OfficeCLI）

产出：`04_submission/submission_package/`  
签核：用户确认投稿 ✔

### 阶段 5: 过程总结

Dubin 生成 AI 自我反思报告：关键决策回顾、问题与解决方案、改进建议。Wisdom learnings 归档。

产出：`05_summary/Process_Summary.md` + Material Passport 归档

---

## 五、跨会话状态系统

### 项目目录兼容策略

omo-sci 默认使用新的阶段目录，但必须能读取/迁移 opensci / codexsci 旧项目：

| omo-sci 目录 | 旧 codexsci 目录 | 用途 |
|-------------|------------------|------|
| `01_design/` | `01_Literature/` + `02_Study_Design/` | 检索、文献矩阵、研究蓝图 |
| `02_analysis/` | `03_Data_Collection/` + `04_Statistical_Analysis/` + `05_Tables_and_Figures/` | 数据字典、SAP、R 脚本、表图 |
| `03_manuscript/` | `06_Manuscript/` | 稿件、审稿、修订 |
| `04_submission/` | 新增 | 投稿包、期刊清单、格式转换 |
| `05_summary/` | 新增 | 过程总结、Wisdom 归档 |

实现层需要提供 `ProjectLayout` 映射，而不是在 agent prompt 中硬编码路径。迁移旧项目时保留原目录，Passport 中记录 `layout: "omo-sci" | "codexsci-legacy"`。

### Material Passport (`passport.json`)

JSON 格式的状态文件，每阶段写入对应 schema 字段，下一阶段验证前置条件。包含：项目信息、流水线状态、各阶段产出索引、审稿记录、Wisdom 统计。

约 2-5K tokens，新会话启动时必读。

Material Passport 必须继承 `~/.claude/skills/opensci/references/material-passport-schema.md` 的核心机制：

- `passport_version`：schema 版本，支持后续 migration。
- `hash`：每个阶段完成后对该阶段 block 计算 sha256，下一阶段入口验证。
- `data_provenance`：`SEALED | real | simulated`，未解封时任何 agent 不得读取数据内容。
- `integrity_gate_1` / `integrity_gate_2`：完整记录 12 模式检查、claim sample rate、retry_count、override 理由。
- `artifacts`：只存相对路径和 checksum，不内联大文件。
- `signoff_records`：用户签核的时间、阶段、摘要、风险提示和用户确认文本。

最小 TypeScript 契约：

```typescript
type DataLabel = 'SEALED' | 'real' | 'simulated';
type GateModeStatus = 'CLEAR' | 'SUSPECTED' | 'INSUFFICIENT_EVIDENCE' | 'OVERRIDDEN';
type GateStatus = 'not_run' | 'passed' | 'failed';

interface SignoffRecord {
  stage: StageId;
  signed_at: string;
  summary: string;
  risks_acknowledged: string[];
  user_confirmation: string;
}

interface GateReport {
  status: GateStatus;
  checked_at: string;
  claim_sample_rate: 0.3 | 1.0;
  retry_count: number;
  modes: Record<string, GateModeStatus>;
  overrides: Array<{ mode: string; reason: string; approved_by_user: boolean }>;
  report_path: string;
}
```

### Boulder 系统 (`boulder.json`)

追踪当前会话状态：活跃计划、session ID、当前阶段/Phase、待完成任务列表、审稿状态。支持跨会话中断和恢复。

### Wisdom 系统 (`wisdom/`)

- `learnings.md` — 本次研究学到的经验
- `decisions.md` — 关键决策及原因（"别重新讨论这些"）
- `gotchas.md` — 踩过的坑（"别再试这个"）
- `problems.md` — 遇到的问题与解决方案

每次子 agent 完成后 Dubin 自动提取 learnings。

### 新会话启动流程

```
session:start → 读 passport.json（确定当前阶段）
              → 读 boulder.json（恢复待完成任务）
              → 读 wisdom/learnings.md + gotchas.md（避免重复错误）
              → Dubin 恢复会话
```

---

## 五B、Dubin 进化记忆系统（用户级）

### 设计目标

项目级的 Wisdom 系统记录"这个项目学到了什么"，用户级的进化记忆系统记录"Dubin 学到了什么关于你的事"。每个项目完成后，Dubin 消化经验、更新对用户的认知。下次见面时，Dubin 是越来越了解你的研究伙伴。

### 存储位置

```
~/.config/opencode/omo-sci/          ← 用户级，跨所有项目
├── omo-sci.jsonc                    # 模型配置
├── profile/
│   ├── researcher.json              # 研究者画像
│   ├── project-history.json         # 所有项目的摘要索引
│   └── evolution.md                 # Dubin 的"成长日记"
```

### researcher.json — 研究者画像

```jsonc
{
  "last_updated": "2026-08-20",
  "total_projects_completed": 3,
  
  "identity": {
    "specialty": "重症医学",
    "sub_specialties": ["脓毒症", "急性肾损伤", "ARDS"],
    "institution_type": "三甲医院ICU",
    "data_resources": ["ICU临床数据库(500+例)", "MIMIC-IV"],
    "target_journals": ["Critical Care Medicine", "Intensive Care Medicine", "中华危重病急救医学"],
    "research_role": "临床一线医生兼研究者"
  },

  "research_preferences": {
    "preferred_study_types": ["回顾性队列研究", "前瞻性观察研究"],
    "avoided_study_types": [],
    "typical_sample_size_range": "100-500",
    "preferred_statistical_approach": "倾向性评分匹配优先，Cox回归为主模型",
    "avoided_statistical_approach": [],
    "analysis_language": "R",
    "writing_language": "中文优先，英文摘要",
    "writing_style_notes": "偏好简洁风格，不喜欢太长的Discussion。Methods部分要求非常详细。"
  },

  "interaction_preferences": {
    "detail_level": "moderate",
    "signoff_frequency": "stage_level",
    "preferred_time": "evening",
    "explain_jargon": true,
    "offer_options_when": "stuck_only",
    "autonomy_level": "moderate"
  },

  "learned_patterns": {
    "common_mistakes": [
      "第一次项目：纳排标准太宽 → 后续项目明显收紧",
      "第二次项目：忘记预注册 → 后续项目主动提醒"
    ],
    "effective_patterns": [
      "晚上8-11点回复最快",
      "偏好先看Table再读文字",
      "Pubmeder搜索时偏好先看中文文献再补充英文"
    ],
    "trust_built": {
      "spsser_trust": "high",
      "writer_trust": "moderate",
      "ebmer_trust": "high"
    }
  },

  "domain_evolution": {
    "emerging_interests": ["脓毒症生物标志物", "机器学习预测模型"],
    "knowledge_gaps": ["高级生存分析(竞争风险模型)", "贝叶斯统计"],
    "suggested_next": "考虑将回顾性队列升级为前瞻性多中心研究"
  }
}
```

### project-history.json — 研究历史索引

每个项目完成后追加条目，包含项目摘要、关键决策、带向未来的教训。

### evolution.md — Dubin 的"成长日记"

Dubin 用第一人称记录每次项目后对用户的认知更新。语气保持 Dubin 风格——简短、真诚、不煽情。例如：

> 我发现你对纳排标准的讨论总是很认真。下次新项目，我会在阶段0先问清楚你的数据有哪些排除条件。

### 进化时机

**项目完成时（阶段 5）** — Dubin 提取跨项目经验，更新 profile 三个文件。

**新项目启动时（阶段 0）** — Dubin 加载 profile，开场词包含对用户的记忆（"上次你提到对机器学习预测模型有兴趣——"）。

### 隐私

- 全部存储本地 `~/.config/opencode/omo-sci/`，不上传不同步
- 用户可随时删除 `profile/` 重置 Dubin 记忆
- `researcher.json` 中敏感字段可选择性填写
- 用户级记忆默认 opt-in：首次安装时询问是否启用；关闭时只保存项目级状态。
- profile 字段分级：`safe`（研究偏好）、`sensitive`（机构/数据资源/作息）、`secret`（API key、真实患者信息，禁止写入 profile）。
- 提供 `/sci-memory export|edit|delete` 或等价 CLI，用于导出、编辑、删除用户级记忆。

### 医学数据与合规边界

omo-sci 是科研辅助工具，不提供临床诊疗建议，也不替代 IRB/伦理委员会、统计师或通讯作者责任。实现必须满足：

1. **PHI/PII 最小化** — 默认拒绝把姓名、住院号、身份证、电话、地址、完整日期等直接发送给模型 API。
2. **脱敏检查** — 阶段 2 入口执行数据列名和样本内容扫描；发现疑似直接标识符时阻断并生成脱敏建议。
3. **模型 API 风险提示** — 安装时说明第三方 API 可能保留日志；用户必须明确选择是否允许真实数据相关摘要进入模型。
4. **日志脱敏** — debug/error log 不得写入原始数据行、API key、患者标识符。
5. **伦理声明** — IRBer 输出只能称为“方案质量与伦理风险预审”，不得称为“伦理批准”。

---

## 六、生命周期钩子（22 个）

### 会话生命周期 (4)
- `session:start` — 加载 Material Passport + Boulder
- `session:end` — 更新 Boulder + Wisdom learnings
- `session:resume` — 恢复中断会话
- `session:interrupt` — 用户中断，保存状态

### 阶段生命周期 (5)
- `stage:entry` — 加载阶段 prompt + 检查前置条件 + 环境就绪检查
- `stage:exit` — 写入 Material Passport + git tag
- `stage:gate_check` — 运行硬门控规则
- `stage:gate_pass` — 记录通过项
- `stage:gate_fail` — 生成失败报告，触发修复流程（max 3 轮）

### 委派生命周期 (3)
- `delegate:pre` — 注入子 agent 所需最简上下文
- `delegate:post` — 提取 learnings → Wisdom 系统
- `delegate:error` — 记录错误，fallback 或重试

### 模型路由 (2)
- `model:select` — 根据分类路由 + 可用性选择模型
- `model:fallback` — 记录降级日志，通知用户

### 质量控制 (4)
- `quality:loop_detect` — 检测到重复循环，强制注入干预（借鉴 OMO Issue #2571 教训）
- `quality:compaction_pre` — 上下文压缩前保存关键约束
- `quality:compaction_post` — 上下文压缩后验证关键约束未被覆盖（借鉴 OMO Issue #1485 教训）
- `quality:token_warn` — 用量超阈值预警

### 审稿协议 (2)
- `review:phase1` — 盲审预判（基于分析摘要，论文不可见）
- `review:phase2` — 实审对比（检查 Phase1 预判与 Phase2 实际偏离度）

### 用户交互 (2)
- `user:signoff` — 展示签核清单，暂停流程
- `user:clarify` — Dubin 生成 2-4 个选项供用户选择

---

## 七、环境就绪检查

### 依赖清单（按阶段）

**阶段 1 研究设计:**
- MCP: PubMed, CNKI, Cochrane, ClinicalTrials.gov, Exa, Consensus, Zotero(可选), browser-use(降级)

**阶段 2 数据分析:**
- R ≥ 4.3
- R 包: tableone, gtsummary, finalfit, survival, coxme, rms, MatchIt, WeightIt, mice, flowchart, ggplot2
- PlotCase (http://127.0.0.1:17892)
- OfficeCLI

**阶段 3 写作:**
- Pandoc ≥ 3.1, OfficeCLI

**阶段 4 投稿:**
- Pandoc, OfficeCLI, browser-use

**全程:**
- Git, Bun ≥ 1.2, OpenCode 最新稳定版

### 检查时机

- 安装时 (`omo-sci install`): 完整检查，缺失项给出安装命令
- 每阶段入口 (`stage:entry`): 增量检查该阶段依赖
- 运行中 (`/sci-doctor`): 完整或分级诊断

---

## 八、安全机制

### 熔断器

```
子 agent 执行限制:
  max_step: 50          // 超 50 步自动终止，通知 Dubin
  max_time: 30min       // 超 30 分钟自动终止

循环检测:
  连续 5 步相同工具 + 相同参数 → 识别为循环
  → 强制注入干预提示

静默路由警告:
  子 agent 模型 ≠ 用户当前会话模型
  → Dubin 委派前明确告知模型选择和预计 token 消耗

并发限制（可配置）:
  同时运行子 agent 总数 ≤ 8
  默认值，用户可在配置中调整
```

### 内容安全

- **文献真实性**: 每条证据必须有来源类型对应的可验证 ID，例如 PMID、DOI、PMCID、CNKI ID、NCT ID、指南 URL 或期刊投稿说明 URL。EBMer 验证。严禁编造。
- **数据溯源**: Material Passport 中 data_label 必填。阶段 2 入口用户解封确认。Writer 必须声明。
- **去 AI 味 + AI 盲**: 禁用词表。Methods 以真人研究者口吻描述。Polisher 逐句扫描。

### 主张-证据映射

Writer、EBMer、Polisher 共享 `ClaimEvidenceMap`，稿件中每个关键主张必须映射到分析结果或文献证据：

```typescript
interface ClaimEvidenceMap {
  claim_id: string;
  claim_text: string;
  manuscript_location?: string;
  evidence_type: 'analysis_result' | 'literature' | 'guideline' | 'journal_instruction';
  evidence_ids: string[];
  verification_status: 'verified' | 'missing' | 'conflict' | 'not_applicable';
}
```

Integrity Gate I 抽样验证 30% 主张，至少 10 条；Integrity Gate II 验证 100% 主张。

### 用量监控

```
额度档位（安装时选择）:
  2 亿 tokens  — 轻度用户
  5 亿 tokens  — 中度用户（默认）
  10 亿 tokens — 重度用户

用量预警:
  50% → Dubin 轻提示
  80% → 建议优先使用轻量模型
  100% → 暂停，进度写入 Material Passport，可调整额度

/sci-usage → 展示按阶段/agent 分类的 token 用量明细
```

---

## 九、技术栈与项目结构

### 技术选型

| 层面 | 选择 |
|------|------|
| 运行环境 | Bun |
| 插件格式 | OpenCode Plugin (npm 包 `omo-sci`) |
| 配置文件 | JSONC (`~/.config/opencode/omo-sci.jsonc`) |
| 状态持久化 | JSON 文件 |
| 安装程序 | TUI 交互式 (Inquirer) |
| 测试 | Bun Test |
| 类型安全 | TypeScript strict |

### CLI 命令

```
/sci-start       开始新研究 → 触发 Dubin 阶段 0 访谈
/sci-status      查看当前项目状态
/sci-resume      恢复中断的研究
/sci-review      手动触发审稿
/sci-usage       查看 token 用量明细
/sci-doctor      环境诊断
omo-sci install  安装插件
omo-sci config   重新配置模型映射
```

### 目录结构

```
omo-sci/
├── src/
│   ├── index.ts              # 插件入口
│   ├── agents/               # 9 个 agent 定义
│   │   ├── dubin.ts, archimedes.ts, irber.ts
│   │   ├── pubmeder.ts, spsser.ts, writer.ts
│   │   ├── submitter.ts, ebmer.ts, polisher.ts
│   ├── orchestrator/         # Dubin 编排引擎
│   │   ├── interview.ts, delegation.ts, summarizer.ts
│   ├── pipeline/             # 流水线状态机
│   │   ├── stages.ts, gates.ts, transitions.ts
│   ├── router/               # 分类路由
│   │   ├── categories.ts, fallback.ts, provider.ts
│   ├── state/                # 跨会话状态
│   │   ├── passport.ts, boulder.ts, wisdom.ts
│   ├── hooks/                # 22 个生命周期钩子
│   │   ├── session.ts, stage.ts, delegation.ts
│   │   ├── model.ts, quality.ts, review.ts, user.ts
│   ├── tools/                # 自定义工具
│   │   ├── literature-search.ts, sap-generator.ts
│   │   ├── reference-validator.ts, journal-matcher.ts
│   ├── safety/               # 安全机制
│   │   ├── circuit-breaker.ts, content-guard.ts, usage-tracker.ts
│   ├── environment/          # 环境就绪检查
│   │   ├── check.ts, mcp-check.ts, r-check.ts
│   │   ├── software-check.ts, api-check.ts, reporter.ts
│   └── install/              # 安装程序
│       ├── tui.ts, config-generator.ts, validator.ts
├── references/               # 领域知识（继承 opensci/codexsci）
├── tests/
└── docs/
```

---

## 十、开发路线图

| 阶段 | 内容 | 时间 |
|------|------|------|
| Phase 1: 核心骨架 | 插件框架 + 安装程序 + 分类路由 + 钩子系统 + Material Passport + Boulder + /sci-doctor | 4 周 |
| Phase 2: Agent 团队 | Dubin 访谈 + Archimedes/IRBer + Pubmeder + SPSSer + Writer/Submitter | 4 周 |
| Phase 3: 审稿 + 安全 | EBMer/Polisher + Sprint Contract + 熔断器 + 内容安全 + Wisdom | 2 周 |
| Phase 4: 打磨 | 文档 + 示例项目 + opensci/codexsci references 同步 + 社区反馈 | 2 周 |
| **总计** | | **~12 周** |

---

## 十一、风险与缓解

| 风险 | 影响 | 缓解 |
|------|------|------|
| OpenCode 插件 API 能力不足 | agent 间通信受限 | 参考 OMO 源码验证可行性 |
| 国内模型 API 不稳定 | 委派失败 | 完善 fallback 链 + 错误重试 |
| 模型输出不符合医学规范 | 文献编造/统计错误 | EBMer 审稿 + 文献验证 + 硬门控 |
| 单开发者维护瓶颈 | 进度缓慢 | Phase 1 先跑通最小可用流程 |
| Anthropic 对第三方客户端的法律行动 | 影响 OpenCode 生态 | 仅使用国内模型 API，不依赖 Claude |
| 医学领域知识陈旧 | AI 引用过时标准 | references 定期更新 + Pubmeder 搜索最新文献 |
