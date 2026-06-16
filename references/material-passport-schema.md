# Material Passport Schema — opensci v3.0

Material Passport 是跨 session 的结构化数据传递载体。JSON 格式，按阶段增量写入。每阶段写入后 hash 锁定，下一阶段验证 hash 一致性。

## 核心规则

- 主 agent 在每阶段完成时写入对应 schema 字段
- 下一阶段 agent 启动时验证前置字段的 hash
- 缺失必填字段 → `PASSPORT_INCOMPLETE` → 拒绝继续
- data_label 为 SEALED 状态时，任何 agent 不得读取其内容
- Schema 字段分为 required（必填）和 optional（可选）

## Schema 结构

```json
{
  "passport_version": "3.0",
  "project": {
    "project_name": "string",
    "research_title_en": "string",
    "research_title_zh": "string",
    "study_type": "RCT | cohort | case_control | diagnostic_accuracy | cross_sectional",
    "reporting_guideline": "CONSORT | STROBE | STARD",
    "target_journal": "string",
    "project_root": "string (absolute path)",
    "start_date": "YYYY-MM-DD"
  },
  "stage1": {
    "status": "completed | in_progress | not_started",
    "completed_at": "YYYY-MM-DD HH:MM",
    "hash": "sha256 of stage1 block",
    "framework": {
      "type": "PIRD | PICOT | PECOS | CoCoPop",
      "population": "string",
      "intervention_exposure": "string",
      "comparison": "string",
      "outcome": "string",
      "timeframe_design": "string"
    },
    "finer_scores": {
      "feasible": "1-5",
      "interesting": "1-5",
      "novel": "1-5",
      "ethical": "1-5",
      "relevant": "1-5",
      "total": "5-25"
    },
    "sample_size": "integer",
    "literature_matrix": {
      "total_papers": "integer",
      "effect_anchor": "integer",
      "pico_reference": "integer",
      "gap_support": "integer",
      "methods_reference": "integer",
      "saturation_reached": "boolean"
    },
    "gates": {
      "usage_coverage": "boolean",
      "multi_db_coverage": "boolean",
      "no_zombie_refs": "boolean",
      "recency_70pct": "boolean",
      "high_impact": "boolean",
      "gap_self_consistent": "boolean"
    },
    "artifacts": [
      "01_design/Study_Blueprint.md",
      "01_design/Literature_Matrix.md",
      "01_design/Search_Plan.md",
      "01_design/Database_Coverage.md",
      "01_design/Screening_Log.md",
      "01_design/PMID_List.md"
    ]
  },
  "stage1_5": {
    "status": "completed | skipped | not_started",
    "data_label_sealed": "string (encrypted, only decryptable at Stage 2 gate)",
    "data_file": "02_analysis/data_sim.csv (or null)",
    "generation_spec": "02_analysis/Data_Generation_Spec.md (or null)",
    "validation_report": "02_analysis/Data_Validation_Report.md (or null)",
    "seed": "integer (or null)",
    "hash": "sha256 of stage1_5 block"
  },
  "data_provenance": {
    "data_label": "SEALED | real | simulated",
    "unsealed_at": "YYYY-MM-DD HH:MM (null when SEALED)",
    "unsealed_by": "string (null when SEALED)",
    "data_source_description": "string (null when SEALED)",
    "hash": "sha256 of data_provenance block"
  },
  "stage2": {
    "status": "completed | in_progress | not_started",
    "sap_approved": "boolean",
    "data_label_verified": "boolean",
    "primary_analysis": {
      "model_type": "string",
      "primary_endpoint": "string",
      "effect_size": "string",
      "ci_95": "string"
    },
    "diagnostic_checks": {
      "total": 8,
      "passed": "integer",
      "exceptions": ["string (description of each exception)"]
    },
    "sensitivity_direction_consistent": "boolean | null",
    "artifacts": [
      "02_analysis/SAP.md",
      "02_analysis/Analysis_Summary.md",
      "02_analysis/tables/Table1_baseline.csv",
      "02_analysis/figures/Figure1_Flow.svg",
      "02_analysis/session_info.txt",
      "02_analysis/session_info_sim.txt  (if simulated)",
      "02_analysis/Data_Generation_Spec.md  (if simulated)",
      "02_analysis/Data_Validation_Report.md  (if simulated)",
      "02_analysis/scripts/"
    ],
    "seed": "integer from stage1_5 (null if real)",
    "hash": "sha256 of stage2 block"
  },
  "integrity_gate_1": {
    "status": "passed | failed | not_run",
    "checked_at": "YYYY-MM-DD HH:MM",
    "checklist_version": "1.0",
    "modes": {
      "M1_syndrome_collider": "CLEAR | SUSPECTED | OVERRIDDEN",
      "M2_immortal_time": "CLEAR | SUSPECTED | OVERRIDDEN",
      "M3_competing_risk": "CLEAR | SUSPECTED | OVERRIDDEN",
      "M4_incorporation_bias": "CLEAR | SUSPECTED | OVERRIDDEN",
      "M5_partial_verification": "CLEAR | SUSPECTED | OVERRIDDEN",
      "M6a_data_provenance": "CLEAR | SUSPECTED | OVERRIDDEN",
      "M6b_manuscript_data_declaration": "CLEAR | SUSPECTED | OVERRIDDEN",
      "M7_citation_hallucination": "CLEAR | SUSPECTED | OVERRIDDEN",
      "M8_table2_fallacy": "CLEAR | SUSPECTED | OVERRIDDEN",
      "M9_missing_data": "CLEAR | SUSPECTED | OVERRIDDEN",
      "M10_overclaiming": "CLEAR | SUSPECTED | OVERRIDDEN",
      "M11_multiple_comparison": "CLEAR | SUSPECTED | OVERRIDDEN",
      "M12_data_drift": "CLEAR | SUSPECTED | OVERRIDDEN"
    },
    "claim_sample_rate": "0.30",
    "retry_count": "0-3",
    "hash": "sha256 of integrity_gate_1 block"
  },
  "stage3": {
    "status": "completed | in_progress | not_started",
    "manuscript_version": "string",
    "sprint_contract_skeptic": "boolean (contract submitted)",
    "sprint_contract_builder": "boolean (contract submitted)",
    "skeptic_review_completed": "boolean",
    "builder_review_completed": "boolean",
    "revision_completed": "boolean",
    "citation_audit_completed": "boolean",
    "data_declaration_verified": "boolean (data_label matches manuscript)",
    "ai_blind_check": "boolean",
    "artifacts": [
      "03_manuscript/Manuscript.md",
      "03_manuscript/Skeptic_Review.md",
      "03_manuscript/Builder_Review.md",
      "03_manuscript/Revision_Summary.md",
      "03_manuscript/Citation_Audit.md"
    ],
    "hash": "sha256 of stage3 block"
  },
  "stage4": {
    "status": "completed | in_progress | not_started",
    "codex_review_completed": "boolean",
    "deepseek_review": "completed | skipped",
    "gemini_review": "completed | skipped",
    "synthesis_completed": "boolean",
    "response_to_reviewers_completed": "boolean",
    "revision_rounds": "integer",
    "artifacts": [
      "04_submission/Codex_Review.md",
      "04_submission/DeepSeek_Review.md (optional)",
      "04_submission/Gemini_Review.md (optional)",
      "04_submission/Review_Synthesis.md",
      "03_manuscript/Response_to_Reviewers.md"
    ],
    "hash": "sha256 of stage4 block"
  },
  "integrity_gate_2": {
    "status": "passed | failed | not_run",
    "checked_at": "YYYY-MM-DD HH:MM",
    "zero_tolerance": "boolean (must be true)",
    "unresolved_modes": ["string (mode IDs: M6b checked here, M6a was checked at gate 1)"],
    "claim_sample_rate": "1.00",
    "hash": "sha256 of integrity_gate_2 block"
  },
  "stage5": {
    "status": "completed | in_progress | not_started",
    "format": "MD | DOCX | PDF | LaTeX",
    "components_generated": ["Cover Letter", "Title Page", "DAS", "Author Contributions", "Competing Interests", "Highlights"],
    "submission_checklist_26": "boolean (all passed)",
    "git_tag": "string",
    "hash": "sha256 of stage5 block"
  },
  "stage6": {
    "status": "completed | not_started",
    "concession_rate": "float (0-1)",
    "failure_mode_audit_log": "string (summary)",
    "collaboration_depth_summary": "string",
    "hash": "sha256 of stage6 block"
  }
}
```

## 验证规则

### Stage 入口前置条件

| 进入 Stage | 必填字段 |
|-----------|---------|
| Stage 1 | project (可部分填写) |
| Stage 2 | stage1.status = completed, stage1.gates 全部 true；data_label 可以是 SEALED 或已解封；门控之后 data_label 必须已解封才能继续分析 |
| Stage 3 | stage2.status = completed, integrity_gate_1.status = passed |
| Stage 4 | stage3.status = completed |
| Stage 5 | stage4.status = completed, integrity_gate_2.status = passed |
| Stage 6 | stage5.status = completed |

### Hash 一致性

每阶段写入后，计算该阶段 block 的 SHA-256 hash。下一阶段 agent 启动时验证 hash 是否一致。hash 不一致 → 可能被手动修改 → 标记 `PASSPORT_TAMPERED` 并暂停向用户确认。

### data_label 安全规则

1. data_label 写入时状态为 SEALED
2. Stage 2 入口门控是唯一解封点
3. 解封后 data_provenance 字段全部填充
4. Stage 3 Writer 必须读取 data_label 并在稿件中声明
5. Skeptic 审查时只核对"稿件声明是否与 data_label 一致"，不预先知道 data_label

## 文件路径

Material Passport 文件：`<项目根目录>/material_passport.json`
