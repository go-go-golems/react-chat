import { describe, expect, it, vi } from 'vitest';
import type { AppDispatch } from '../store/store';
import type { TransportPlatform, WebSocketLike } from './sessionStreamTransport';
import { WsManager } from './wsManager';

class FakeWebSocket implements WebSocketLike {
  readyState = 0;
  onopen: (() => void) | null = null;
  onclose: ((event: { code: number; reason?: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  onmessage: ((event: { data: unknown }) => void) | null = null;
  sent: string[] = [];

  open(): void {
    this.readyState = 1;
    this.onopen?.();
  }

  message(frame: unknown): void {
    this.onmessage?.({ data: JSON.stringify(frame) });
  }

  send(data: string): void {
    this.sent.push(data);
  }

  close(): void {
    this.readyState = 3;
  }
}

describe('WsManager', () => {
  it('recreates a same-session transport after terminal failure', async () => {
    const sockets: FakeWebSocket[] = [];
    const platform: TransportPlatform = {
      createWebSocket: () => {
        const socket = new FakeWebSocket();
        sockets.push(socket);
        return socket;
      },
      setTimeout: () => 1,
      clearTimeout: () => undefined,
      random: () => 0.5,
    };
    const manager = new WsManager({ platform, buildURL: () => 'ws://test' });
    const statuses: string[] = [];
    const args = {
      sessionId: 's-1',
      basePrefix: '',
      dispatch: vi.fn() as unknown as AppDispatch,
      onStatus: (status: string) => statuses.push(status),
    };

    const firstConnection = manager.connect(args);
    sockets[0].open();
    sockets[0].message({ hello: {} });
    sockets[0].message({ snapshot: { sessionId: 's-1', snapshotOrdinal: '10', entities: [] } });
    sockets[0].message({ subscribed: { sessionId: 's-1', sinceSnapshotOrdinal: '0' } });
    await firstConnection;

    sockets[0].message({ unsupported: {} });
    await vi.waitFor(() => expect(statuses).toContain('failed'));

    const secondConnection = manager.connect(args);
    expect(sockets).toHaveLength(2);
    expect(secondConnection).not.toBe(firstConnection);
  });
});
