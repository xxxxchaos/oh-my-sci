# 统计方法速查

> 研究类型 → 推荐统计方法 + 常用 R 包

## 研究类型 → 统计方法

| 研究类型 | 主要分析 | 常用 R 包 |
|---------|---------|----------|
| 诊断试验 | ROC、AUC 比较（DeLong）、敏感/特异度 | pROC、OptimalCutpoints、DTComPair |
| 队列研究 | Cox 回归、KM 曲线、HR + 95%CI | survival、survminer、forestplot、rms |
| 病例对照 | Logistic 回归、OR、匹配分析 | MatchIt、logistf、epiDisplay |
| RCT | Cox/Logistic、ITT、亚组分析 | survival、tableone、lme4、emmeans |
| 横断面 | Logistic 回归、患病率、调查权重 | survey、epiR、logistf |

## 协变量选择策略

- 先验知识优先：基于文献和 DAG 选择已知混杂因素，而非数据驱动
- 禁止逐步法：禁止 step()、stepAIC() 等自动化变量选择
- 变化-in-estimate：作为补充，加入协变量后效应量变化 >10% 则保留
- 事件-per-变量（EVPV）：Logistic/Cox 回归至少 10 个事件/协变量

## 敏感性分析

| 方法 | 目的 | R 包 |
|------|------|------|
| PSM | 平衡基线特征 | MatchIt、cobalt |
| IPTW | 逆概率加权 | WeightIt、survey |
| MICE | 多重插补 | mice、miceadds |
| E-value | 未测量混杂敏感性 | EValue |

## 诊断检查

| 检查项 | 方法 | 阈值 |
|--------|------|------|
| PH 假设 | Schoenfeld 残差 | P > 0.05 |
| 共线性 | VIF | < 5（宽松 < 10） |
| 模型拟合 | HL test / C-index | P > 0.05 / > 0.7 |
| PSM 平衡 | 匹配后 SMD | < 0.1 |
| 影响点 | dfbeta | 逐个检查 |

## 多重比较校正

- 次要终点 ≥ 3 个 → Bonferroni 或 Holm 校正
- 探索性终点 → 不校正，标注 "exploratory"
- 亚组分析 → 报告交互 P 值，不单独校正

## R 执行规则

1. 生成 R 代码后，用 `Rscript <文件>.R` 执行
2. 先检查 R 环境：`which R`
3. 自动安装缺失包：`install.packages(c("包名"), repos="https://cloud.r-project.org")`
4. Tables 输出到 `02_analysis/tables/`
5. Figures 输出到 `02_analysis/figures/`（同时输出 PDF + PNG）
6. 保存 `session_info.txt`（R 版本 + 包版本 + seed）
