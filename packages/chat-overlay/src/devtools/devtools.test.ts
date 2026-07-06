import { describe, expect, it } from 'vitest';
import type { ChatDebugEntry } from '@go-go-golems/chat-provider';
import { buildVisibleEventsYamlExport, filterVisibleEntries, isNearBottom } from './ChatEventViewer';
import { buildTimelineDebugSnapshot, sanitizeForExport } from './timelineDebugModel';
import { foldTimelineMutationsFromDebugEntries, seedTimelineMirrorFromSnapshot } from './timelineMirrorFolding';
import { toYaml } from './yamlFormat';

describe('devtools YAML and sanitization helpers', () => {
  it('formats readable YAML for nested values', () => {
    expect(toYaml({ hello: 'world', count: 2, items: ['a', 'b:c'] })).toContain('hello: world');
    expect(toYaml({ hello: 'world', count: 2, items: ['a', 'b:c'] })).toContain('- "b:c"');
  });

  it('sanitizes functions, bigints, dates, and cycles', () => {
    const value: Record<string, unknown> = { count: 1n, when: new Date('2026-01-02T03:04:05Z'), fn: function named() {} };
    value.self = value;
    expect(sanitizeForExport(value)).toEqual({
      count: '[BigInt: 1]',
      when: '2026-01-02T03:04:05.000Z',
      fn: '[Function: named]',
      self: '[Circular]',
    });
  });
});

describe('ChatEventViewer helpers', () => {
  const entry = (overrides: Partial<ChatDebugEntry>): ChatDebugEntry => ({
    id: 'evt-1',
    seq: 1,
    at: Date.parse('2026-01-01T00:00:00Z'),
    family: 'llm',
    eventType: 'ChatTextPatch',
    eventId: '#1',
    summary: 'patch',
    event: { type: 'ws-lifecycle', sessionId: 'conv', event: 'connected' },
    ...overrides,
  });

  it('filters by family and noisy text patch event type', () => {
    const entries = [entry({ id: 'a', family: 'llm' }), entry({ id: 'b', family: 'raw', eventType: 'raw' })];
    expect(filterVisibleEntries(entries, { llm: true, raw: false }, { hideTextPatch: true })).toEqual([]);
    expect(filterVisibleEntries(entries, { llm: true, raw: false }, { hideTextPatch: false }).map((e) => e.id)).toEqual(['a']);
  });

  it('computes near-bottom status and YAML exports', () => {
    expect(isNearBottom({ scrollTop: 70, clientHeight: 30, scrollHeight: 105 })).toBe(true);
    const exported = buildVisibleEventsYamlExport('conv/id', [entry({})], Date.parse('2026-01-01T00:00:00Z'));
    expect(exported.fileName).toBe('events-conv-id-2026-01-01T00-00-00-000Z.yaml');
    expect(exported.yaml).toContain('eventCount: 1');
  });
});

describe('timeline debug helpers', () => {
  it('builds snapshots and folds timeline mutations from debug entries', () => {
    const mirror = seedTimelineMirrorFromSnapshot([{ id: 'm1', kind: 'message', createdAt: '2026-01-01T00:00:00Z', props: { content: 'hello' } }]);
    const folded = foldTimelineMutationsFromDebugEntries(mirror, [{
      id: 'evt-1',
      seq: 1,
      at: 1,
      family: 'timeline',
      eventType: '→ ChatTextPatch',
      eventId: 'm2',
      summary: 'mutation',
      event: {
        type: 'ui-event',
        sessionId: 'conv',
        name: 'ChatTextPatch',
        mutation: { upsert: { id: 'm2', kind: 'message', createdAt: 1, props: { content: 'world' } } },
      },
    }], 0);
    const snapshot = buildTimelineDebugSnapshot('conv', folded.mirror);
    expect(snapshot.summary).toEqual({ entityCount: 2, orderCount: 2, kinds: { message: 2 } });
    expect(snapshot.timeline.order).toEqual(['m1', 'm2']);
  });
});
