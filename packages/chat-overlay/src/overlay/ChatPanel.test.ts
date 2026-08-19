import { describe, expect, it } from 'vitest';
import type { TransportStatus } from '@go-go-golems/chat-provider';
import { getConnectionStatusPresentation } from './ChatPanel';

describe('getConnectionStatusPresentation', () => {
  it('maps every SessionStream lifecycle status', () => {
    const statuses: TransportStatus[] = [
      'idle',
      'connecting',
      'socket-open',
      'subscribing',
      'hydrating',
      'ready',
      'backoff',
      'stopped',
      'failed',
    ];

    for (const status of statuses) {
      expect(getConnectionStatusPresentation(status).label).not.toBe('?');
    }
    expect(getConnectionStatusPresentation('ready')).toEqual({
      label: '●',
      color: 'text-mac-black',
    });
    expect(getConnectionStatusPresentation('failed').label).toBe('✕');
  });
});
