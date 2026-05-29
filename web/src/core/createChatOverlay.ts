import { store, type AppDispatch } from '../store/store';
import { overlaySlice } from '../store/overlaySlice';
import { timelineSlice } from '../store/timelineSlice';
import { wsManager } from '../ws/wsManager';
import { defaultToolRegistry, type ToolRegistry } from '../tools/toolRegistry';
import { cancelActiveFrontendTools, configureToolRuntime } from '../tools/toolRuntime';

export type ChatOverlayConfig = {
  basePrefix?: string;
  apiBase?: string;
};

export type ToolResultSubmission = {
  toolCallId: string;
  toolName: string;
  status: 'success' | 'failed' | 'cancelled' | 'denied';
  result?: Record<string, unknown>;
  error?: string;
};

export type ChatOverlayTools = ToolRegistry & {
  syncManifest: () => Promise<void>;
  submitResult: (result: ToolResultSubmission) => Promise<void>;
};

export type ChatOverlay = {
  send: (prompt: string) => Promise<void>;
  stop: () => Promise<void>;
  open: () => void;
  close: () => void;
  toggle: () => void;
  reset: () => void;
  getStore: () => typeof store;
  tools: ChatOverlayTools;
};

export function createChatOverlay(config: ChatOverlayConfig = {}): ChatOverlay {
  const basePrefix = config.basePrefix ?? '';
  const apiBase = config.apiBase ?? basePrefix;

  async function ensureSession(dispatch: AppDispatch): Promise<string> {
    let sessionId = store.getState().overlay.sessionId;
    if (sessionId) return sessionId;

    const res = await fetch(`${apiBase}/api/chat/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    if (!res.ok) throw new Error(`create session failed: ${res.status}`);
    const data = await res.json() as { sessionId: string };
    sessionId = data.sessionId;
    dispatch(overlaySlice.actions.setSessionId(sessionId));
    return sessionId;
  }

  async function ensureConnection(sessionId: string, dispatch: AppDispatch) {
    await wsManager.connect({
      sessionId,
      basePrefix,
      dispatch,
      onStatus: (s) => {
        dispatch(overlaySlice.actions.setWsStatus(s));
      },
    });
  }

  async function syncToolManifest() {
    const sessionId = store.getState().overlay.sessionId;
    if (!sessionId) return;
    const res = await fetch(
      `${apiBase}/api/chat/sessions/${encodeURIComponent(sessionId)}/tools/manifest`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          revision: defaultToolRegistry.revision(),
          tools: defaultToolRegistry.manifest(),
        }),
      },
    );
    if (!res.ok) {
      throw new Error(`sync tool manifest failed: ${res.status} ${await res.text()}`);
    }
  }

  async function submitToolResult(result: ToolResultSubmission) {
    const sessionId = store.getState().overlay.sessionId;
    if (!sessionId) throw new Error('cannot submit frontend tool result without a session');
    const res = await fetch(
      `${apiBase}/api/chat/sessions/${encodeURIComponent(sessionId)}/tools/results`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result),
      },
    );
    if (!res.ok) {
      throw new Error(`submit frontend tool result failed: ${res.status} ${await res.text()}`);
    }
  }

  const tools: ChatOverlayTools = {
    register: defaultToolRegistry.register.bind(defaultToolRegistry),
    get: defaultToolRegistry.get.bind(defaultToolRegistry),
    manifest: defaultToolRegistry.manifest.bind(defaultToolRegistry),
    revision: defaultToolRegistry.revision.bind(defaultToolRegistry),
    syncManifest: syncToolManifest,
    submitResult: submitToolResult,
  };

  configureToolRuntime({ submitToolResult });

  return {
    async send(prompt: string) {
      const dispatch = store.dispatch as AppDispatch;
      try {
        dispatch(overlaySlice.actions.setError(null));
        const sessionId = await ensureSession(dispatch);
        await ensureConnection(sessionId, dispatch);
        await syncToolManifest();
        const res = await fetch(
          `${apiBase}/api/chat/sessions/${encodeURIComponent(sessionId)}/messages`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt }),
          },
        );
        if (!res.ok) {
          const text = await res.text();
          dispatch(overlaySlice.actions.setError(text));
        }
      } catch (err) {
        dispatch(overlaySlice.actions.setError(err instanceof Error ? err.message : String(err)));
      }
    },

    async stop() {
      const sessionId = store.getState().overlay.sessionId;
      if (!sessionId) return;
      cancelActiveFrontendTools();
      await fetch(
        `${apiBase}/api/chat/sessions/${encodeURIComponent(sessionId)}/stop`,
        { method: 'POST' },
      );
    },

    open() {
      store.dispatch(overlaySlice.actions.setOpen(true));
    },

    close() {
      store.dispatch(overlaySlice.actions.setOpen(false));
    },

    toggle() {
      store.dispatch(overlaySlice.actions.toggleOpen());
    },

    reset() {
      cancelActiveFrontendTools();
      wsManager.disconnect();
      store.dispatch(overlaySlice.actions.reset());
      store.dispatch(timelineSlice.actions.clear());
    },

    getStore: () => store,
    tools,
  };
}
