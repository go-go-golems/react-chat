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
import type { TimelineProjectorRegistry } from './projectorRegistry';
import { applySnapshot } from './timelineSnapshot';

export type ChatDebugEvent =
  | { type: 'ws-lifecycle'; sessionId: string; event: string; [key: string]: unknown }
  | { type: 'raw-ws'; sessionId: string; size: number; preview: string; raw: string }
  | { type: 'parsed-frame'; sessionId: string; frameType?: unknown; name?: unknown; ordinal?: unknown; frame: CanonicalFrame }
  | { type: 'snapshot'; sessionId: string; ordinal?: unknown; entityCount: number; droppedCount: number; entities: Array<Record<string, unknown>> }
  | { type: 'ui-event'; sessionId: string; ordinal?: unknown; name?: unknown; messageId?: unknown; mutation: unknown; projectorName?: string };

export type ChatDebugHandler = (event: ChatDebugEvent) => void;

type ConnectArgs = {
  sessionId: string;
  basePrefix: string;
  dispatch: AppDispatch;
  onStatus?: (s: string) => void;
  toolRuntime?: ToolRuntime;
  projectorRegistry?: TimelineProjectorRegistry;
  onDebugEvent?: ChatDebugHandler;
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

    args.onDebugEvent?.({ type: 'ws-lifecycle', sessionId: args.sessionId, event: 'connecting', nonce });
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
      args.onDebugEvent?.({ type: 'ws-lifecycle', sessionId: args.sessionId, event: 'connected', nonce });
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
      args.onDebugEvent?.({ type: 'ws-lifecycle', sessionId: args.sessionId, event: 'closed', nonce });
      args.onStatus?.('closed');
    };
    ws.onerror = () => {
      settleOpen?.();
      if (nonce !== this.connectNonce) return;
      args.onDebugEvent?.({ type: 'ws-lifecycle', sessionId: args.sessionId, event: 'error', nonce });
      args.onStatus?.('error');
    };
    ws.onmessage = (m) => {
      if (nonce !== this.connectNonce) return;
      const raw = String(m.data);
      args.onDebugEvent?.({ type: 'raw-ws', sessionId: args.sessionId, size: raw.length, preview: raw.slice(0, 1000), raw });
      try {
        const frame = parseServerFrame(raw);
        args.onDebugEvent?.({
          type: 'parsed-frame',
          sessionId: args.sessionId,
          frameType: frame.type,
          name: frame.name,
          ordinal: frame.ordinal,
          frame,
        });
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
      const debugEntities = applySnapshot(frame, args.dispatch, args.sessionId);
      args.onDebugEvent?.({
        type: 'snapshot',
        sessionId: args.sessionId,
        ordinal: frame.ordinal,
        entityCount: debugEntities.length,
        droppedCount: debugEntities.filter((entity) => !entity.mapped).length,
        entities: debugEntities.map((entity) => ({
          rawKind: entity.raw.kind,
          rawId: entity.raw.id,
          mappedId: entity.mapped?.id,
          mappedKind: entity.mapped?.kind,
          dropped: !entity.mapped,
        })),
      });
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
      const projection = applyUIEvent(frame, args.dispatch, args.sessionId, args.toolRuntime, args.projectorRegistry);
      args.onDebugEvent?.({
        type: 'ui-event',
        sessionId: args.sessionId,
        ordinal: frame.ordinal,
        name: frame.name,
        messageId: (frame.payload as any)?.messageId,
        mutation: projection?.mutation ?? null,
        projectorName: projection?.projectorName,
      });
    }
  }
}

export function createWsManager(): WsManager {
  return new WsManager();
}
