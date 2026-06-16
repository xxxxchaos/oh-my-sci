/**
 * Dubin 结构化访谈状态机
 *
 * 6 个状态: GREETING → INTENT_CLASSIFICATION → PICO_EXTRACTION
 * → FEASIBILITY_DISCUSSION → CONFIRMATION → COMPLETED
 *
 * 用于阶段 0（意图访谈）的对话驱动，逐步提取 PICO 框架、
 * 确定研究类型、讨论可行性，最后用户确认后进入下一阶段。
 */

// ====================================================================
// Types
// ====================================================================

export type InterviewState =
  | 'GREETING'
  | 'INTENT_CLASSIFICATION'
  | 'PICO_EXTRACTION'
  | 'FEASIBILITY_DISCUSSION'
  | 'CONFIRMATION'
  | 'COMPLETED';

export interface Pico {
  population?: string;
  intervention?: string;
  comparison?: string;
  outcome?: string;
}

export interface InterviewContext {
  state: InterviewState;
  researchType?: string;
  specialty?: string;
  pico: Pico;
  finerNotes: string[];
  evidenceLandscape?: string; // Pubmeder 初搜结果
  userConfirmed: boolean;
}

export interface ProcessResult {
  ctx: InterviewContext;
  nextPrompt: string;
  shouldDelegate?: { agent: string; task: string };
}

// ====================================================================
// Factory
// ====================================================================

export function createInterview(): InterviewContext {
  return {
    state: 'GREETING',
    pico: {},
    finerNotes: [],
    userConfirmed: false,
  };
}

// ====================================================================
// getNextPrompt — 根据当前状态生成提示语
// ====================================================================

export function getNextPrompt(ctx: InterviewContext): string {
  switch (ctx.state) {
    case 'GREETING':
      return '欢迎！我是 Dubin，你的医学科研搭档。说说你最近在临床上碰到什么让你想深入研究的问题？';
    case 'INTENT_CLASSIFICATION':
      return `明白了。我先确认一下——你想要做的研究类型是：
A) 临床原始研究（RCT、队列研究、病例对照等）
B) 系统评价或 Meta 分析
C) 综述或观点文章
D) 还不太确定，想先探索一下领域`;
    case 'PICO_EXTRACTION':
      if (!ctx.pico.population)
        return '我们先聊聊病人群：你关注的是什么患者？比如脓毒症（Sepsis-3标准）？还是脓毒性休克？还是特定的亚组？';
      if (!ctx.pico.intervention)
        return '你想研究的干预或暴露因素是什么？比如限制性液体复苏策略？特定药物？还是某种诊断方法？';
      if (!ctx.pico.comparison)
        return '对照组是什么？比如常规治疗？还是另一种干预方案？';
      if (!ctx.pico.outcome)
        return '主要结局指标是什么？比如28天死亡率？还是RRT依赖率？';
      return `我总结一下：你关注【${ctx.pico.population}】，研究【${ctx.pico.intervention}】vs【${ctx.pico.comparison}】，主要看【${ctx.pico.outcome}】。确认吗？（或者需要调整？）`;
    case 'FEASIBILITY_DISCUSSION':
      return '好的，框架清楚了。接下来咱们聊聊可行性——你手上大概有多少符合条件的数据？数据来源是什么（EHR/数据库/CRF）？';
    case 'CONFIRMATION':
      return `好的。我已经在后台让 Pubmeder 初搜了这个方向的文献。${
        ctx.evidenceLandscape
          ? '\n现有证据景观：' + ctx.evidenceLandscape
          : ''
      }\n\n总结一下：\n- 研究类型: ${ctx.researchType || '待定'}\n- PICO: ${Object.values(ctx.pico).filter(Boolean).join(' / ')}\n\n要进入正式的研究设计阶段吗？`;
    default:
      return '';
  }
}

// ====================================================================
// processUserInput — 主状态转换函数
// ====================================================================

export function processUserInput(
  ctx: InterviewContext,
  userInput: string,
): ProcessResult {
  switch (ctx.state) {
    case 'GREETING': {
      ctx.state = 'INTENT_CLASSIFICATION';
      // Extract specialty hints from free-text input
      if (
        userInput.includes('脓毒症') ||
        userInput.includes('sepsis') ||
        userInput.includes('Sepsis')
      ) {
        ctx.specialty = '重症医学/脓毒症';
      }
      break;
    }

    case 'INTENT_CLASSIFICATION': {
      if (
        userInput.includes('A') ||
        userInput.includes('原始研究') ||
        userInput.includes('RCT') ||
        userInput.includes('队列')
      ) {
        ctx.researchType = '原始研究';
        ctx.state = 'PICO_EXTRACTION';
      } else if (
        userInput.includes('D') ||
        userInput.includes('不确定') ||
        userInput.includes('探索')
      ) {
        ctx.researchType = '探索中';
        ctx.state = 'PICO_EXTRACTION';
        return {
          ctx,
          nextPrompt: getNextPrompt(ctx),
          shouldDelegate: {
            agent: 'pubmeder',
            task: `领域初扫: ${ctx.specialty || ctx.pico.population || userInput}`,
          },
        };
      } else {
        ctx.researchType = userInput;
        ctx.state = 'PICO_EXTRACTION';
      }
      break;
    }

    case 'PICO_EXTRACTION': {
      processPicoInput(ctx, userInput);
      // 明确检查四个 PICO 字段全部非空（避免空对象时 .every() 误判为 true）
      if (
        ctx.pico.population &&
        ctx.pico.intervention &&
        ctx.pico.comparison &&
        ctx.pico.outcome
      ) {
        ctx.state = 'FEASIBILITY_DISCUSSION';
      }
      break;
    }

    case 'FEASIBILITY_DISCUSSION': {
      ctx.finerNotes.push(userInput);
      ctx.state = 'CONFIRMATION';
      break;
    }

    case 'CONFIRMATION': {
      if (
        userInput.includes('是') ||
        userInput.includes('好') ||
        userInput.includes('继续') ||
        userInput.includes('yes') ||
        userInput.includes('Yes')
      ) {
        ctx.userConfirmed = true;
        ctx.state = 'COMPLETED';
      }
      // If user says no, remain in CONFIRMATION — caller can reset pico
      break;
    }

    // COMPLETED: no further transitions
  }

  return { ctx, nextPrompt: getNextPrompt(ctx) };
}

// ====================================================================
// processPicoInput — 逐项填充 PICO
// ====================================================================

function processPicoInput(ctx: InterviewContext, input: string): void {
  if (!ctx.pico.population) {
    ctx.pico.population = input;
  } else if (!ctx.pico.intervention) {
    ctx.pico.intervention = input;
  } else if (!ctx.pico.comparison) {
    ctx.pico.comparison = input;
  } else if (!ctx.pico.outcome) {
    ctx.pico.outcome = input;
  }
}
