import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface ChatUsageTotals {
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
  cacheCreationInputTokens: number;
  cacheReadInputTokens: number;
}

export interface ChatRunStats {
  isStreaming: boolean;
  streamStartTime: number | null;
  streamOutputTokens: number;
  lastRun: ChatUsageTotals | null;
  lastRunDurationMs: number | null;
  lastRunStopReason: string | null;
  totals: ChatUsageTotals;
  completedRuns: number;
}

export type RunStatsState = ChatRunStats & {
  streamChars: number;
  usageOutputSoFar: number;
  runUsage: ChatUsageTotals;
  runDurationMs: number;
  runStopReason: string | null;
  runHadCalls: boolean;
};

export function emptyUsageTotals(): ChatUsageTotals {
  return {
    inputTokens: 0,
    outputTokens: 0,
    cachedTokens: 0,
    cacheCreationInputTokens: 0,
    cacheReadInputTokens: 0,
  };
}

export function addUsageTotals(a: ChatUsageTotals, b: ChatUsageTotals): ChatUsageTotals {
  return {
    inputTokens: a.inputTokens + b.inputTokens,
    outputTokens: a.outputTokens + b.outputTokens,
    cachedTokens: a.cachedTokens + b.cachedTokens,
    cacheCreationInputTokens: a.cacheCreationInputTokens + b.cacheCreationInputTokens,
    cacheReadInputTokens: a.cacheReadInputTokens + b.cacheReadInputTokens,
  };
}

export function estimateOutputTokens(chars: number): number {
  return Math.max(0, Math.ceil(chars / 4));
}

function createInitialState(): RunStatsState {
  return {
    isStreaming: false,
    streamStartTime: null,
    streamOutputTokens: 0,
    lastRun: null,
    lastRunDurationMs: null,
    lastRunStopReason: null,
    totals: emptyUsageTotals(),
    completedRuns: 0,
    streamChars: 0,
    usageOutputSoFar: 0,
    runUsage: emptyUsageTotals(),
    runDurationMs: 0,
    runStopReason: null,
    runHadCalls: false,
  };
}

export function toChatRunStats(state: RunStatsState): ChatRunStats {
  return {
    isStreaming: state.isStreaming,
    streamStartTime: state.streamStartTime,
    streamOutputTokens: state.streamOutputTokens,
    lastRun: state.lastRun,
    lastRunDurationMs: state.lastRunDurationMs,
    lastRunStopReason: state.lastRunStopReason,
    totals: state.totals,
    completedRuns: state.completedRuns,
  };
}

export const runStatsSlice = createSlice({
  name: 'runStats',
  initialState: createInitialState(),
  reducers: {
    runStarted(state, action: PayloadAction<number>) {
      state.streamChars = 0;
      state.usageOutputSoFar = 0;
      state.runUsage = emptyUsageTotals();
      state.runDurationMs = 0;
      state.runStopReason = null;
      state.runHadCalls = false;
      state.isStreaming = true;
      state.streamStartTime = action.payload;
      state.streamOutputTokens = 0;
    },
    textPatchObserved(state, action: PayloadAction<{ chars: number }>) {
      if (!state.isStreaming) return;
      state.streamChars += Math.max(0, action.payload.chars);
      state.streamOutputTokens = state.usageOutputSoFar > 0
        ? state.usageOutputSoFar
        : estimateOutputTokens(state.streamChars);
    },
    providerCallMetadataUpdated(state, action: PayloadAction<{ usage: ChatUsageTotals | null }>) {
      const { usage } = action.payload;
      if (!usage || usage.outputTokens <= 0) return;
      state.usageOutputSoFar = usage.outputTokens;
      if (state.isStreaming) {
        state.streamOutputTokens = usage.outputTokens;
      }
    },
    providerCallFinished(
      state,
      action: PayloadAction<{ usage: ChatUsageTotals | null; durationMs: number; stopReason: string | null }>,
    ) {
      const { usage, durationMs, stopReason } = action.payload;
      if (usage) {
        state.runUsage = addUsageTotals(state.runUsage, usage);
        state.runHadCalls = true;
        state.usageOutputSoFar = 0;
      }
      state.runDurationMs += Math.max(0, durationMs);
      if (stopReason) {
        state.runStopReason = stopReason;
      }
    },
    runFinished(state) {
      const finishedRun = state.runHadCalls ? state.runUsage : null;
      state.isStreaming = false;
      state.streamStartTime = null;
      state.streamOutputTokens = 0;
      state.streamChars = 0;
      state.usageOutputSoFar = 0;
      if (finishedRun) {
        state.lastRun = finishedRun;
        state.lastRunDurationMs = state.runDurationMs;
        state.lastRunStopReason = state.runStopReason;
        state.totals = addUsageTotals(state.totals, finishedRun);
        state.completedRuns += 1;
      }
      state.runUsage = emptyUsageTotals();
      state.runDurationMs = 0;
      state.runStopReason = null;
      state.runHadCalls = false;
    },
    reset() {
      return createInitialState();
    },
  },
});
