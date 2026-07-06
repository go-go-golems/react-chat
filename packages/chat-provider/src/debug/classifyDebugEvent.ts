import type { ChatDebugEvent } from '../ws/wsManager';

export type ChatDebugFamily = 'llm' | 'tool' | 'widget' | 'timeline' | 'ws' | 'raw' | 'other';

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

function familyForUIEventName(name: string, aliases: Partial<Record<string, ChatDebugFamily>>): ChatDebugFamily {
  if (aliases[name]) return aliases[name];
  if (name.startsWith('ChatWidgetInstance')) return 'widget';
  if (name.startsWith('ChatToolCall') || name.startsWith('FrontendTool') || name.includes('Tool')) return 'tool';
  if (
    name.startsWith('ChatRun') ||
    name.startsWith('ChatText') ||
    name.startsWith('ChatReasoning') ||
    name.startsWith('ChatThinking') ||
    name.startsWith('ChatProviderCall') ||
    name.startsWith('ChatUserMessage')
  ) return 'llm';
  if (name.startsWith('Timeline') || name.includes('Timeline')) return 'timeline';
  return 'other';
}

export function createDefaultChatDebugClassifier(options: ChatDebugClassifierOptions = {}): ChatDebugClassifier {
  const aliases = options.familyAliases ?? {};

  return {
    classify(event) {
      switch (event.type) {
        case 'ws-lifecycle':
          return { family: 'ws', eventType: `ws.${String(event.event)}`, eventId: '' };
        case 'raw-ws':
          return { family: 'raw', eventType: 'raw', eventId: '' };
        case 'parsed-frame': {
          const frameType = String(event.frameType ?? 'frame');
          const name = asNonEmptyString(event.name);
          if (frameType === 'ui-event' && name) {
            return {
              family: familyForUIEventName(name, aliases),
              eventType: name,
              eventId: ordinalId(event.ordinal),
            };
          }
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
          return { family: 'timeline', eventType: `→ ${name || 'mutation'}`, eventId: id };
        }
        default:
          return { family: 'other', eventType: String((event as { type?: unknown }).type ?? 'event'), eventId: '' };
      }
    },

    summarize(event) {
      switch (event.type) {
        case 'ws-lifecycle':
          return `ws ${String(event.event)}`;
        case 'raw-ws':
          return `raw ${event.size}B ${event.preview.slice(0, 100)}`;
        case 'parsed-frame': {
          const name = event.name ? ` ${String(event.name)}` : '';
          const ord = event.ordinal !== undefined && event.ordinal !== null ? ` #${String(event.ordinal)}` : '';
          return `${String(event.frameType ?? 'frame')}${name}${ord}`;
        }
        case 'snapshot':
          return `snapshot entities=${event.entityCount} dropped=${event.droppedCount}`;
        case 'ui-event': {
          const adapter = event.adapterName ? ` via ${event.adapterName}` : '';
          return `ui ${String(event.name ?? '')}${adapter}`;
        }
        default:
          return String((event as { type?: unknown }).type ?? 'event');
      }
    },
  };
}

export const defaultChatDebugClassifier = createDefaultChatDebugClassifier();
