import {
  buildWebSocketURL,
  compareEventOrdinals,
  defaultSessionStreamCodec,
  type EventOrdinal,
  type SessionStreamCodec,
  type SessionStreamFrame,
  SessionStreamProtocolError,
  ZERO_ORDINAL,
} from './protocol';

export type TransportStatus =
  | 'idle'
  | 'connecting'
  | 'socket-open'
  | 'subscribing'
  | 'hydrating'
  | 'ready'
  | 'backoff'
  | 'stopped'
  | 'failed';

export type TransportErrorKind = 'network' | 'protocol' | 'consumer' | 'buffer-overflow' | 'aborted';

export type TransportError = {
  kind: TransportErrorKind;
  message: string;
  cause?: unknown;
  retryable: boolean;
};

export type SafeTransportDiagnostic =
  | { type: 'state-changed'; from: TransportStatus; to: TransportStatus }
  | { type: 'socket-closed'; code: number; reason?: string }
  | { type: 'reconnect-scheduled'; attempt: number; delayMs: number }
  | { type: 'frame-received'; frameType: SessionStreamFrame['type']; ordinal?: EventOrdinal; size: number }
  | { type: 'heartbeat-pong-sent' }
  | { type: 'resume-requested'; sinceOrdinal: EventOrdinal }
  | { type: 'buffer-depth'; frames: number; bytes: number };

export type SnapshotFrame = Extract<SessionStreamFrame, { type: 'snapshot' }>;
export type UIEventFrame = Extract<SessionStreamFrame, { type: 'ui-event' }>;

export interface TransportObserver {
  onSnapshot(frame: SnapshotFrame): void | Promise<void>;
  onEvent(frame: UIEventFrame): void | Promise<void>;
  onStatus?(status: TransportStatus): void;
  onError?(error: TransportError): void;
  onDiagnostic?(event: SafeTransportDiagnostic): void;
}

export interface WebSocketLike {
  readonly readyState: number;
  onopen: (() => void) | null;
  onclose: ((event: { code: number; reason?: string }) => void) | null;
  onerror: (() => void) | null;
  onmessage: ((event: { data: unknown }) => void) | null;
  send(data: string): void;
  close(): void;
}

export type TransportPlatform = {
  createWebSocket(url: string): WebSocketLike;
  setTimeout(callback: () => void, milliseconds: number): unknown;
  clearTimeout(handle: unknown): void;
  random(): number;
};

export type ReconnectPolicy = {
  baseDelayMs: number;
  maxDelayMs: number;
  maxAttempts: number;
  jitterRatio: number;
};

export type SessionStreamTransportConfig = {
  basePrefix?: string;
  buildURL?: (args: { sessionId: string; basePrefix: string }) => string;
  codec?: SessionStreamCodec;
  platform?: TransportPlatform;
  reconnect?: Partial<ReconnectPolicy>;
  maxBufferedFrames?: number;
  maxBufferedBytes?: number;
};

export type ConnectRequest = {
  sessionId: string;
  sinceOrdinal?: EventOrdinal;
  signal?: AbortSignal;
};

const DEFAULT_RECONNECT: ReconnectPolicy = {
  baseDelayMs: 250,
  maxDelayMs: 10_000,
  maxAttempts: 8,
  jitterRatio: 0.2,
};

function browserPlatform(): TransportPlatform {
  return {
    createWebSocket: (url) => new WebSocket(url) as unknown as WebSocketLike,
    setTimeout: (callback, milliseconds) => window.setTimeout(callback, milliseconds),
    clearTimeout: (handle) => window.clearTimeout(handle as number),
    random: Math.random,
  };
}

function asErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function deferred(): { promise: Promise<void>; resolve: () => void; reject: (error: unknown) => void } {
  let resolve!: () => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

export class SessionStreamTransport {
  private readonly config: SessionStreamTransportConfig;
  private readonly codec: SessionStreamCodec;
  private readonly platform: TransportPlatform;
  private readonly reconnectPolicy: ReconnectPolicy;
  private readonly maxBufferedFrames: number;
  private readonly maxBufferedBytes: number;
  private socket: WebSocketLike | null = null;
  private generation = 0;
  private reconnectTimer: unknown = null;
  private reconnectAttempts = 0;
  private intentionalStop = false;
  private disposed = false;
  private request: ConnectRequest | null = null;
  private observer: TransportObserver | null = null;
  private readyDeferred: ReturnType<typeof deferred> | null = null;
  private snapshotOrdinal: EventOrdinal | null = null;
  private bufferedEvents: Array<{ frame: UIEventFrame; bytes: number; order: number }> = [];
  private bufferedBytes = 0;
  private nextBufferOrder = 0;
  private abortCleanup: (() => void) | null = null;
  private currentStatus: TransportStatus = 'idle';
  private committedOrdinal: EventOrdinal = ZERO_ORDINAL;

  constructor(config: SessionStreamTransportConfig = {}) {
    this.config = config;
    this.codec = config.codec ?? defaultSessionStreamCodec;
    this.platform = config.platform ?? browserPlatform();
    this.reconnectPolicy = { ...DEFAULT_RECONNECT, ...config.reconnect };
    this.maxBufferedFrames = Math.max(1, config.maxBufferedFrames ?? 1_000);
    this.maxBufferedBytes = Math.max(1, config.maxBufferedBytes ?? 4 * 1024 * 1024);
  }

  get status(): TransportStatus {
    return this.currentStatus;
  }

  get lastCommittedOrdinal(): EventOrdinal {
    return this.committedOrdinal;
  }

  get isConnected(): boolean {
    return this.currentStatus === 'ready';
  }

  connect(request: ConnectRequest, observer: TransportObserver): Promise<void> {
    if (this.disposed) return Promise.reject(new Error('sessionstream transport is disposed'));
    const sessionId = request.sessionId.trim();
    if (!sessionId) return Promise.reject(new Error('sessionId is required'));
    if (request.signal?.aborted) return Promise.reject(new DOMException('connection aborted', 'AbortError'));

    if (this.request?.sessionId === sessionId && this.observer === observer && this.readyDeferred) {
      return this.readyDeferred.promise;
    }

    this.readyDeferred?.reject(new DOMException('connection replaced', 'AbortError'));
    this.stopCurrent(false);
    this.intentionalStop = false;
    this.request = { ...request, sessionId };
    this.observer = observer;
    this.committedOrdinal = request.sinceOrdinal ?? ZERO_ORDINAL;
    this.readyDeferred = deferred();
    if (request.signal) {
      const abort = () => this.fail({ kind: 'aborted', message: 'connection aborted', retryable: false });
      request.signal.addEventListener('abort', abort, { once: true });
      this.abortCleanup = () => request.signal?.removeEventListener('abort', abort);
    }
    this.openSocket();
    return this.readyDeferred.promise;
  }

  disconnect(reason = 'intentional disconnect'): void {
    this.intentionalStop = true;
    this.transition('stopped');
    this.stopCurrent(true);
    this.readyDeferred?.reject(new DOMException(reason, 'AbortError'));
    this.readyDeferred = null;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disconnect('transport disposed');
    this.disposed = true;
    this.observer = null;
    this.request = null;
  }

  private openSocket(): void {
    const request = this.request;
    if (!request || this.intentionalStop || this.disposed) return;
    this.clearReconnectTimer();
    this.generation += 1;
    const generation = this.generation;
    this.snapshotOrdinal = null;
    this.clearBuffer();
    this.transition('connecting');

    const basePrefix = this.config.basePrefix ?? '';
    const url = this.config.buildURL?.({ sessionId: request.sessionId, basePrefix })
      ?? buildWebSocketURL({ basePrefix });
    let socket: WebSocketLike;
    try {
      socket = this.platform.createWebSocket(url);
    } catch (cause) {
      this.handleRetryableFailure({ kind: 'network', message: asErrorMessage(cause), cause, retryable: true }, generation);
      return;
    }
    this.socket = socket;
    let consumerQueue = Promise.resolve();

    socket.onopen = () => {
      if (!this.isCurrent(generation, socket)) return;
      this.transition('socket-open');
    };
    socket.onerror = () => {
      if (!this.isCurrent(generation, socket)) return;
      this.observer?.onError?.({ kind: 'network', message: 'websocket error', retryable: true });
    };
    socket.onclose = (event) => {
      if (!this.isCurrent(generation, socket)) return;
      this.socket = null;
      this.observer?.onDiagnostic?.({ type: 'socket-closed', code: event.code, reason: event.reason || undefined });
      if (this.intentionalStop) return;
      this.handleRetryableFailure({
        kind: 'network',
        message: `websocket closed${event.code ? ` (${event.code})` : ''}${event.reason ? `: ${event.reason}` : ''}`,
        retryable: true,
      }, generation);
    };
    socket.onmessage = (event) => {
      if (!this.isCurrent(generation, socket)) return;
      const raw = String(event.data);
      let frame: SessionStreamFrame;
      try {
        frame = this.codec.decodeServerFrame(raw);
        this.observer?.onDiagnostic?.({
          type: 'frame-received',
          frameType: frame.type,
          ordinal: frame.ordinal,
          size: raw.length,
        });
        if (this.processControlFrame(frame, generation, socket)) return;
      } catch (cause) {
        this.handleProcessingFailure(cause, generation);
        return;
      }
      consumerQueue = consumerQueue
        .then(() => this.processConsumerFrame(frame, raw.length, generation, socket))
        .catch((cause) => this.handleProcessingFailure(cause, generation));
    };
  }

  private processControlFrame(frame: SessionStreamFrame, generation: number, socket: WebSocketLike): boolean {
    if (!this.isCurrent(generation, socket)) return false;
    switch (frame.type) {
      case 'hello':
        this.transition('subscribing');
        this.send(this.codec.encodeSubscribe({
          sessionId: this.request!.sessionId,
          sinceSnapshotOrdinal: this.committedOrdinal,
        }));
        this.observer?.onDiagnostic?.({ type: 'resume-requested', sinceOrdinal: this.committedOrdinal });
        return true;
      case 'ping':
        this.send(this.codec.encodePong(frame.nonce));
        this.observer?.onDiagnostic?.({ type: 'heartbeat-pong-sent' });
        return true;
      case 'pong':
      case 'unsubscribed':
        return true;
      default:
        return false;
    }
  }

  private async processConsumerFrame(
    frame: SessionStreamFrame,
    rawLength: number,
    generation: number,
    socket: WebSocketLike,
  ): Promise<void> {
    if (!this.isCurrent(generation, socket)) return;
    switch (frame.type) {
      case 'error':
        throw new SessionStreamProtocolError(`${frame.code ? `${frame.code}: ` : ''}${frame.error}`);
      case 'snapshot':
        this.transition('hydrating');
        await this.observer?.onSnapshot(frame);
        if (!this.isCurrent(generation, socket)) return;
        this.committedOrdinal = frame.ordinal;
        this.snapshotOrdinal = frame.ordinal;
        await this.flushBufferedEvents(generation, socket);
        return;
      case 'ui-event':
        if (this.snapshotOrdinal === null) {
          this.bufferEvent(frame, rawLength);
          return;
        }
        if (compareEventOrdinals(frame.ordinal, this.snapshotOrdinal) <= 0) return;
        await this.deliverEvent(frame, generation, socket);
        return;
      case 'subscribed':
        if (this.snapshotOrdinal === null) {
          throw new SessionStreamProtocolError('subscribed received before snapshot');
        }
        this.reconnectAttempts = 0;
        this.transition('ready');
        this.readyDeferred?.resolve();
        return;
      case 'hello':
      case 'ping':
      case 'pong':
      case 'unsubscribed':
        return;
    }
  }

  private bufferEvent(frame: UIEventFrame, bytes: number): void {
    if (this.bufferedEvents.length + 1 > this.maxBufferedFrames || this.bufferedBytes + bytes > this.maxBufferedBytes) {
      throw Object.assign(new Error('sessionstream hydration buffer overflow'), { transportKind: 'buffer-overflow' });
    }
    this.bufferedEvents.push({ frame, bytes, order: this.nextBufferOrder++ });
    this.bufferedBytes += bytes;
    this.observer?.onDiagnostic?.({ type: 'buffer-depth', frames: this.bufferedEvents.length, bytes: this.bufferedBytes });
  }

  private async flushBufferedEvents(generation: number, socket: WebSocketLike): Promise<void> {
    const snapshotOrdinal = this.snapshotOrdinal;
    if (snapshotOrdinal === null) return;
    const buffered = this.bufferedEvents
      .filter(({ frame }) => compareEventOrdinals(frame.ordinal, snapshotOrdinal) > 0)
      .sort((left, right) => compareEventOrdinals(left.frame.ordinal, right.frame.ordinal) || left.order - right.order);
    this.clearBuffer();
    for (const { frame } of buffered) {
      await this.deliverEvent(frame, generation, socket);
      if (!this.isCurrent(generation, socket)) return;
    }
  }

  private async deliverEvent(frame: UIEventFrame, generation: number, socket: WebSocketLike): Promise<void> {
    await this.observer?.onEvent(frame);
    if (!this.isCurrent(generation, socket)) return;
    if (compareEventOrdinals(frame.ordinal, this.committedOrdinal) > 0) this.committedOrdinal = frame.ordinal;
  }

  private send(data: string): void {
    const socket = this.socket;
    if (!socket) throw new Error('websocket is not available');
    socket.send(data);
  }

  private handleProcessingFailure(cause: unknown, generation: number): void {
    if (generation !== this.generation) return;
    const kind: TransportErrorKind = cause instanceof SessionStreamProtocolError
      ? 'protocol'
      : (cause as { transportKind?: TransportErrorKind })?.transportKind ?? 'consumer';
    this.fail({ kind, message: asErrorMessage(cause), cause, retryable: false });
  }

  private handleRetryableFailure(error: TransportError, generation: number): void {
    if (generation !== this.generation || this.intentionalStop || this.disposed) return;
    this.observer?.onError?.(error);
    if (this.reconnectAttempts >= this.reconnectPolicy.maxAttempts) {
      this.fail({ ...error, message: `${error.message}; reconnect attempts exhausted`, retryable: false });
      return;
    }
    const attempt = this.reconnectAttempts++;
    const rawDelay = Math.min(this.reconnectPolicy.maxDelayMs, this.reconnectPolicy.baseDelayMs * 2 ** attempt);
    const jitter = 1 - this.reconnectPolicy.jitterRatio + this.platform.random() * this.reconnectPolicy.jitterRatio * 2;
    const delayMs = Math.max(0, Math.round(rawDelay * jitter));
    this.transition('backoff');
    this.observer?.onDiagnostic?.({ type: 'reconnect-scheduled', attempt: attempt + 1, delayMs });
    this.reconnectTimer = this.platform.setTimeout(() => {
      this.reconnectTimer = null;
      this.openSocket();
    }, delayMs);
  }

  private fail(error: TransportError): void {
    const observer = this.observer;
    this.intentionalStop = true;
    this.transition(error.kind === 'aborted' ? 'stopped' : 'failed');
    this.stopCurrent(true);
    observer?.onError?.(error);
    this.readyDeferred?.reject(error.cause ?? new Error(error.message));
    this.readyDeferred = null;
  }

  private stopCurrent(clearRequest: boolean): void {
    this.generation += 1;
    this.clearReconnectTimer();
    this.abortCleanup?.();
    this.abortCleanup = null;
    const socket = this.socket;
    this.socket = null;
    try { socket?.close(); } catch { /* best effort */ }
    this.snapshotOrdinal = null;
    this.clearBuffer();
    if (clearRequest) {
      this.request = null;
      this.observer = null;
    }
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer === null) return;
    this.platform.clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
  }

  private clearBuffer(): void {
    this.bufferedEvents = [];
    this.bufferedBytes = 0;
    this.nextBufferOrder = 0;
  }

  private isCurrent(generation: number, socket: WebSocketLike): boolean {
    return generation === this.generation && socket === this.socket;
  }

  private transition(next: TransportStatus): void {
    if (this.currentStatus === next) return;
    const previous = this.currentStatus;
    this.currentStatus = next;
    this.observer?.onStatus?.(next);
    this.observer?.onDiagnostic?.({ type: 'state-changed', from: previous, to: next });
  }
}

export function createSessionStreamTransport(config: SessionStreamTransportConfig = {}): SessionStreamTransport {
  return new SessionStreamTransport(config);
}
