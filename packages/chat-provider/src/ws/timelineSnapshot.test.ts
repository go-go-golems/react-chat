import { describe, expect, it, vi } from 'vitest';
import { createChatStore } from '../store/store';
import type { ToolRuntime } from '../tools/toolRuntime';
import { createTimelineAdapterRegistry } from './timelineAdapterRegistry';
import { coreTimelineAdapters } from './timelineEvents';
import { applySnapshot } from './timelineSnapshot';
import { parseEventOrdinal } from './protocol';

function registryWithCoreAdapters() {
  const registry = createTimelineAdapterRegistry();
  for (const adapter of coreTimelineAdapters) registry.register(adapter);
  return registry;
}

function toolRuntime(): ToolRuntime {
  return {
    cancelActiveFrontendTools: vi.fn(),
    handleFrontendToolUIEvent: vi.fn(),
    reconcileFrontendToolRequests: vi.fn(),
    stateOf: vi.fn(() => null),
    subscribe: vi.fn(() => () => undefined),
    isPendingHumanTool: vi.fn(() => false),
    completeHumanTool: vi.fn(async () => 'not-pending' as const),
  };
}

describe('applySnapshot', () => {
  it('reconciles requested tools and derives streaming run status', () => {
    const store = createChatStore();
    const runtime = toolRuntime();
    applySnapshot({
      type: 'snapshot',
      sessionId: 's-1',
      ordinal: parseEventOrdinal('10'),
      entities: [
        {
          id: 'message-1',
          kind: 'ChatMessage',
          payload: { messageId: 'message-1', role: 'assistant', status: 'finished', streaming: false },
        },
        {
          id: 'tool-1',
          kind: 'ChatFrontendToolCall',
          payload: { toolCallId: 'tool-1', toolName: 'confirm', status: 'requested', input: { ok: true } },
        },
      ],
    }, store.dispatch, 's-1', registryWithCoreAdapters(), runtime);

    expect(store.getState().overlay.runStatus).toBe('streaming');
    expect(runtime.reconcileFrontendToolRequests).toHaveBeenCalledWith([
      expect.objectContaining({ toolCallId: 'tool-1', toolName: 'confirm', status: 'requested' }),
    ], 's-1');
  });

  it('resets stale streaming status from a completed snapshot', () => {
    const store = createChatStore();
    store.dispatch({ type: 'overlay/setRunStatus', payload: 'streaming' });
    applySnapshot({
      type: 'snapshot',
      sessionId: 's-1',
      ordinal: parseEventOrdinal('20'),
      entities: [
        {
          id: 'message-1',
          kind: 'ChatMessage',
          payload: { messageId: 'message-1', role: 'assistant', status: 'finished', streaming: false },
        },
      ],
    }, store.dispatch, 's-1', registryWithCoreAdapters(), toolRuntime());

    expect(store.getState().overlay.runStatus).toBe('finished');
  });

  it('derives terminal status from the latest hydrated message', () => {
    const store = createChatStore();
    applySnapshot({
      type: 'snapshot',
      sessionId: 's-1',
      ordinal: parseEventOrdinal('30'),
      entities: [
        {
          id: 'old-error',
          kind: 'ChatMessage',
          createdOrdinal: '5',
          lastEventOrdinal: '6',
          payload: { messageId: 'old-error', role: 'error', status: 'failed', streaming: false },
        },
        {
          id: 'latest-answer',
          kind: 'ChatMessage',
          createdOrdinal: '20',
          lastEventOrdinal: '25',
          payload: { messageId: 'latest-answer', role: 'assistant', status: 'finished', streaming: false },
        },
      ],
    }, store.dispatch, 's-1', registryWithCoreAdapters(), toolRuntime());

    expect(store.getState().overlay.runStatus).toBe('finished');
  });

  it('treats the latest accepted user message as an active run', () => {
    const store = createChatStore();
    applySnapshot({
      type: 'snapshot',
      sessionId: 's-1',
      ordinal: parseEventOrdinal('40'),
      entities: [
        {
          id: 'old-error',
          kind: 'ChatMessage',
          lastEventOrdinal: '10',
          payload: { messageId: 'old-error', role: 'error', status: 'failed', streaming: false },
        },
        {
          id: 'new-user',
          kind: 'ChatMessage',
          lastEventOrdinal: '35',
          payload: { messageId: 'new-user', role: 'user', status: 'accepted', streaming: false },
        },
      ],
    }, store.dispatch, 's-1', registryWithCoreAdapters(), toolRuntime());

    expect(store.getState().overlay.runStatus).toBe('streaming');
  });
});
