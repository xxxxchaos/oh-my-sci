# omo-sci Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an OpenCode plugin (`omo-sci`) that provides a 9-agent medical research AI team for Chinese researchers, covering the full pipeline from study design through submission.

**Architecture:** A Bun + TypeScript OpenCode plugin with a three-engine core (interview state machine, pipeline state machine, category router), 9 specialized agents with model-agnostic category routing, 22 lifecycle hooks, cross-session state persistence (Material Passport + Boulder + Wisdom), and a user-level evolution memory system.

**Tech Stack:** Bun runtime, TypeScript (strict), OpenCode Plugin API, JSONC config, Inquirer TUI, Bun Test

**Reference Design:** `docs/superpowers/specs/2026-06-16-omo-sci-design.md`
**Reference Opensci:** `~/.claude/skills/opensci/`
**Reference CodexSci:** `~/.codex/skills/codexsci/`

> **Codex correction:** Do not start by generating all 22 hooks and 9 agents. First prove that OpenCode can load the package, execute one installed command, and see one configured Dubin agent. All later tasks depend on this smoke test.

---

# Phase 0: OpenCode Integration Spike (required, 1-2 days)

Phase 0 removes the largest implementation risk: OpenCode plugin, command, and agent loading semantics may differ from the assumptions in this plan. Complete this phase before Task 1.

## Task 0: Verify host integration contract

**Files:**
- Create: `docs/dev/opencode-integration-notes.md`
- Create: `examples/smoke-opencode/`
- Create or update based on findings: `package.json`, `bin/omo-sci.ts`, OpenCode config templates

- [ ] **Step 0.1: Read current OpenCode docs**

Use the current official docs as the source of truth:

- https://opencode.ai/docs/plugins/
- https://opencode.ai/docs/commands/
- https://opencode.ai/docs/agents/

Record in `docs/dev/opencode-integration-notes.md`:

- How npm packages are loaded as OpenCode plugins.
- Whether a plugin entry exports a function, object, or config.
- How custom commands are discovered.
- How agents are configured and selected.
- Whether command handlers can be registered programmatically, or must be generated as command files.

- [ ] **Step 0.2: Build a smoke plugin**

Create the smallest possible local fixture that:

1. Installs `omo-sci` locally.
2. Exposes a `sci-doctor` command or command file.
3. Exposes a `dubin` agent or agent config.
4. Runs in OpenCode without relying on internal undocumented behavior.

- [ ] **Step 0.3: Freeze the integration shape**

Update the implementation plan if the smoke test proves that `src/index.ts` exports are insufficient. In particular, do not assume this works unless Phase 0 verifies it:

```typescript
export const COMMANDS = [...]
export const AGENTS = [...]
```

- [ ] **Step 0.4: Add a CLI binary**

`bunx omo-sci install` requires a real executable. Create `bin/omo-sci.ts` with at least:

```bash
omo-sci install --no-tui --providers deepseek,qwen-bailian --quota 500000000
omo-sci doctor
omo-sci status
```

The CLI may call the same functions used by slash commands, but it must not depend on OpenCode runtime.

- [ ] **Step 0.5: Commit**

```bash
git add docs/dev/ examples/smoke-opencode/ package.json bin/ src/
git commit -m "chore: verify OpenCode plugin integration contract"
```

**Exit criteria:**

- [ ] `bun run typecheck` passes.
- [ ] `bun test` passes.
- [ ] `bunx --bun . install --no-tui --providers deepseek --quota 200000000` writes a config.
- [ ] The documented OpenCode smoke command can display the doctor output.
- [ ] The documented Dubin smoke agent/config is visible to OpenCode.

---

# Phase 1: Core Skeleton (4 weeks)

Phase 1 builds the installable plugin shell, category router, state persistence contracts, minimal hooks, and environment diagnostics. At the end of Phase 1, `bunx omo-sci install --no-tui` works, the OpenCode smoke command from Phase 0 runs, and the state system reads/writes/validates correctly.

## File Structure (Phase 1)

```
omo-sci/
├── package.json
├── tsconfig.json
├── bunfig.toml
├── README.md
├── bin/
│   └── omo-sci.ts                  # CLI binary for bunx omo-sci
├── src/
│   ├── index.ts                    # Plugin entry point
│   ├── types.ts                    # All shared TypeScript interfaces
│   ├── config.ts                   # Config loader (JSONC parse + merge)
│   ├── constants.ts                # Well-known paths, defaults
│   ├── router/
│   │   ├── categories.ts           # 6 category definitions
│   │   ├── fallback.ts             # Fallback chain resolver
│   │   └── provider.ts             # Model provider registry
│   ├── state/
│   │   ├── passport.ts             # Material Passport read/write/validate
│   │   ├── boulder.ts              # Boulder session tracker
│   │   └── wisdom.ts               # Phase 3: Wisdom learnings extractor
│   ├── hooks/
│   │   ├── registry.ts             # Hook registration + dispatch
│   │   ├── session.ts              # session:* hooks
│   │   ├── stage.ts                # stage:* hooks
│   │   ├── delegation.ts           # delegate:* hooks
│   │   ├── model.ts                # model:* hooks
│   │   ├── quality.ts              # quality:* hooks
│   │   ├── review.ts               # review:* hooks
│   │   └── user.ts                 # user:* hooks
│   ├── environment/
│   │   ├── check.ts                # Main checker orchestrator
│   │   ├── mcp-check.ts            # MCP tool connectivity
│   │   ├── r-check.ts              # R environment + packages
│   │   ├── software-check.ts       # Pandoc/OfficeCLI/PlotCase
│   │   ├── api-check.ts            # Model API availability
│   │   └── reporter.ts             # Formatted doctor report
│   ├── safety/
│   │   ├── circuit-breaker.ts      # max_step + loop detection
│   │   └── usage-tracker.ts        # Token counting + quota warnings
│   ├── install/
│   │   ├── tui.ts                  # Interactive TUI installer
│   │   ├── config-generator.ts     # Generate omo-sci.jsonc
│   │   └── validator.ts            # Post-install self-check
│   └── commands/                   # Command business logic, wired to OpenCode per Phase 0
│       ├── sci-doctor.ts
│       ├── sci-start.ts            # stub for Phase 2
│       ├── sci-status.ts
│       └── sci-usage.ts
├── tests/
│   ├── setup.ts                    # Bun test setup
│   ├── router/
│   │   ├── categories.test.ts
│   │   ├── fallback.test.ts
│   │   └── provider.test.ts
│   ├── state/
│   │   ├── passport.test.ts
│   │   ├── boulder.test.ts
│   │   └── wisdom.test.ts          # Phase 3
│   ├── hooks/
│   │   ├── registry.test.ts
│   │   └── session.test.ts
│   ├── environment/
│   │   ├── check.test.ts
│   │   └── reporter.test.ts
│   ├── safety/
│   │   ├── circuit-breaker.test.ts
│   │   └── usage-tracker.test.ts
│   └── install/
│       └── config-generator.test.ts
├── docs/
│   └── dev/
│       └── opencode-integration-notes.md
└── references/                     # Copied from opensci/codexsci
    ├── clinical-research-design.md
    ├── statistical-methods.md
    ├── clinical-failure-modes.md
    ├── integrity-gates.md
    ├── material-passport-schema.md
    ├── manuscript-polishing.md
    ├── literature-tools.md
    └── figure-style-guide.md
```

---

### Task 1: Project scaffolding

**Files:**
- Create: `package.json`, `tsconfig.json`, `bunfig.toml`, `.gitignore`, `README.md`, `bin/omo-sci.ts`

- [ ] **Step 1: Initialize Bun project**

```bash
cd /Users/dr.xie/CC/coding/oh-my-sci
bun init -y
```

- [ ] **Step 2: Write package.json**

```jsonc
{
  "name": "omo-sci",
  "version": "0.1.0",
  "description": "医学科研智能体团队 — OpenCode 插件",
  "type": "module",
  "main": "src/index.ts",
  "bin": {
    "omo-sci": "./bin/omo-sci.ts"
  },
  "scripts": {
    "test": "bun test",
    "test:watch": "bun test --watch",
    "typecheck": "bun run --bun tsc --noEmit"
  },
  "dependencies": {
    "inquirer": "^12.0.0",
    "jsonc-parser": "^3.0.0"
  },
  "devDependencies": {
    "@types/bun": "latest",
    "typescript": "^5.7.0"
  },
  "peerDependencies": {
    "opencode": "*"
  },
  "keywords": ["opencode", "plugin", "medical-research", "ai-agent", "omo"],
  "license": "MIT"
}
```

- [ ] **Step 3: Write tsconfig.json**

```jsonc
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": ".",
    "declaration": true,
    "types": ["bun"]
  },
  "include": ["src/**/*.ts", "bin/**/*.ts", "tests/**/*.ts"],
  "exclude": ["tests", "dist"]
}
```

- [ ] **Step 4: Write bunfig.toml**

```toml
[test]
preload = "./tests/setup.ts"
```

- [ ] **Step 5: Write .gitignore**

```
node_modules/
dist/
*.log
.DS_Store
.omo-sci/
.omo/
.env
*.local.jsonc
```

- [ ] **Step 6: Write README.md (stub)**

```markdown
# omo-sci

医学科研智能体团队 — OpenCode 插件

## 安装

\`\`\`bash
bunx omo-sci install
\`\`\`

## 命令

- `/sci-start` — 开始新研究
- `/sci-status` — 查看项目状态
- `/sci-review` — 手动触发审稿
- `/sci-usage` — 查看用量
- `/sci-doctor` — 环境诊断
```

- [ ] **Step 7: Write bin/omo-sci.ts**

```typescript
#!/usr/bin/env bun

function main() {
  const [, , command, ...args] = process.argv;
  if (command) {
    console.log(`omo-sci CLI scaffolded. Command "${command}" will be wired in Task 12. Args: ${args.join(' ')}`);
    return;
  }

  console.log(`omo-sci

Usage:
  omo-sci install --no-tui --providers deepseek,qwen-bailian --quota 500000000
  omo-sci doctor
  omo-sci status`);
}

main();
```

Task 12 replaces this scaffold with the real CLI wiring after command modules exist.

- [ ] **Step 8: Install dependencies and verify**

```bash
cd /Users/dr.xie/CC/coding/oh-my-sci
bun install
bun run typecheck
bun run bin/omo-sci.ts doctor
```

Expected: No TypeScript errors; CLI prints a doctor report or a clear missing-config warning.

- [ ] **Step 9: Commit**

```bash
git init
git add -A
git commit -m "chore: scaffold omo-sci project"
```

---

### Task 2: Shared types

**Files:**
- Create: `src/types.ts`

- [ ] **Step 1: Write types.ts with all core interfaces**

```typescript
// ============================================================
// Agent & Category Types
// ============================================================

/** 9 named agents in the omo-sci team */
export type AgentName =
  | 'dubin'
  | 'archimedes'
  | 'irber'
  | 'pubmeder'
  | 'spsser'
  | 'writer'
  | 'submitter'
  | 'ebmer'
  | 'polisher';

/** 6 capability categories for model routing */
export type CapabilityCategory =
  | 'agent-orchestration'
  | 'deep-reasoning'
  | 'chinese-writing'
  | 'fast-search'
  | 'long-context'
  | 'methodical-review';

/** Maps agent name to its capability category */
export const AGENT_CATEGORY: Record<AgentName, CapabilityCategory> = {
  dubin: 'agent-orchestration',
  irber: 'agent-orchestration',
  submitter: 'agent-orchestration',
  archimedes: 'deep-reasoning',
  spsser: 'deep-reasoning',
  ebmer: 'methodical-review',
  writer: 'chinese-writing',
  polisher: 'chinese-writing',
  pubmeder: 'fast-search',
};

/** Model provider identifier */
export type ProviderId =
  | 'deepseek'
  | 'qwen-bailian'
  | 'zhipu'
  | 'kimi'
  | 'minimax'
  | 'tencent-hy'
  | 'opencode-go';

// ============================================================
// Pipeline Types
// ============================================================

/** 6 stages + 2 integrity gates */
export type StageId =
  | 'stage-0-intake'
  | 'stage-1-design'
  | 'stage-2-analysis'
  | 'gate-i'
  | 'stage-3-writing'
  | 'gate-ii'
  | 'stage-4-submission'
  | 'stage-5-summary';

export type StageStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

export interface StageState {
  status?: StageStatus;
  started_at?: string;
  completed_at?: string;
  artifacts?: string[];
  gates?: Record<string, boolean>;
  hash?: string;
}

export type DataLabel = 'SEALED' | 'real' | 'simulated';
export type GateModeStatus = 'CLEAR' | 'SUSPECTED' | 'INSUFFICIENT_EVIDENCE' | 'OVERRIDDEN';
export type GateStatus = 'not_run' | 'passed' | 'failed';

export interface SignoffRecord {
  stage: StageId;
  signed_at: string;
  summary: string;
  risks_acknowledged: string[];
  user_confirmation: string;
}

export interface GateReport {
  status: GateStatus;
  checked_at: string;
  claim_sample_rate: 0.3 | 1.0;
  retry_count: number;
  modes: Record<string, GateModeStatus>;
  overrides: Array<{ mode: string; reason: string; approved_by_user: boolean }>;
  report_path: string;
}

export interface ClaimEvidenceMap {
  claim_id: string;
  claim_text: string;
  manuscript_location?: string;
  evidence_type: 'analysis_result' | 'literature' | 'guideline' | 'journal_instruction';
  evidence_ids: string[];
  verification_status: 'verified' | 'missing' | 'conflict' | 'not_applicable';
}

// ============================================================
// State Types
// ============================================================

export interface MaterialPassport {
  passport_version: string;
  project: {
    title: string;
    research_type: string;
    created_at: string;
    last_session: string;
    layout: 'omo-sci' | 'codexsci-legacy';
  };
  pipeline: {
    current_stage: StageId;
    status: 'not_started' | 'in_progress' | 'completed';
    completed_stages: StageId[];
    gates_passed: string[];
  };
  signoff_records: SignoffRecord[];
  data_provenance?: {
    data_label: DataLabel;
    unsealed_at: string | null;
    unsealed_by: string | null;
    data_source_description: string | null;
    hash?: string;
  };
  integrity_gate_1?: GateReport;
  integrity_gate_2?: GateReport;
  claim_evidence_map?: ClaimEvidenceMap[];
  stage_0_intake?: {
    pico: Record<string, string>;
    evidence_landscape: Record<string, unknown>;
  };
  stage_1_design?: StageState & {
    finer_scores?: Record<string, number>;
    sample_size?: number;
    target_journal?: string;
  };
  stage_2_analysis?: StageState & {
    data_label?: DataLabel;
    seed?: number | null;
    primary_model?: string;
    effect_size?: string;
    diagnostic_checks?: { total: number; passed: number; exceptions: string[] };
  };
  stage_3_writing?: StageState & {
    review_rounds?: number;
  };
  stage_4_submission?: StageState & {
    target_journal?: string;
  };
  stage_5_summary?: StageState;
  review_sessions: Array<{
    reviewer: 'ebmer' | 'polisher';
    phase1_predictions: string[];
    key_findings: string;
  }>;
  wisdom_collected: {
    learnings: number;
    decisions: number;
    gotchas: number;
  };
}

export interface BoulderState {
  active_plan: string;
  session_id: string;
  started_at: string;
  current_stage: StageId;
  current_phase: string;
  pending_tasks: PendingTask[];
  review_state?: {
    ebmer_phase1_completed: boolean;
    polisher_phase1_completed: boolean;
    reconciliation_needed: boolean;
  };
}

export interface PendingTask {
  id: string;
  agent: AgentName;
  task: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
}

// ============================================================
// Hook Types
// ============================================================

export type HookName =
  // session
  | 'session:start' | 'session:end' | 'session:resume' | 'session:interrupt'
  // stage
  | 'stage:entry' | 'stage:exit' | 'stage:gate_check' | 'stage:gate_pass' | 'stage:gate_fail'
  // delegation
  | 'delegate:pre' | 'delegate:post' | 'delegate:error'
  // model
  | 'model:select' | 'model:fallback'
  // quality
  | 'quality:loop_detect' | 'quality:compaction_pre' | 'quality:compaction_post' | 'quality:token_warn'
  // review
  | 'review:phase1' | 'review:phase2'
  // user
  | 'user:signoff' | 'user:clarify';

export interface HookContext {
  hook: HookName;
  agent?: AgentName;
  stage?: StageId;
  passport?: MaterialPassport;
  boulder?: BoulderState;
  metadata?: Record<string, unknown>;
}

export type HookHandler = (ctx: HookContext) => Promise<void> | void;

// ============================================================
// Router Types
// ============================================================

export interface ModelSpec {
  provider: ProviderId;
  model_id: string;
  context_window: number;
  max_output: number;
}

export interface CategoryConfig {
  category: CapabilityCategory;
  fallback_chain: ModelSpec[];
  concurrency_limit: number;
}

export interface RouterConfig {
  categories: Record<CapabilityCategory, CategoryConfig>;
  concurrency: {
    max_total_agents: number;
  };
}

// ============================================================
// Config Types
// ============================================================

export interface OmoSciConfig {
  $schema?: string;
  router: RouterConfig;
  disabled_agents?: AgentName[];
  disabled_hooks?: HookName[];
  safety: {
    max_step: number;
    max_time_minutes: number;
    loop_detect_threshold: number;
  };
  usage: {
    token_quota: 200_000_000 | 500_000_000 | 1_000_000_000;
    current_usage: number;
    quota_reset_date: string;
  };
  environment: {
    mcp_required: string[];
    mcp_optional: string[];
    r_packages: string[];
    software: string[];
  };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
bun run typecheck
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/types.ts
git commit -m "feat: add core TypeScript type definitions"
```

---

### Task 3: Constants and config loader

**Files:**
- Create: `src/constants.ts`, `src/config.ts`
- Test: `tests/config.test.ts`

- [ ] **Step 1: Write constants.ts**

```typescript
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { OmoSciConfig } from './types';

export const OPENCODE_CONFIG_DIR = join(homedir(), '.config', 'opencode');
export const OMO_SCI_CONFIG_PATH = join(OPENCODE_CONFIG_DIR, 'omo-sci.jsonc');
export const OMO_SCI_DIR = join(OPENCODE_CONFIG_DIR, 'omo-sci');
export const OMO_SCI_PROFILE_DIR = join(OMO_SCI_DIR, 'profile');
export const OMO_SCI_PROJECTS_DIR = join(OMO_SCI_DIR, 'projects');

export const DEFAULT_CONFIG: OmoSciConfig = {
  router: {
    categories: {
      'agent-orchestration': {
        category: 'agent-orchestration',
        fallback_chain: [],
        concurrency_limit: 2,
      },
      'deep-reasoning': {
        category: 'deep-reasoning',
        fallback_chain: [],
        concurrency_limit: 2,
      },
      'chinese-writing': {
        category: 'chinese-writing',
        fallback_chain: [],
        concurrency_limit: 2,
      },
      'fast-search': {
        category: 'fast-search',
        fallback_chain: [],
        concurrency_limit: 4,
      },
      'long-context': {
        category: 'long-context',
        fallback_chain: [],
        concurrency_limit: 2,
      },
      'methodical-review': {
        category: 'methodical-review',
        fallback_chain: [],
        concurrency_limit: 2,
      },
    },
    concurrency: { max_total_agents: 8 },
  },
  safety: {
    max_step: 50,
    max_time_minutes: 30,
    loop_detect_threshold: 5,
  },
  usage: {
    token_quota: 500_000_000,
    current_usage: 0,
    quota_reset_date: new Date().toISOString().slice(0, 7) + '-01',
  },
  environment: {
    mcp_required: [
      'unified_search',
      'search_cnki',
      'search_cochrane_reviews',
      'web_search_exa',
      'Consensus__search',
      'officecli',
    ],
    mcp_optional: ['zotero_search_items', 'browser_navigate'],
    r_packages: [
      'tableone', 'gtsummary', 'finalfit', 'survival', 'coxme', 'rms',
      'MatchIt', 'WeightIt', 'mice', 'flowchart', 'ggplot2', 'patchwork',
    ],
    software: ['R', 'Pandoc', 'Git', 'PlotCase'],
  },
};
```

- [ ] **Step 2: Write config.ts**

```typescript
import { parse } from 'jsonc-parser';
import { readFileSync, existsSync } from 'node:fs';
import { DEFAULT_CONFIG, OMO_SCI_CONFIG_PATH } from './constants';
import type { OmoSciConfig } from './types';

/**
 * Deep-merge two config objects. Arrays are replaced, not merged.
 */
function deepMerge<T extends Record<string, unknown>>(base: T, overlay: Partial<T>): T {
  const result = { ...base };
  for (const key of Object.keys(overlay) as Array<keyof T>) {
    const ov = overlay[key];
    if (ov === undefined) continue;
    const bv = result[key];
    if (isRecord(bv) && isRecord(ov)) {
      result[key] = deepMerge(bv, ov) as T[keyof T];
    } else {
      result[key] = ov as T[keyof T];
    }
  }
  return result;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/**
 * Load omo-sci config from disk. Falls back to DEFAULT_CONFIG
 * if no user config exists. Merges user config on top of defaults.
 */
export function loadConfig(configPath?: string): OmoSciConfig {
  const path = configPath ?? OMO_SCI_CONFIG_PATH;
  if (!existsSync(path)) {
    return DEFAULT_CONFIG;
  }
  const raw = readFileSync(path, 'utf-8');
  const parsed = parse(raw) as Partial<OmoSciConfig>;
  return deepMerge(DEFAULT_CONFIG, parsed);
}

/**
 * Validate that a config object has at least one model per category
 * that has a non-empty fallback chain.
 */
export function validateConfig(config: OmoSciConfig): string[] {
  const warnings: string[] = [];
  for (const [cat, catConfig] of Object.entries(config.router.categories)) {
    if (catConfig.fallback_chain.length === 0) {
      warnings.push(`Category "${cat}" has no models configured. Category routing will fail.`);
    }
  }
  if (config.usage.token_quota <= 0) {
    warnings.push('Token quota must be positive.');
  }
  return warnings;
}
```

- [ ] **Step 3: Write test**

```typescript
import { describe, it, expect } from 'bun:test';
import { loadConfig, validateConfig } from '../src/config';

describe('loadConfig', () => {
  it('returns defaults when no config file exists', () => {
    const config = loadConfig('/nonexistent/path.jsonc');
    expect(config.safety.max_step).toBe(50);
    expect(config.router.categories['deep-reasoning'].fallback_chain).toEqual([]);
  });
});

describe('validateConfig', () => {
  it('warns on empty fallback chains', () => {
    const config = loadConfig('/nonexistent/path.jsonc');
    const warnings = validateConfig(config);
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings.some(w => w.includes('no models configured'))).toBe(true);
  });
});
```

- [ ] **Step 4: Run tests**

```bash
bun test tests/config.test.ts
```

Expected: 2 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/constants.ts src/config.ts tests/config.test.ts
git commit -m "feat: add constants and JSONC config loader"
```

---

### Task 4: Category router

**Files:**
- Create: `src/router/categories.ts`, `src/router/fallback.ts`, `src/router/provider.ts`
- Test: `tests/router/categories.test.ts`, `tests/router/fallback.test.ts`, `tests/router/provider.test.ts`

- [ ] **Step 1: Write provider.ts — model provider registry**

```typescript
import type { ProviderId, ModelSpec } from '../types';

/**
 * Registry of known model providers and their supported models.
 * Users configure which providers they have access to during install.
 */
export const PROVIDER_REGISTRY: Record<ProviderId, {
  name: string;
  models: ModelSpec[];
}> = {
  'deepseek': {
    name: 'DeepSeek (官方API / 中转站)',
    models: [
      { provider: 'deepseek', model_id: 'deepseek-v4-pro', context_window: 1_000_000, max_output: 128_000 },
      { provider: 'deepseek', model_id: 'deepseek-v4-flash', context_window: 1_000_000, max_output: 128_000 },
    ],
  },
  'qwen-bailian': {
    name: '阿里百炼 (Qwen 3.7-Max)',
    models: [
      { provider: 'qwen-bailian', model_id: 'qwen3.7-max', context_window: 1_000_000, max_output: 128_000 },
    ],
  },
  'zhipu': {
    name: '智谱开放平台 (GLM-5.2)',
    models: [
      { provider: 'zhipu', model_id: 'glm-5.2', context_window: 1_000_000, max_output: 128_000 },
    ],
  },
  'kimi': {
    name: 'Kimi 开放平台 (Kimi K2.7)',
    models: [
      { provider: 'kimi', model_id: 'kimi-k2.7-code', context_window: 256_000, max_output: 128_000 },
    ],
  },
  'minimax': {
    name: 'MiniMax (Token Plan / API)',
    models: [
      { provider: 'minimax', model_id: 'minimax-m3', context_window: 1_000_000, max_output: 128_000 },
    ],
  },
  'tencent-hy': {
    name: '腾讯混元 (Hy3)',
    models: [
      { provider: 'tencent-hy', model_id: 'hy3', context_window: 256_000, max_output: 128_000 },
    ],
  },
  'opencode-go': {
    name: 'OpenCode Go (包月订阅)',
    models: [
      { provider: 'opencode-go', model_id: 'qwen3.7-max', context_window: 1_000_000, max_output: 128_000 },
      { provider: 'opencode-go', model_id: 'deepseek-v4-pro', context_window: 1_000_000, max_output: 128_000 },
      { provider: 'opencode-go', model_id: 'kimi-k2.7-code', context_window: 256_000, max_output: 128_000 },
    ],
  },
};

/** Return all ModelSpec entries available for the given providers */
export function getAvailableModels(providerIds: ProviderId[]): ModelSpec[] {
  return providerIds.flatMap(id => PROVIDER_REGISTRY[id]?.models ?? []);
}
```

- [ ] **Step 2: Write categories.ts — category definitions**

```typescript
import type { AgentName, CapabilityCategory, AGENT_CATEGORY } from '../types';

/**
 * Human-readable labels for capability categories.
 */
export const CATEGORY_LABELS: Record<CapabilityCategory, string> = {
  'agent-orchestration': '编排调度 — 多轮对话、工具调用、任务委派',
  'deep-reasoning': '深度推理 — 数学、逻辑、方法论推导',
  'chinese-writing': '中文写作 — 医学论文的中文表达与格式',
  'fast-search': '高频搜索 — 文献检索、数据库查询、信息提取',
  'long-context': '长上下文 — 文献全文分析、长篇论文通读',
  'methodical-review': '方法学审查 — 统计正确性、研究设计批判',
};

/**
 * Agent display names for user-facing output.
 */
export const AGENT_DISPLAY_NAMES: Record<AgentName, string> = {
  dubin: 'Dubin (主编排者)',
  archimedes: 'Archimedes (研究设计师)',
  irber: 'IRBer (计划审查员)',
  pubmeder: 'Pubmeder (文献搜索员)',
  spsser: 'SPSSer (统计分析师)',
  writer: 'Writer (论文写作者)',
  submitter: 'Submitter (投稿协调员)',
  ebmer: 'EBMer (方法学审稿人)',
  polisher: 'Polisher (逻辑审稿人)',
};

/**
 * Default fallback chain ordering per category.
 * The order reflects model preference for each capability.
 */
export const DEFAULT_FALLBACK_ORDERS: Record<CapabilityCategory, string[]> = {
  'agent-orchestration': ['qwen3.7-max', 'deepseek-v4-pro', 'kimi-k2.7-code'],
  'deep-reasoning': ['deepseek-v4-pro', 'qwen3.7-max', 'kimi-k2.7-code'],
  'chinese-writing': ['glm-5.2', 'qwen3.7-max', 'hy3'],
  'fast-search': ['minimax-m3', 'kimi-k2.7-code', 'deepseek-v4-flash'],
  'long-context': ['minimax-m3', 'glm-5.2', 'qwen3.7-max', 'deepseek-v4-pro'],
  'methodical-review': ['deepseek-v4-pro', 'qwen3.7-max'],
};
```

- [ ] **Step 3: Write fallback.ts — fallback chain resolver**

```typescript
import type { CapabilityCategory, ModelSpec, RouterConfig } from '../types';
import { loadConfig } from '../config';

/**
 * Resolve the best available model for a capability category.
 * Returns the first model in the fallback chain that is configured.
 * Returns null if no model is available.
 */
export function resolveModel(
  category: CapabilityCategory,
  config?: RouterConfig,
): ModelSpec | null {
  const cfg = config ?? loadConfig().router;
  const catConfig = cfg.categories[category];
  if (!catConfig || catConfig.fallback_chain.length === 0) {
    return null;
  }
  return catConfig.fallback_chain[0] ?? null;
}

/**
 * Resolve the full fallback chain for a category.
 */
export function resolveFallbackChain(
  category: CapabilityCategory,
  config?: RouterConfig,
): ModelSpec[] {
  const cfg = config ?? loadConfig().router;
  return cfg.categories[category]?.fallback_chain ?? [];
}

/**
 * Check if the user has at least one model configured for this category.
 */
export function isCategoryAvailable(
  category: CapabilityCategory,
  config?: RouterConfig,
): boolean {
  return resolveModel(category, config) !== null;
}
```

- [ ] **Step 4: Write tests**

```typescript
// tests/router/categories.test.ts
import { describe, it, expect } from 'bun:test';
import { CATEGORY_LABELS, AGENT_DISPLAY_NAMES, DEFAULT_FALLBACK_ORDERS } from '../src/router/categories';
import type { CapabilityCategory, AgentName } from '../src/types';

describe('CATEGORY_LABELS', () => {
  it('has labels for all 6 categories', () => {
    const categories: CapabilityCategory[] = [
      'agent-orchestration', 'deep-reasoning', 'chinese-writing',
      'fast-search', 'long-context', 'methodical-review',
    ];
    for (const cat of categories) {
      expect(CATEGORY_LABELS[cat]).toBeString();
    }
  });
});

describe('AGENT_DISPLAY_NAMES', () => {
  it('has names for all 9 agents', () => {
    const agents: AgentName[] = [
      'dubin', 'archimedes', 'irber', 'pubmeder', 'spsser',
      'writer', 'submitter', 'ebmer', 'polisher',
    ];
    for (const agent of agents) {
      expect(AGENT_DISPLAY_NAMES[agent]).toBeString();
    }
  });
});

describe('DEFAULT_FALLBACK_ORDERS', () => {
  it('has entries for all 6 categories', () => {
    expect(Object.keys(DEFAULT_FALLBACK_ORDERS).length).toBe(6);
  });

  it('each category has at least 2 fallback models', () => {
    for (const [cat, chain] of Object.entries(DEFAULT_FALLBACK_ORDERS)) {
      expect(chain.length).toBeGreaterThanOrEqual(2);
    }
  });
});
```

```typescript
// tests/router/fallback.test.ts
import { describe, it, expect } from 'bun:test';
import { resolveModel, resolveFallbackChain, isCategoryAvailable } from '../src/router/fallback';
import type { RouterConfig } from '../src/types';

const mockConfig: RouterConfig = {
  categories: {
    'deep-reasoning': {
      category: 'deep-reasoning',
      fallback_chain: [
        { provider: 'deepseek', model_id: 'deepseek-v4-pro', context_window: 1_000_000, max_output: 128_000 },
        { provider: 'qwen-bailian', model_id: 'qwen3.7-max', context_window: 1_000_000, max_output: 128_000 },
      ],
      concurrency_limit: 2,
    },
    'agent-orchestration': {
      category: 'agent-orchestration',
      fallback_chain: [],
      concurrency_limit: 2,
    },
    'chinese-writing': {
      category: 'chinese-writing',
      fallback_chain: [],
      concurrency_limit: 2,
    },
    'fast-search': {
      category: 'fast-search',
      fallback_chain: [],
      concurrency_limit: 4,
    },
    'long-context': {
      category: 'long-context',
      fallback_chain: [],
      concurrency_limit: 2,
    },
    'methodical-review': {
      category: 'methodical-review',
      fallback_chain: [],
      concurrency_limit: 2,
    },
  },
  concurrency: { max_total_agents: 8 },
};

describe('resolveModel', () => {
  it('returns first model in fallback chain', () => {
    const model = resolveModel('deep-reasoning', mockConfig);
    expect(model?.model_id).toBe('deepseek-v4-pro');
  });

  it('returns null for category with empty chain', () => {
    const model = resolveModel('agent-orchestration', mockConfig);
    expect(model).toBeNull();
  });
});

describe('isCategoryAvailable', () => {
  it('returns true when models are configured', () => {
    expect(isCategoryAvailable('deep-reasoning', mockConfig)).toBe(true);
  });

  it('returns false when no models configured', () => {
    expect(isCategoryAvailable('agent-orchestration', mockConfig)).toBe(false);
  });
});
```

- [ ] **Step 5: Run tests**

```bash
bun test tests/router/
```

Expected: All router tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/router/ tests/router/
git commit -m "feat: add category router with provider registry and fallback chains"
```

---

### Task 5: Material Passport state system

**Files:**
- Create: `src/state/passport.ts`, `src/state/boulder.ts`
- Test: `tests/state/passport.test.ts`, `tests/state/boulder.test.ts`

Before coding, read and preserve the semantics from:

- `references/material-passport-schema.md`
- `references/integrity-gates.md`

Phase 1 does not need every final field, but it must include versioning, project layout, signoff records, data provenance, gate report placeholders, and deterministic stage hashing. Missing required fields should return validation errors instead of being silently ignored.

- [ ] **Step 1: Write passport.ts**

```typescript
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type { MaterialPassport, StageId, StageState } from '../types';

const DEFAULT_PASSPORT: MaterialPassport = {
  passport_version: '1.0.0',
  project: {
    title: '',
    research_type: '',
    created_at: new Date().toISOString(),
    last_session: new Date().toISOString(),
    layout: 'omo-sci',
  },
  pipeline: {
    current_stage: 'stage-0-intake',
    status: 'not_started',
    completed_stages: [],
    gates_passed: [],
  },
  signoff_records: [],
  review_sessions: [],
  wisdom_collected: { learnings: 0, decisions: 0, gotchas: 0 },
};

/**
 * Load Material Passport from a project directory.
 * Creates a default one if no passport exists.
 */
export function loadPassport(projectDir: string): MaterialPassport {
  const passportPath = join(projectDir, '.omo-sci', 'passport.json');
  if (!existsSync(passportPath)) {
    return { ...DEFAULT_PASSPORT, project: { ...DEFAULT_PASSPORT.project } };
  }
  const raw = readFileSync(passportPath, 'utf-8');
  return JSON.parse(raw) as MaterialPassport;
}

/**
 * Save Material Passport to project directory.
 */
export function savePassport(projectDir: string, passport: MaterialPassport): void {
  passport.project.last_session = new Date().toISOString();
  const passportDir = join(projectDir, '.omo-sci');
  if (!existsSync(passportDir)) {
    mkdirSync(passportDir, { recursive: true });
  }
  writeFileSync(
    join(passportDir, 'passport.json'),
    JSON.stringify(passport, null, 2),
    'utf-8',
  );
}

/**
 * Update a single stage's state in the passport and persist.
 */
export function updateStageState(
  projectDir: string,
  stage: StageId,
  update: Partial<StageState> & Record<string, unknown>,
): MaterialPassport {
  const passport = loadPassport(projectDir);
  const stageKey = stageToKey(stage);
  if (stageKey) {
    const current = (passport as Record<string, unknown>)[stageKey] as StageState | undefined;
    (passport as Record<string, unknown>)[stageKey] = { ...current, ...update } as StageState;
  }
  savePassport(projectDir, passport);
  return passport;
}

/**
 * Map StageId to passport property key.
 */
function stageToKey(stage: StageId): keyof MaterialPassport | null {
  const map: Record<StageId, keyof MaterialPassport> = {
    'stage-0-intake': 'stage_0_intake',
    'stage-1-design': 'stage_1_design',
    'stage-2-analysis': 'stage_2_analysis',
    'gate-i': 'stage_2_analysis',
    'stage-3-writing': 'stage_3_writing',
    'gate-ii': 'stage_3_writing',
    'stage-4-submission': 'stage_4_submission',
    'stage-5-summary': 'stage_5_summary',
  };
  return map[stage] ?? null;
}

/**
 * Validate that all required fields for the current stage are present.
 */
export function validatePassport(passport: MaterialPassport, _stage: StageId): string[] {
  const errors: string[] = [];
  if (!passport.project.title) {
    errors.push('Project title is required. Run /sci-start to begin.');
  }
  return errors;
}
```

- [ ] **Step 2: Write boulder.ts**

```typescript
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type { BoulderState, StageId, PendingTask } from '../types';

function makeSessionId(): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  const time = now.toTimeString().slice(0, 5).replace(/:/g, '');
  return `sess_${date}_${time}`;
}

/**
 * Create a fresh Boulder state for a new session.
 */
export function createBoulder(
  planName: string,
  currentStage: StageId,
  currentPhase: string,
): BoulderState {
  return {
    active_plan: planName,
    session_id: makeSessionId(),
    started_at: new Date().toISOString(),
    current_stage: currentStage,
    current_phase,
    pending_tasks: [],
  };
}

/**
 * Load Boulder from project directory.
 */
export function loadBoulder(projectDir: string): BoulderState | null {
  const path = join(projectDir, '.omo-sci', 'boulder.json');
  if (!existsSync(path)) return null;
  const raw = readFileSync(path, 'utf-8');
  return JSON.parse(raw) as BoulderState;
}

/**
 * Save Boulder to project directory.
 */
export function saveBoulder(projectDir: string, boulder: BoulderState): void {
  const dir = join(projectDir, '.omo-sci');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'boulder.json'), JSON.stringify(boulder, null, 2), 'utf-8');
}

/**
 * Add a pending task to the boulder.
 */
export function addPendingTask(
  projectDir: string,
  task: PendingTask,
): BoulderState {
  const boulder = loadBoulder(projectDir);
  if (!boulder) throw new Error('No active boulder state. Start a session first.');
  boulder.pending_tasks.push(task);
  saveBoulder(projectDir, boulder);
  return boulder;
}

/**
 * Update a pending task's status by id.
 */
export function updateTaskStatus(
  projectDir: string,
  taskId: string,
  status: PendingTask['status'],
): void {
  const boulder = loadBoulder(projectDir);
  if (!boulder) return;
  const task = boulder.pending_tasks.find(t => t.id === taskId);
  if (task) task.status = status;
  saveBoulder(projectDir, boulder);
}
```

- [ ] **Step 3: Write tests**

```typescript
// tests/state/passport.test.ts
import { describe, it, expect, afterEach } from 'bun:test';
import { loadPassport, savePassport, updateStageState } from '../src/state/passport';
import { rmSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

function tempDir(): string {
  return mkdtempSync(join(tmpdir(), 'omo-sci-test-'));
}

describe('loadPassport', () => {
  it('returns default passport when no file exists', () => {
    const dir = tempDir();
    const passport = loadPassport(dir);
    expect(passport.pipeline.status).toBe('not_started');
    expect(passport.pipeline.current_stage).toBe('stage-0-intake');
    rmSync(dir, { recursive: true, force: true });
  });
});

describe('savePassport + loadPassport roundtrip', () => {
  it('saves and loads correctly', () => {
    const dir = tempDir();
    const passport = loadPassport(dir);
    passport.project.title = 'Test Study';
    savePassport(dir, passport);
    
    const loaded = loadPassport(dir);
    expect(loaded.project.title).toBe('Test Study');
    rmSync(dir, { recursive: true, force: true });
  });
});

describe('updateStageState', () => {
  it('updates a stage state and persists', () => {
    const dir = tempDir();
    const updated = updateStageState(dir, 'stage-1-design', {
      status: 'completed',
      sample_size: 200,
    });
    expect(updated.stage_1_design?.status).toBe('completed');
    expect(updated.stage_1_design?.sample_size).toBe(200);
    rmSync(dir, { recursive: true, force: true });
  });
});
```

- [ ] **Step 4: Run tests**

```bash
bun test tests/state/
```

Expected: All state tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/state/ tests/state/
git commit -m "feat: add Material Passport and Boulder state systems"
```

---

### Task 6: Hook registry

**Files:**
- Create: `src/hooks/registry.ts`
- Test: `tests/hooks/registry.test.ts`

- [ ] **Step 1: Write hook registry**

```typescript
import type { HookName, HookHandler, HookContext } from '../types';
import { loadConfig } from '../config';

type HookMap = Map<HookName, HookHandler[]>;

let hookRegistry: HookMap = new Map();

/**
 * Register a handler for a lifecycle hook.
 * Multiple handlers can be registered for the same hook.
 */
export function on(hook: HookName, handler: HookHandler): void {
  const handlers = hookRegistry.get(hook) ?? [];
  handlers.push(handler);
  hookRegistry.set(hook, handlers);
}

/**
 * Dispatch a hook event to all registered handlers.
 * Handlers are called in registration order.
 * If a hook is disabled in config, it is skipped.
 */
export async function dispatch(ctx: HookContext): Promise<void> {
  const config = loadConfig();
  if (config.disabled_hooks?.includes(ctx.hook)) {
    return;
  }
  const handlers = hookRegistry.get(ctx.hook) ?? [];
  for (const handler of handlers) {
    await handler(ctx);
  }
}

/**
 * Remove all registered handlers. Used in testing.
 */
export function clearHooks(): void {
  hookRegistry = new Map();
}

/**
 * Get the list of all registered hook names.
 */
export function registeredHooks(): HookName[] {
  return Array.from(hookRegistry.keys());
}
```

- [ ] **Step 2: Write test**

```typescript
import { describe, it, expect, beforeEach } from 'bun:test';
import { on, dispatch, clearHooks, registeredHooks } from '../src/hooks/registry';
import type { HookContext } from '../src/types';

beforeEach(() => clearHooks());

describe('on + dispatch', () => {
  it('calls registered handler when hook is dispatched', async () => {
    const calls: string[] = [];
    on('session:start', async (ctx: HookContext) => {
      calls.push(ctx.hook);
    });
    await dispatch({ hook: 'session:start' });
    expect(calls).toEqual(['session:start']);
  });

  it('calls multiple handlers in registration order', async () => {
    const order: number[] = [];
    on('stage:entry', async () => { order.push(1); });
    on('stage:entry', async () => { order.push(2); });
    await dispatch({ hook: 'stage:entry' });
    expect(order).toEqual([1, 2]);
  });
});

describe('registeredHooks', () => {
  it('returns all registered hook names', () => {
    on('session:start', async () => {});
    on('stage:entry', async () => {});
    expect(registeredHooks()).toContain('session:start');
    expect(registeredHooks()).toContain('stage:entry');
  });
});
```

- [ ] **Step 3: Run tests**

```bash
bun test tests/hooks/registry.test.ts
```

Expected: 3 tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/registry.ts tests/hooks/registry.test.ts
git commit -m "feat: add lifecycle hook registry with dispatch"
```

---

### Task 7: Session hooks

**Files:**
- Create: `src/hooks/session.ts`
- Test: `tests/hooks/session.test.ts`

- [ ] **Step 1: Write session hooks**

```typescript
import type { HookContext } from '../types';
import { loadPassport, savePassport } from '../state/passport';
import { loadBoulder, saveBoulder, createBoulder } from '../state/boulder';
import { on } from './registry';

/**
 * session:start — Load state and prepare for a new or resumed session.
 */
on('session:start', async (ctx: HookContext) => {
  const projectDir = process.cwd();
  
  const passport = loadPassport(projectDir);
  const boulder = loadBoulder(projectDir);

  if (boulder) {
    // Resuming: restore from boulder
    ctx.passport = passport;
    ctx.boulder = boulder;
    ctx.metadata = {
      ...ctx.metadata,
      resumed: true,
      resume_stage: boulder.current_stage,
      resume_phase: boulder.current_phase,
    };
  } else {
    // New session
    const newBoulder = createBoulder(
      passport.project.title || 'Untitled Research',
      passport.pipeline.current_stage,
      'start',
    );
    saveBoulder(projectDir, newBoulder);
    ctx.passport = passport;
    ctx.boulder = newBoulder;
    ctx.metadata = { ...ctx.metadata, resumed: false };
  }
});

/**
 * session:end — Persist final state before shutdown.
 */
on('session:end', async (ctx: HookContext) => {
  if (ctx.passport) {
    savePassport(process.cwd(), ctx.passport);
  }
  if (ctx.boulder) {
    saveBoulder(process.cwd(), ctx.boulder);
  }
});

/**
 * session:resume — Restore from a previous boulder checkpoint.
 */
on('session:resume', async (ctx: HookContext) => {
  const boulder = loadBoulder(process.cwd());
  if (!boulder) {
    ctx.metadata = { ...ctx.metadata, resume_error: 'No saved session found.' };
    return;
  }
  ctx.boulder = boulder;
  ctx.passport = loadPassport(process.cwd());
  ctx.metadata = {
    ...ctx.metadata,
    resume_stage: boulder.current_stage,
    resume_phase: boulder.current_phase,
    pending_tasks: boulder.pending_tasks.filter(t => t.status !== 'completed'),
  };
});

/**
 * session:interrupt — User interrupts mid-session. Save state.
 */
on('session:interrupt', async (ctx: HookContext) => {
  if (ctx.passport) {
    savePassport(process.cwd(), ctx.passport);
  }
  if (ctx.boulder) {
    saveBoulder(process.cwd(), ctx.boulder);
  }
});
```

- [ ] **Step 2: Write test**

```typescript
import { describe, it, expect } from 'bun:test';
import { dispatch, registeredHooks } from '../src/hooks/registry';
import type { HookContext } from '../src/types';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import '../src/hooks/session';

describe('session:start hook', () => {
  it('registers all session hooks', () => {
    expect(registeredHooks()).toContain('session:start');
    expect(registeredHooks()).toContain('session:end');
    expect(registeredHooks()).toContain('session:resume');
    expect(registeredHooks()).toContain('session:interrupt');
  });

  it('can dispatch session:start', async () => {
    const previous = process.cwd();
    const dir = mkdtempSync(join(tmpdir(), 'omo-sci-session-'));
    const ctx: HookContext = { hook: 'session:start' };
    try {
      process.chdir(dir);
      await dispatch(ctx);
      expect(ctx.metadata?.resumed).toBe(false);
      expect(ctx.passport).toBeDefined();
      expect(ctx.boulder).toBeDefined();
    } finally {
      process.chdir(previous);
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
```

- [ ] **Step 3: Commit**

```bash
git add src/hooks/session.ts tests/hooks/session.test.ts
git commit -m "feat: add session lifecycle hooks (start/end/resume/interrupt)"
```

---

### Task 8: Stage, delegation, model, quality, review, and user hooks (stubs)

**Files:**
- Create: `src/hooks/stage.ts`, `src/hooks/delegation.ts`, `src/hooks/model.ts`, `src/hooks/quality.ts`, `src/hooks/review.ts`, `src/hooks/user.ts`

- [ ] **Step 1: Write stage.ts**

```typescript
import type { HookContext } from '../types';
import { updateStageState } from '../state/passport';
import { on } from './registry';

on('stage:entry', async (ctx: HookContext) => {
  const stage = ctx.stage;
  if (!stage) return;
  updateStageState(process.cwd(), stage, {
    status: 'in_progress',
    started_at: new Date().toISOString(),
  });
  ctx.metadata = { ...ctx.metadata, stage_entry_time: Date.now() };
});

on('stage:exit', async (ctx: HookContext) => {
  const stage = ctx.stage;
  if (!stage) return;
  updateStageState(process.cwd(), stage, {
    status: 'completed',
    completed_at: new Date().toISOString(),
  });
});

on('stage:gate_check', async (ctx: HookContext) => {
  ctx.metadata = { ...ctx.metadata, gate_checked: true };
});

on('stage:gate_pass', async (ctx: HookContext) => {
  ctx.metadata = { ...ctx.metadata, gate_passed: true };
});

on('stage:gate_fail', async (ctx: HookContext) => {
  ctx.metadata = { ...ctx.metadata, gate_failed: true, gate_retry_count: ((ctx.metadata?.gate_retry_count as number) ?? 0) + 1 };
});
```

- [ ] **Step 2: Write delegation.ts**

```typescript
import type { HookContext } from '../types';
import { on } from './registry';

on('delegate:pre', async (ctx: HookContext) => {
  ctx.metadata = { ...ctx.metadata, delegation_start: Date.now(), delegate_agent: ctx.agent };
});

on('delegate:post', async (ctx: HookContext) => {
  ctx.metadata = { ...ctx.metadata, delegation_end: Date.now() };
});

on('delegate:error', async (ctx: HookContext) => {
  ctx.metadata = { ...ctx.metadata, delegation_error: true };
});
```

- [ ] **Step 3: Write model.ts**

```typescript
import type { HookContext } from '../types';
import { on } from './registry';

on('model:select', async (ctx: HookContext) => {
  ctx.metadata = { ...ctx.metadata, model_selected: true };
});

on('model:fallback', async (ctx: HookContext) => {
  ctx.metadata = { ...ctx.metadata, model_fallback: true };
});
```

- [ ] **Step 4: Write quality.ts**

```typescript
import type { HookContext } from '../types';
import { on } from './registry';
import { loadConfig } from '../config';

on('quality:loop_detect', async (ctx: HookContext) => {
  ctx.metadata = { ...ctx.metadata, loop_detected: true };
});

on('quality:compaction_pre', async (ctx: HookContext) => {
  // Save critical constraints before context compaction
  ctx.metadata = { ...ctx.metadata, compaction_pre_saved: true };
});

on('quality:compaction_post', async (ctx: HookContext) => {
  // Verify critical constraints still intact after compaction
  ctx.metadata = { ...ctx.metadata, compaction_post_verified: true };
});

on('quality:token_warn', async (ctx: HookContext) => {
  const config = loadConfig();
  const usage = config.usage;
  const pct = (usage.current_usage / usage.token_quota) * 100;
  ctx.metadata = { ...ctx.metadata, token_warn_pct: Math.round(pct) };
});
```

- [ ] **Step 5: Write review.ts**

```typescript
import type { HookContext } from '../types';
import { on } from './registry';

on('review:phase1', async (ctx: HookContext) => {
  ctx.metadata = { ...ctx.metadata, review_phase: 'phase1', paper_visible: false };
});

on('review:phase2', async (ctx: HookContext) => {
  ctx.metadata = { ...ctx.metadata, review_phase: 'phase2', paper_visible: true };
});
```

- [ ] **Step 6: Write user.ts**

```typescript
import type { HookContext } from '../types';
import { on } from './registry';

on('user:signoff', async (ctx: HookContext) => {
  ctx.metadata = { ...ctx.metadata, awaiting_signoff: true };
});

on('user:clarify', async (ctx: HookContext) => {
  ctx.metadata = { ...ctx.metadata, awaiting_clarification: true };
});
```

- [ ] **Step 7: Commit**

```bash
git add src/hooks/stage.ts src/hooks/delegation.ts src/hooks/model.ts src/hooks/quality.ts src/hooks/review.ts src/hooks/user.ts
git commit -m "feat: add all 22 lifecycle hook handlers (stubs for Phase 2 refinement)"
```

---

### Task 9: Environment checker

**Files:**
- Create: `src/environment/check.ts`, `src/environment/mcp-check.ts`, `src/environment/r-check.ts`, `src/environment/software-check.ts`, `src/environment/api-check.ts`, `src/environment/reporter.ts`
- Test: `tests/environment/check.test.ts`, `tests/environment/reporter.test.ts`

- [ ] **Step 1: Write check.ts — main orchestrator**

```typescript
import type { OmoSciConfig } from '../types';
import { loadConfig } from '../config';
import type { CheckResult } from './reporter';

export type { CheckResult };

export interface EnvCheckOptions {
  stage?: string;        // Filter checks by stage dependency
  mcpOnly?: boolean;
  rOnly?: boolean;
}

/**
 * Run all environment checks.
 */
export async function runAllChecks(config: OmoSciConfig, options: EnvCheckOptions = {}): Promise<CheckResult[]> {
  const results: CheckResult[] = [];

  // MCP checks
  results.push(...checkMcpTools(config, options));
  
  // R checks (only for stage 2+)
  if (!options.stage || options.stage === '2' || options.stage === 'all') {
    results.push(...checkREnvironment(config));
  }

  // Software checks
  results.push(...checkSoftware(config, options));

  // API checks
  results.push(...checkModelApis(config));

  return results;
}

function checkMcpTools(config: OmoSciConfig, _options: EnvCheckOptions): CheckResult[] {
  const results: CheckResult[] = [];
  for (const tool of config.environment.mcp_required) {
    results.push({
      category: 'MCP',
      name: tool,
      status: 'unknown',  // Will be checked by OpenCode host at runtime
      message: `MCP tool "${tool}" — requires OpenCode host runtime check`,
    });
  }
  return results;
}

function checkREnvironment(config: OmoSciConfig): CheckResult[] {
  const results: CheckResult[] = [];
  results.push({
    category: 'R',
    name: 'R >= 4.3',
    status: 'unknown',
    message: 'Run `R --version` to verify. Expected >= 4.3.',
  });
  for (const pkg of config.environment.r_packages) {
    results.push({
      category: 'R',
      name: `R package: ${pkg}`,
      status: 'unknown',
      message: `Run \`R -e 'library(${pkg})'\` to verify.`,
    });
  }
  return results;
}

function checkSoftware(config: OmoSciConfig, _options: EnvCheckOptions): CheckResult[] {
  const results: CheckResult[] = [];
  for (const sw of config.environment.software) {
    results.push({
      category: 'Software',
      name: sw,
      status: 'unknown',
      message: `Run \`which ${sw.toLowerCase()}\` or equivalent to verify.`,
    });
  }
  // Also check OfficeCLI
  results.push({
    category: 'Software',
    name: 'OfficeCLI',
    status: 'unknown',
    message: 'Run `which officecli` to verify. Install: `npm i -g officecli`.',
  });
  return results;
}

function checkModelApis(config: OmoSciConfig): CheckResult[] {
  const results: CheckResult[] = [];
  const categories = Object.entries(config.router.categories);
  for (const [cat, catConfig] of categories) {
    const models = catConfig.fallback_chain;
    if (models.length === 0) {
      results.push({
        category: 'API',
        name: `Category: ${cat}`,
        status: 'fail',
        message: 'No models configured for this category.',
      });
    } else {
      results.push({
        category: 'API',
        name: `Category: ${cat}`,
        status: 'pass',
        message: `${models.length} model(s) configured. Primary: ${models[0]?.model_id}`,
      });
    }
  }
  return results;
}
```

- [ ] **Step 2: Write reporter.ts**

```typescript
export interface CheckResult {
  category: string;
  name: string;
  status: 'pass' | 'fail' | 'warn' | 'unknown';
  message: string;
}

export function formatDoctorReport(results: CheckResult[]): string {
  const lines: string[] = [];
  lines.push('╭─────────────────────────────────────────╮');
  lines.push('│        omo-sci 环境诊断报告              │');
  lines.push(`│        ${new Date().toISOString().slice(0, 16).replace('T', ' ')}                  │`);
  lines.push('╰─────────────────────────────────────────╯');
  lines.push('');

  // Group by category
  const grouped = new Map<string, CheckResult[]>();
  for (const r of results) {
    const list = grouped.get(r.category) ?? [];
    list.push(r);
    grouped.set(r.category, list);
  }

  let passCount = 0;
  let failCount = 0;
  let warnCount = 0;
  let unknownCount = 0;

  for (const [category, items] of grouped) {
    const catPass = items.filter(i => i.status === 'pass').length;
    const catFail = items.filter(i => i.status === 'fail').length;
    lines.push(`${category} (${catPass}/${items.length} 就绪)`);

    for (const item of items) {
      const icon = statusIcon(item.status);
      lines.push(`  ${icon} ${item.name.padEnd(30)} ${item.message}`);
      switch (item.status) {
        case 'pass': passCount++; break;
        case 'fail': failCount++; break;
        case 'warn': warnCount++; break;
        default: unknownCount++; break;
      }
    }
    lines.push('');
  }

  const total = passCount + failCount + warnCount + unknownCount;
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  lines.push(` 总体: ${passCount}/${total} 项就绪`);
  if (failCount > 0) lines.push(` ⚠ ${failCount} 项缺失，请按上述建议修复`);
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  return lines.join('\n');
}

function statusIcon(status: CheckResult['status']): string {
  switch (status) {
    case 'pass': return '✓';
    case 'fail': return '✗';
    case 'warn': return '⚠';
    default: return '?';
  }
}
```

- [ ] **Step 3: Write test for reporter**

```typescript
import { describe, it, expect } from 'bun:test';
import { formatDoctorReport, type CheckResult } from '../src/environment/reporter';

describe('formatDoctorReport', () => {
  it('produces formatted output', () => {
    const results: CheckResult[] = [
      { category: 'MCP', name: 'PubMed', status: 'pass', message: 'OK' },
      { category: 'MCP', name: 'CNKI', status: 'fail', message: 'Not configured' },
      { category: 'R', name: 'R', status: 'pass', message: 'R 4.4.1' },
    ];
    const report = formatDoctorReport(results);
    expect(report).toContain('omo-sci 环境诊断报告');
    expect(report).toContain('✓');
    expect(report).toContain('✗');
    expect(report).toContain('2/3');
  });
});
```

- [ ] **Step 4: Run tests**

```bash
bun test tests/environment/
```

Expected: Tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/environment/ tests/environment/
git commit -m "feat: add environment checker and doctor report formatter"
```

---

### Task 10: Safety — circuit breaker and usage tracker

**Files:**
- Create: `src/safety/circuit-breaker.ts`, `src/safety/usage-tracker.ts`
- Test: `tests/safety/circuit-breaker.test.ts`, `tests/safety/usage-tracker.test.ts`

- [ ] **Step 1: Write circuit-breaker.ts**

```typescript
import { loadConfig } from '../config';

interface AgentRunState {
  stepCount: number;
  startedAt: number;
  lastToolCalls: string[];  // last N tool calls for loop detection
}

const agentStates = new Map<string, AgentRunState>();

/**
 * Start tracking a new agent run. Returns the run ID.
 */
export function startRun(agentName: string): string {
  const id = `${agentName}-${Date.now()}`;
  agentStates.set(id, {
    stepCount: 0,
    startedAt: Date.now(),
    lastToolCalls: [],
  });
  return id;
}

/**
 * Record a step for an agent run. Returns circuit breaker status.
 */
export function recordStep(
  runId: string,
  toolName: string,
  toolParams: string,
): { shouldContinue: boolean; reason?: string } {
  const state = agentStates.get(runId);
  if (!state) return { shouldContinue: false, reason: 'Run not found' };

  state.stepCount++;
  const config = loadConfig();

  // Check max step limit
  if (state.stepCount > config.safety.max_step) {
    return { shouldContinue: false, reason: `Exceeded max steps (${config.safety.max_step})` };
  }

  // Check time limit
  const elapsed = (Date.now() - state.startedAt) / 1000 / 60;
  if (elapsed > config.safety.max_time_minutes) {
    return { shouldContinue: false, reason: `Exceeded max time (${config.safety.max_time_minutes}min)` };
  }

  // Check loop detection
  const callSig = `${toolName}:${toolParams}`;
  state.lastToolCalls.push(callSig);
  if (state.lastToolCalls.length > config.safety.loop_detect_threshold) {
    state.lastToolCalls.shift();
  }
  if (
    state.lastToolCalls.length >= config.safety.loop_detect_threshold &&
    new Set(state.lastToolCalls).size === 1
  ) {
    return {
      shouldContinue: false,
      reason: `Loop detected: same tool call repeated ${config.safety.loop_detect_threshold} times`,
    };
  }

  return { shouldContinue: true };
}

/**
 * Clean up agent run state.
 */
export function endRun(runId: string): void {
  agentStates.delete(runId);
}

/**
 * Get the intervention prompt for a loop-detected agent.
 */
export function getLoopInterventionPrompt(): string {
  return `你似乎在重复相同的操作。回顾一下：
1. 你当前的目标是什么？
2. 你已经尝试了什么？结果如何？
3. 是否有不同的方法可以达到目标？
如果无法突破，请将情况汇报给 Dubin。`;
}
```

- [ ] **Step 2: Write usage-tracker.ts**

```typescript
import { loadConfig } from '../config';
import { OMO_SCI_CONFIG_PATH } from '../constants';
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { modify, applyEdits } from 'jsonc-parser';

interface UsageRecord {
  timestamp: string;
  agent: string;
  stage: string;
  input_tokens: number;
  output_tokens: number;
}

/**
 * Record token usage from an agent call and update quota tracking.
 */
export function recordUsage(record: UsageRecord): {
  currentUsage: number;
  quotaPercent: number;
  warningLevel: 'none' | 'light' | 'moderate' | 'critical';
} {
  const config = loadConfig();
  const totalTokens = record.input_tokens + record.output_tokens;
  const newUsage = config.usage.current_usage + totalTokens;
  
  // Update config file with new usage
  if (existsSync(OMO_SCI_CONFIG_PATH)) {
    const raw = readFileSync(OMO_SCI_CONFIG_PATH, 'utf-8');
    const edits = modify(raw, ['usage', 'current_usage'], newUsage, {});
    writeFileSync(OMO_SCI_CONFIG_PATH, applyEdits(raw, edits), 'utf-8');
  }

  config.usage.current_usage = newUsage;
  const pct = (newUsage / config.usage.token_quota) * 100;

  let warningLevel: 'none' | 'light' | 'moderate' | 'critical' = 'none';
  if (pct >= 100) warningLevel = 'critical';
  else if (pct >= 80) warningLevel = 'moderate';
  else if (pct >= 50) warningLevel = 'light';

  return { currentUsage: newUsage, quotaPercent: Math.round(pct), warningLevel };
}

/**
 * Get warning message for the given level.
 */
export function getQuotaWarning(level: 'light' | 'moderate' | 'critical'): string {
  switch (level) {
    case 'light':
      return '当前项目 token 消耗已达额度的 50%。';
    case 'moderate':
      return '接近额度上限了。后续任务我会优先用轻量模型（MiniMax M3 / Kimi K2.7），把 DeepSeek V4 Pro 留给最关键的分析步骤。';
    case 'critical':
      return '本月 token 额度已用完。当前进度已写入 Material Passport，下个月可以无缝恢复。或您现在调整额度上限。';
    default:
      return '';
  }
}
```

- [ ] **Step 3: Write tests**

```typescript
// tests/safety/circuit-breaker.test.ts
import { describe, it, expect } from 'bun:test';
import { startRun, recordStep, endRun } from '../src/safety/circuit-breaker';

describe('circuit breaker', () => {
  it('allows steps within limits', () => {
    const id = startRun('spsser');
    const result = recordStep(id, 'read', '{"path":"data.csv"}');
    expect(result.shouldContinue).toBe(true);
    endRun(id);
  });

  it('detects loops after threshold', () => {
    const id = startRun('pubmeder');
    // Simulate 5 identical calls
    for (let i = 0; i < 5; i++) {
      const result = recordStep(id, 'search', '{"query":"sepsis"}');
      if (i < 4) expect(result.shouldContinue).toBe(true);
      else {
        expect(result.shouldContinue).toBe(false);
        expect(result.reason).toContain('Loop detected');
      }
    }
    endRun(id);
  });

  it('enforces max step limit', () => {
    const id = startRun('writer');
    for (let i = 0; i < 51; i++) {
      const result = recordStep(id, `tool_${i}`, `{"step":${i}}`);
      if (i < 50) expect(result.shouldContinue).toBe(true);
      else {
        expect(result.shouldContinue).toBe(false);
        expect(result.reason).toContain('max steps');
      }
    }
    endRun(id);
  });
});
```

- [ ] **Step 4: Run tests**

```bash
bun test tests/safety/
```

Expected: Circuit breaker tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/safety/ tests/safety/
git commit -m "feat: add circuit breaker and token usage tracker"
```

---

### Task 11: Install TUI and config generator

**Files:**
- Create: `src/install/tui.ts`, `src/install/config-generator.ts`, `src/install/validator.ts`
- Test: `tests/install/config-generator.test.ts`

- [ ] **Step 1: Write config-generator.ts**

```typescript
import type { ProviderId, CapabilityCategory, ModelSpec, OmoSciConfig } from '../types';
import { DEFAULT_CONFIG } from '../constants';
import { PROVIDER_REGISTRY, getAvailableModels } from '../router/provider';
import { DEFAULT_FALLBACK_ORDERS } from '../router/categories';

export interface InstallAnswers {
  providers: ProviderId[];
  tokenQuota: 200_000_000 | 500_000_000 | 1_000_000_000;
}

/**
 * Generate a complete omo-sci.jsonc config from user's install answers.
 */
export function generateConfig(answers: InstallAnswers, _existingConfig?: OmoSciConfig): OmoSciConfig {
  const config: OmoSciConfig = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
  const availableModels = getAvailableModels(answers.providers);

  // Build fallback chains for each category based on user's available models
  for (const [cat, preferredOrder] of Object.entries(DEFAULT_FALLBACK_ORDERS) as Array<[CapabilityCategory, string[]]>) {
    const chain: ModelSpec[] = [];
    for (const modelId of preferredOrder) {
      const model = availableModels.find(m => m.model_id === modelId);
      if (model) chain.push(model);
    }
    config.router.categories[cat].fallback_chain = chain;
  }

  config.usage.token_quota = answers.tokenQuota;
  config.usage.quota_reset_date = new Date().toISOString().slice(0, 7) + '-01';

  return config;
}

/**
 * Format the generated config as a pretty-printed JSONC string.
 */
export function formatConfigJsonc(config: OmoSciConfig): string {
  return JSON.stringify(
    {
      $schema: 'https://raw.githubusercontent.com/code-yeongyu/omo-sci/main/schema/omo-sci.schema.json',
      ...config,
    },
    null,
    2,
  );
}
```

- [ ] **Step 2: Write test**

```typescript
import { describe, it, expect } from 'bun:test';
import { generateConfig } from '../src/install/config-generator';
import type { ProviderId } from '../src/types';

describe('generateConfig', () => {
  it('builds fallback chains from user providers', () => {
    const config = generateConfig({
      providers: ['deepseek', 'qwen-bailian', 'zhipu'],
      tokenQuota: 500_000_000,
    });

    // Deep-reasoning should have deepseek-v4-pro first (user has deepseek)
    const deepReasoning = config.router.categories['deep-reasoning'];
    expect(deepReasoning.fallback_chain.length).toBeGreaterThan(0);
    expect(deepReasoning.fallback_chain[0]?.model_id).toBe('deepseek-v4-pro');

    // Player should have qwen first (user has qwen-bailian)
    const orchestration = config.router.categories['agent-orchestration'];
    expect(orchestration.fallback_chain.length).toBeGreaterThan(0);
    expect(orchestration.fallback_chain[0]?.model_id).toBe('qwen3.7-max');

    // Chinese writing should have glm (user has zhipu)
    const writing = config.router.categories['chinese-writing'];
    expect(writing.fallback_chain[0]?.model_id).toBe('glm-5.2');
  });

  it('omits models user does not have access to', () => {
    const config = generateConfig({
      providers: ['deepseek'],
      tokenQuota: 200_000_000,
    });

    // Only deepseek models should appear
    for (const cat of Object.values(config.router.categories)) {
      for (const model of cat.fallback_chain) {
        expect(model.provider).toBe('deepseek');
      }
    }
  });

  it('sets token quota correctly', () => {
    const config = generateConfig({
      providers: ['deepseek'],
      tokenQuota: 1_000_000_000,
    });
    expect(config.usage.token_quota).toBe(1_000_000_000);
  });
});
```

- [ ] **Step 3: Write TUI installer stub**

```typescript
// src/install/tui.ts
// Full Inquirer-based TUI to be fleshed out in Phase 2.
// For Phase 1, provides a programmatic install path for CI.

import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { OMO_SCI_CONFIG_PATH, OMO_SCI_DIR, OMO_SCI_PROFILE_DIR } from '../constants';
import { generateConfig } from './config-generator';
import type { ProviderId } from '../types';

export interface InstallOptions {
  providers: ProviderId[];
  tokenQuota: 200_000_000 | 500_000_000 | 1_000_000_000;
  noTui?: boolean;  // Non-interactive mode for CI / LLM agent install
}

export async function install(options: InstallOptions): Promise<void> {
  // Ensure directories exist
  if (!existsSync(OMO_SCI_DIR)) mkdirSync(OMO_SCI_DIR, { recursive: true });
  if (!existsSync(OMO_SCI_PROFILE_DIR)) mkdirSync(OMO_SCI_PROFILE_DIR, { recursive: true });

  // Generate and write config
  const config = generateConfig({
    providers: options.providers,
    tokenQuota: options.tokenQuota,
  });

  const configStr = JSON.stringify(config, null, 2);
  writeFileSync(OMO_SCI_CONFIG_PATH, configStr, 'utf-8');

  console.log(`✓ Config written to ${OMO_SCI_CONFIG_PATH}`);
  console.log('✓ omo-sci installed successfully.');
  console.log('  Try /sci-doctor to verify your environment.');
  console.log('  Try /sci-start to begin your first research project.');
}
```

- [ ] **Step 4: Run tests**

```bash
bun test tests/install/
```

Expected: Config generator tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/install/ tests/install/
git commit -m "feat: add config generator and programmatic installer"
```

---

### Task 12: Plugin entry point and slash commands

**Files:**
- Create/update: `src/index.ts`, `src/commands/sci-doctor.ts`, `src/commands/sci-status.ts`, `src/commands/sci-usage.ts`, `src/commands/sci-start.ts`, `src/commands/sci-resume.ts`, `src/commands/sci-review.ts`, `bin/omo-sci.ts`

- [ ] **Step 1: Write index.ts — plugin entry point**

```typescript
/**
 * omo-sci OpenCode Plugin Entry Point
 * 
 * Exports omo-sci public APIs.
 * The exact OpenCode plugin adapter must follow Phase 0 findings.
 */

// Register all hooks (side-effect: on() calls at module load)
import './hooks/session';
import './hooks/stage';
import './hooks/delegation';
import './hooks/model';
import './hooks/quality';
import './hooks/review';
import './hooks/user';

// Export public API
export { loadConfig, validateConfig } from './config';
export { loadPassport, savePassport, updateStageState } from './state/passport';
export { loadBoulder, createBoulder, saveBoulder } from './state/boulder';
export { on, dispatch, clearHooks } from './hooks/registry';
export { resolveModel, resolveFallbackChain } from './router/fallback';
export { runAllChecks } from './environment/check';
export { formatDoctorReport } from './environment/reporter';
export { startRun, recordStep, endRun } from './safety/circuit-breaker';
export { recordUsage, getQuotaWarning } from './safety/usage-tracker';
export { install } from './install/tui';
export { generateConfig } from './install/config-generator';
export { PROVIDER_REGISTRY, getAvailableModels } from './router/provider';
export { CATEGORY_LABELS, AGENT_DISPLAY_NAMES } from './router/categories';

// Agent definitions will be registered in Phase 2 according to the OpenCode
// integration shape verified in Phase 0.
export const AGENTS = [
  'dubin', 'archimedes', 'irber', 'pubmeder', 'spsser',
  'writer', 'submitter', 'ebmer', 'polisher',
] as const;

// Command metadata for docs/installer generation.
// Do not assume OpenCode auto-loads this array unless Phase 0 verified it.
export const COMMANDS = [
  { name: '/sci-start', handler: 'commands/sci-start', description: '开始新研究' },
  { name: '/sci-status', handler: 'commands/sci-status', description: '查看项目状态' },
  { name: '/sci-resume', handler: 'commands/sci-resume', description: '恢复中断的研究' },
  { name: '/sci-review', handler: 'commands/sci-review', description: '手动触发审稿' },
  { name: '/sci-usage', handler: 'commands/sci-usage', description: '查看 token 用量' },
  { name: '/sci-doctor', handler: 'commands/sci-doctor', description: '环境诊断' },
] as const;
```

- [ ] **Step 2: Write sci-doctor.ts**

```typescript
import { loadConfig } from '../config';
import { runAllChecks } from '../environment/check';
import { formatDoctorReport } from '../environment/reporter';

export async function sciDoctor(args: string[]): Promise<string> {
  const config = loadConfig();
  const options: { stage?: string; mcpOnly?: boolean } = {};
  
  const stageFlag = args.indexOf('--stage');
  if (stageFlag !== -1 && args[stageFlag + 1]) {
    options.stage = args[stageFlag + 1];
  }
  if (args.includes('--mcp')) {
    options.mcpOnly = true;
  }

  const results = await runAllChecks(config, options);
  return formatDoctorReport(results);
}
```

- [ ] **Step 3: Write sci-status.ts**

```typescript
import { loadPassport } from '../state/passport';
import { loadBoulder } from '../state/boulder';

export function sciStatus(projectDir?: string): string {
  const dir = projectDir ?? process.cwd();
  const passport = loadPassport(dir);
  const boulder = loadBoulder(dir);

  const lines: string[] = [];
  lines.push(`📋 项目: ${passport.project.title || '(未命名)'}`);
  lines.push(`📌 阶段: ${passport.pipeline.current_stage}`);
  lines.push(`📊 状态: ${passport.pipeline.status}`);
  lines.push(`✅ 已完成: ${passport.pipeline.completed_stages.join(', ') || '(无)'}`);

  if (boulder) {
    lines.push(`🔖 会话: ${boulder.session_id} (${boulder.started_at.slice(0, 10)})`);
    const pending = boulder.pending_tasks.filter(t => t.status !== 'completed');
    if (pending.length > 0) {
      lines.push(`⏳ 待完成: ${pending.length} 项`);
      for (const task of pending) {
        lines.push(`   [${task.status}] ${task.agent}: ${task.task}`);
      }
    }
  }

  return lines.join('\n');
}
```

- [ ] **Step 4: Write sci-usage.ts**

```typescript
import { loadConfig } from '../config';

export function sciUsage(): string {
  const config = loadConfig();
  const quota = config.usage.token_quota;
  const used = config.usage.current_usage;
  const pct = Math.round((used / quota) * 100);
  
  // Format large numbers
  const fmt = (n: number) => {
    if (n >= 1_0000_0000) return `${(n / 1_0000_0000).toFixed(1)} 亿`;
    if (n >= 1_0000) return `${(n / 1_0000).toFixed(1)} 万`;
    return n.toLocaleString();
  };

  const barWidth = 30;
  const filled = Math.round((pct / 100) * barWidth);
  const bar = '█'.repeat(filled) + '░'.repeat(barWidth - filled);

  return `
Token 用量
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ${bar}  ${pct}%
  已用: ${fmt(used)} / ${fmt(quota)} tokens
  重置: ${config.usage.quota_reset_date}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`.trim();
}
```

- [ ] **Step 5: Write sci-start.ts (stub for Phase 2)**

```typescript
export function sciStart(): string {
  return `Dubin 正在启动...
该功能将在 Phase 2 中实现。
当前请直接在对话中描述您的研究想法，Dubin 会引导你。`;
}
```

- [ ] **Step 6: Write sci-resume.ts and sci-review.ts stubs**

```typescript
export function sciResume(): string {
  return '恢复流程将在 Phase 2 接入 Dubin 状态机。当前可用 /sci-status 查看 Boulder 状态。';
}
```

```typescript
export function sciReview(): string {
  return '审稿流程将在 Phase 3 接入 EBMer/Polisher。当前可先使用完整性闸门清单人工审查。';
}
```

- [ ] **Step 7: Replace bin/omo-sci.ts scaffold with real CLI wiring**

```typescript
#!/usr/bin/env bun

import { install } from '../src/install/tui';
import { sciDoctor } from '../src/commands/sci-doctor';
import { sciStatus } from '../src/commands/sci-status';
import { sciUsage } from '../src/commands/sci-usage';
import type { ProviderId } from '../src/types';

const VALID_PROVIDERS = new Set<ProviderId>([
  'deepseek',
  'qwen-bailian',
  'zhipu',
  'kimi',
  'minimax',
  'tencent-hy',
  'opencode-go',
]);

const VALID_QUOTAS = new Set([200_000_000, 500_000_000, 1_000_000_000]);

function parseFlag(args: string[], name: string): string | undefined {
  const idx = args.indexOf(name);
  return idx >= 0 ? args[idx + 1] : undefined;
}

function parseProviders(raw: string | undefined): ProviderId[] {
  const providers = (raw ?? 'deepseek').split(',').map(v => v.trim()).filter(Boolean);
  for (const provider of providers) {
    if (!VALID_PROVIDERS.has(provider as ProviderId)) {
      throw new Error(`Unknown provider: ${provider}`);
    }
  }
  return providers as ProviderId[];
}

function parseQuota(raw: string | undefined): 200_000_000 | 500_000_000 | 1_000_000_000 {
  const quota = Number(raw ?? '500000000');
  if (!VALID_QUOTAS.has(quota)) {
    throw new Error('Quota must be one of 200000000, 500000000, 1000000000.');
  }
  return quota as 200_000_000 | 500_000_000 | 1_000_000_000;
}

async function main() {
  const [, , command, ...args] = process.argv;

  if (command === 'install') {
    await install({
      providers: parseProviders(parseFlag(args, '--providers')),
      tokenQuota: parseQuota(parseFlag(args, '--quota')),
      noTui: args.includes('--no-tui'),
    });
    return;
  }

  if (command === 'doctor') {
    console.log(await sciDoctor(args));
    return;
  }

  if (command === 'status') {
    console.log(sciStatus(process.cwd()));
    return;
  }

  if (command === 'usage') {
    console.log(sciUsage());
    return;
  }

  console.log(`omo-sci

Usage:
  omo-sci install --no-tui --providers deepseek,qwen-bailian --quota 500000000
  omo-sci doctor
  omo-sci status
  omo-sci usage`);
}

main().catch(err => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
```

- [ ] **Step 8: Commit**

```bash
git add src/index.ts src/commands/ bin/omo-sci.ts
git commit -m "feat: add plugin entry point and slash command handlers"
```

---

### Task 13: Copy references from opensci

**Files:**
- Copy: `references/` from `~/.claude/skills/opensci/references/`

- [ ] **Step 1: Copy reference files**

```bash
mkdir -p references
cp ~/.claude/skills/opensci/references/clinical-research-design.md references/
cp ~/.claude/skills/opensci/references/statistical-methods.md references/
cp ~/.claude/skills/opensci/references/clinical-failure-modes.md references/
cp ~/.claude/skills/opensci/references/manuscript-polishing.md references/
cp ~/.claude/skills/opensci/references/literature-tools.md references/
cp ~/.claude/skills/opensci/references/figure-style-guide.md references/
cp ~/.claude/skills/opensci/references/material-passport-schema.md references/
cp ~/.claude/skills/opensci/stages/integrity-gates.md references/
cp ~/.codex/skills/codexsci/references/pubmed-cyanheads.md references/
cp ~/.codex/skills/codexsci/references/project-structure.md references/codexsci-project-structure.md
```

- [ ] **Step 2: Commit**

```bash
git add references/
git commit -m "chore: copy opensci reference files for medical research domain knowledge"
```

---

### Task 14: Phase 1 integration test

**Files:**
- Create: `tests/integration/phase1.test.ts`

- [ ] **Step 1: Write integration test**

```typescript
import { describe, it, expect, beforeEach } from 'bun:test';
import { clearHooks } from '../src/hooks/registry';
import { generateConfig } from '../src/install/config-generator';
import { startRun, recordStep, endRun } from '../src/safety/circuit-breaker';
import { resolveModel } from '../src/router/fallback';
import { loadPassport, savePassport } from '../src/state/passport';
import { createBoulder } from '../src/state/boulder';
import { formatDoctorReport } from '../src/environment/reporter';
import { rmSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

function tempDir(): string {
  return mkdtempSync(join(tmpdir(), 'omo-sci-int-'));
}

describe('Phase 1 integration', () => {
  it('config generator → router → state → safety pipeline works end-to-end', () => {
    // 1. Generate config from user's providers
    const config = generateConfig({
      providers: ['deepseek', 'qwen-bailian', 'zhipu'],
      tokenQuota: 500_000_000,
    });

    // 2. Router resolves models from generated config
    const model = resolveModel('deep-reasoning', config.router);
    expect(model).not.toBeNull();
    expect(model!.model_id).toBe('deepseek-v4-pro');

    // 3. State system works
    const dir = tempDir();
    const passport = loadPassport(dir);
    passport.project.title = 'Test Integration Study';
    savePassport(dir, passport);

    const loaded = loadPassport(dir);
    expect(loaded.project.title).toBe('Test Integration Study');

    // 4. Boulder works
    const boulder = createBoulder('Test', 'stage-0-intake', 'start');
    expect(boulder.active_plan).toBe('Test');

    // 5. Circuit breaker works
    const runId = startRun('spsser');
    const step1 = recordStep(runId, 'read_file', '{}');
    expect(step1.shouldContinue).toBe(true);
    endRun(runId);

    // 6. Report formatter works
    const report = formatDoctorReport([
      { category: 'Test', name: 'Integration', status: 'pass', message: 'OK' },
    ]);
    expect(report).toContain('✓');

    rmSync(dir, { recursive: true, force: true });
  });

  it('token quota is set correctly from install answers', () => {
    const config = generateConfig({
      providers: ['kimi'],
      tokenQuota: 1_000_000_000,
    });
    expect(config.usage.token_quota).toBe(1_000_000_000);
  });

  it('all 6 categories are present in generated config', () => {
    const config = generateConfig({
      providers: ['deepseek'],
      tokenQuota: 200_000_000,
    });
    expect(Object.keys(config.router.categories).length).toBe(6);
  });
});
```

- [ ] **Step 2: Run integration test**

```bash
bun test tests/integration/
```

Expected: All integration tests pass.

- [ ] **Step 3: Run all tests**

```bash
bun test
```

Expected: All Phase 1 tests pass (approximately 20+ tests).

- [ ] **Step 4: Commit**

```bash
git add tests/integration/
git commit -m "test: add Phase 1 integration tests"
```

---

## Phase 1 Exit Criteria

- [ ] `bun test` — all tests pass
- [ ] `bun run typecheck` — no TypeScript errors
- [ ] `bunx --bun . install --no-tui --providers deepseek --quota 200000000` writes config
- [ ] OpenCode smoke command from Phase 0 displays doctor output
- [ ] Dubin smoke agent/config from Phase 0 is visible to OpenCode
- [ ] Config generator produces valid fallback chains from user providers
- [ ] Material Passport read/write/validate roundtrip, including `passport_version`, `layout`, `data_provenance`, `signoff_records`, and gate reports
- [ ] Boulder session state persistence
- [ ] Hooks registered and dispatchable; stub hooks have explicit TODOs for Phase 2 behavior
- [ ] Circuit breaker detects loops and enforces step limits
- [ ] Environment checker reports categorized results
- [ ] Doctor report formatter produces readable output
- [ ] Plugin entry point follows the integration shape verified in Phase 0

---

# Phase 2: Agent Team (4 weeks)

Phase 2 builds the 9 agents with their prompts, the Dubin interview state machine, delegation logic, and result summarization.

### Task 15: Agent prompt templates

Create `src/agents/` with one file per agent. Each file exports the agent's system prompt template — designed for its capability category and tuned for Chinese medical research context. Dubin's prompt (~800 lines) is the most elaborate, incorporating the personality and interview style defined in the spec. Other agent prompts are 100-300 lines each.

### Task 16: Dubin interview state machine

Build `src/orchestrator/interview.ts` — a state machine that drives Dubin's structured intake conversation. States: GREETING → INTENT_CLASSIFICATION → PICO_EXTRACTION → FEASIBILITY_DISCUSSION → CONFIRMATION. Each state has transition rules, prompt templates, and parallel Pubmeder launch triggers.

### Task 17: Delegation engine

Build `src/orchestrator/delegation.ts` — handles the `delegate:pre/post/error` lifecycle, constructs minimal context payloads for sub-agents, and manages concurrent sub-agent limits.

### Task 18: Result summarizer

Build `src/orchestrator/summarizer.ts` — Dubin's post-delegation logic: translate sub-agent technical output into user-friendly language, extract Wisdom learnings, and update Material Passport.

### Task 19: Sub-agent prompts

Write the system prompts for:
- `archimedes.ts` — Research design architect, FINER evaluation
- `irber.ts` — Plan reviewer, gate keeper  
- `pubmeder.ts` — Multi-source literature search orchestrator
- `spsser.ts` — Statistical analysis + SAP generator
- `writer.ts` — Medical manuscript writer (Chinese/English)
- `submitter.ts` — Journal matcher + submission package builder

### Task 20: Agent registration in OpenCode

Register all 9 agents with OpenCode's plugin API, assign toolsets (MCP + custom tools), and wire up the category router so each agent's model selection uses the fallback chain.

---

# Phase 3: Review + Safety (2 weeks)

### Task 21: EBMer + Polisher agent prompts

Write the Sprint Contract two-phase review prompts. EBMer focuses on methodology (12 failure modes, data consistency, overclaiming detection). Polisher focuses on logic coherence, AI-odor removal, language quality.

### Task 22: Sprint Contract protocol

Build the Phase 1 (blind, paper-not-visible) and Phase 2 (full review, deviation tracking) protocol. Ensure EBMer and Polisher receive analysis summary cards, not full manuscripts, in Phase 1.

### Task 23: Content safety

Implement reference validator (PMID/Dashboard verification), AI-odor scanner (禁用词表 + 逐句扫描), and data provenance checker (data_label consistency enforcement).

### Task 24: Wisdom system

Build `src/state/wisdom.ts` — automatic extraction of learnings, decisions, gotchas, and problems from completed sub-agent tasks. Update `wisdom/` files in project directory.

---

# Phase 4: Polish + Docs (2 weeks)

### Task 25: Dubin evolution memory system

Build `src/state/evolution.ts` — user-level profile system: `researcher.json` update on project completion, `project-history.json` append, `evolution.md` first-person journal entries. Dubin loads profile on `/sci-start`.

### Task 26: Interactive TUI installer

Flesh out `src/install/tui.ts` with Inquirer prompts: provider selection, API key collection, token quota selection, MCP availability check. Generate optimal fallback chains.

### Task 27: Chinese user documentation

Write `docs/guide/installation.md`, `docs/guide/quickstart.md`, `docs/guide/model-setup.md`, and `docs/reference/agents.md`. Include end-to-end example research project walkthrough.

### Task 28: Example research project

Create a complete example: sepsis fluid resuscitation study, with all artifacts from stages 0-5, demonstrating the full pipeline.

### Task 29: npm publish preparation

Finalize `package.json`, verify `bunx omo-sci install` works end-to-end, write CHANGELOG.md, prepare v0.1.0 release.

---

## Risk Mitigation (Built Into Plan)

| Risk | Task Addressing It |
|------|-------------------|
| OpenCode plugin API unknowns | Task 1 uses minimal API surface; Task 20 validates agent registration |
| Model API instability | Task 4 fallback chain; Task 10 circuit breaker |
| Configuration complexity | Task 3 JSONC config; Task 11 guided installer |
| Token cost overruns | Task 10 usage tracker; Task 12 `/sci-usage` |
| Context contamination after compaction | Task 8 `quality:compaction_pre/post` hooks |
