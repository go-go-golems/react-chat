export type EventOrdinal = string & { readonly __eventOrdinal: unique symbol };

export const ZERO_ORDINAL = '0' as EventOrdinal;

export type SnapshotEntityFrame = {
  kind?: unknown;
  id?: unknown;
  tombstone?: unknown;
  payload?: unknown;
};

type FrameBase = {
  sessionId?: string;
  ordinal?: EventOrdinal;
  name?: string;
  payload?: unknown;
  entities?: SnapshotEntityFrame[];
  error?: string;
  code?: string;
  detail?: string;
};

export type SessionStreamFrame = FrameBase & (
  | { type: 'hello'; connectionId?: string }
  | { type: 'ping'; nonce: string }
  | { type: 'pong'; nonce: string }
  | { type: 'subscribed'; sessionId: string; ordinal: EventOrdinal }
  | { type: 'unsubscribed'; sessionId: string }
  | { type: 'snapshot'; sessionId: string; ordinal: EventOrdinal; entities: SnapshotEntityFrame[] }
  | { type: 'ui-event'; sessionId: string; ordinal: EventOrdinal; name: string; payload: Record<string, unknown> }
  | { type: 'error'; sessionId?: string; error: string; code?: string; detail?: string }
);

/** Projection input accepted by timeline adapters and debug tooling. */
export type CanonicalFrame = FrameBase & { type?: SessionStreamFrame['type'] };

export class SessionStreamProtocolError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'SessionStreamProtocolError';
  }
}

export interface SessionStreamCodec {
  decodeServerFrame(raw: string): SessionStreamFrame;
  encodeSubscribe(args: { sessionId: string; sinceSnapshotOrdinal: EventOrdinal }): string;
  encodePong(nonce: string): string;
}

export function parseEventOrdinal(raw: unknown): EventOrdinal {
  let text = '';
  if (typeof raw === 'bigint') text = raw.toString();
  else if (typeof raw === 'string') text = raw.trim();
  else if (typeof raw === 'number' && Number.isSafeInteger(raw) && raw >= 0) text = String(raw);
  if (!/^(0|[1-9][0-9]*)$/.test(text)) {
    throw new SessionStreamProtocolError(`invalid event ordinal: ${String(raw)}`);
  }
  return text as EventOrdinal;
}

export function compareEventOrdinals(a: EventOrdinal, b: EventOrdinal): number {
  const left = BigInt(a);
  const right = BigInt(b);
  return left < right ? -1 : left > right ? 1 : 0;
}

export function buildWebSocketURL(args: { basePrefix?: string }): string {
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
  return `${proto}://${window.location.host}${args.basePrefix ?? ''}/api/chat/ws`;
}

export function encodeSubscribeFrame(sessionId: string, sinceSnapshotOrdinal: EventOrdinal | string | number = ZERO_ORDINAL): string {
  return defaultSessionStreamCodec.encodeSubscribe({
    sessionId,
    sinceSnapshotOrdinal: parseEventOrdinal(sinceSnapshotOrdinal),
  });
}

export function encodePongFrame(nonce: string): string {
  return defaultSessionStreamCodec.encodePong(nonce);
}

/** @deprecated Ordinals must remain decimal strings. */
export function safeOrdinal(raw: unknown): EventOrdinal | null {
  try {
    return parseEventOrdinal(raw);
  } catch {
    return null;
  }
}

export function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>;
  return {};
}

export function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new SessionStreamProtocolError(`${field} must be a non-empty string`);
  }
  return value;
}

export function unwrapAnyPayload(value: unknown): Record<string, unknown> {
  const payload = asRecord(value);
  const nestedValue = asRecord(payload.value);
  return Object.keys(nestedValue).length > 0 ? nestedValue : payload;
}

export function normalizeServerFrame(value: unknown): SessionStreamFrame {
  const frame = asRecord(value);
  if (frame.hello) {
    const hello = asRecord(frame.hello);
    return { type: 'hello', connectionId: asString(hello.connectionId) || undefined };
  }
  if (frame.snapshot) {
    const snapshot = asRecord(frame.snapshot);
    return {
      type: 'snapshot',
      sessionId: requiredString(snapshot.sessionId, 'snapshot.sessionId'),
      ordinal: parseEventOrdinal(snapshot.snapshotOrdinal),
      entities: Array.isArray(snapshot.entities) ? snapshot.entities.map(asRecord) : [],
    };
  }
  if (frame.subscribed) {
    const subscribed = asRecord(frame.subscribed);
    return {
      type: 'subscribed',
      sessionId: requiredString(subscribed.sessionId, 'subscribed.sessionId'),
      ordinal: parseEventOrdinal(subscribed.sinceSnapshotOrdinal),
    };
  }
  if (frame.unsubscribed) {
    const unsubscribed = asRecord(frame.unsubscribed);
    return { type: 'unsubscribed', sessionId: requiredString(unsubscribed.sessionId, 'unsubscribed.sessionId') };
  }
  if (frame.uiEvent) {
    const uiEvent = asRecord(frame.uiEvent);
    return {
      type: 'ui-event',
      sessionId: requiredString(uiEvent.sessionId, 'uiEvent.sessionId'),
      ordinal: parseEventOrdinal(uiEvent.eventOrdinal),
      name: requiredString(uiEvent.name, 'uiEvent.name'),
      payload: unwrapAnyPayload(uiEvent.payload),
    };
  }
  if (frame.error) {
    const error = asRecord(frame.error);
    return {
      type: 'error',
      sessionId: asString(error.sessionId) || undefined,
      error: requiredString(error.message, 'error.message'),
      code: asString(error.code) || undefined,
      detail: asString(error.detail) || undefined,
    };
  }
  if (frame.ping) {
    const ping = asRecord(frame.ping);
    return { type: 'ping', nonce: requiredString(ping.nonce, 'ping.nonce') };
  }
  if (frame.pong) {
    const pong = asRecord(frame.pong);
    return { type: 'pong', nonce: requiredString(pong.nonce, 'pong.nonce') };
  }
  throw new SessionStreamProtocolError('unknown sessionstream server frame');
}

export const defaultSessionStreamCodec: SessionStreamCodec = {
  decodeServerFrame(raw) {
    try {
      return normalizeServerFrame(JSON.parse(raw));
    } catch (error) {
      if (error instanceof SessionStreamProtocolError) throw error;
      throw new SessionStreamProtocolError('invalid sessionstream JSON', { cause: error });
    }
  },
  encodeSubscribe({ sessionId, sinceSnapshotOrdinal }) {
    return JSON.stringify({ subscribe: { sessionId: requiredString(sessionId, 'subscribe.sessionId'), sinceSnapshotOrdinal } });
  },
  encodePong(nonce) {
    return JSON.stringify({ pong: { nonce: requiredString(nonce, 'pong.nonce') } });
  },
};

export function parseServerFrame(raw: string): SessionStreamFrame {
  return defaultSessionStreamCodec.decodeServerFrame(raw);
}
