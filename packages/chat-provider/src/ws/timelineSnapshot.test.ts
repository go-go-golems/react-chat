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
    isPendingHumanTool: vi.fn(() => false),
    respondToHumanTool: vi.fn(),
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
    ]);
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
});
