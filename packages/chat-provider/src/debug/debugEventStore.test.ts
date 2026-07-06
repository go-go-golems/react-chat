import { describe, expect, it, vi } from 'vitest';
import type { ChatDebugEvent } from '../ws/wsManager';
import { createDefaultChatDebugClassifier } from './classifyDebugEvent';
import { createChatDebugEventStore } from './debugEventStore';

describe('createDefaultChatDebugClassifier', () => {
  it('classifies provider debug events into stable devtool families', () => {
    const classifier = createDefaultChatDebugClassifier();
    const parsed: ChatDebugEvent = {
      type: 'parsed-frame',
      sessionId: 'conv-1',
      frameType: 'ui-event',
      name: 'ChatTextPatch',
      ordinal: 7,
      frame: { type: 'ui-event', name: 'ChatTextPatch' },
    };
    const mutation: ChatDebugEvent = {
      type: 'ui-event',
      sessionId: 'conv-1',
      ordinal: 7,
      name: 'ChatWidgetInstanceStarted',
      messageId: 'widget-1',
      mutation: { upsert: { id: 'widget-1' } },
    };

    expect(classifier.classify(parsed)).toEqual({ family: 'llm', eventType: 'ChatTextPatch', eventId: '#7' });
    expect(classifier.classify(mutation)).toEqual({ family: 'timeline', eventType: '→ ChatWidgetInstanceStarted', eventId: 'widget-1' });
    expect(classifier.summarize(parsed)).toBe('ui-event ChatTextPatch #7');
  });

  it('supports family aliases for application-specific frame names', () => {
    const classifier = createDefaultChatDebugClassifier({ familyAliases: { InventoryCardUpdated: 'widget' } });
    expect(classifier.classify({
      type: 'parsed-frame',
      sessionId: 'conv-1',
      frameType: 'ui-event',
      name: 'InventoryCardUpdated',
      ordinal: 12,
      frame: { type: 'ui-event', name: 'InventoryCardUpdated' },
    })).toEqual({ family: 'widget', eventType: 'InventoryCardUpdated', eventId: '#12' });
  });
});

describe('createChatDebugEventStore', () => {
  it('stores bounded per-conversation entries and notifies subscribers', () => {
    let now = 1000;
    const store = createChatDebugEventStore({ maxEntriesPerConversation: 2, now: () => now++ });
    const listener = vi.fn();
    const unsubscribe = store.subscribe('conv-1', listener);

    store.push('conv-1', { type: 'ws-lifecycle', sessionId: 'conv-1', event: 'connecting' });
    store.push('conv-2', { type: 'ws-lifecycle', sessionId: 'conv-2', event: 'connected' });
    store.push('conv-1', { type: 'raw-ws', sessionId: 'conv-1', size: 4, preview: 'test', raw: 'test' });
    store.push('conv-1', { type: 'snapshot', sessionId: 'conv-1', entityCount: 1, droppedCount: 0, entities: [] });

    const snapshot = store.getSnapshot('conv-1');
    expect(snapshot).toHaveLength(2);
    expect(snapshot.map((entry) => entry.eventType)).toEqual(['raw', 'snapshot.applied']);
    expect(snapshot.map((entry) => entry.at)).toEqual([1002, 1003]);
    expect(listener).toHaveBeenCalledTimes(3);

    unsubscribe();
    store.clear('conv-1');
    expect(listener).toHaveBeenCalledTimes(3);
    expect(store.getSnapshot('conv-1')).toEqual([]);
    expect(store.getSnapshot('conv-2')).toHaveLength(1);
  });
});
