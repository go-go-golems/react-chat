import { describe, expect, it, vi } from 'vitest';
import { parseEventOrdinal } from './protocol';
import {
  SessionStreamTransport,
  type TransportPlatform,
  type WebSocketLike,
} from './sessionStreamTransport';

class FakeWebSocket implements WebSocketLike {
  readyState = 0;
  onopen: (() => void) | null = null;
  onclose: ((event: { code: number; reason?: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  onmessage: ((event: { data: unknown }) => void) | null = null;
  sent: string[] = [];
  closed = false;

  open() {
    this.readyState = 1;
    this.onopen?.();
  }

  message(frame: unknown) {
    this.onmessage?.({ data: JSON.stringify(frame) });
  }

  serverClose(code = 1006, reason = '') {
    this.readyState = 3;
    this.onclose?.({ code, reason });
  }

  send(data: string) {
    if (this.readyState !== 1) throw new Error('socket is not open');
    this.sent.push(data);
  }

  close() {
    this.closed = true;
    this.readyState = 3;
  }
}

function harness() {
  const sockets: FakeWebSocket[] = [];
  const timers = new Map<number, () => void>();
  let timerId = 0;
  const platform: TransportPlatform = {
    createWebSocket: () => {
      const socket = new FakeWebSocket();
      sockets.push(socket);
      return socket;
    },
    setTimeout: (callback) => {
      const id = ++timerId;
      timers.set(id, callback);
      return id;
    },
    clearTimeout: (handle) => timers.delete(handle as number),
    random: () => 0.5,
  };
  return {
    sockets,
    timers,
    platform,
    runNextTimer() {
      const next = timers.entries().next().value as [number, () => void] | undefined;
      if (!next) throw new Error('no pending timer');
      timers.delete(next[0]);
      next[1]();
    },
  };
}

function establish(socket: FakeWebSocket, sessionId = 's-1', ordinal = '10') {
  socket.open();
  socket.message({ hello: { connectionId: 'c-1' } });
  socket.message({ snapshot: { sessionId, snapshotOrdinal: ordinal, entities: [] } });
  socket.message({ subscribed: { sessionId, sinceSnapshotOrdinal: '0' } });
}

describe('SessionStreamTransport', () => {
  it('waits for hydration and answers each ping with the exact nonce', async () => {
    const h = harness();
    const diagnostics = vi.fn();
    const observer = { onSnapshot: vi.fn(), onEvent: vi.fn(), onDiagnostic: diagnostics };
    const transport = new SessionStreamTransport({ platform: h.platform, buildURL: () => 'ws://test' });
    let ready = false;
    const connected = transport.connect({ sessionId: 's-1' }, observer).then(() => { ready = true; });
    const socket = h.sockets[0];
    socket.open();
    socket.message({ hello: { connectionId: 'c-1' } });
    socket.message({ ping: { nonce: ' opaque ' } });
    await vi.waitFor(() => expect(socket.sent).toHaveLength(2));
    expect(ready).toBe(false);
    expect(socket.sent).toEqual([
      '{"subscribe":{"sessionId":"s-1","sinceSnapshotOrdinal":"0"}}',
      '{"pong":{"nonce":" opaque "}}',
    ]);
    socket.message({ snapshot: { sessionId: 's-1', snapshotOrdinal: '10', entities: [] } });
    socket.message({ subscribed: { sessionId: 's-1', sinceSnapshotOrdinal: '0' } });
    await connected;
    expect(transport.status).toBe('ready');
    expect(transport.lastCommittedOrdinal).toBe('10');
    expect(diagnostics).toHaveBeenCalledWith({ type: 'heartbeat-pong-sent' });
  });

  it('buffers pre-snapshot events, drops the snapshot boundary, and preserves same-ordinal batches', async () => {
    const h = harness();
    const delivered: string[] = [];
    const transport = new SessionStreamTransport({ platform: h.platform, buildURL: () => 'ws://test' });
    const connected = transport.connect({ sessionId: 's-1' }, {
      onSnapshot: () => undefined,
      onEvent: (frame) => { delivered.push(`${frame.ordinal}:${frame.name}`); },
    });
    const socket = h.sockets[0];
    socket.open();
    socket.message({ hello: {} });
    socket.message({ uiEvent: { sessionId: 's-1', eventOrdinal: '10', name: 'covered', payload: {} } });
    socket.message({ uiEvent: { sessionId: 's-1', eventOrdinal: '11', name: 'first', payload: {} } });
    socket.message({ uiEvent: { sessionId: 's-1', eventOrdinal: '11', name: 'second', payload: {} } });
    socket.message({ snapshot: { sessionId: 's-1', snapshotOrdinal: '10', entities: [] } });
    socket.message({ subscribed: { sessionId: 's-1', sinceSnapshotOrdinal: '0' } });
    await connected;
    expect(delivered).toEqual(['11:first', '11:second']);
    expect(transport.lastCommittedOrdinal).toBe('11');
  });

  it('reconnects from the committed ordinal and ignores stale socket callbacks', async () => {
    const h = harness();
    const observer = { onSnapshot: vi.fn(), onEvent: vi.fn() };
    const transport = new SessionStreamTransport({
      platform: h.platform,
      buildURL: () => 'ws://test',
      reconnect: { baseDelayMs: 250, maxDelayMs: 250, jitterRatio: 0 },
    });
    const connected = transport.connect({ sessionId: 's-1' }, observer);
    const first = h.sockets[0];
    establish(first);
    await connected;
    first.message({ uiEvent: { sessionId: 's-1', eventOrdinal: '12', name: 'live', payload: {} } });
    await vi.waitFor(() => expect(transport.lastCommittedOrdinal).toBe('12'));
    first.serverClose();
    expect(transport.status).toBe('backoff');
    expect(h.timers.size).toBe(1);
    h.runNextTimer();
    const second = h.sockets[1];
    second.open();
    second.message({ hello: {} });
    await vi.waitFor(() => expect(second.sent).toHaveLength(1));
    expect(second.sent).toContain('{"subscribe":{"sessionId":"s-1","sinceSnapshotOrdinal":"12"}}');
    first.onmessage?.({ data: JSON.stringify({ ping: { nonce: 'stale' } }) });
    await Promise.resolve();
    expect(first.sent).not.toContain('{"pong":{"nonce":"stale"}}');
  });

  it('does not reconnect after intentional disconnect', async () => {
    const h = harness();
    const transport = new SessionStreamTransport({ platform: h.platform, buildURL: () => 'ws://test' });
    const connected = transport.connect({ sessionId: 's-1' }, { onSnapshot: vi.fn(), onEvent: vi.fn() });
    establish(h.sockets[0]);
    await connected;
    transport.disconnect();
    h.sockets[0].onclose?.({ code: 1000, reason: 'client close' });
    expect(transport.status).toBe('stopped');
    expect(h.timers.size).toBe(0);
  });

  it('fails explicitly when hydration buffering exceeds its limit', async () => {
    const h = harness();
    const onError = vi.fn();
    const transport = new SessionStreamTransport({
      platform: h.platform,
      buildURL: () => 'ws://test',
      maxBufferedFrames: 1,
    });
    const connected = transport.connect({ sessionId: 's-1' }, { onSnapshot: vi.fn(), onEvent: vi.fn(), onError });
    const socket = h.sockets[0];
    socket.open();
    socket.message({ hello: {} });
    socket.message({ uiEvent: { sessionId: 's-1', eventOrdinal: '1', name: 'one', payload: {} } });
    socket.message({ uiEvent: { sessionId: 's-1', eventOrdinal: '2', name: 'two', payload: {} } });
    await expect(connected).rejects.toThrow('buffer overflow');
    expect(transport.status).toBe('failed');
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ kind: 'buffer-overflow', retryable: false }));
  });

  it('does not commit an event whose observer rejects it', async () => {
    const h = harness();
    const transport = new SessionStreamTransport({ platform: h.platform, buildURL: () => 'ws://test' });
    const connected = transport.connect({ sessionId: 's-1', sinceOrdinal: parseEventOrdinal('3') }, {
      onSnapshot: vi.fn(),
      onEvent: () => { throw new Error('projection failed'); },
    });
    establish(h.sockets[0], 's-1', '10');
    await connected;
    h.sockets[0].message({ uiEvent: { sessionId: 's-1', eventOrdinal: '11', name: 'bad', payload: {} } });
    await vi.waitFor(() => expect(transport.status).toBe('failed'));
    expect(transport.status).toBe('failed');
    expect(transport.lastCommittedOrdinal).toBe('10');
  });
});
