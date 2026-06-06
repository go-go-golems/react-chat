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
