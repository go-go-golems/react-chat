import { type AppDispatch } from '../store/store';
import {
  asString,
  buildWebSocketURL,
  type CanonicalFrame,
  encodeSubscribeFrame,
  parseServerFrame,
  safeOrdinal,
} from './protocol';
import { applyUIEvent } from './timelineEvents';
import type { ToolRuntime } from '../tools/toolRuntime';
import { applySnapshot } from './timelineSnapshot';

type ConnectArgs = {
  sessionId: string;
  basePrefix: string;
  dispatch: AppDispatch;
  onStatus?: (s: string) => void;
  toolRuntime?: ToolRuntime;
};

export class WsManager {
  private ws: WebSocket | null = null;
  private sessionId = '';
  private connectNonce = 0;
  private hydrated = false;
  private buffered: CanonicalFrame[] = [];
  private lastOnStatus: ((s: string) => void) | null = null;

  async connect(args: ConnectArgs) {
    if (this.ws && this.sessionId === args.sessionId) {
      return;
    }
    this.disconnect();

    this.connectNonce++;
    const nonce = this.connectNonce;

    this.sessionId = args.sessionId;
    this.hydrated = false;
    this.buffered = [];
    this.lastOnStatus = args.onStatus ?? null;

    args.onStatus?.('connecting...');
    const ws = new WebSocket(buildWebSocketURL({ basePrefix: args.basePrefix }));
    this.ws = ws;

    let settleOpen: (() => void) | null = null;
    const openPromise = new Promise<void>((resolve) => {
      let settled = false;
      settleOpen = () => {
        if (settled) return;
        settled = true;
        resolve();
      };
      setTimeout(() => settleOpen?.(), 1500);
    });

    ws.onopen = () => {
      settleOpen?.();
      if (nonce !== this.connectNonce) return;
      args.onStatus?.('connected');
      try {
        ws.send(encodeSubscribeFrame(args.sessionId));
      } catch (err) {
        console.error('ws subscribe failed', err);
      }
    };
    ws.onclose = () => {
      settleOpen?.();
      if (nonce !== this.connectNonce) return;
      args.onStatus?.('closed');
    };
    ws.onerror = () => {
      settleOpen?.();
      if (nonce !== this.connectNonce) return;
      args.onStatus?.('error');
    };
    ws.onmessage = (m) => {
      if (nonce !== this.connectNonce) return;
      try {
        const frame = parseServerFrame(String(m.data));
        const ord = safeOrdinal(frame.ordinal);
        if (ord !== null) {
          // Could dispatch to a lastSeq slice if needed
        }
        this.handleFrame(frame, args, nonce);
      } catch (err) {
        console.error('ws message parse failed', err);
      }
    };

    await openPromise;
  }

  disconnect() {
    this.connectNonce++;
    this.lastOnStatus?.('disconnected');
    try {
      this.ws?.close();
    } catch { /* ignore */ }
    this.ws = null;
    this.sessionId = '';
    this.hydrated = false;
    this.buffered = [];
  }

  get isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  private handleFrame(frame: CanonicalFrame, args: ConnectArgs, nonce: number) {
    const type = asString(frame.type);
    if (type === 'hello') return;
    if (type === 'error') {
      console.error('ws error frame', frame.error);
      return;
    }
    if (type === 'snapshot') {
      if (nonce !== this.connectNonce) return;
      applySnapshot(frame, args.dispatch, args.sessionId);
      this.hydrated = true;
      args.onStatus?.('hydrated');
      const buffered = this.buffered;
      this.buffered = [];
      for (const next of buffered) {
        applyUIEvent(next, args.dispatch, args.sessionId, args.toolRuntime);
      }
      return;
    }
    if (type === 'subscribed') {
      args.onStatus?.('subscribed');
      return;
    }
    if (type === 'ui-event') {
      if (!this.hydrated) {
        this.buffered.push(frame);
        return;
      }
      applyUIEvent(frame, args.dispatch, args.sessionId, args.toolRuntime);
    }
  }
}

export function createWsManager(): WsManager {
  return new WsManager();
}
