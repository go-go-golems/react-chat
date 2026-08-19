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
      reconcileFrontendToolRequests: vi.fn(),
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
      sessionPolicy: { restore: 'never' },
      onSessionIdChange,
    });

    await client.connect();

    expect(store.getState().overlay.sessionId).toBe('fresh-session');
    expect(localStorage.getItem).not.toHaveBeenCalled();
    expect(localStorage.setItem).not.toHaveBeenCalled();
    expect(onSessionIdChange).toHaveBeenCalledWith('fresh-session');
  });

  it('restores a session from an explicitly configured URL policy', async () => {
    const localStorage = memoryStorage({ ignored: 'stored-session' });
    vi.stubGlobal('window', { location: { href: 'https://example.test/?conversation=from-url' }, localStorage });
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 200 })));
    const { client, store } = clientWith({ sessionPolicy: { restore: 'url', parameter: 'conversation' } });

    await client.connect();

    expect(store.getState().overlay.sessionId).toBe('from-url');
    expect(localStorage.getItem).not.toHaveBeenCalled();
  });
});

describe('chat HTTP operations', () => {
  it('runs request hooks, injects headers, and sends attachment references', async () => {
    const localStorage = memoryStorage({ 'chat-provider.sessionId': 'session-1' });
    vi.stubGlobal('window', { location: { href: 'https://example.test/' }, localStorage });
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response('{}', { status: 200 }));
    const beforeRequest = vi.fn();
    const { client } = clientWith({
      http: {
        fetch: fetchImpl as typeof fetch,
        headers: () => ({ Authorization: 'Bearer test-token' }),
        beforeRequest,
      },
    });

    await client.send({
      prompt: 'hello',
      attachments: [{ attachmentId: 'att-1', kind: 'image', mediaType: 'image/png' }],
    });

    expect(beforeRequest.mock.calls.map(([operation]) => operation)).toEqual([
      'sync-tool-manifest',
      'send-message',
    ]);
    const messageCall = fetchImpl.mock.calls.find(([url]) => String(url).endsWith('/messages'));
    expect(messageCall).toBeDefined();
    expect(JSON.parse(String(messageCall?.[1]?.body))).toEqual({
      prompt: 'hello',
      attachments: [{ attachmentId: 'att-1', kind: 'image', mediaType: 'image/png' }],
    });
    expect(new Headers(messageCall?.[1]?.headers).get('Authorization')).toBe('Bearer test-token');
  });

  it('uploads and removes attachments through the active session', async () => {
    const localStorage = memoryStorage({ 'chat-provider.sessionId': 'session-1' });
    vi.stubGlobal('window', { location: { href: 'https://example.test/' }, localStorage });
    const fetchImpl = vi.fn(async (input: string | URL | Request) => {
      if (String(input).endsWith('/attachments')) {
        return new Response(JSON.stringify({ attachment_id: 'att-2', media_type: 'image/png', width: 10, height: 20 }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(null, { status: 204 });
    });
    const { client } = clientWith({ http: { fetch: fetchImpl as typeof fetch } });
    const file = new File(['image'], 'plant.png', { type: 'image/png' });

    await expect(client.attachments.upload(file)).resolves.toMatchObject({
      attachmentId: 'att-2',
      kind: 'image',
      mediaType: 'image/png',
      filename: 'plant.png',
      width: 10,
      height: 20,
    });
    await client.attachments.remove('att-2');

    expect(fetchImpl).toHaveBeenCalledWith(
      '/api/chat/sessions/session-1/attachments/att-2',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('updates Redux and rejects when an operation fails', async () => {
    const localStorage = memoryStorage({ 'chat-provider.sessionId': 'session-1' });
    vi.stubGlobal('window', { location: { href: 'https://example.test/' }, localStorage });
    const fetchImpl = vi.fn(async (input: string | URL | Request) => new Response(
      String(input).endsWith('/messages') ? 'not allowed' : '{}',
      { status: String(input).endsWith('/messages') ? 403 : 200 },
    ));
    const { client, store } = clientWith({ http: { fetch: fetchImpl as typeof fetch } });

    await expect(client.send({ prompt: 'hello' })).rejects.toThrow('send-message failed: 403 not allowed');
    expect(store.getState().overlay.error).toBe('send-message failed: 403 not allowed');
  });
});
