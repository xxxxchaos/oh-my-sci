# 临床研究设计参考

## 研究类型速查

| 类型 | 推荐问题框架 | 报告规范 | 核心指标 | 统计方法 |
|------|-----------|---------|---------|---------|
| A. 诊断试验 | PIRD | STARD 2015 | AUC、敏感性、特异性 | pROC / OptimalCutpoints |
| B. 队列研究 | PECOS | STROBE | HR、发生率、KM 曲线 | survival / survminer / forestplot |
| C. 病例对照 | PECOS | STROBE | OR、匹配分析 | MatchIt / logistf |
| D. RCT | PICOT | CONSORT 2010 | ARR、NNT、治疗效应 | survival / tableone |
| E. 横断面 | CoCoPop | STROBE | 患病率、95%CI | survey / epiR |

## 问题框架速查

| 研究类型 | 推荐框架 | 元素 |
|---------|---------|------|
| 干预/治疗比较 | PICOT | Population, Intervention, Comparison, Outcome, Timeframe |
| 观察性（暴露→结局） | PECOS | Population, Exposure, Comparison, Outcome, Study Design |
| 诊断准确性 | PIRD | Population, Index test, Reference standard, Disease |
| 预后/预测 | PFO | Population, Factor(s), Outcome |
| 患病率/横断面 | CoCoPop | Condition, Context, Population |
| 定性/混合方法 | SPIDER | Sample, Phenomena of Interest, Design, Evaluation, Research type |
| 卫生服务评估 | SPICE | Setting, Perspective, Intervention, Comparison, Evaluation |

### 框架选择决策树

```
研究目的是什么？
├─ 评价干预效果 → PICOT
├─ 找暴露与疾病的关联 → PECOS
├─ 评价诊断工具准确度 → PIRD
├─ 预测预后/风险分层 → PFO
├─ 描述患病率/疾病负担 → CoCoPop
└─ 理解体验/态度/行为 → SPIDER 或 PEO
```

## PICOT 各元素精细化定义

**P — Population**：不只说疾病名——诊断标准（哪版指南？ICD编码？）、年龄段、关键纳排特征。示例：不是"脓毒症患者"，而是"ICU 住院的脓毒症 3.0 成人患者，APACHE II ≥ 15，接受血管活性药物治疗"。

**I — Intervention/Exposure**：需量化——剂量、频次、持续时间、实施方式。示例：不是"高剂量 CRRT"，而是"CRRT 剂量 ≥ 35 ml/kg/h，持续 ≥ 48h，使用 AN69 滤器"。

**C — Comparison**：明确定义——安慰剂/假干预/标准治疗/无干预。如为"标准治疗"，说明当前 SOP。

**O — Outcome**：区分层级——主要终点（1 个，硬终点优先）、次要终点（2-5 个）、探索性终点。每个终点明确定义、测量方法、测量时间点。

**T — Timeframe**：ICU 研究特别重要——暴露窗口、随访时长（28天/90天/ICU出院）、终点评估时间点。

## FINER 五维评估

每个维度 1-5 分，总分 < 18 分需重新讨论。

| 维度 | 说明 |
|------|------|
| F — Feasible | 年可纳入患者量？EHR 数据可及性？随访可行性？技术能力？时间线？预算？ |
| I — Interesting | 同行会觉得"我也想知道"吗？能否解决科室内部争议？ |
| N — Novel | 1=完全重复 / 2=人群扩展 / 3=方法学创新 / 4=增量创新 / 5=原创 |
| E — Ethical | 回顾性：免知情同意？前瞻性：知情同意流程？弱势群体？ |
| R — Relevant | 能否改变 ICU 诊疗决策？能否为指南提供证据？能否支持后续 RCT？ |

| 总分 | 建议 |
|------|------|
| 20-25 | 绿灯：继续推进 |
| 15-19 | 黄灯：针对性讨论后决定 |
| <15 | 红灯：重新选题 |

## 报告规范清单（RCT 用 SPIRIT，非 RCT 按类型选）

### SPIRIT 2025 脑暴阶段需关注的项（★ 标记，约15项）

| # | 项目 | 脑暴关注 |
|---|------|---------|
| 6 | 背景与原理 | ★ 证据景观产出 |
| 7 | 研究目的 | ★ 脑暴核心 |
| 8 | 试验设计 | ★ 设计类型讨论 |
| 10 | 纳排标准 | ★ PICO 的 P |
| 12 | 干预描述 | ★ PICO 的 I（TIDieR 级别精度） |
| 15 | 结局指标 | ★ PICO 的 O |
| 17 | 样本量 | ★ 效应量依据来自锚点文献 |
| 22 | 数据收集方案 | ★ 来源和方法 |
| 24 | 统计分析 | ★ 主要分析方案方向 |
| 26 | harms | ★ 安全事件定义和收集 |
| 29 | 伦理审批 | ★ 伦理路径 |

> 来源：Chan AW et al. BMJ 2025;388:e081660. PMID 40294956。非RCT不加载SPIRIT。

## 临床数据逻辑约束（数据生成时遵守）

1. 年龄整数（18-100），不出现小数
2. 性别 0/1，男性比例 ICU 约 55-65%
3. APACHE II（0-71），每增 10 分院内死亡风险约翻倍
4. SOFA（0-24），与 APACHE II 正相关（r≈0.6-0.7）
5. BMI 与年龄不相关；糖尿病与 BMI 正相关
6. 血管活性药物使用者的 SOFA 更高
7. CRRT 持续时间与疾病严重度正相关
8. 合并症可共病（糖尿病+高血压常见），概率合理
9. 主要终点事件率必须有文献锚点
10. 缺失值 MCAR 机制，≤5%
