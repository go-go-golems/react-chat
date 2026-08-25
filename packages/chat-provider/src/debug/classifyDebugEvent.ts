import type { ChatDebugEvent } from '../ws/wsManager';

export type ChatDebugFamily = 'llm' | 'tool' | 'widget' | 'timeline' | 'ws' | 'other';

export interface ChatDebugEntry {
  /** Monotonic id, stable as a React key. Numeric part is `seq`. */
  id: string;
  /** Monotonic sequence number assigned at ingest time. */
  seq: number;
  /** Ingest timestamp in milliseconds since epoch. */
  at: number;
  /** Filter family used by devtools. */
  family: ChatDebugFamily;
  /** Display event type, usually a frame name or lifecycle marker. */
  eventType: string;
  /** Correlating id when available: ordinal, message id, or empty string. */
  eventId: string;
  /** One-line summary precomputed at ingest time. */
  summary: string;
  /** Original provider debug event. */
  event: ChatDebugEvent;
}

export interface ChatDebugClassifier {
  classify(event: ChatDebugEvent): Pick<ChatDebugEntry, 'family' | 'eventType' | 'eventId'>;
  summarize(event: ChatDebugEvent): string;
}

export interface ChatDebugClassifierOptions {
  familyAliases?: Partial<Record<string, ChatDebugFamily>>;
}

function asNonEmptyString(value: unknown): string {
  return typeof value === 'string' && value.trim() ? value : '';
}

function ordinalId(value: unknown): string {
  if (value === undefined || value === null || value === '') return '';
  return `#${String(value)}`;
}

export function createDefaultChatDebugClassifier(options: ChatDebugClassifierOptions = {}): ChatDebugClassifier {
  const aliases = options.familyAliases ?? {};

  return {
    classify(event) {
      switch (event.type) {
        case 'ws-lifecycle':
          return { family: 'ws', eventType: `ws.${String(event.event)}`, eventId: '' };
        case 'frame-received': {
          const frameType = String(event.frameType ?? 'frame');
          if (frameType === 'snapshot') return { family: 'timeline', eventType: 'snapshot', eventId: ordinalId(event.ordinal) };
          return { family: frameType === 'hello' || frameType === 'subscribed' ? 'ws' : 'other', eventType: frameType, eventId: ordinalId(event.ordinal) };
        }
        case 'snapshot':
          return { family: 'timeline', eventType: 'snapshot.applied', eventId: ordinalId(event.ordinal) };
        case 'ui-event': {
          const name = asNonEmptyString(event.name);
          const id = event.messageId !== undefined && event.messageId !== null && event.messageId !== ''
            ? String(event.messageId)
            : ordinalId(event.ordinal);
          return { family: aliases[name] ?? 'timeline', eventType: `→ ${name || 'mutation'}`, eventId: id };
        }
        default: {
          const toolEvent = event as { type?: unknown; toolCallId?: unknown };
          const eventType = String(toolEvent.type ?? 'event');
          if (eventType.startsWith('tool-')) {
            return { family: 'tool', eventType, eventId: asNonEmptyString(toolEvent.toolCallId) };
          }
          return { family: 'other', eventType, eventId: '' };
        }
      }
    },

    summarize(event) {
      switch (event.type) {
        case 'ws-lifecycle':
          return `ws ${String(event.event)}`;
        case 'frame-received': {
          const ord = event.ordinal !== undefined && event.ordinal !== null ? ` #${String(event.ordinal)}` : '';
          return `${String(event.frameType ?? 'frame')}${ord} ${event.size}B`;
        }
        case 'snapshot':
          return `snapshot entities=${event.entityCount} dropped=${event.droppedCount}`;
        case 'ui-event': {
          const adapter = event.adapterName ? ` via ${event.adapterName}` : '';
          return `ui ${String(event.name ?? '')}${adapter}`;
        }
        case 'heartbeat-pong-sent':
          return 'heartbeat pong sent';
        case 'reconnect-scheduled':
          return `reconnect attempt=${event.attempt} delay=${event.delayMs}ms`;
        case 'resume-requested':
          return `resume since #${event.sinceOrdinal}`;
        case 'buffer-depth':
          return `buffer frames=${event.frames} bytes=${event.bytes}`;
        default: {
          const toolEvent = event as { type?: unknown; toolCallId?: unknown; attempt?: unknown; reason?: unknown };
          const eventType = String(toolEvent.type ?? 'event');
          if (eventType.startsWith('tool-')) {
            const id = asNonEmptyString(toolEvent.toolCallId);
            const attempt = toolEvent.attempt === undefined ? '' : ` attempt=${String(toolEvent.attempt)}`;
            const reason = asNonEmptyString(toolEvent.reason);
            return `${eventType}${id ? ` ${id}` : ''}${attempt}${reason ? ` ${reason}` : ''}`;
          }
          return eventType;
        }
      }
    },
  };
}

export const defaultChatDebugClassifier = createDefaultChatDebugClassifier();
