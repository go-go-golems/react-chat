import { store, type AppDispatch } from '../store/store';
import { overlaySlice } from '../store/overlaySlice';
import { timelineSlice } from '../store/timelineSlice';
import { wsManager } from '../ws/wsManager';

export type ChatOverlayConfig = {
  basePrefix?: string;
  apiBase?: string;
};

export type ChatOverlay = {
  send: (prompt: string) => Promise<void>;
  stop: () => Promise<void>;
  open: () => void;
  close: () => void;
  toggle: () => void;
  reset: () => void;
  getStore: () => typeof store;
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

  return {
    async send(prompt: string) {
      const dispatch = store.dispatch as AppDispatch;
      try {
        dispatch(overlaySlice.actions.setError(null));
        const sessionId = await ensureSession(dispatch);
        await ensureConnection(sessionId, dispatch);
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
      wsManager.disconnect();
      store.dispatch(overlaySlice.actions.reset());
      store.dispatch(timelineSlice.actions.clear());
    },

    getStore: () => store,
  };
}
