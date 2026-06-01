import { describe, expect, it } from 'vitest';
import {
  createTimelineAdapterRegistry,
  defineLiveOnlyAdapter,
  type TimelineAdapter,
} from './timelineAdapterRegistry';

function liveOnlyAdapter(name: string, priority = 0): TimelineAdapter {
  return defineLiveOnlyAdapter({
    name,
    priority,
    hydrationUnsupportedReason: 'test adapter has no durable snapshot representation',
    live: {
      accepts: (frame) => frame.name === 'TestEvent',
      project: () => ({
        upsert: {
          id: name,
          kind: 'test',
          createdAt: 1,
          updatedAt: 1,
          props: { name },
        },
      }),
    },
  });
}

describe('TimelineAdapterRegistry baseline behavior', () => {
  it('rejects duplicate adapter names', () => {
    const registry = createTimelineAdapterRegistry();
    registry.register(liveOnlyAdapter('duplicate'));

    expect(() => registry.register(liveOnlyAdapter('duplicate'))).toThrow(/already registered/);
  });

  it('requires live-only adapters to explain unsupported hydration', () => {
    expect(() =>
      defineLiveOnlyAdapter({
        name: 'bad-live-only',
        hydrationUnsupportedReason: '   ',
        live: {
          accepts: () => true,
          project: () => ({ status: 'streaming' }),
        },
      }),
    ).toThrow(/hydrationUnsupportedReason/);
  });

  it('uses adapter priority and keeps same-priority registration order stable', () => {
    const priorityRegistry = createTimelineAdapterRegistry();
    priorityRegistry.register(liveOnlyAdapter('generic', 0));
    priorityRegistry.register(liveOnlyAdapter('app', -10));

    const priorityProjection = priorityRegistry.projectLive({ name: 'TestEvent', payload: {} }, { sessionId: 's1' });

    expect(priorityProjection?.adapterName).toBe('app');
    expect(priorityProjection?.mutation.upsert?.id).toBe('app');

    const stableRegistry = createTimelineAdapterRegistry();
    stableRegistry.register(liveOnlyAdapter('first', 0));
    stableRegistry.register(liveOnlyAdapter('second', 0));

    const stableProjection = stableRegistry.projectLive({ name: 'TestEvent', payload: {} }, { sessionId: 's1' });

    expect(stableProjection?.adapterName).toBe('first');
  });
});

describe('chat-provider built-in timeline adapters', () => {
  it('projects ChatMessage live events and snapshots to the same render kind', async () => {
    const { messageTimelineAdapter } = await import('./timelineEvents');
    const registry = createTimelineAdapterRegistry();
    registry.register(messageTimelineAdapter);

    const live = registry.projectLive(
      {
        name: 'ChatTextPatch',
        payload: { messageId: 'm1', text: 'hello', role: 'assistant' },
      },
      { sessionId: 's1' },
    );
    const snapshot = registry.projectSnapshot(
      {
        id: 'm1',
        kind: 'ChatMessage',
        payload: { messageId: 'm1', role: 'assistant', content: 'hello' },
      },
      { sessionId: 's1' },
    );

    expect(live?.adapterName).toBe('chat-provider.message');
    expect(snapshot?.adapterName).toBe('chat-provider.message');
    expect(live?.mutation.upsert?.kind).toBe('message');
    expect(snapshot?.mutation.upsert?.kind).toBe('message');
    expect(snapshot?.mutation.upsert?.id).toBe('m1');
  });
});
