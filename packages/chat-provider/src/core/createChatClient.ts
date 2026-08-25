import { overlaySlice } from '../store/overlaySlice';
import { runStatsSlice } from '../store/runStatsSlice';
import type { AppDispatch, ChatStore } from '../store/store';
import { timelineSlice } from '../store/timelineSlice';
import type { ToolManifestSnapshot, ToolRegistry } from '../tools/toolRegistry';
import type { FrontendToolExecutor, ToolCompletionStatus, ToolRuntime } from '../tools/toolRuntime';
import type { TimelineAdapterRegistry } from '../ws/timelineAdapterRegistry';
import type { ChatDebugHandler, WsManager } from '../ws/wsManager';
import type { SessionStreamTransportConfig } from '../ws/sessionStreamTransport';
import type { ChatExtensionConfig } from './extensions';

export type ChatRequestBody = Record<string, unknown>;

export type SessionPolicy =
  | { restore: 'never' }
  | { restore: 'local-storage'; storageKey?: string }
  | { restore: 'url'; parameter?: string; fallback?: { restore: 'never' } | { restore: 'local-storage'; storageKey?: string } };

export type ChatOperation =
  | 'create-session'
  | 'send-message'
  | 'stop-run'
  | 'sync-tool-manifest'
  | 'submit-tool-result'
  | 'upload-attachment'
  | 'remove-attachment';

export type ChatHttpConfig = {
  fetch?: typeof fetch;
  headers?: () => HeadersInit | Promise<HeadersInit>;
  beforeRequest?: (operation: ChatOperation) => void | Promise<void>;
};

export type ChatAttachmentRef = {
  attachmentId: string;
  kind: 'image' | 'file';
  mediaType: string;
  filename?: string;
  sizeBytes?: number;
  width?: number;
  height?: number;
  url?: string;
};

export type SendMessageRequest = {
  prompt: string;
  attachments?: ChatAttachmentRef[];
};

export type ExecutorIdentityConfig = {
  clientInstanceId?: string;
  storageKey?: string;
  storage?: Pick<Storage, 'getItem' | 'setItem'>;
  createId?: () => string;
};

export type ChatProviderConfig = ChatExtensionConfig & {
  basePrefix?: string;
  apiBase?: string;
  sessionPolicy?: SessionPolicy;
  http?: ChatHttpConfig;
  transport?: SessionStreamTransportConfig;
  onSessionIdChange?: (sessionId: string | null) => void;
  onDebugEvent?: ChatDebugHandler;
  createSessionBody?: () => ChatRequestBody | Promise<ChatRequestBody>;
  sendMessageBody?: (request: SendMessageRequest) => ChatRequestBody | Promise<ChatRequestBody>;
  executorIdentity?: ExecutorIdentityConfig;
};

export type ToolResultSubmission = {
  sessionId?: string;
  toolCallId: string;
  toolName: string;
  status: ToolCompletionStatus;
  result?: Record<string, unknown>;
  error?: string;
  executor: FrontendToolExecutor;
};

type ToolManifestAck = {
  accepted: boolean;
  sessionId: string;
  connectionGeneration: number;
  revision: number;
  digest: string;
  executor: FrontendToolExecutor;
};

export type ChatClientTools = ToolRegistry & {
  syncManifest: () => Promise<void>;
  submitResult: (result: ToolResultSubmission) => Promise<void>;
};

export type ChatClientAttachments = {
  upload: (file: File, signal?: AbortSignal) => Promise<ChatAttachmentRef>;
  remove: (attachmentId: string, signal?: AbortSignal) => Promise<void>;
};

export type ChatClient = {
  connect: () => Promise<void>;
  send: (request: SendMessageRequest) => Promise<void>;
  stop: () => Promise<void>;
  open: () => void;
  close: () => void;
  toggle: () => void;
  reset: () => void;
  getStore: () => ChatStore;
  tools: ChatClientTools;
  attachments: ChatClientAttachments;
};

export type CreateChatClientArgs = {
  config?: ChatProviderConfig;
  store: ChatStore;
  toolRegistry: ToolRegistry;
  toolRuntime: ToolRuntime;
  adapterRegistry: TimelineAdapterRegistry;
  wsManager: WsManager;
};

const DEFAULT_SESSION_STORAGE_KEY = 'chat-provider.sessionId';
const DEFAULT_EXECUTOR_STORAGE_KEY = '@go-go-golems/chat-provider.client-instance-id';
const DEFAULT_SESSION_ID_PARAM = 'chatSessionId';
const DEFAULT_SESSION_POLICY: SessionPolicy = {
  restore: 'url',
  parameter: DEFAULT_SESSION_ID_PARAM,
  fallback: { restore: 'local-storage', storageKey: DEFAULT_SESSION_STORAGE_KEY },
};

function persistedSessionId(config: ChatProviderConfig): string {
  if (typeof window === 'undefined') return '';
  try {
    const policy = config.sessionPolicy ?? DEFAULT_SESSION_POLICY;
    if (policy.restore === 'never') return '';
    if (policy.restore === 'local-storage') {
      return window.localStorage.getItem(policy.storageKey ?? DEFAULT_SESSION_STORAGE_KEY)?.trim() || '';
    }
    const fromURL = new URL(window.location.href).searchParams.get(policy.parameter ?? DEFAULT_SESSION_ID_PARAM)?.trim() || '';
    if (fromURL) return fromURL;
    if (policy.fallback?.restore === 'local-storage') {
      return window.localStorage.getItem(policy.fallback.storageKey ?? DEFAULT_SESSION_STORAGE_KEY)?.trim() || '';
    }
    return '';
  } catch {
    return '';
  }
}

function persistSessionId(config: ChatProviderConfig, sessionId: string | null) {
  if (typeof window === 'undefined') return;
  try {
    const policy = config.sessionPolicy ?? DEFAULT_SESSION_POLICY;
    const storageKey = policy.restore === 'local-storage'
      ? policy.storageKey ?? DEFAULT_SESSION_STORAGE_KEY
      : policy.restore === 'url' && policy.fallback?.restore === 'local-storage'
        ? policy.fallback.storageKey ?? DEFAULT_SESSION_STORAGE_KEY
        : '';
    if (storageKey) {
      if (sessionId) window.localStorage.setItem(storageKey, sessionId);
      else window.localStorage.removeItem(storageKey);
    }
    config.onSessionIdChange?.(sessionId);
  } catch {
    // Ignore storage failures in embedded contexts/private windows.
  }
}

function createOpaqueExecutorId(config: ChatProviderConfig): string {
  const value = (config.executorIdentity?.createId?.() ?? globalThis.crypto?.randomUUID?.() ?? '').trim();
  if (!value) throw new Error('executor identity requires crypto.randomUUID or an injected createId');
  return value;
}

function executorStorage(config: ChatProviderConfig): Pick<Storage, 'getItem' | 'setItem'> | null {
  if (config.executorIdentity?.storage) return config.executorIdentity.storage;
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function loadOrCreateClientInstanceId(config: ChatProviderConfig): string {
  const configured = config.executorIdentity?.clientInstanceId?.trim();
  if (configured) return configured;
  const storage = executorStorage(config);
  const key = config.executorIdentity?.storageKey ?? DEFAULT_EXECUTOR_STORAGE_KEY;
  try {
    const stored = storage?.getItem(key)?.trim();
    if (stored) return stored;
  } catch {
    // A process-local identity still provides strict ownership for this runtime.
  }
  const created = createOpaqueExecutorId(config);
  try {
    storage?.setItem(key, created);
  } catch {
    // Embedded/private contexts may reject storage; keep the process-local id.
  }
  return created;
}

function parseExecutor(value: unknown): FrontendToolExecutor | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const clientInstanceId = String(record.clientInstanceId ?? '').trim();
  const connectionId = String(record.connectionId ?? '').trim();
  const assignmentId = String(record.assignmentId ?? '').trim();
  if (!clientInstanceId || !connectionId || !assignmentId) return null;
  return Object.freeze({ clientInstanceId, connectionId, assignmentId });
}

function sameConnection(executor: FrontendToolExecutor, clientInstanceId: string, connectionId: string): boolean {
  return executor.clientInstanceId === clientInstanceId && executor.connectionId === connectionId;
}

export function createChatClient(args: CreateChatClientArgs): ChatClient {
  const config = args.config ?? {};
  const basePrefix = config.basePrefix ?? '';
  const apiBase = config.apiBase ?? basePrefix;
  const dispatch = args.store.dispatch as AppDispatch;
  const fetchImpl = config.http?.fetch ?? fetch;
  let manifestSyncTail: Promise<void> = Promise.resolve();
  let lastManifestAck: ToolManifestAck | null = null;
  let connectionGeneration = 0;
  let hasReadyConnection = false;
  let clientInstanceId = '';
  let connectionId = '';
  type ReadyWaiter = { resolve: () => void; reject: (error: Error) => void };
  const readyWaiters = new Set<ReadyWaiter>();
  let readinessInvalidation = 0;
  let activeManifestController: AbortController | null = null;

  function markConnectionReady(): void {
    for (const waiter of readyWaiters) waiter.resolve();
    readyWaiters.clear();
  }

  function rejectReadyWaiters(reason: string): void {
    readinessInvalidation += 1;
    const error = new Error(reason);
    for (const waiter of readyWaiters) waiter.reject(error);
    readyWaiters.clear();
  }

  async function waitForReadyConnection(): Promise<void> {
    while (!connectionId) {
      await new Promise<void>((resolve, reject) => {
        const waiter: ReadyWaiter = {
          resolve: () => {
            readyWaiters.delete(waiter);
            resolve();
          },
          reject: (error) => {
            readyWaiters.delete(waiter);
            reject(error);
          },
        };
        readyWaiters.add(waiter);
      });
    }
  }

  async function request(operation: ChatOperation, url: string, init: RequestInit = {}): Promise<Response> {
    await config.http?.beforeRequest?.(operation);
    const configuredHeaders = await config.http?.headers?.();
    const headers = new Headers(configuredHeaders);
    new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    const response = await fetchImpl(url, { ...init, headers });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`${operation} failed: ${response.status}${body ? ` ${body}` : ''}`);
    }
    return response;
  }

  async function ensureSession(): Promise<string> {
    let sessionId = args.store.getState().overlay.sessionId;
    if (sessionId) return sessionId;

    sessionId = persistedSessionId(config);
    if (sessionId) {
      dispatch(overlaySlice.actions.setSessionId(sessionId));
      return sessionId;
    }

    const createBody = await (config.createSessionBody?.() ?? {});
    const res = await request('create-session', `${apiBase}/api/chat/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(createBody ?? {}),
    });
    const data = await res.json() as { sessionId: string };
    sessionId = data.sessionId;
    dispatch(overlaySlice.actions.setSessionId(sessionId));
    persistSessionId(config, sessionId);
    return sessionId;
  }

  async function ensureConnection(sessionId: string) {
    await args.wsManager.connect({
      sessionId,
      basePrefix,
      dispatch,
      toolRuntime: args.toolRuntime,
      adapterRegistry: args.adapterRegistry,
      onStatus: (status) => {
        dispatch(overlaySlice.actions.setWsStatus(status));
        if (status === 'ready') {
          const isReconnect = hasReadyConnection;
          hasReadyConnection = true;
          connectionGeneration += 1;
          clientInstanceId ||= loadOrCreateClientInstanceId(config);
          connectionId = createOpaqueExecutorId(config);
          lastManifestAck = null;
          args.toolRuntime.setExecutorIdentity(null);
          markConnectionReady();
          if (isReconnect) void syncToolManifest().catch(() => undefined);
        } else if (status === 'backoff' || status === 'stopped' || status === 'failed') {
          connectionId = '';
          lastManifestAck = null;
          activeManifestController?.abort();
          activeManifestController = null;
          args.toolRuntime.setExecutorIdentity(null);
          if (status === 'stopped' || status === 'failed') {
            rejectReadyWaiters(`frontend tool connection ${status} before executor readiness`);
          }
        }
      },
      onDebugEvent: config.onDebugEvent,
    });
  }

  async function syncToolManifest(expectedInvalidation = readinessInvalidation): Promise<void> {
    if (expectedInvalidation !== readinessInvalidation) throw new Error('frontend tool connection invalidated before manifest synchronization');
    const sessionId = args.store.getState().overlay.sessionId;
    if (!sessionId) return;
    await waitForReadyConnection();
    if (expectedInvalidation !== readinessInvalidation) throw new Error('frontend tool connection invalidated before manifest synchronization');
    const snapshot = args.toolRegistry.snapshot();
    const generation = connectionGeneration;
    const requestedClientId = clientInstanceId;
    const requestedConnectionId = connectionId;
    const operation = manifestSyncTail.then(() => postManifestSnapshot(
      sessionId,
      snapshot,
      generation,
      requestedClientId,
      requestedConnectionId,
    ));
    manifestSyncTail = operation.then(() => undefined, () => undefined);
    try {
      await operation;
    } catch (error) {
      dispatch(overlaySlice.actions.setError(error instanceof Error ? error.message : String(error)));
      throw error;
    }
  }

  async function postManifestSnapshot(
    sessionId: string,
    snapshot: ToolManifestSnapshot,
    generation: number,
    requestedClientId: string,
    requestedConnectionId: string,
  ): Promise<ToolManifestAck> {
    if (
      !requestedClientId
      || !requestedConnectionId
      || generation !== connectionGeneration
      || requestedConnectionId !== connectionId
    ) throw new Error(`cannot sync stale frontend tool manifest for connection generation ${generation}`);
    if (
      lastManifestAck?.sessionId === sessionId
      && lastManifestAck.connectionGeneration === generation
      && lastManifestAck.digest === snapshot.digest
    ) return lastManifestAck;
    const controller = new AbortController();
    activeManifestController = controller;
    let response: Response;
    try {
      response = await request('sync-tool-manifest', `${apiBase}/api/chat/sessions/${encodeURIComponent(sessionId)}/tools/manifest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientInstanceId: requestedClientId,
          connectionId: requestedConnectionId,
          revision: snapshot.revision,
          tools: snapshot.tools,
        }),
        signal: controller.signal,
      });
    } finally {
      if (activeManifestController === controller) activeManifestController = null;
    }
    const body = await response.json().catch(() => ({})) as { accepted?: boolean; revision?: number; executor?: unknown };
    if (body.accepted !== true || body.revision !== snapshot.revision) {
      throw new Error(`sync-tool-manifest rejected revision ${snapshot.revision}`);
    }
    const executor = parseExecutor(body.executor);
    if (!executor || !sameConnection(executor, requestedClientId, requestedConnectionId)) {
      throw new Error(`sync-tool-manifest returned an invalid executor assignment for revision ${snapshot.revision}`);
    }
    if (generation !== connectionGeneration || requestedConnectionId !== connectionId) {
      throw new Error(`sync-tool-manifest acknowledgement is stale for connection generation ${generation}`);
    }
    const acknowledgement: ToolManifestAck = {
      accepted: true,
      sessionId,
      connectionGeneration: generation,
      revision: body.revision,
      digest: snapshot.digest,
      executor,
    };
    lastManifestAck = acknowledgement;
    args.toolRuntime.setExecutorIdentity(executor);
    reconcileRequestedTools(sessionId);
    return acknowledgement;
  }

  function reconcileRequestedTools(sessionId: string): void {
    const state = args.store.getState().timeline;
    const requests = state.order
      .map((id) => state.byId[id])
      .filter((entity) => entity?.kind === 'tool_call' && String(entity.props.status ?? '').toLowerCase() === 'requested')
      .map((entity) => entity!.props);
    args.toolRuntime.reconcileFrontendToolRequests(requests, sessionId);
  }

  async function submitToolResult(result: ToolResultSubmission) {
    const sessionId = result.sessionId?.trim() || args.store.getState().overlay.sessionId;
    if (!sessionId) throw new Error('cannot submit frontend tool result without a session');
    const { sessionId: _sessionId, ...body } = result;
    await request('submit-tool-result', `${apiBase}/api/chat/sessions/${encodeURIComponent(sessionId)}/tools/results`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  const tools: ChatClientTools = {
    register: args.toolRegistry.register.bind(args.toolRegistry),
    replace: args.toolRegistry.replace.bind(args.toolRegistry),
    get: args.toolRegistry.get.bind(args.toolRegistry),
    owner: args.toolRegistry.owner.bind(args.toolRegistry),
    manifest: args.toolRegistry.manifest.bind(args.toolRegistry),
    snapshot: args.toolRegistry.snapshot.bind(args.toolRegistry),
    revision: args.toolRegistry.revision.bind(args.toolRegistry),
    syncManifest: syncToolManifest,
    submitResult: submitToolResult,
  };

  const attachments: ChatClientAttachments = {
    async upload(file, signal) {
      const sessionId = await ensureSession();
      const body = new FormData();
      body.append('file', file);
      const response = await request(
        'upload-attachment',
        `${apiBase}/api/chat/sessions/${encodeURIComponent(sessionId)}/attachments`,
        { method: 'POST', body, signal },
      );
      const data = await response.json() as Record<string, unknown>;
      const attachmentId = String(data.attachmentId ?? data.attachment_id ?? '').trim();
      if (!attachmentId) throw new Error('upload-attachment response missing attachmentId');
      const responseMediaType = String(data.mediaType ?? data.media_type ?? '').trim();
      const mediaType = responseMediaType || file.type.trim() || 'application/octet-stream';
      return {
        attachmentId,
        kind: mediaType.startsWith('image/') ? 'image' : 'file',
        mediaType,
        filename: String(data.filename ?? file.name ?? '') || undefined,
        sizeBytes: typeof data.sizeBytes === 'number' ? data.sizeBytes : typeof data.size_bytes === 'number' ? data.size_bytes : file.size,
        width: typeof data.width === 'number' ? data.width : undefined,
        height: typeof data.height === 'number' ? data.height : undefined,
        url: typeof data.url === 'string' ? data.url : undefined,
      };
    },
    async remove(attachmentId, signal) {
      const sessionId = await ensureSession();
      await request(
        'remove-attachment',
        `${apiBase}/api/chat/sessions/${encodeURIComponent(sessionId)}/attachments/${encodeURIComponent(attachmentId)}`,
        { method: 'DELETE', signal },
      );
    },
  };

  return {
    async connect() {
      try {
        dispatch(overlaySlice.actions.setError(null));
        const expectedInvalidation = readinessInvalidation;
        const sessionId = await ensureSession();
        await ensureConnection(sessionId);
        await syncToolManifest(expectedInvalidation);
      } catch (err) {
        dispatch(overlaySlice.actions.setError(err instanceof Error ? err.message : String(err)));
        throw err;
      }
    },

    async send(message: SendMessageRequest) {
      try {
        dispatch(overlaySlice.actions.setError(null));
        const expectedInvalidation = readinessInvalidation;
        const sessionId = await ensureSession();
        await ensureConnection(sessionId);
        await syncToolManifest(expectedInvalidation);
        const sendBody = await (config.sendMessageBody?.(message) ?? message);
        await request('send-message', `${apiBase}/api/chat/sessions/${encodeURIComponent(sessionId)}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sendBody ?? message),
        });
      } catch (err) {
        dispatch(overlaySlice.actions.setError(err instanceof Error ? err.message : String(err)));
        throw err;
      }
    },

    async stop() {
      try {
        dispatch(overlaySlice.actions.setError(null));
        const sessionId = args.store.getState().overlay.sessionId;
        if (!sessionId) return;
        await args.toolRuntime.cancelActiveFrontendTools();
        await request('stop-run', `${apiBase}/api/chat/sessions/${encodeURIComponent(sessionId)}/stop`, { method: 'POST' });
      } catch (err) {
        dispatch(overlaySlice.actions.setError(err instanceof Error ? err.message : String(err)));
        throw err;
      }
    },

    open() { dispatch(overlaySlice.actions.setOpen(true)); },
    close() { dispatch(overlaySlice.actions.setOpen(false)); },
    toggle() { dispatch(overlaySlice.actions.toggleOpen()); },

    reset() {
      void args.toolRuntime.cancelActiveFrontendTools();
      args.toolRuntime.setExecutorIdentity(null);
      connectionId = '';
      hasReadyConnection = false;
      lastManifestAck = null;
      rejectReadyWaiters('frontend tool connection reset before executor readiness');
      activeManifestController?.abort();
      activeManifestController = null;
      args.wsManager.disconnect();
      persistSessionId(config, null);
      dispatch(overlaySlice.actions.reset());
      dispatch(timelineSlice.actions.clear());
      dispatch(runStatsSlice.actions.reset());
    },

    getStore: () => args.store,
    tools,
    attachments,
  };
}
