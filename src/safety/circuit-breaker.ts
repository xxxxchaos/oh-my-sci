import { loadConfig } from '../config';

interface AgentRunState {
  stepCount: number;
  startedAt: number;
  lastToolCalls: string[];  // last N tool calls for loop detection
}

const agentStates = new Map<string, AgentRunState>();

export function startRun(agentName: string): string {
  const id = `${agentName}-${Date.now()}`;
  agentStates.set(id, { stepCount: 0, startedAt: Date.now(), lastToolCalls: [] });
  return id;
}

export function recordStep(runId: string, toolName: string, toolParams: string): { shouldContinue: boolean; reason?: string } {
  const state = agentStates.get(runId);
  if (!state) return { shouldContinue: false, reason: 'Run not found' };
  state.stepCount++;
  const config = loadConfig();
  if (state.stepCount > config.safety.max_step) return { shouldContinue: false, reason: `超过最大步数限制 (${config.safety.max_step})` };
  const elapsed = (Date.now() - state.startedAt) / 1000 / 60;
  if (elapsed > config.safety.max_time_minutes) return { shouldContinue: false, reason: `超过最大时间限制 (${config.safety.max_time_minutes}分钟)` };
  const callSig = `${toolName}:${toolParams}`;
  state.lastToolCalls.push(callSig);
  if (state.lastToolCalls.length > config.safety.loop_detect_threshold) state.lastToolCalls.shift();
  if (state.lastToolCalls.length >= config.safety.loop_detect_threshold && new Set(state.lastToolCalls).size === 1)
    return { shouldContinue: false, reason: `检测到循环: 相同工具调用重复 ${config.safety.loop_detect_threshold} 次` };
  return { shouldContinue: true };
}

export function endRun(runId: string): void { agentStates.delete(runId); }

export function getLoopInterventionPrompt(): string {
  return `你似乎在重复相同的操作。回顾一下：
1. 你当前的目标是什么？
2. 你已经尝试了什么？结果如何？
3. 是否有不同的方法可以达到目标？
如果无法突破，请将情况汇报给 Dubin。`;
}
