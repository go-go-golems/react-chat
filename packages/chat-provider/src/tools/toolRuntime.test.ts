import { describe, expect, it, vi } from 'vitest';
import { createToolRegistry } from './toolRegistry';
import { createToolRuntime as createRawToolRuntime, type FrontendToolExecutor, type ToolResultSubmission } from './toolRuntime';

const TEST_EXECUTOR: FrontendToolExecutor = {
  clientInstanceId: 'client-a',
  connectionId: 'connection-a',
  assignmentId: 'assignment-a',
};

function createToolRuntime(args: Parameters<typeof createRawToolRuntime>[0]) {
  const runtime = createRawToolRuntime(args);
  runtime.setExecutorIdentity(TEST_EXECUTOR);
  return runtime;
}

function toolRequest(toolCallId: string, toolName: string) {
  return { toolCallId, toolName, input: {}, executor: TEST_EXECUTOR };
}

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
    const request = toolRequest('call-1', 'lookup');

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
    const request = toolRequest('call-1', 'mutate_ui');

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
    expect(submissions[0]?.sessionId).toBe('session-1');
    expect(submissions[1]).toEqual(submissions[0]);
  });

  it('claims one human completion synchronously across duplicate responders', async () => {
    const registry = createToolRegistry();
    registry.register({ name: 'confirm', mode: 'human', render: () => null });
    const delivery = deferred<void>();
    const submitToolResult = vi.fn(() => delivery.promise);
    const runtime = createToolRuntime({ registry, submitToolResult });
    const request = toolRequest('call-2', 'confirm');

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

    runtime.reconcileFrontendToolRequests([toolRequest('call-3', 'slow_tool')], 'session-1');
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
    const request = toolRequest('missing-call', 'missing_tool');

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
    const request = toolRequest('shared-call', 'lookup');

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

    runtime.reconcileFrontendToolRequests([toolRequest('call-1', 'lookup')], 'session-1');
    await expectPhase(runtime, 'call-1', 'terminal');
    currentTime += 10;
    runtime.reconcileFrontendToolRequests([toolRequest('call-2', 'lookup')], 'session-1');
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

  it('lets exactly one of two assigned runtimes execute and submit', async () => {
    const registryA = createToolRegistry();
    const registryB = createToolRegistry();
    const executeA = vi.fn(async () => ({ owner: 'a' }));
    const executeB = vi.fn(async () => ({ owner: 'b' }));
    registryA.register({ name: 'mutate', mode: 'frontend', execute: executeA });
    registryB.register({ name: 'mutate', mode: 'frontend', execute: executeB });
    const submitA = vi.fn(async () => undefined);
    const submitB = vi.fn(async () => undefined);
    const runtimeA = createRawToolRuntime({ registry: registryA, submitToolResult: submitA });
    const runtimeB = createRawToolRuntime({ registry: registryB, submitToolResult: submitB });
    runtimeA.setExecutorIdentity(TEST_EXECUTOR);
    runtimeB.setExecutorIdentity({ clientInstanceId: 'client-b', connectionId: 'connection-b', assignmentId: 'assignment-b' });

    const request = toolRequest('call-owner', 'mutate');
    runtimeA.reconcileFrontendToolRequests([request], 'session-1');
    runtimeB.reconcileFrontendToolRequests([request], 'session-1');

    await vi.waitFor(() => expect(submitA).toHaveBeenCalledTimes(1));
    expect(executeA).toHaveBeenCalledTimes(1);
    expect(executeB).not.toHaveBeenCalled();
    expect(submitB).not.toHaveBeenCalled();
    expect(runtimeB.stateOf('call-owner', 'session-1')).toBeNull();
  });

  it('fails closed before claim when executor identity is missing', async () => {
    const registry = createToolRegistry();
    const execute = vi.fn(async () => ({ ok: true }));
    registry.register({ name: 'lookup', mode: 'frontend', execute });
    const debug = vi.fn();
    const submit = vi.fn(async () => undefined);
    const runtime = createRawToolRuntime({ registry, submitToolResult: submit, onDebugEvent: debug });
    runtime.setExecutorIdentity(TEST_EXECUTOR);

    runtime.reconcileFrontendToolRequests([{ toolCallId: 'missing-executor', toolName: 'lookup', input: {} }], 'session-1');
    await Promise.resolve();

    expect(execute).not.toHaveBeenCalled();
    expect(submit).not.toHaveBeenCalled();
    expect(runtime.stateOf('missing-executor', 'session-1')).toBeNull();
    expect(debug).toHaveBeenCalledWith(expect.objectContaining({ type: 'tool-request-executor-missing' }));
  });

  it('retries with the invocation executor after current assignment changes', async () => {
    const registry = createToolRegistry();
    registry.register({ name: 'mutate', mode: 'frontend', execute: async () => ({ changed: true }) });
    const scheduled: Array<() => void> = [];
    const submissions: ToolResultSubmission[] = [];
    const runtime = createRawToolRuntime({
      registry,
      submitToolResult: vi.fn(async (submission: ToolResultSubmission) => {
        submissions.push(structuredClone(submission));
        if (submissions.length === 1) throw new Error('offline');
      }),
      scheduleRetry: (callback) => scheduled.push(callback),
    });
    runtime.setExecutorIdentity(TEST_EXECUTOR);
    runtime.reconcileFrontendToolRequests([toolRequest('call-retry', 'mutate')], 'session-1');
    await vi.waitFor(() => expect(submissions).toHaveLength(1));

    runtime.setExecutorIdentity({ clientInstanceId: 'client-a', connectionId: 'connection-new', assignmentId: 'assignment-new' });
    scheduled.shift()?.();
    await vi.waitFor(() => expect(submissions).toHaveLength(2));

    expect(submissions[0]?.executor).toEqual(TEST_EXECUTOR);
    expect(submissions[1]?.executor).toEqual(TEST_EXECUTOR);
  });
});
