import { overlaySlice } from '../store/overlaySlice';
import { runStatsSlice } from '../store/runStatsSlice';
import type { AppDispatch, ChatStore } from '../store/store';
import { timelineSlice } from '../store/timelineSlice';
import type { ToolRegistry } from '../tools/toolRegistry';
import type { ToolRuntime } from '../tools/toolRuntime';
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
};

export type ToolResultSubmission = {
  toolCallId: string;
  toolName: string;
  status: 'success' | 'failed' | 'cancelled' | 'denied';
  result?: Record<string, unknown>;
  error?: string;
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

export function createChatClient(args: CreateChatClientArgs): ChatClient {
  const config = args.config ?? {};
  const basePrefix = config.basePrefix ?? '';
  const apiBase = config.apiBase ?? basePrefix;
  const dispatch = args.store.dispatch as AppDispatch;
  const fetchImpl = config.http?.fetch ?? fetch;

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
      onStatus: (s) => dispatch(overlaySlice.actions.setWsStatus(s)),
      onDebugEvent: config.onDebugEvent,
    });
  }

  async function syncToolManifest() {
    const sessionId = args.store.getState().overlay.sessionId;
    if (!sessionId) return;
    await request('sync-tool-manifest', `${apiBase}/api/chat/sessions/${encodeURIComponent(sessionId)}/tools/manifest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ revision: args.toolRegistry.revision(), tools: args.toolRegistry.manifest() }),
    });
  }

  async function submitToolResult(result: ToolResultSubmission) {
    const sessionId = args.store.getState().overlay.sessionId;
    if (!sessionId) throw new Error('cannot submit frontend tool result without a session');
    await request('submit-tool-result', `${apiBase}/api/chat/sessions/${encodeURIComponent(sessionId)}/tools/results`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result),
    });
  }

  const tools: ChatClientTools = {
    register: args.toolRegistry.register.bind(args.toolRegistry),
    get: args.toolRegistry.get.bind(args.toolRegistry),
    manifest: args.toolRegistry.manifest.bind(args.toolRegistry),
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
      const mediaType = String(data.mediaType ?? data.media_type ?? file.type ?? 'application/octet-stream');
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
        const sessionId = await ensureSession();
        await ensureConnection(sessionId);
        await syncToolManifest();
      } catch (err) {
        dispatch(overlaySlice.actions.setError(err instanceof Error ? err.message : String(err)));
        throw err;
      }
    },

    async send(message: SendMessageRequest) {
      try {
        dispatch(overlaySlice.actions.setError(null));
        const sessionId = await ensureSession();
        await ensureConnection(sessionId);
        await syncToolManifest();
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
        args.toolRuntime.cancelActiveFrontendTools();
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
      args.toolRuntime.cancelActiveFrontendTools();
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
