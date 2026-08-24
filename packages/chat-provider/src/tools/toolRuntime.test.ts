import { describe, expect, it, vi } from 'vitest';
import { createToolRegistry } from './toolRegistry';
import { createToolRuntime, type ToolResultSubmission } from './toolRuntime';

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

async function expectPhase(runtime: ReturnType<typeof createToolRuntime>, toolCallId: string, phase: string, sessionId = 'session-1') {
  await vi.waitFor(() => expect(runtime.stateOf(toolCallId, sessionId)?.phase).toBe(phase));
}

describe('ToolRuntime invocation state machine', () => {
  it('deduplicates a hydrated request while running and after terminal acknowledgement', async () => {
    const registry = createToolRegistry();
    const execution = deferred<Record<string, unknown>>();
    const execute = vi.fn(() => execution.promise);
    registry.register({ name: 'lookup', mode: 'frontend', execute });
    const submitToolResult = vi.fn(async () => undefined);
    const runtime = createToolRuntime({ registry, submitToolResult });
    const request = { toolCallId: 'call-1', toolName: 'lookup', input: {} };

    runtime.reconcileFrontendToolRequests([request], 'session-1');
    runtime.reconcileFrontendToolRequests([request], 'session-1');
    expect(execute).toHaveBeenCalledTimes(1);

    execution.resolve({ ok: true });
    await expectPhase(runtime, 'call-1', 'terminal');
    expect(submitToolResult).toHaveBeenCalledTimes(1);

    runtime.reconcileFrontendToolRequests([request], 'session-1');
    await Promise.resolve();
    expect(execute).toHaveBeenCalledTimes(1);
    expect(submitToolResult).toHaveBeenCalledTimes(1);
  });

  it('retries terminal delivery without replaying the browser effect', async () => {
    const registry = createToolRegistry();
    const execute = vi.fn(async () => ({ changed: true }));
    registry.register({ name: 'mutate_ui', mode: 'frontend', execute });
    const scheduled: Array<() => void> = [];
    const submissions: ToolResultSubmission[] = [];
    const submitToolResult = vi.fn(async (submission: ToolResultSubmission) => {
      submissions.push(structuredClone(submission));
      if (submissions.length === 1) throw new Error('network unavailable');
    });
    const runtime = createToolRuntime({
      registry,
      submitToolResult,
      scheduleRetry: (callback) => scheduled.push(callback),
    });
    const request = { toolCallId: 'call-1', toolName: 'mutate_ui', input: {} };

    runtime.reconcileFrontendToolRequests([request], 'session-1');
    await vi.waitFor(() => expect(submitToolResult).toHaveBeenCalledTimes(1));
    expect(runtime.stateOf('call-1', 'session-1')).toMatchObject({ phase: 'completing', attempt: 1 });
    expect(scheduled).toHaveLength(1);

    runtime.reconcileFrontendToolRequests([request], 'session-1');
    expect(execute).toHaveBeenCalledTimes(1);
    expect(submitToolResult).toHaveBeenCalledTimes(1);

    scheduled.shift()?.();
    await expectPhase(runtime, 'call-1', 'terminal');
    expect(execute).toHaveBeenCalledTimes(1);
    expect(submitToolResult).toHaveBeenCalledTimes(2);
    expect(submissions[1]).toEqual(submissions[0]);
  });

  it('claims one human completion synchronously across duplicate responders', async () => {
    const registry = createToolRegistry();
    registry.register({ name: 'confirm', mode: 'human', render: () => null });
    const delivery = deferred<void>();
    const submitToolResult = vi.fn(() => delivery.promise);
    const runtime = createToolRuntime({ registry, submitToolResult });
    const request = { toolCallId: 'call-2', toolName: 'confirm', input: {} };

    runtime.reconcileFrontendToolRequests([request], 'session-1');
    expect(runtime.isPendingHumanTool('call-2', 'session-1')).toBe(true);

    const first = runtime.completeHumanTool({ sessionId: 'session-1', toolCallId: 'call-2', toolName: 'confirm', result: { approved: true } });
    const second = runtime.completeHumanTool({ sessionId: 'session-1', toolCallId: 'call-2', toolName: 'confirm', status: 'denied' });
    await expect(second).resolves.toBe('already-completing');
    expect(runtime.stateOf('call-2', 'session-1')?.phase).toBe('completing');
    expect(submitToolResult).toHaveBeenCalledTimes(1);

    delivery.resolve();
    await expect(first).resolves.toBe('accepted');
    expect(runtime.stateOf('call-2', 'session-1')?.phase).toBe('terminal');
    await expect(runtime.completeHumanTool({ sessionId: 'session-1', toolCallId: 'call-2', toolName: 'confirm' })).resolves.toBe('terminal');
    expect(submitToolResult).toHaveBeenCalledTimes(1);
  });

  it('terminalizes cancellation once and ignores a late tool resolution', async () => {
    const registry = createToolRegistry();
    const execution = deferred<Record<string, unknown>>();
    const execute = vi.fn(() => execution.promise);
    registry.register({ name: 'slow_tool', mode: 'frontend', execute });
    const submitToolResult = vi.fn(async () => undefined);
    const runtime = createToolRuntime({ registry, submitToolResult });

    runtime.reconcileFrontendToolRequests([{ toolCallId: 'call-3', toolName: 'slow_tool', input: {} }], 'session-1');
    await expectPhase(runtime, 'call-3', 'running');
    await runtime.cancelActiveFrontendTools();
    expect(runtime.stateOf('call-3', 'session-1')?.phase).toBe('terminal');
    expect(submitToolResult).toHaveBeenCalledTimes(1);
    expect(submitToolResult).toHaveBeenCalledWith(expect.objectContaining({ status: 'cancelled' }));

    execution.resolve({ tooLate: true });
    await Promise.resolve();
    await Promise.resolve();
    expect(submitToolResult).toHaveBeenCalledTimes(1);
  });

  it('claims validation failures before submitting so duplicate requests submit once', async () => {
    const registry = createToolRegistry();
    const delivery = deferred<void>();
    const submitToolResult = vi.fn(() => delivery.promise);
    const runtime = createToolRuntime({ registry, submitToolResult });
    const request = { toolCallId: 'missing-call', toolName: 'missing_tool', input: {} };

    runtime.reconcileFrontendToolRequests([request], 'session-1');
    runtime.reconcileFrontendToolRequests([request], 'session-1');
    expect(submitToolResult).toHaveBeenCalledTimes(1);
    expect(runtime.stateOf('missing-call', 'session-1')?.phase).toBe('completing');

    delivery.resolve();
    await expectPhase(runtime, 'missing-call', 'terminal');
  });

  it('namespaces v1 call ids by session', async () => {
    const registry = createToolRegistry();
    const execute = vi.fn(async () => ({ ok: true }));
    registry.register({ name: 'lookup', mode: 'frontend', execute });
    const submitToolResult = vi.fn(async () => undefined);
    const runtime = createToolRuntime({ registry, submitToolResult });
    const request = { toolCallId: 'shared-call', toolName: 'lookup', input: {} };

    runtime.reconcileFrontendToolRequests([request], 'session-a');
    runtime.reconcileFrontendToolRequests([request], 'session-b');
    await vi.waitFor(() => expect(submitToolResult).toHaveBeenCalledTimes(2));

    expect(execute).toHaveBeenCalledTimes(2);
    expect(runtime.stateOf('shared-call')).toBeNull();
    expect(runtime.stateOf('shared-call', 'session-a')?.phase).toBe('terminal');
    expect(runtime.stateOf('shared-call', 'session-b')?.phase).toBe('terminal');
  });

  it('evicts terminal entries deterministically by capacity and TTL', async () => {
    const registry = createToolRegistry();
    const execute = vi.fn(async () => ({ ok: true }));
    registry.register({ name: 'lookup', mode: 'frontend', execute });
    const submitToolResult = vi.fn(async () => undefined);
    let currentTime = 1_000;
    const debug = vi.fn();
    const runtime = createToolRuntime({
      registry,
      submitToolResult,
      now: () => currentTime,
      retention: { maxTerminalEntries: 1, terminalTtlMs: 100 },
      onDebugEvent: debug,
    });

    runtime.reconcileFrontendToolRequests([{ toolCallId: 'call-1', toolName: 'lookup', input: {} }], 'session-1');
    await expectPhase(runtime, 'call-1', 'terminal');
    currentTime += 10;
    runtime.reconcileFrontendToolRequests([{ toolCallId: 'call-2', toolName: 'lookup', input: {} }], 'session-1');
    await expectPhase(runtime, 'call-2', 'terminal');
    expect(runtime.stateOf('call-1', 'session-1')).toBeNull();

    currentTime += 100;
    expect(runtime.stateOf('call-2', 'session-1')).toBeNull();
    expect(debug).toHaveBeenCalledWith(expect.objectContaining({ type: 'tool-terminal-evicted' }));
  });

  it('rejects invalid retention instead of silently creating an unbounded ledger', () => {
    const registry = createToolRegistry();
    expect(() => createToolRuntime({
      registry,
      submitToolResult: vi.fn(async () => undefined),
      retention: { maxTerminalEntries: 0 },
    })).toThrow(/maxTerminalEntries/);
  });
});
