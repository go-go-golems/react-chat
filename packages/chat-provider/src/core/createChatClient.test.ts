import { afterEach, describe, expect, it, vi } from 'vitest';
import { createChatStore } from '../store/store';
import { createToolRegistry } from '../tools/toolRegistry';
import type { ConnectArgs } from '../ws/wsManager';
import { createChatClient, type ChatProviderConfig } from './createChatClient';

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

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
  let activeConnection: ConnectArgs | null = null;
  const wsManager = {
    connect: vi.fn(async (args: ConnectArgs) => {
      if (activeConnection) return;
      activeConnection = args;
      args.onStatus?.('ready');
    }),
    disconnect: vi.fn(() => { activeConnection = null; }),
  };
  let generatedId = 0;
  const baseFetch = config.http?.fetch ?? fetch;
  const identityAwareFetch: typeof fetch = async (input, init) => {
    const response = await baseFetch(input, init);
    if (!String(input).endsWith('/tools/manifest') || !response.ok) return response;
    const responseBody = await response.clone().json().catch(() => ({})) as Record<string, unknown>;
    if (responseBody.executor) return response;
    const requestBody = JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>;
    return new Response(JSON.stringify({
      ...responseBody,
      accepted: responseBody.accepted ?? true,
      revision: responseBody.revision ?? requestBody.revision,
      executor: {
        clientInstanceId: requestBody.clientInstanceId,
        connectionId: requestBody.connectionId,
        assignmentId: `assignment-${String(requestBody.connectionId)}`,
      },
    }), { status: response.status, headers: { 'Content-Type': 'application/json' } });
  };
  const effectiveConfig: ChatProviderConfig = {
    ...config,
    http: { ...config.http, fetch: identityAwareFetch },
    executorIdentity: config.executorIdentity ?? {
      clientInstanceId: 'client-test',
      createId: () => `connection-${++generatedId}`,
    },
  };
  const toolRegistry = createToolRegistry();
  const toolRuntime = {
    cancelActiveFrontendTools: vi.fn(async (): Promise<void> => undefined),
    setExecutorIdentity: vi.fn(),
    executorIdentity: vi.fn(() => null),
    handleFrontendToolUIEvent: vi.fn(),
    reconcileFrontendToolRequests: vi.fn(),
    stateOf: vi.fn(() => null),
    subscribe: vi.fn(() => () => undefined),
    isPendingHumanTool: vi.fn(() => false),
    completeHumanTool: vi.fn(async () => 'not-pending' as const),
  };
  const client = createChatClient({
    config: effectiveConfig,
    store,
    toolRegistry,
    toolRuntime,
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
  return { client, store, wsManager, toolRuntime, toolRegistry };
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

describe('tool manifest synchronization', () => {
  it('serializes snapshots, preserves revision order, and skips an acknowledged digest', async () => {
    const firstResponse = deferred<Response>();
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => {
      if (fetchImpl.mock.calls.length === 1) return firstResponse.promise;
      return new Response(JSON.stringify({ accepted: true, revision: 2 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });
    const { client, store, toolRegistry } = clientWith({ http: { fetch: fetchImpl as typeof fetch } });
    store.dispatch({ type: 'overlay/setSessionId', payload: 'session-1' });
    toolRegistry.register({ name: 'alpha', execute: () => ({}) }, { owner: 'test' });

    const first = client.connect();
    await vi.waitFor(() => expect(fetchImpl).toHaveBeenCalledTimes(1));
    toolRegistry.register({ name: 'beta', execute: () => ({}) }, { owner: 'test' });
    const second = client.tools.syncManifest();
    await Promise.resolve();
    expect(fetchImpl).toHaveBeenCalledTimes(1);

    firstResponse.resolve(new Response(JSON.stringify({ accepted: true, revision: 1 }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));
    await expect(first).resolves.toBeUndefined();
    await expect(second).resolves.toBeUndefined();
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    const revisions = fetchImpl.mock.calls.map(([, init]) => JSON.parse(String(init?.body)).revision);
    expect(revisions).toEqual([1, 2]);

    await expect(client.tools.syncManifest()).resolves.toBeUndefined();
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('persists one client identity per sessionStorage while rotating connections', async () => {
    const storage = memoryStorage();
    const firstIds = ['client-stable', 'connection-first'];
    const secondIds = ['connection-second'];
    const firstFetch = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response('{}', { status: 200 }));
    const secondFetch = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response('{}', { status: 200 }));
    const first = clientWith({
      http: { fetch: firstFetch as typeof fetch },
      executorIdentity: { storage, createId: () => firstIds.shift() ?? 'unexpected-first' },
    });
    const second = clientWith({
      http: { fetch: secondFetch as typeof fetch },
      executorIdentity: { storage, createId: () => secondIds.shift() ?? 'unexpected-second' },
    });
    first.store.dispatch({ type: 'overlay/setSessionId', payload: 'session-1' });
    second.store.dispatch({ type: 'overlay/setSessionId', payload: 'session-1' });

    await first.client.connect();
    await second.client.connect();

    const firstBody = JSON.parse(String(firstFetch.mock.calls[0]?.[1]?.body));
    const secondBody = JSON.parse(String(secondFetch.mock.calls[0]?.[1]?.body));
    expect(firstBody.clientInstanceId).toBe('client-stable');
    expect(secondBody.clientInstanceId).toBe('client-stable');
    expect(firstBody.connectionId).toBe('connection-first');
    expect(secondBody.connectionId).toBe('connection-second');
  });

  it('posts client and connection identity and installs the acknowledged assignment', async () => {
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response('{}', { status: 200 }));
    const { client, store, toolRegistry, toolRuntime } = clientWith({ http: { fetch: fetchImpl as typeof fetch } });
    store.dispatch({ type: 'overlay/setSessionId', payload: 'session-1' });
    toolRegistry.register({ name: 'alpha', execute: () => ({}) }, { owner: 'test' });

    await client.connect();

    const body = JSON.parse(String(fetchImpl.mock.calls[0]?.[1]?.body));
    expect(body).toMatchObject({ clientInstanceId: 'client-test', connectionId: 'connection-1', revision: 1 });
    expect(toolRuntime.setExecutorIdentity).toHaveBeenCalledWith(null);
    expect(toolRuntime.setExecutorIdentity).toHaveBeenCalledWith({
      clientInstanceId: 'client-test',
      connectionId: 'connection-1',
      assignmentId: 'assignment-connection-1',
    });
  });

  it('rejects an acknowledgement for another connection', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({
      accepted: true,
      revision: 1,
      executor: { clientInstanceId: 'client-test', connectionId: 'wrong', assignmentId: 'assignment-wrong' },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    const { client, store } = clientWith({ http: { fetch: fetchImpl as typeof fetch } });
    store.dispatch({ type: 'overlay/setSessionId', payload: 'session-1' });

    await expect(client.connect()).rejects.toThrow('invalid executor assignment');
  });

  it('reconciles hydrated requested calls after assignment acknowledgement', async () => {
    const fetchImpl = vi.fn(async () => new Response('{}', { status: 200 }));
    const { client, store, toolRuntime } = clientWith({ http: { fetch: fetchImpl as typeof fetch } });
    store.dispatch({ type: 'overlay/setSessionId', payload: 'session-1' });
    store.dispatch({
      type: 'timeline/upsertEntity',
      payload: {
        id: 'call-1',
        kind: 'tool_call',
        createdAt: 1,
        props: {
          toolCallId: 'call-1',
          toolName: 'lookup',
          status: 'requested',
          input: {},
          executor: { clientInstanceId: 'client-test', connectionId: 'connection-1', assignmentId: 'assignment-connection-1' },
        },
      },
    });

    await client.connect();

    expect(toolRuntime.reconcileFrontendToolRequests).toHaveBeenCalledWith([
      expect.objectContaining({ toolCallId: 'call-1', status: 'requested' }),
    ], 'session-1');
  });

  it('republishes an acknowledged manifest after a connection becomes ready again', async () => {
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response(JSON.stringify({ accepted: true, revision: 1 }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));
    const { client, store, toolRegistry, wsManager } = clientWith({ http: { fetch: fetchImpl as typeof fetch } });
    store.dispatch({ type: 'overlay/setSessionId', payload: 'session-1' });
    toolRegistry.register({ name: 'alpha', execute: () => ({}) }, { owner: 'test' });

    await client.connect();
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const connection = wsManager.connect.mock.calls[0]?.[0];
    connection?.onStatus?.('backoff');
    connection?.onStatus?.('ready');

    await vi.waitFor(() => expect(fetchImpl).toHaveBeenCalledTimes(2));
    expect(fetchImpl.mock.calls.every(([url]) => String(url).endsWith('/sessions/session-1/tools/manifest'))).toBe(true);
    const connectionIds = fetchImpl.mock.calls.map(([, init]) => JSON.parse(String(init?.body)).connectionId);
    expect(connectionIds).toEqual(['connection-1', 'connection-2']);
    await client.tools.syncManifest();
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('waits for reconnect readiness before a send synchronizes its manifest', async () => {
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response('{}', { status: 200 }));
    const { client, store, wsManager } = clientWith({ http: { fetch: fetchImpl as typeof fetch } });
    store.dispatch({ type: 'overlay/setSessionId', payload: 'session-1' });

    await client.connect();
    const connection = wsManager.connect.mock.calls[0]?.[0];
    connection?.onStatus?.('backoff');
    const send = client.send({ prompt: 'during reconnect' });
    await Promise.resolve();
    expect(fetchImpl).toHaveBeenCalledTimes(1);

    connection?.onStatus?.('ready');
    await expect(send).resolves.toBeUndefined();
    expect(fetchImpl.mock.calls.map(([url]) => String(url))).toEqual([
      expect.stringContaining('/tools/manifest'),
      expect.stringContaining('/tools/manifest'),
      expect.stringContaining('/messages'),
    ]);
  });

  it('allows a pre-connect manifest sync to wait for the first ready transition', async () => {
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response('{}', { status: 200 }));
    const { client, store } = clientWith({ http: { fetch: fetchImpl as typeof fetch } });
    store.dispatch({ type: 'overlay/setSessionId', payload: 'session-1' });

    const sync = client.tools.syncManifest();
    await Promise.resolve();
    expect(fetchImpl).not.toHaveBeenCalled();

    await client.connect();
    await expect(sync).resolves.toBeUndefined();
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('rejects a send waiting for readiness when reconnect reaches a terminal state', async () => {
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response('{}', { status: 200 }));
    const { client, store, wsManager } = clientWith({ http: { fetch: fetchImpl as typeof fetch } });
    store.dispatch({ type: 'overlay/setSessionId', payload: 'session-1' });

    await client.connect();
    const connection = wsManager.connect.mock.calls[0]?.[0];
    connection?.onStatus?.('backoff');
    const send = client.send({ prompt: 'must not survive failure' });
    const failure = expect(send).rejects.toThrow('connection failed before executor readiness');
    await vi.waitFor(() => expect(wsManager.connect).toHaveBeenCalledTimes(2));
    connection?.onStatus?.('failed');

    await failure;
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('invalidates readiness waiters on reset', async () => {
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response('{}', { status: 200 }));
    const { client, store, wsManager } = clientWith({ http: { fetch: fetchImpl as typeof fetch } });
    store.dispatch({ type: 'overlay/setSessionId', payload: 'session-1' });

    await client.connect();
    const connection = wsManager.connect.mock.calls[0]?.[0];
    connection?.onStatus?.('backoff');
    const send = client.send({ prompt: 'must not cross reset' });
    const failure = expect(send).rejects.toThrow('connection invalidated before manifest synchronization');
    client.reset();

    await failure;
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('aborts an in-flight stale manifest when the transport enters backoff', async () => {
    const firstStarted = deferred<void>();
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (fetchImpl.mock.calls.length > 1) return new Response('{}', { status: 200 });
      firstStarted.resolve();
      return await new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')), { once: true });
      });
    });
    const { client, store, wsManager } = clientWith({ http: { fetch: fetchImpl as typeof fetch } });
    store.dispatch({ type: 'overlay/setSessionId', payload: 'session-1' });

    const initialConnect = client.connect();
    const initialFailure = expect(initialConnect).rejects.toThrow('aborted');
    await firstStarted.promise;
    const connection = wsManager.connect.mock.calls[0]?.[0];
    connection?.onStatus?.('backoff');
    await initialFailure;

    connection?.onStatus?.('ready');
    await vi.waitFor(() => expect(fetchImpl).toHaveBeenCalledTimes(2));
    expect(fetchImpl.mock.calls[0]?.[1]?.signal?.aborted).toBe(true);
    expect(JSON.parse(String(fetchImpl.mock.calls[1]?.[1]?.body)).connectionId).toBe('connection-2');
  });

  it('continues the sync queue after a failed snapshot without acknowledging it', async () => {
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => {
      if (fetchImpl.mock.calls.length === 1) return new Response('offline', { status: 503 });
      return new Response(JSON.stringify({ accepted: true, revision: 2 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });
    const { client, store, toolRegistry } = clientWith({ http: { fetch: fetchImpl as typeof fetch } });
    store.dispatch({ type: 'overlay/setSessionId', payload: 'session-1' });
    toolRegistry.register({ name: 'alpha', execute: () => ({}) }, { owner: 'test' });
    const first = client.connect();
    const firstFailure = expect(first).rejects.toThrow('sync-tool-manifest failed: 503 offline');
    await vi.waitFor(() => expect(fetchImpl).toHaveBeenCalledTimes(1));
    toolRegistry.register({ name: 'beta', execute: () => ({}) }, { owner: 'test' });
    const second = client.tools.syncManifest();

    await firstFailure;
    await expect(second).resolves.toBeUndefined();
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(store.getState().overlay.error).toContain('sync-tool-manifest failed: 503 offline');
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

  it('submits a retained tool result to its originating session', async () => {
    const fetchImpl = vi.fn(async () => new Response('{}', { status: 200 }));
    const { client, store } = clientWith({ http: { fetch: fetchImpl as typeof fetch } });
    store.dispatch({ type: 'overlay/setSessionId', payload: 'new-session' });

    await client.tools.submitResult({
      sessionId: 'origin-session',
      toolCallId: 'call-1',
      toolName: 'mutate_ui',
      status: 'success',
      result: { changed: true },
      executor: { clientInstanceId: 'client-a', connectionId: 'connection-a', assignmentId: 'assignment-a' },
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      '/api/chat/sessions/origin-session/tools/results',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          toolCallId: 'call-1',
          toolName: 'mutate_ui',
          status: 'success',
          result: { changed: true },
          executor: { clientInstanceId: 'client-a', connectionId: 'connection-a', assignmentId: 'assignment-a' },
        }),
      }),
    );
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

  it('uses the binary MIME fallback for an untyped upload', async () => {
    const localStorage = memoryStorage({ 'chat-provider.sessionId': 'session-1' });
    vi.stubGlobal('window', { location: { href: 'https://example.test/' }, localStorage });
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ attachment_id: 'att-unknown' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));
    const { client } = clientWith({ http: { fetch: fetchImpl as typeof fetch } });
    const file = new File(['binary'], 'payload.unknown-extension');

    await expect(client.attachments.upload(file)).resolves.toMatchObject({
      attachmentId: 'att-unknown',
      kind: 'file',
      mediaType: 'application/octet-stream',
    });
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

  it('awaits frontend-tool cancellation before posting stop', async () => {
    const localStorage = memoryStorage({ 'chat-provider.sessionId': 'session-1' });
    vi.stubGlobal('window', { location: { href: 'https://example.test/' }, localStorage });
    const fetchImpl = vi.fn(async () => new Response('{}', { status: 200 }));
    const { client, store, toolRuntime } = clientWith({ http: { fetch: fetchImpl as typeof fetch } });
    store.dispatch({ type: 'overlay/setSessionId', payload: 'session-1' });
    let finishCancellation!: () => void;
    toolRuntime.cancelActiveFrontendTools.mockImplementation(() => new Promise<void>((resolve) => {
      finishCancellation = resolve;
    }));

    const stopping = client.stop();
    await Promise.resolve();
    expect(fetchImpl).not.toHaveBeenCalled();

    finishCancellation();
    await stopping;
    expect(fetchImpl).toHaveBeenCalledWith(
      '/api/chat/sessions/session-1/stop',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('updates Redux and rejects when stopping a run fails', async () => {
    const localStorage = memoryStorage({ 'chat-provider.sessionId': 'session-1' });
    vi.stubGlobal('window', { location: { href: 'https://example.test/' }, localStorage });
    const fetchImpl = vi.fn(async () => new Response('cannot stop', { status: 503 }));
    const { client, store } = clientWith({ http: { fetch: fetchImpl as typeof fetch } });
    store.dispatch({ type: 'overlay/setSessionId', payload: 'session-1' });

    await expect(client.stop()).rejects.toThrow('stop-run failed: 503 cannot stop');
    expect(store.getState().overlay.error).toBe('stop-run failed: 503 cannot stop');
  });
});
