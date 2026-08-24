import { describe, expect, it } from 'vitest';

import { ChatToolRegistry, assertProviderSafeToolName, defineTool } from './toolRegistry';

describe('provider-safe tool names', () => {
  it('accepts letters, numbers, underscores, and hyphens', () => {
    expect(() => assertProviderSafeToolName('cart_add-1')).not.toThrow();
  });

  it('rejects dotted names before they reach model providers', () => {
    expect(() => assertProviderSafeToolName('cart.add')).toThrow(/provider-safe/);
    expect(() =>
      defineTool({
        name: 'checkout.confirm',
        execute: () => ({ ok: true }),
      }),
    ).toThrow(/checkout\.confirm/);
  });

  it('validates registry registrations', () => {
    const registry = new ChatToolRegistry();
    expect(() =>
      registry.register({
        name: 'catalog.search',
        mode: 'frontend',
        execute: () => ({ ok: true }),
      }),
    ).toThrow(/catalog\.search/);
  });
});

describe('ChatToolRegistry ownership', () => {
  it('rejects duplicate registration and identifies both owners', () => {
    const registry = new ChatToolRegistry();
    registry.register({ name: 'lookup', execute: () => ({ source: 'first' }) }, { owner: 'extension-a' });

    expect(() => registry.register(
      { name: 'lookup', execute: () => ({ source: 'second' }) },
      { owner: 'extension-b' },
    )).toThrow(/extension-a.*extension-b.*replace/);
    expect(registry.owner('lookup')).toBe('extension-a');
  });

  it('requires expected ownership for explicit replacement and keeps cleanup exact', () => {
    const registry = new ChatToolRegistry();
    const unregisterOriginal = registry.register({ name: 'lookup', execute: () => ({ source: 'first' }) }, { owner: 'extension-a' });

    expect(() => registry.replace(
      'lookup',
      { name: 'lookup', execute: () => ({ source: 'wrong' }) },
      { expectedOwner: 'extension-b', owner: 'extension-c' },
    )).toThrow(/current owner is "extension-a"/);

    const replacement = { name: 'lookup', execute: () => ({ source: 'replacement' }) };
    const unregisterReplacement = registry.replace('lookup', replacement, { expectedOwner: 'extension-a', owner: 'extension-c' });
    unregisterOriginal();
    const installed = registry.get('lookup');
    expect(installed && 'execute' in installed ? installed.execute : undefined).toBe(replacement.execute);
    expect(registry.owner('lookup')).toBe('extension-c');

    unregisterReplacement();
    expect(registry.get('lookup')).toBeUndefined();
  });
});

describe('ChatToolRegistry manifest snapshots', () => {
  it('returns one deeply immutable snapshot until semantic content changes', () => {
    const registry = new ChatToolRegistry();
    registry.register({
      name: 'lookup',
      description: 'Lookup inventory',
      inputSchema: { type: 'object', properties: { sku: { type: 'string' } } },
      execute: () => ({ ok: true }),
    }, { owner: 'inventory' });

    const first = registry.snapshot();
    const same = registry.snapshot();
    expect(same).toBe(first);
    expect(first.revision).toBe(1);
    expect(first.digest).toMatch(/^fnv1a64:/);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.tools)).toBe(true);
    expect(Object.isFrozen(first.tools[0]?.inputSchema)).toBe(true);
    expect(() => ((first.tools[0]?.inputSchema as Record<string, unknown>).type = 'array')).toThrow();
  });

  it('increments revision when dynamic availability changes', () => {
    const registry = new ChatToolRegistry();
    let available = true;
    registry.register({ name: 'lookup', available: () => available, execute: () => ({ ok: true }) }, { owner: 'inventory' });

    const first = registry.snapshot();
    available = false;
    const second = registry.snapshot();

    expect(second.revision).toBe(first.revision + 1);
    expect(second.digest).not.toBe(first.digest);
    expect(second.tools[0]?.available).toBe(false);
  });

  it('sorts semantic content so registration order does not affect the digest', () => {
    const left = new ChatToolRegistry();
    left.register({ name: 'z_tool', execute: () => ({}) }, { owner: 'z' });
    left.register({ name: 'a_tool', execute: () => ({}) }, { owner: 'a' });
    const right = new ChatToolRegistry();
    right.register({ name: 'a_tool', execute: () => ({}) }, { owner: 'a' });
    right.register({ name: 'z_tool', execute: () => ({}) }, { owner: 'z' });

    expect(left.snapshot().digest).toBe(right.snapshot().digest);
    expect(left.manifest().map((entry) => entry.name)).toEqual(['a_tool', 'z_tool']);
  });

  it('returns mutable manifest copies without exposing frozen snapshot data', () => {
    const registry = new ChatToolRegistry();
    registry.register({ name: 'lookup', inputSchema: { type: 'object' }, execute: () => ({}) }, { owner: 'inventory' });
    const snapshot = registry.snapshot();
    const manifest = registry.manifest();

    manifest[0]!.inputSchema.type = 'array';
    expect(snapshot.tools[0]?.inputSchema.type).toBe('object');
  });
});
