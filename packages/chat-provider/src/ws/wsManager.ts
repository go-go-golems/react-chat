import { type AppDispatch } from '../store/store';
import type { ToolRuntime } from '../tools/toolRuntime';
import type { TimelineAdapterRegistry } from './timelineAdapterRegistry';
import { applyUIEvent } from './timelineEvents';
import { applySnapshot } from './timelineSnapshot';
import {
  createSessionStreamTransport,
  type SafeTransportDiagnostic,
  type SessionStreamTransport,
  type SessionStreamTransportConfig,
  type TransportStatus,
} from './sessionStreamTransport';

export type ChatDebugEvent =
  | { type: 'ws-lifecycle'; sessionId: string; event: TransportStatus; from?: TransportStatus }
  | { type: 'frame-received'; sessionId: string; frameType: string; ordinal?: string; size: number }
  | { type: 'heartbeat-pong-sent'; sessionId: string }
  | { type: 'reconnect-scheduled'; sessionId: string; attempt: number; delayMs: number }
  | { type: 'resume-requested'; sessionId: string; sinceOrdinal: string }
  | { type: 'buffer-depth'; sessionId: string; frames: number; bytes: number }
  | { type: 'snapshot'; sessionId: string; ordinal?: string; entityCount: number; droppedCount: number; entities: Array<Record<string, unknown>> }
  | { type: 'ui-event'; sessionId: string; ordinal?: string; name: string; messageId?: string; toolCallId?: string; toolName?: string; status?: string; adapterName?: string };

export type ChatDebugHandler = (event: ChatDebugEvent) => void;

export type ConnectArgs = {
  sessionId: string;
  basePrefix: string;
  dispatch: AppDispatch;
  onStatus?: (status: TransportStatus) => void;
  toolRuntime?: ToolRuntime;
  adapterRegistry?: TimelineAdapterRegistry;
  onDebugEvent?: ChatDebugHandler;
};

function forwardDiagnostic(sessionId: string, handler: ChatDebugHandler | undefined, event: SafeTransportDiagnostic): void {
  if (!handler) return;
  switch (event.type) {
    case 'state-changed':
      handler({ type: 'ws-lifecycle', sessionId, event: event.to, from: event.from });
      return;
    case 'socket-closed':
      return;
    case 'frame-received':
      handler({ type: 'frame-received', sessionId, frameType: event.frameType, ordinal: event.ordinal, size: event.size });
      return;
    case 'heartbeat-pong-sent':
      handler({ type: 'heartbeat-pong-sent', sessionId });
      return;
    case 'reconnect-scheduled':
      handler({ type: 'reconnect-scheduled', sessionId, attempt: event.attempt, delayMs: event.delayMs });
      return;
    case 'resume-requested':
      handler({ type: 'resume-requested', sessionId, sinceOrdinal: event.sinceOrdinal });
      return;
    case 'buffer-depth':
      handler({ type: 'buffer-depth', sessionId, frames: event.frames, bytes: event.bytes });
  }
}

export class WsManager {
  private readonly transportConfig: SessionStreamTransportConfig;
  private transport: SessionStreamTransport | null = null;
  private sessionId = '';
  private connectionPromise: Promise<void> | null = null;
  private lastOnStatus: ((status: TransportStatus) => void) | null = null;

  constructor(transportConfig: SessionStreamTransportConfig = {}) {
    this.transportConfig = transportConfig;
  }

  connect(args: ConnectArgs): Promise<void> {
    if (this.transport && this.sessionId === args.sessionId && this.connectionPromise) return this.connectionPromise;
    this.disconnect();
    this.sessionId = args.sessionId;
    this.lastOnStatus = args.onStatus ?? null;
    this.transport = createSessionStreamTransport({ ...this.transportConfig, basePrefix: args.basePrefix });
    const observer = {
      onSnapshot: async (frame: Parameters<typeof applySnapshot>[0]) => {
        const debugEntities = applySnapshot(frame, args.dispatch, args.sessionId, args.adapterRegistry);
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
            adapterName: entity.adapterName,
            dropped: !entity.mapped,
          })),
        });
      },
      onEvent: async (frame: Parameters<typeof applyUIEvent>[0]) => {
        const projection = applyUIEvent(frame, args.dispatch, args.sessionId, args.toolRuntime, args.adapterRegistry);
        const payload = typeof frame.payload === 'object' && frame.payload ? frame.payload as Record<string, unknown> : {};
        const metadataString = (camel: string, snake?: string): string | undefined => {
          const value = payload[camel] ?? (snake ? payload[snake] : undefined);
          return typeof value === 'string' && value ? value : undefined;
        };
        args.onDebugEvent?.({
          type: 'ui-event',
          sessionId: args.sessionId,
          ordinal: frame.ordinal,
          name: frame.name ?? '',
          messageId: metadataString('messageId', 'message_id'),
          toolCallId: metadataString('toolCallId', 'tool_call_id'),
          toolName: metadataString('toolName', 'tool_name'),
          status: metadataString('status'),
          adapterName: projection?.adapterName,
        });
      },
      onStatus: (status: TransportStatus) => {
        args.onStatus?.(status);
      },
      onError: (error: { message: string }) => {
        console.error('chat websocket transport error', error.message);
      },
      onDiagnostic: (event: SafeTransportDiagnostic) => {
        forwardDiagnostic(args.sessionId, args.onDebugEvent, event);
      },
    };
    this.connectionPromise = this.transport.connect({ sessionId: args.sessionId }, observer);
    return this.connectionPromise;
  }

  disconnect(): void {
    this.lastOnStatus?.('stopped');
    this.transport?.dispose();
    this.transport = null;
    this.connectionPromise = null;
    this.sessionId = '';
    this.lastOnStatus = null;
  }

  get isConnected(): boolean {
    return this.transport?.isConnected ?? false;
  }
}

export function createWsManager(config: SessionStreamTransportConfig = {}): WsManager {
  return new WsManager(config);
}
