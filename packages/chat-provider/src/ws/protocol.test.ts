import { describe, expect, it } from 'vitest';
import {
  compareEventOrdinals,
  defaultSessionStreamCodec,
  parseEventOrdinal,
  SessionStreamProtocolError,
} from './protocol';

describe('sessionstream protocol', () => {
  it('preserves uint64 ordinals beyond JavaScript safe integers', () => {
    const ordinal = parseEventOrdinal('18446744073709551615');
    expect(ordinal).toBe('18446744073709551615');
    expect(compareEventOrdinals(ordinal, parseEventOrdinal('9007199254740993'))).toBe(1);
  });

  it('rejects unsafe numeric ordinals', () => {
    expect(() => parseEventOrdinal(9_007_199_254_740_992)).toThrow(SessionStreamProtocolError);
  });

  it('decodes heartbeat frames and echoes the nonce exactly', () => {
    const frame = defaultSessionStreamCodec.decodeServerFrame('{"ping":{"nonce":" opaque nonce "}}');
    expect(frame).toEqual({ type: 'ping', nonce: ' opaque nonce ' });
    expect(defaultSessionStreamCodec.encodePong(frame.type === 'ping' ? frame.nonce : '')).toBe(
      '{"pong":{"nonce":" opaque nonce "}}',
    );
  });

  it('rejects malformed and unknown frames', () => {
    expect(() => defaultSessionStreamCodec.decodeServerFrame('{"ping":{}}')).toThrow('ping.nonce');
    expect(() => defaultSessionStreamCodec.decodeServerFrame('{"mystery":{}}')).toThrow('unknown sessionstream');
  });

  it('decodes snapshot and ui-event ordinals as strings', () => {
    expect(defaultSessionStreamCodec.decodeServerFrame(JSON.stringify({
      snapshot: { sessionId: 's-1', snapshotOrdinal: '9007199254740993', entities: [] },
    }))).toMatchObject({ type: 'snapshot', ordinal: '9007199254740993' });
    expect(defaultSessionStreamCodec.decodeServerFrame(JSON.stringify({
      uiEvent: { sessionId: 's-1', eventOrdinal: '9007199254740994', name: 'ChatRunStarted', payload: {} },
    }))).toMatchObject({ type: 'ui-event', ordinal: '9007199254740994' });
  });
});
