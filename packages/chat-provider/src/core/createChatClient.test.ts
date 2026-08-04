import { afterEach, describe, expect, it, vi } from 'vitest';
import { createChatStore } from '../store/store';
import { createChatClient, type ChatProviderConfig } from './createChatClient';

function memoryStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => values.set(key, value)),
    removeItem: vi.fn((key: string) => values.delete(key)),
  };
}

function clientWith(config: ChatProviderConfig) {
  const store = createChatStore();
  const wsManager = {
    connect: vi.fn(async () => undefined),
    disconnect: vi.fn(),
  };
  const client = createChatClient({
    config,
    store,
    toolRegistry: {
      register: vi.fn(),
      get: vi.fn(),
      manifest: vi.fn(() => []),
      revision: vi.fn(() => 0),
    },
    toolRuntime: {
      cancelActiveFrontendTools: vi.fn(),
      handleFrontendToolUIEvent: vi.fn(),
      isPendingHumanTool: vi.fn(() => false),
      respondToHumanTool: vi.fn(async () => undefined),
    },
    adapterRegistry: {
      register: vi.fn(),
      projectLive: vi.fn(() => null),
      projectSnapshot: vi.fn(() => null),
      list: vi.fn(() => []),
      revision: vi.fn(() => 0),
      assertHydrationCoverage: vi.fn(() => ({ adapters: [] })),
    },
    wsManager: wsManager as never,
  });
  return { client, store, wsManager };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('chat session persistence', () => {
  it('uses localStorage by default', async () => {
    const localStorage = memoryStorage({ 'chat-provider.sessionId': 'remembered-session' });
    vi.stubGlobal('window', { location: { href: 'https://example.test/' }, localStorage });
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 200 })));
    const { client, store, wsManager } = clientWith({});

    await client.connect();

    expect(store.getState().overlay.sessionId).toBe('remembered-session');
    expect(wsManager.connect).toHaveBeenCalledWith(expect.objectContaining({ sessionId: 'remembered-session' }));
    expect(fetch).not.toHaveBeenCalledWith('/api/chat/sessions', expect.objectContaining({ method: 'POST' }));
  });

  it('creates a fresh session and does not write storage when persistence is disabled', async () => {
    const localStorage = memoryStorage({ 'chat-provider.sessionId': 'stale-session' });
    vi.stubGlobal('window', { location: { href: 'https://example.test/' }, localStorage });
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request) => {
      if (String(input).endsWith('/api/chat/sessions')) {
        return new Response(JSON.stringify({ sessionId: 'fresh-session' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response('{}', { status: 200 });
    }));
    const onSessionIdChange = vi.fn();
    const { client, store } = clientWith({
      persistSession: false,
      sessionIdParam: '',
      onSessionIdChange,
    });

    await client.connect();

    expect(store.getState().overlay.sessionId).toBe('fresh-session');
    expect(localStorage.getItem).not.toHaveBeenCalled();
    expect(localStorage.setItem).not.toHaveBeenCalled();
    expect(onSessionIdChange).toHaveBeenCalledWith('fresh-session');
  });
});
