import { describe, expect, it } from 'vitest';
import { createChatStore, selectRunStats } from './store';
import { runStatsSlice } from './runStatsSlice';
import { applyRunStatsEvent, usageFromPayload } from '../ws/runStatsEvents';
import type { CanonicalFrame } from '../ws/protocol';

function uiEvent(name: string, payload: Record<string, unknown> = {}): CanonicalFrame {
  return { type: 'ui-event', name, payload };
}

describe('runStatsSlice', () => {
  it('estimates live output tokens from text patches before usage metadata arrives', () => {
    const store = createChatStore();

    applyRunStatsEvent(uiEvent('ChatRunStarted'), store.dispatch, 1000);
    applyRunStatsEvent(uiEvent('ChatTextPatch', { text: 'abcdefgh' }), store.dispatch, 1001);

    expect(selectRunStats(store.getState())).toMatchObject({
      isStreaming: true,
      streamStartTime: 1000,
      streamOutputTokens: 2,
      completedRuns: 0,
    });
  });

  it('uses provider metadata to override live token estimates and commits finished run usage', () => {
    const store = createChatStore();

    applyRunStatsEvent(uiEvent('ChatRunStarted'), store.dispatch, 2000);
    applyRunStatsEvent(uiEvent('ChatTextPatch', { text: 'abcdefgh' }), store.dispatch, 2001);
    applyRunStatsEvent(uiEvent('ChatProviderCallMetadataUpdated', {
      usage: { inputTokens: 10, outputTokens: 12, cachedTokens: 1 },
    }), store.dispatch, 2002);
    applyRunStatsEvent(uiEvent('ChatProviderCallFinished', {
      usage: { inputTokens: 10, outputTokens: 12, cachedTokens: 1 },
      durationMs: 500,
      stopReason: 'end_turn',
    }), store.dispatch, 2003);
    applyRunStatsEvent(uiEvent('ChatRunFinished'), store.dispatch, 2004);

    const stats = selectRunStats(store.getState());
    expect(stats.isStreaming).toBe(false);
    expect(stats.streamOutputTokens).toBe(0);
    expect(stats.lastRun).toEqual({
      inputTokens: 10,
      outputTokens: 12,
      cachedTokens: 1,
      cacheCreationInputTokens: 0,
      cacheReadInputTokens: 0,
    });
    expect(stats.lastRunDurationMs).toBe(500);
    expect(stats.lastRunStopReason).toBe('end_turn');
    expect(stats.totals.outputTokens).toBe(12);
    expect(stats.completedRuns).toBe(1);
  });

  it('accumulates multiple provider calls into one completed run', () => {
    const store = createChatStore();

    applyRunStatsEvent(uiEvent('ChatRunStarted'), store.dispatch, 3000);
    applyRunStatsEvent(uiEvent('ChatProviderCallFinished', {
      usage: { inputTokens: 4, outputTokens: 6, cacheReadInputTokens: 2 },
      durationMs: 100,
    }), store.dispatch, 3001);
    applyRunStatsEvent(uiEvent('ChatProviderCallFinished', {
      usage: { inputTokens: 5, outputTokens: 7, cacheCreationInputTokens: 3 },
      durationMs: 200,
      stopReason: 'tool_use',
    }), store.dispatch, 3002);
    applyRunStatsEvent(uiEvent('ChatRunStopped'), store.dispatch, 3003);

    const stats = selectRunStats(store.getState());
    expect(stats.lastRun).toEqual({
      inputTokens: 9,
      outputTokens: 13,
      cachedTokens: 0,
      cacheCreationInputTokens: 3,
      cacheReadInputTokens: 2,
    });
    expect(stats.lastRunDurationMs).toBe(300);
    expect(stats.lastRunStopReason).toBe('tool_use');
    expect(stats.totals.inputTokens).toBe(9);
    expect(stats.completedRuns).toBe(1);
  });

  it('does not invent completed usage for runs without provider-call metadata', () => {
    const store = createChatStore();

    applyRunStatsEvent(uiEvent('ChatRunStarted'), store.dispatch, 4000);
    applyRunStatsEvent(uiEvent('ChatTextPatch', { text: 'streamed but no usage' }), store.dispatch, 4001);
    applyRunStatsEvent(uiEvent('ChatRunFailed'), store.dispatch, 4002);

    const stats = selectRunStats(store.getState());
    expect(stats.isStreaming).toBe(false);
    expect(stats.lastRun).toBeNull();
    expect(stats.completedRuns).toBe(0);
    expect(stats.totals.outputTokens).toBe(0);
  });

  it('resets public and scratch stats state', () => {
    const store = createChatStore();

    applyRunStatsEvent(uiEvent('ChatRunStarted'), store.dispatch, 5000);
    applyRunStatsEvent(uiEvent('ChatProviderCallFinished', {
      usage: { inputTokens: 1, outputTokens: 2 },
      durationMs: 10,
    }), store.dispatch, 5001);
    applyRunStatsEvent(uiEvent('ChatRunFinished'), store.dispatch, 5002);
    store.dispatch(runStatsSlice.actions.reset());

    expect(selectRunStats(store.getState())).toMatchObject({
      isStreaming: false,
      streamStartTime: null,
      streamOutputTokens: 0,
      lastRun: null,
      completedRuns: 0,
    });
  });
});

describe('usageFromPayload', () => {
  it('normalizes missing and string usage fields to numbers', () => {
    expect(usageFromPayload({ usage: { inputTokens: '3', outputTokens: 4 } })).toEqual({
      inputTokens: 3,
      outputTokens: 4,
      cachedTokens: 0,
      cacheCreationInputTokens: 0,
      cacheReadInputTokens: 0,
    });
    expect(usageFromPayload({})).toBeNull();
  });
});
