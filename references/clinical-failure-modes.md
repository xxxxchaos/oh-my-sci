# 12 模式临床失败检查表

> 用于 Stage 2.5 和 Stage 4.5 完整性闸门。
> 基于 ICU 临床研究方法论文献（Lynn 2025, Hazard 2025, Kohn 2013, Crit Care Science 2025）。

---

## 检查表

### M1 — 综合征碰撞偏倚
**问题**：用 ARDS/脓毒症等综合征定义作为入组标准，将不同疾病实体混合，引入碰撞偏倚（collider bias），导致结论不可迁移。
**检测**：入组标准是否基于综合征定义（而非病因学诊断）？若为 RCT，是否讨论了综合征内异质性对结论可迁移性的影响？
**严重度**：Critical
**来源**：Lynn et al. (2025) *Patient Safety in Surgery*

### M2 — 不朽时间偏倚
**问题**：生存分析中暴露定义含时间窗，暴露发生前的存活时间被错误归入暴露组。
**检测**：暴露是否在基线后定义？若含时间窗，是否用了时间依赖 Cox 或 landmark 分析？
**严重度**：Critical
**来源**：Hazard et al. (2025) *Clin Micro Infect*

### M3 — 竞争风险偏倚
**问题**：死亡是 ICU 研究最常见竞争事件。用标准 Cox（将死亡视为删失）而非 Fine-Gray 或原因别风险模型，会高估目标事件的累积发生率。
**检测**：研究中死亡是否常见终点？若为 KM/Cox 且研究时长 >28 天，是否考虑了竞争风险？
**严重度**：Critical
**来源**：Hazard et al. (2025)

### M4 — Incorporation Bias
**问题**：诊断研究中 index test 的结果被混入 reference standard 的判断中，人为提高 Se/Sp。
**检测**：PiCCO/金标准判断者是否对 Doppler 结果设盲？reference standard 的定义是否独立于 index test？
**严重度**：Critical
**来源**：Kohn et al. (2013) *AEM*

### M5 — 部分验证偏倚
**问题**：只有 index test 阳性者接受金标准验证，阴性者的真实状态未知。
**检测**：是否所有纳入患者都接受了金标准（PiCCO/液体负荷）？若否，是否讨论了偏倚方向？
**严重度**：Critical
**来源**：Kohn et al. (2013)

### M6 — 数据溯源违规
**问题**：data_label 未解封、未在 SAP/Analysis_Summary 中引用、或稿件声明与 data_label 不一致。

**Stage 2.5 检测（M6a — 数据溯源完整性）**：
- data_label 是否已从 SEALED 解封？
- SAP 中是否引用了 data_label？
- Analysis_Summary 中是否含 data_label？
- 若 data_label = simulated，seed 是否从 stage1_5 传递到 stage2？

**Stage 4.5 检测（M6b — 稿件数据声明）**：
- 稿件是否在 Abstract 和 Methods 首段声明了数据来源？
- 声明是否与 data_label 一致？
- data_label = simulated 时，第一条局限性是否为模拟数据声明？
**严重度**：Critical

### M7 — 引用幻觉
**问题**：参考文献的 PMID 在 PubMed 中不存在，或 DOI 无法解析。
**检测**：每篇引用是否可通过 PMID 在 PubMed 验证？是否为"vibe citing"（拼接真实文献要素的假引用）？
**严重度**：Critical
**来源**：Zhao et al. (2026) *arXiv:2605.07723*

### M8 — Table 2 Fallacy
**问题**：多变量回归模型的所有系数被当作可解释的效应估计呈现在 Table 2 中，忽略不同变量的调整意义不同。
**检测**：Table 2 中是否每个变量都有明确的调整理由（基于 DAG 而非逐步法）？
**严重度**：Major
**来源**：*Crit Care Science* (2025)

### M9 — 缺失数据处理不当
**问题**：缺失 >5% 但仅用完整病例分析，或排除了缺失数据的患者而未做敏感性分析。
**检测**：缺失比例是否报告？若 >5%，是否做了多重插补或至少讨论了偏倚方向？
**严重度**：Major
**来源**：*Crit Care Science* (2025)

### M10 — 过度宣称
**问题**：观察性研究使用 causal 语言；AUC 0.7-0.8 声称"good accuracy"；AUC < 0.7 声称任何预测能力。
**检测**：稿件是否使用了 causal 语言？对诊断准确性的描述是否与 AUC 的实际范围匹配？
**严重度**：Major
**来源**：综合临床流行病学

### M11 — 多重比较未校正
**问题**：≥3 个次要终点或亚组分析未做多重比较校正。
**检测**：次要终点数量？是否做了 Bonferroni/Holm 校正？探索性分析是否标注？
**严重度**：Major
**来源**：综合生物统计学

### M12 — 数据漂移
**问题**：模拟数据/外部数据训练的模型，其分布与目标 ICU 人群不匹配。
**检测**：data_label = simulated 时，生成参数是否基于目标 ICU 人群的文献分布？模型验证是否仅限于模拟数据？
**严重度**：Warning
**来源**：*Intensive Care Med* (2025)

---

## 闸门执行规则

### Stage 2.5（完整性闸门 I）
- 12 模式全部运行
- 结果：CLEAR / SUSPECTED / INSUFFICIENT_EVIDENCE
- 阻塞条件：任何模式 SUSPECTED → 修复 + 重跑（max 3 轮）
- 主张抽样：30%，最少 10 条
- 用户可选：OVERRIDE（附理由，记录到 Passport）

### Stage 4.5（完整性闸门 II）
- 12 模式零容忍重跑
- 主张抽样：100%
- Stage 2.5 标记 SUSPECTED 的模式 → 必须 CLEAR 或正式 OVERRIDDEN
- 阻塞条件：任何模式仍 SUSPECTED → 阻止进入 Stage 5
