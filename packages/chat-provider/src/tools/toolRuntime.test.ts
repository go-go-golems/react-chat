import { describe, expect, it, vi } from 'vitest';
import { createToolRegistry } from './toolRegistry';
import { createToolRuntime } from './toolRuntime';

describe('ToolRuntime snapshot reconciliation', () => {
  it('deduplicates a hydrated request against an active frontend execution', async () => {
    const registry = createToolRegistry();
    let finish!: () => void;
    const pending = new Promise<Record<string, unknown>>((resolve) => {
      finish = () => resolve({ ok: true });
    });
    const execute = vi.fn(() => pending);
    registry.register({ name: 'lookup', mode: 'frontend', execute });
    const submitToolResult = vi.fn(async () => undefined);
    const runtime = createToolRuntime({ registry, submitToolResult });
    const request = { toolCallId: 'call-1', toolName: 'lookup', input: {} };

    runtime.reconcileFrontendToolRequests([request]);
    runtime.reconcileFrontendToolRequests([request]);
    expect(execute).toHaveBeenCalledTimes(1);

    finish();
    await vi.waitFor(() => expect(submitToolResult).toHaveBeenCalledTimes(1));
  });

  it('restores a hydrated human request to the pending set once', () => {
    const registry = createToolRegistry();
    registry.register({ name: 'confirm', mode: 'human', render: () => null });
    const runtime = createToolRuntime({ registry, submitToolResult: vi.fn(async () => undefined) });
    const request = { toolCallId: 'call-2', toolName: 'confirm', input: {} };

    runtime.reconcileFrontendToolRequests([request]);
    runtime.reconcileFrontendToolRequests([request]);

    expect(runtime.isPendingHumanTool('call-2')).toBe(true);
  });
});
