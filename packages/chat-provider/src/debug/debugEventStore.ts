import { useCallback, useSyncExternalStore } from 'react';
import type { ChatDebugEvent } from '../ws/wsManager';
import {
  defaultChatDebugClassifier,
  type ChatDebugClassifier,
  type ChatDebugEntry,
} from './classifyDebugEvent';

export interface ChatDebugEventStore {
  push(conversationId: string, event: ChatDebugEvent): void;
  clear(conversationId: string): void;
  getSnapshot(conversationId: string): ChatDebugEntry[];
  subscribe(conversationId: string, listener: () => void): () => void;
}

export interface CreateChatDebugEventStoreOptions {
  maxEntriesPerConversation?: number;
  classifier?: ChatDebugClassifier;
  now?: () => number;
}

type Buffer = {
  entries: ChatDebugEntry[];
  listeners: Set<() => void>;
};

function emit(buffer: Buffer): void {
  for (const listener of buffer.listeners) listener();
}

export function createChatDebugEventStore(options: CreateChatDebugEventStoreOptions = {}): ChatDebugEventStore {
  const maxEntriesPerConversation = Math.max(1, Math.floor(options.maxEntriesPerConversation ?? 1000));
  const classifier = options.classifier ?? defaultChatDebugClassifier;
  const now = options.now ?? Date.now;
  const buffers = new Map<string, Buffer>();
  let seqCounter = 0;

  function getBuffer(conversationId: string): Buffer {
    let buffer = buffers.get(conversationId);
    if (!buffer) {
      buffer = { entries: [], listeners: new Set() };
      buffers.set(conversationId, buffer);
    }
    return buffer;
  }

  return {
    push(conversationId, event) {
      const buffer = getBuffer(conversationId);
      seqCounter += 1;
      const classified = classifier.classify(event);
      const entry: ChatDebugEntry = {
        id: `evt-${seqCounter}`,
        seq: seqCounter,
        at: now(),
        ...classified,
        summary: classifier.summarize(event),
        event,
      };
      const next = buffer.entries.concat(entry);
      buffer.entries = next.length > maxEntriesPerConversation
        ? next.slice(next.length - maxEntriesPerConversation)
        : next;
      emit(buffer);
    },

    clear(conversationId) {
      const buffer = buffers.get(conversationId);
      if (!buffer) return;
      buffer.entries = [];
      emit(buffer);
    },

    getSnapshot(conversationId) {
      return getBuffer(conversationId).entries;
    },

    subscribe(conversationId, listener) {
      const buffer = getBuffer(conversationId);
      buffer.listeners.add(listener);
      return () => {
        buffer.listeners.delete(listener);
      };
    },
  };
}

export function useChatDebugEntries(store: ChatDebugEventStore, conversationId: string): ChatDebugEntry[] {
  const subscribe = useCallback((listener: () => void) => store.subscribe(conversationId, listener), [store, conversationId]);
  const getSnapshot = useCallback(() => store.getSnapshot(conversationId), [store, conversationId]);
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
