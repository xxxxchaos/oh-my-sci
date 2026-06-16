# 论文润色指南（Nature 标准临床适配版）

> 基于 [nature-polishing v5.0.0](https://github.com/Yuan1z0825/nature-skills)（课程优先架构）+ Academic Phrasebank，适配临床医学论文写作。
> 所有临床示例来自 ICU 领域（sepsis, ARDS, CRRT, ECMO）。

---

# Part A: 核心架构

## A1. 论文类型识别（先于一切编辑）

编辑之前先确定论文类型。不同类型有不同的叙事逻辑：

| 论文类型 | 读者核心问题 | 叙事逻辑 |
|----------|-------------|---------|
| **原始研究**（RCT/队列/病例对照/诊断/横断面） | 为什么重要？做了什么？发现了什么？意味着什么？ | IMRaD 沙漏 |
| **系统评价/Meta** | 证据全貌是什么？可置信吗？ | PRISMA 流程驱动 |
| **方法学论文** | 方法是否有效？可复现吗？比现有方法好吗？ | 公平比较逻辑 |

**临床论文特别提醒**：绝大多数临床论文属于"原始研究"类型，但不同研究设计（RCT vs 队列 vs 诊断）的 Discussion 写法差异巨大（详见 Part B）。

**不要用一种叙事逻辑写所有论文类型。**

## A2. 为读者而写（非为起草顺序而写）

读者按以下顺序消费论文：
1. 这和我有关吗？（Relevance）
2. 有什么新的？（Novelty）
3. 我能信吗？（Trust）
4. 我能用吗？（Reuse）
5. 意味着什么？边界在哪？（Meaning）

润色应帮助论文按这个顺序回答读者的问题。

## A3. 沙漏结构

论文呈沙漏形：
- **Introduction**：从宽到窄（领域→已知→空白→"Here we..."）
- **Methods/Results**：聚焦，只讲本研究
- **Discussion**：从窄到宽（发现→对比→含义→局限→结论）

如果段落违反此结构，先重建结构再润色措辞。

## A4. 写作顺序 ≠ 阅读顺序

**原始研究的正确写作顺序：**
1. Results（从数据和图表开始——最客观，不易引入 bias）
2. Methods（写完 Results 就知道方法写了什么）
3. Introduction（知道了发现才知道怎么引入）
4. Discussion（对比和含义）
5. Abstract（最后写，它是 mini-paper）
6. Title（最后确定，确保被数据支撑）

**系统评价/Meta 的写作顺序：**
1. Results（筛选流程图 + 证据表）
2. Methods（检索策略 + 统计方法）
3. Introduction + Discussion
4. Abstract

## A5. 核心论点所有权

论文的核心论点包括：
- 论文实际回答的科学问题
- 为什么这个问题重要
- 本研究与现有研究的区别
- 结果意味着什么
- 主要推理线索如何展开

**AI 可以**：润色语言、重组结构、比较措辞、检查逻辑
**AI 不应**：发明或创作核心论点

如果论点本身弱或不清楚，**暴露问题而不是用流畅语言掩盖问题**。

## A6. 先诊断失败模式，再编辑

编辑前先识别主要问题，按优先级诊断：

```
论文类型 → 章节职责 → 段落逻辑 → 主张/证据/边界 → 句子润色
```

常见失败模式：

| 失败模式 | 表现 | 优先修复 |
|----------|------|---------|
| 论文类型逻辑错误 | 队列研究用了 RCT 的因果语言 | 全文 aud |
| 缺口缺失或定位差 | Introduction 没说清为什么这个研究现在必须做 | Introduction 重写 |
| 有主张无证据 | Discussion 声称"first"但无数据支撑 | 删除或弱化主张 |
| 有证据无主张 | Results 报告了数字但不解释临床意义 | Discussion 补充 |
| 边界/局限缺失 | 全文无局限性段落或只说"sample size" | Discussion 补充 ≥4 条 |
| Results/Discussion 混杂 | Results 段落出现解释性语言 | 拆分 |
| 标题/摘要弱信号 | 标题太泛，摘要无数字 | 重写 |
| 仅句子层面杂乱 | 以上都 OK，仅需句子润色 | 直接进 Part C |

---

# Part B: 章节职责

## B1. Introduction

必须回答四个问题：
1. 关于该主题已知什么（疾病负担/现有证据）
2. 尚有哪些未解决（证据空白——非简单地"没人做过"，而是"已有证据为什么不充分"）
3. 本研究的具体问题是什么（PICO 框架）
4. 如何回答（研究设计一句话概括）

**四段结构模板**：

```
段落 1：疾病负担 + 临床重要性
  → "Sepsis affects an estimated 49 million people annually worldwide..."
  → 引用：GBD 数据、流行病学调查（2-3 篇）

段落 2：现有证据总结
  → "Several studies have examined the association between X and Y..."
  → 引用：关键先前研究，标注各自的局限（3-4 篇）

段落 3：证据空白具体化（最关键段落）
  → "However, whether X benefits patients with [specific subgroup] remains uncertain, as prior studies [specific limitation]..."
  → 引用：支撑空白存在的具体证据（2-3 篇）
  → 每个空白用文献矩阵中的 🟡缺口支撑 文献

段落 4："Here we..." + 研究设计一句话
  → "Here we [verb] whether [exposure] is associated with [outcome] in [population], using [design]."
```

**禁忌**：
- 不要在 Introduction 中总结结果
- 不要在 Introduction 中总结结论
- 不要用"no one has ever studied"——“没人研究过”几乎永远不准确，改为"has received limited attention"或具体说明先前研究的局限

**按论文类型的 Introduction 重点**：

| 论文类型 | Introduction 侧重 |
|----------|-------------------|
| RCT | 已有 RCT 的证据等级和未回答的具体问题 |
| 队列研究 | 观察性证据的局限 + 为什么 RCT 不可行 |
| 系统评价 | 已有综述的缺口（方法学局限、时效性、范围） |
| 诊断研究 | 现有诊断手段的具体不足（灵敏度/特异度/可操作性） |

## B2. Methods

好的方法写作是：specific, complete, transparent。

**临床论文方法学必须覆盖（按报告规范逐项检查）**：

| 条目 | 要求 | 反例 |
|------|------|------|
| 研究设计 | 类型 + 报告规范声明 | "回顾性研究"→ 应为"retrospective cohort study, reported following STROBE" |
| 数据来源 | 系统名称、版本、提取时段 | "电子病历"→ 应为"[系统名] v[X], data from [YYYY-MM] to [YYYY-MM]" |
| 纳入/排除标准 | 完整列表 | "根据临床诊断"→ 应为具体诊断标准+ICD编码 |
| 暴露/干预 | 精确到剂量、时长、采样时间点 | "CRRT"→ 应为"CRRT initiated within [X] h, dose [Y] mL/kg/h" |
| 结局 | 主要/次要，精确到定义 | "死亡率"→ 应为"28-day all-cause mortality" |
| 统计方法 | 检验名称、软件版本、变量选择策略、缺失值处理 | "用 SPSS 分析"→ 应为具体检验+版本+双侧/单侧 |
| 伦理 | 批准号和日期、知情同意类型 | 必须包含 |
| 注册号 | RCT 必须（NCT 号） | 必须包含 |

**绝对禁止的模糊短语**：

| 禁止 | 应写明 |
|------|--------|
| "数据来自电子病历" | 具体系统名称、版本、提取时段、字段清单 |
| "采用常规方法" | 具体方案及参考文献 |
| "数据进行了统计分析" | 检验名称、软件及版本、双侧/单侧 |
| "差异有统计学意义" | P 值、效应量、95% CI、所用检验 |
| "患者随机分组" | 随机化方法、分配隐藏、盲法类型 |
| "排除了数据不完整的患者" | 具体缺失阈值和处理策略 |

## B3. Results

Results = 收集到的数据的客观摘要。

**必须包含**：
- 主要用**过去时**：were enrolled, increased, showed, was associated with
- 对象和条件：in patients with septic shock, during the first 72 h of ICU stay
- 定量信息：HR 1.34 (95% CI 1.12-1.61), P = 0.002, AUC 0.84
- 统计检验名称和效应量，**不只是 P 值**

**禁忌**：
- 不要用文字重复图表的全部内容——文字应补充图表不能直接传达的信息
- 不要在 Results 中解释机制或临床意义（属于 Discussion）
- 不要只说"差异有统计学意义"而不给效应量和置信区间

**Results 句法特征**：
- `was detected` / `increased` / `showed` / `enabled` / `achieved`
- 这些动词在 Results 中OK，在 Discussion 中需替换为解释性语言

## B4. Discussion

Results = 我们观察到的。Discussion = 我们如何理解，以及何时可能失效。

**Discussion 必须覆盖的结构**：

```
段落 1：核心发现一句话总结
  → "In this [design] of [population], we found that [core finding]."
  → 这是全文中最重要的句子之一

段落 2-4：与现有文献的对比
  → 逐一与文献矩阵中的 🔴效应量锚点 和 🔵PICO参考 对比
  → 一致的结果："Consistent with [ref], we observed..."
  → 不一致的结果："In contrast to [ref], our data suggest..."
  → 不回避矛盾数据——解释可能的原因

段落 5：生物学/临床合理性
  → "The observed association may be explained by..."
  → 机制讨论必须标注为推测性

段落 6：临床意义
  → "These findings suggest that [specific clinical action] may..."
  → 可讨论 NNT、适用人群、实施条件

段落 7：局限性（≥4 条）
  → 不写"样本量小"这种空洞条目
  → 每条局限性必须写：局限是什么 + 为什么可能影响结果 + 影响方向 + 读者应如何折价

段落 8：结论
  → 三部分结构（见 B5）
```

**按论文类型的 Discussion 重点**：

| 论文类型 | Discussion 关键差异 |
|----------|-------------------|
| RCT | 可做因果推断，讨论 NNT、临床可操作性、与先前 RCT 的对比 |
| 队列研究 | **必须充分讨论残余混杂**，用关联语言不用因果语言 |
| 病例对照 | 讨论选择偏倚和回忆偏倚的方向和可能影响 |
| 诊断研究 | 讨论阈值选择、适用场景、与现有诊断手段的互补 vs 替代 |
| 系统评价 | 讨论证据质量分级、异质性来源、与先前综述的差异 |
| 横断面 | 讨论时间性局限（"不能推断因果"） |

**Discussion 语言模式**：
- 模糊限制语：may, might, could, suggests, indicates, potentially
- 原因/机制：likely due to, reflecting, attributable to, mediated by
- 含义/应用：may facilitate, could support, offers a potential strategy for
- 局限性/失效条件：may not apply to, a limitation is, further validation in...is needed

## B5. Conclusion

强制执行三部分结构：
1. **重述核心贡献**（1 句：做了什么、回答了什么问题）
2. **总结关键证据**（1-2 句：用数字说话）
3. **含义 + 边界**（临床意义 + 适用范围 + 明确局限性，不引入新数据）

## B6. Abstract

摘要是 mini-paper。Vancouver 结构化摘要：

```
Background: [已知什么 + 空白是什么]
Methods: [设计 + 场景 + 患者 + 干预/暴露 + 主要终点]
Results: [核心数字：HR/OR/RR + 95% CI + P 值]
Conclusions: [含义 + 局限 + 登记号]
```

限制：≤250 词（多数临床期刊）；ClinicalTrials.gov 号必须包含。

## B7. Title

好的临床论文标题：
- ≤75 字符（含空格）
- 包含研究设计关键词（retrospective cohort, RCT, systematic review）
- 包含核心暴露和结局
- 不过度主张（避免 "novel", "first", "improves survival" 除非数据充分支撑）
- 可检索（PubMed 搜索能找到）

---

# Part C: 句子与段落控制

## C1. 句子长度控制

每个句子 ≤30 词。强制算法：
1. 起草后分别统计每个句子的词数
2. 任何超过 20 词的句子——检查是否包含多于一个主要命题
3. 拆分超载句，而非表面润色
4. 重新计数——迭代直到所有句子 ≤30 词
5. **最后一句必须接受同等审视**——若最后一句是最长的，拆分失败

**每个句子以一个主语 + 一个谓语动词为核心。** 如果一个句子同时有主动词、分词短语（enabling, revealing, thereby）和 "including" 列表——已超载，拆分。

## C2. 信息密度

删除填充短语：
- "It is well known that..." → 直接陈述
- "As a matter of fact..." → 删除
- "It is worth noting that..." → 删除或改为 Notably, ...（慎用）
- "Needless to say..." → 删除

每个句子必须有分量——要么带数据，要么带逻辑推进。

## C3. 句子结构

**首选结构**：
- 主动语态，具体主语："We found that..." 而非 "It was found that..."
- 主要观点前置，条件/限定词后置
- 复杂句子追求精确而非修饰

**临床论文模式模板**：
```
[Exposure] was associated with [outcome], [quantitative result].
  → Early CRRT initiation was associated with lower 28-day mortality, with an adjusted HR of 0.72 (95% CI 0.58-0.89).

Although [prior evidence], [gap remains].
  → Although several studies have examined CRRT dose in septic shock, the optimal timing of initiation remains uncertain.

Here we [verb] that [key finding].
  → Here we report that early CRRT initiation in patients with AKI stage 2 or higher was associated with improved survival.

Using [method], we [action verb] that [result].
  → Using propensity score matching with 32 baseline covariates, we assessed the association between CRRT timing and 28-day mortality.
```

## C4. 段落控制

- 每个段落一个控制性思想 + 支持材料（数据、对比、解释、后果、文献、局限）
- 新思想 → 新段落
- 使用主题连接，不用重复的 "This suggests..." 开头

**衔接策略（避免滥用 This/These）**：

| 策略 | 示例 |
|------|------|
| 重述主语 | "Septic shock causes microcirculatory dysfunction. This dysfunction impairs tissue oxygenation." |
| 状语连接词 | "Lactate clearance was monitored for 6 h. However, early normalization did not predict survival." |
| 定冠词 + 名词 | "The ICU cohort comprised 500 patients. The cohort was followed for 28 days." |
| 分词开头 | "These biomarkers showed conflicting patterns. Taken together, they suggest a multifactorial mechanism." |
| 零连接词 | "CRRT was initiated within 12 h. The median treatment duration was 48 h." |

**每段不超过一个指示词句子（This/These/Such）。**

## C5. Results vs Discussion 句法区分

**Results 句法**（客观报告）：
- was detected, increased, showed, enabled, achieved
- 过去时，定量信息
- 不解释

**Discussion 句法**（解释推断）：
- may reflect, suggests that, could indicate, is likely due to, may facilitate
- 现在时/现在完成时为主
- 带模糊限制语

不要让 Results 段落滑入 Discussion 句法。

---

# Part D: 语言规范

## D1. 模糊限制语校准

将主张的强度与证据水平匹配：

| 证据强度 | 可用动词 | 临床适用 |
|----------|---------|---------|
| **强**（RCT/荟萃分析） | demonstrate, show, establish, reveal | 仅限 RCT 和高质量 Meta |
| **中**（高质量队列研究） | suggest, indicate, are consistent with, support | 多数 ICU 观察性研究 |
| **弱**（小样本/单中心/亚组） | may reflect, could, seem to, appears to, potentially | 探索性分析 |

**临床研究铁律**：观察性研究永远不要用 "demonstrate" 或 "prove"，一律用关联语言（"was associated with", "may contribute to"）。

## D2. 词汇升级

| 避免 | 使用 |
|------|------|
| look at | examine, investigate, assess |
| find out | determine, establish |
| big/large | substantial, considerable, marked |
| very important | critical, essential, central |
| makes | generates, produces, yields |
| use | employ, utilize |
| get | obtain, achieve |
| change | modulate, alter, shift |
| help | facilitate, promote, enable |
| cause | induce, trigger, underlie, precipitate |
| more | additional, further, incremental |

## D3. 英式 vs 美式英语

确定目标期刊后遵从其拼写习惯。多数临床期刊接受美式（NEJM, JAMA）或英式（Lancet, BMJ）。

| 美式 | 英式 |
|------|------|
| signaling | signalling |
| analyze | analyse |
| behavior | behaviour |
| edema | oedema |
| hemorrhage | haemorrhage |
| ischemia | ischaemia |

## D4. 冠词用法（中文母语者重点关注）

中文没有冠词——这是高频错误源。

- **首次提及**："a/an"（a retrospective cohort study）
- **后续提及**："the"（the study, the cohort）
- **泛指复数**：无冠词（"Patients were enrolled" 而非 "The patients were enrolled"）
- **唯一实体**："the"（the ICU, the primary endpoint）
- **一般语境下的抽象名词**：无冠词（"Sepsis induces..." 而非 "The sepsis induces..."）

## D5. 缩写约定

- 首次出现写出全称，后跟括号中的缩写："acute respiratory distress syndrome (ARDS)"
- 后续仅用缩写，保持一致性
- 不在摘要和方法中独立定义不同的缩写
- 常见缩写无需定义：DNA, RNA, ATP, pH, ICU
- **临床论文特别提醒**：不要为每个生物标志物创造独立缩写——只有出现 ≥3 次的才缩写

## D6. 数字和单位

- 测量值使用数字："1.2 mm" 而非 "one point two millimeters"
- 数字和单位之间留空格："25 cm" 而非 "25cm"
- 范围使用短破折号："28-90 days" 或 "from 28 to 90 days"
- P 值：精确到小数点后 3 位（P = 0.032），极小值用 P < 0.001
- 百分比：小数不用过多位数（72.3% 非 72.31%）

## D7. 中译英模式

当源文本是中文或受中文影响的英文时：

1. **先提取核心命题**——不要逐句机械翻译
2. **重建显性逻辑连接**——中文常隐含逻辑关系，英文需要显性标注（contrast, cause, implication, limitation）
3. **验证术语准确性**——医学术语、因果关系词、模糊限制语
4. **保持关键术语稳定**——同一个概念不要用多个英文对应词
5. **检查主谓一致和冠词**——中文无冠词和无主谓一致，是中译英最高频错误

---

# Part E: 引用与归属

## E1. 引用类型（Vancouver 编号制）

四种引用类型：

A. **支撑型**："Previous studies have shown that early goal-directed therapy reduces mortality (1-3)."
B. **借用型**："Following the sepsis definition of Sepsis-3 (4), we defined septic shock as..."
C. **对比定位型**："Unlike the ARDSNet trial (5), which used 6 mL/kg, our protocol used 4 mL/kg."
D. **复现型**："We reproduced the analysis pipeline of Zhang et al (6)."

## E2. 需要引用什么

**必须引用**：他人的数据、论点、方法、定义、分类标准
**无需引用**：教科书级公共知识（APACHE II 是什么、SOFA 评分标准）

**核心规则**：引用你实际阅读并验证的来源，不引用二手来源。引用数 30-40 篇。

## E3. 致谢

- 资助："This work was supported by ____ (Grant No. ____)."
- 技术协助："We thank ____ for assistance with data extraction."
- 致谢对象：资助机构、数据采集协助者、统计咨询——非家庭成员

---

# Part F: 质量把控

## F1. 过度宣称检测

定稿前标记并弱化以下模式：

| 模式 | 临床示例 | 修正 |
|------|---------|------|
| 绝对化主张 | "CRRT improves survival" | "Early CRRT was associated with lower 28-day mortality" |
| 从相关推导因果 | "Lactate causes mortality" | "Higher lactate was associated with increased mortality, potentially reflecting disease severity" |
| 范围扩大 | 单中心结果泛化到所有 ICU | "in this single-center cohort" / "multicenter validation is needed" |
| "First" 声明 | "the first to show..." | "To our knowledge, this is the first study to..." |
| 强级最高级 | "most effective", "best", "superior" | 必须有头对头比较数据 |

## F2. 校对清单

- [ ] 主谓一致（"The data suggest..." 非 "The data suggests..."）
- [ ] 图表编号连续（Figure 1 → Figure 2 中间不跳）
- [ ] 引用连续（Vancouver 编号从 1 开始不中断）
- [ ] P 值精度一致（均为小数点后 3 位或 P < 0.001）
- [ ] 缩写定义一致（在摘要和正文中均定义）
- [ ] 数字与单位格式统一
- [ ] 参考文献中每条都有在正文中被引用

## F3. 去 AI 味

**英文禁用词：**

delve, crucial, groundbreaking, robust, comprehensive, furthermore, moreover, notably, intriguingly, pivotal, paradigm, testament, beacon, realm, landscape, intricate, nuanced, multifaceted, holistic, underscores, remarkable, remarkably

**中文禁用短语：**

在此基础上、值得注意的是、起到了关键作用、毋庸置疑、显而易见、众所周知、不言而喻、具有重要的理论意义和实践价值、填补了国内空白

**写作风格**：用 suggest/indicate/demonstrate（按证据等级），不用 prove。

## F4. AI 使用边界（交通灯模型）

**Green（可接受）：**
- 改善语法、清晰度、学术语气
- 产生替代措辞供比较
- 翻译并验证术语
- 检查句子长度和过度宣称

**Yellow（允许但需强人工控制）：**
- 翻译段落——验证医学术语、因果关系、模糊限制语的准确性
- 解释方法或结果——用于措辞支持而非科学判断

**Red（不适当）：**
- 插入 AI 生成的参考文献而不核对
- 请 AI 从头起草论文核心论点
- 将未发表稿件或患者数据上传到公共模型
- 编造或修改数据

**核心原则**：AI 协助语言，作者对准确性、完整性和原创性负责。

---

# Part G: 润色工作流

## Phase 1: 结构诊断（先于任何句子编辑）

1. 识别论文类型（A1）
2. 诊断失败模式（A6）
3. 验证沙漏结构（A3）
4. 确认章节职责是否履行（Part B 对应章节）

## Phase 2: 章节内容编辑

- Introduction：4 问题检查 → 缺口支撑文献映射
- Methods：模糊短语对照表逐一检查（B2）
- Results：客观性检查，Discussion 句法入侵检查（C5）
- Discussion：结构完整性检查（B4 的 8 段落覆盖度）

## Phase 3: 句子与段落润色

- 句子长度统计 + 拆分超载句（C1）
- 删除填充词（C2）
- 衔接策略检查，减少 This/These（C4）
- 加强动词 + 词汇升级（D2）

## Phase 4: 语言规范

- 模糊限制语校准（D1）——与证据等级匹配
- 冠词检查（D4，中文母语重点）
- 缩写一致性（D5）
- 数字单位格式（D6）
- 英式/美式选择（D3）

## Phase 5: 质量把关

- 过度宣称检测（F1）
- 去 AI 味扫描（F3）
- 校对清单（F2）
- 引用完整性

---

# 输出格式

润色后始终返回三件事：
1. **纯文本润色版**——不在代码块中，直接可复制粘贴
2. **修改总结**——3-5 个要点：改了什么、为什么
3. **结构说明**——如执行了句子拆分、段落重组或章节重排，简要说明
