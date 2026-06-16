# 图表风格指南

## PlotCase R 图表模板库

PlotCase（v1.0.4）提供本地 API（`http://127.0.0.1:17892`），含 150+ 发表级 R 图表模板。

```bash
curl -s http://127.0.0.1:17892/cases              # 列出所有模板
curl -s "http://127.0.0.1:17892/case?id=多因素Cox森林图"  # 获取单个模板
```

返回字段：id, title, path, intro, code（完整 R 代码）, env（R 环境和包版本）, interpretation（绘图思路）

### 使用规则

1. 需要画图时，先用 API 搜索相关模板
2. API 不可用 → `npx asar extract-file /Applications/PlotCase.app/Contents/Resources/app.asar "/content/<分类>/<模板名>/code.R" /tmp/<输出>.R`
3. 读取模板代码，替换数据路径和变量名
4. 检查 env 字段确认 R 包，缺失则安装
5. PlotCase 完全不可用 → 自行编写 ggplot2（参考下方 R 自编码模板）

### 常用统计图覆盖

PlotCase 覆盖：KM 曲线、Cox 森林图、箱线图、小提琴图、散点图、热图、相关性矩阵

PlotCase 不含（自编码）：ROC 曲线（pROC）、校准曲线（rms）、决策曲线（dcurves）、SMD 平衡图（cobalt）、CONSORT/STROBE/STARD 流程图（`/drawio` 技能）

文件名标注：PlotCase 来源 `FigureX_xxx_PlotCase.svg`，自编码 `FigureX_xxx_ModelGen.svg`

## ggplot2 视觉惯例（从 PlotCase 模板提取）

### 基座与背景
- theme: `theme_classic()` 或等效自定义（无面板背景、无边框）
- 面板背景：纯白，无边框
- 右轴、上轴：始终隐藏

### 网格
- 主网格：`#e5e5e5`，0.2px（部分模板无网格）
- 次网格：始终隐藏

### 轴线
- 左轴、底轴：black，0.4px
- 轴线末端：默认

### 文字
- 字体族：Times New Roman（投稿要求）
- 轴文字：10pt，black，bold
- 轴标题：9pt，black
- 图例文字：black，可选 italic，9pt
- 图例标题：通常隐藏

### 配色
- 来源：ggsci 调色板或手动
- 分组色（定性）：#E64B35（红）、#4DBBD5（蓝）、#00A087（绿）、#3C5488（深蓝）
- 连续色：viridis palette
- PSM 匹配前后对比：匹配前 #FC4E07、匹配后 #00BFC4
- 柔和优先，避免荧光色，2-3 色调（对比型），≤4 色（分类型）
- 填充透明度：alpha 0.7

### 图例
- 背景：无，边框：无
- 位置：图内（如右上角）或右侧

### 边距
- plot.margin: `unit(c(0.5, 0.5, 0.5, 0.5), "cm")`

### 图形尺寸
- 单栏宽图：84mm × 80mm
- 双栏宽图：174mm × 100mm
- 半页图：174mm × 120mm

### R 自编码 ggplot2 模板

```r
theme_classic() +
theme(
  axis.line = element_line(color = "black", size = 0.4),
  axis.text = element_text(color = "black", size = 10, face = "bold"),
  axis.title = element_text(color = "black", size = 9),
  panel.grid.major = element_line(size = 0.2, color = "#e5e5e5"),
  panel.grid.minor = element_blank(),
  panel.background = element_blank(),
  panel.border = element_blank(),
  legend.background = element_blank(),
  legend.key = element_blank(),
  legend.title = element_blank(),
  legend.text = element_text(color = "black", size = 9),
  plot.margin = unit(c(0.5, 0.5, 0.5, 0.5), "cm")
)
```

## 输出规范

- 主格式：SVG（可编辑文字，`svg.fonttype = 'none'`）
- 预览：PNG（≥ 300 DPI）
- 组图用 patchwork 拼接
- 图序按正文引用顺序（Figure 1, Figure 2…）
- 避免冗余：同一信息不在多个图中重复
- 所有缩写在图注中定义
- 误差线：均值 ± 95% CI 或 ± SD（图注说明）
- P 值标注：* P<0.05, ** P<0.01, *** P<0.001

## 示意图（外部模型或 Draw.io）

Figure 1 患者筛选流程图等，传入精确数字（不传原始数据），嵌入上述风格参数。`/drawio` 技能可生成 .drawio XML 并导出 PNG（内嵌 XML，可再编辑）。
