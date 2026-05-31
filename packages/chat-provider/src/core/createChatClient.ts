import type { ChatStore, AppDispatch } from '../store/store';
import { overlaySlice } from '../store/overlaySlice';
import { timelineSlice } from '../store/timelineSlice';
import type { ToolRegistry } from '../tools/toolRegistry';
import type { ToolRuntime } from '../tools/toolRuntime';
import type { WsManager } from '../ws/wsManager';
import { installToolkit, type ChatToolkit } from './toolkit';

export type ChatRequestBody = Record<string, unknown>;

export type ChatProviderConfig = {
  basePrefix?: string;
  apiBase?: string;
  createSessionBody?: () => ChatRequestBody | Promise<ChatRequestBody>;
  sendMessageBody?: (args: { prompt: string }) => ChatRequestBody | Promise<ChatRequestBody>;
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

export type ChatClient = {
  send: (prompt: string) => Promise<void>;
  stop: () => Promise<void>;
  open: () => void;
  close: () => void;
  toggle: () => void;
  reset: () => void;
  getStore: () => ChatStore;
  tools: ChatClientTools;
  use: (toolkit: ChatToolkit) => () => void;
};

export type CreateChatClientArgs = {
  config?: ChatProviderConfig;
  store: ChatStore;
  toolRegistry: ToolRegistry;
  toolRuntime: ToolRuntime;
  wsManager: WsManager;
};

const SESSION_STORAGE_KEY = 'chat-provider.sessionId';

function persistedSessionId(): string {
  if (typeof window === 'undefined') return '';
  try {
    const fromURL = new URL(window.location.href).searchParams.get('chatSessionId') || '';
    if (fromURL.trim()) return fromURL.trim();
    return window.localStorage.getItem(SESSION_STORAGE_KEY)?.trim() || '';
  } catch {
    return '';
  }
}

function persistSessionId(sessionId: string | null) {
  if (typeof window === 'undefined') return;
  try {
    if (sessionId) window.localStorage.setItem(SESSION_STORAGE_KEY, sessionId);
    else window.localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    // Ignore storage failures in embedded contexts/private windows.
  }
}

export function createChatClient(args: CreateChatClientArgs): ChatClient {
  const config = args.config ?? {};
  const basePrefix = config.basePrefix ?? '';
  const apiBase = config.apiBase ?? basePrefix;
  const dispatch = args.store.dispatch as AppDispatch;

  async function ensureSession(): Promise<string> {
    let sessionId = args.store.getState().overlay.sessionId;
    if (sessionId) return sessionId;

    sessionId = persistedSessionId();
    if (sessionId) {
      dispatch(overlaySlice.actions.setSessionId(sessionId));
      return sessionId;
    }

    const createBody = await (config.createSessionBody?.() ?? {});
    const res = await fetch(`${apiBase}/api/chat/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(createBody ?? {}),
    });
    if (!res.ok) throw new Error(`create session failed: ${res.status}`);
    const data = await res.json() as { sessionId: string };
    sessionId = data.sessionId;
    dispatch(overlaySlice.actions.setSessionId(sessionId));
    persistSessionId(sessionId);
    return sessionId;
  }

  async function ensureConnection(sessionId: string) {
    await args.wsManager.connect({
      sessionId,
      basePrefix,
      dispatch,
      toolRuntime: args.toolRuntime,
      onStatus: (s) => dispatch(overlaySlice.actions.setWsStatus(s)),
    });
  }

  async function syncToolManifest() {
    const sessionId = args.store.getState().overlay.sessionId;
    if (!sessionId) return;
    const res = await fetch(`${apiBase}/api/chat/sessions/${encodeURIComponent(sessionId)}/tools/manifest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ revision: args.toolRegistry.revision(), tools: args.toolRegistry.manifest() }),
    });
    if (!res.ok) throw new Error(`sync tool manifest failed: ${res.status} ${await res.text()}`);
  }

  async function submitToolResult(result: ToolResultSubmission) {
    const sessionId = args.store.getState().overlay.sessionId;
    if (!sessionId) throw new Error('cannot submit frontend tool result without a session');
    const res = await fetch(`${apiBase}/api/chat/sessions/${encodeURIComponent(sessionId)}/tools/results`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result),
    });
    if (!res.ok) throw new Error(`submit frontend tool result failed: ${res.status} ${await res.text()}`);
  }

  const tools: ChatClientTools = {
    register: args.toolRegistry.register.bind(args.toolRegistry),
    get: args.toolRegistry.get.bind(args.toolRegistry),
    manifest: args.toolRegistry.manifest.bind(args.toolRegistry),
    revision: args.toolRegistry.revision.bind(args.toolRegistry),
    syncManifest: syncToolManifest,
    submitResult: submitToolResult,
  };

  return {
    async send(prompt: string) {
      try {
        dispatch(overlaySlice.actions.setError(null));
        const sessionId = await ensureSession();
        await ensureConnection(sessionId);
        await syncToolManifest();
        const sendBody = await (config.sendMessageBody?.({ prompt }) ?? { prompt });
        const res = await fetch(`${apiBase}/api/chat/sessions/${encodeURIComponent(sessionId)}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sendBody ?? { prompt }),
        });
        if (!res.ok) dispatch(overlaySlice.actions.setError(await res.text()));
      } catch (err) {
        dispatch(overlaySlice.actions.setError(err instanceof Error ? err.message : String(err)));
      }
    },

    async stop() {
      const sessionId = args.store.getState().overlay.sessionId;
      if (!sessionId) return;
      args.toolRuntime.cancelActiveFrontendTools();
      await fetch(`${apiBase}/api/chat/sessions/${encodeURIComponent(sessionId)}/stop`, { method: 'POST' });
    },

    open() { dispatch(overlaySlice.actions.setOpen(true)); },
    close() { dispatch(overlaySlice.actions.setOpen(false)); },
    toggle() { dispatch(overlaySlice.actions.toggleOpen()); },

    reset() {
      args.toolRuntime.cancelActiveFrontendTools();
      args.wsManager.disconnect();
      persistSessionId(null);
      dispatch(overlaySlice.actions.reset());
      dispatch(timelineSlice.actions.clear());
    },

    getStore: () => args.store,
    tools,
    use(toolkit: ChatToolkit) { return installToolkit(this, toolkit); },
  };
}
