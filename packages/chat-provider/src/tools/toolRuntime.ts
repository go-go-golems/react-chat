import { formatToolValidationError, parseToolInput, parseToolResult, type HumanTool, type ToolRegistry } from './toolRegistry';
import type { CanonicalFrame } from '../ws/protocol';

export type ToolCompletionStatus = 'success' | 'failed' | 'cancelled' | 'denied' | 'timeout';

export type FrontendToolExecutor = {
  clientInstanceId: string;
  connectionId: string;
  assignmentId: string;
};

export type ToolCompletion = {
  status: ToolCompletionStatus;
  result?: Record<string, unknown>;
  error?: string;
};

export type ToolResultSubmission = ToolCompletion & {
  sessionId: string;
  toolCallId: string;
  toolName: string;
  executor: FrontendToolExecutor;
};

export type SubmitToolResult = (result: ToolResultSubmission) => Promise<void>;

export type HumanCompletionOutcome = 'accepted' | 'already-completing' | 'terminal' | 'not-pending';
export type ToolInvocationPhase = 'running' | 'waiting-human' | 'completing' | 'terminal';

export type ToolInvocationStateView = {
  sessionId: string;
  toolCallId: string;
  toolName: string;
  phase: ToolInvocationPhase;
  attempt?: number;
  startedAt: number;
  completedAt?: number;
  executor: FrontendToolExecutor;
};

export type ToolRuntimeRetention = {
  maxTerminalEntries: number;
  terminalTtlMs: number;
  resultRetryBaseDelayMs: number;
  resultRetryMaxDelayMs: number;
};

export type ToolRuntimeDebugEvent = {
  type:
    | 'tool-request-claimed'
    | 'tool-request-duplicate-active'
    | 'tool-request-duplicate-terminal'
    | 'tool-request-identity-conflict'
    | 'tool-request-executor-missing'
    | 'tool-request-not-executor'
    | 'tool-executor-assignment-changed'
    | 'tool-human-waiting'
    | 'tool-completion-claimed'
    | 'tool-result-submit-attempt'
    | 'tool-result-submit-failed'
    | 'tool-result-acknowledged'
    | 'tool-terminal-evicted';
  sessionId: string;
  toolCallId: string;
  toolName: string;
  phase?: ToolInvocationPhase;
  attempt?: number;
  reason?: string;
  executor?: FrontendToolExecutor;
};

export type ToolRuntime = {
  cancelActiveFrontendTools: () => Promise<void>;
  setExecutorIdentity: (identity: FrontendToolExecutor | null) => void;
  executorIdentity: () => Readonly<FrontendToolExecutor> | null;
  handleFrontendToolUIEvent: (frame: CanonicalFrame) => void;
  reconcileFrontendToolRequests: (requests: Array<Record<string, unknown>>, sessionId?: string) => void;
  stateOf: (toolCallId: string, sessionId?: string) => ToolInvocationStateView | null;
  subscribe: (listener: () => void) => () => void;
  isPendingHumanTool: (toolCallId: string, sessionId?: string) => boolean;
  completeHumanTool: (args: {
    sessionId?: string;
    toolCallId: string;
    toolName: string;
    result?: unknown;
    status?: ToolCompletionStatus;
    error?: string;
  }) => Promise<HumanCompletionOutcome>;
};

export type CreateToolRuntimeArgs = {
  registry: ToolRegistry;
  submitToolResult: SubmitToolResult;
  retention?: Partial<ToolRuntimeRetention>;
  now?: () => number;
  scheduleRetry?: (callback: () => void, delayMs: number) => void;
  onDebugEvent?: (event: ToolRuntimeDebugEvent) => void;
};

const DEFAULT_RETENTION: ToolRuntimeRetention = {
  maxTerminalEntries: 1_000,
  terminalTtlMs: 30 * 60_000,
  resultRetryBaseDelayMs: 250,
  resultRetryMaxDelayMs: 5_000,
};

type ToolRequest = {
  key: string;
  sessionId: string;
  toolCallId: string;
  toolName: string;
  input: Record<string, unknown>;
  executor: FrontendToolExecutor;
};

type RunningState = {
  phase: 'running';
  request: ToolRequest;
  controller: AbortController;
  startedAt: number;
};

type WaitingHumanState = {
  phase: 'waiting-human';
  request: ToolRequest;
  tool: HumanTool<any, any>;
  startedAt: number;
};

type ClaimingHumanState = {
  phase: 'claiming-human';
  request: ToolRequest;
  tool: HumanTool<any, any>;
  startedAt: number;
};

type CompletingState = {
  phase: 'completing';
  request: ToolRequest;
  completion: ToolCompletion;
  startedAt: number;
  attempt: number;
  deliveryInFlight: boolean;
  retryScheduled: boolean;
};

type TerminalState = {
  phase: 'terminal';
  request: ToolRequest;
  completion: ToolCompletion;
  startedAt: number;
  completedAt: number;
};

type InvocationState = RunningState | WaitingHumanState | ClaimingHumanState | CompletingState | TerminalState;

export function createToolRuntime(args: CreateToolRuntimeArgs): ToolRuntime {
  const retention = validateRetention({ ...DEFAULT_RETENTION, ...args.retention });
  const now = args.now ?? Date.now;
  const scheduleRetry = args.scheduleRetry ?? ((callback, delayMs) => { setTimeout(callback, delayMs); });
  const states = new Map<string, InvocationState>();
  const terminalOrder = new Map<string, number>();
  const listeners = new Set<() => void>();
  let currentExecutor: FrontendToolExecutor | null = null;

  function emit(event: ToolRuntimeDebugEvent): void {
    try {
      args.onDebugEvent?.(event);
    } catch {
      // Debug observers must never alter execution correctness.
    }
  }

  function notify(): void {
    for (const listener of listeners) listener();
  }

  function setState(key: string, state: InvocationState): void {
    states.set(key, state);
    notify();
  }

  function evictTerminalStates(): void {
    const currentTime = now();
    let changed = false;
    for (const [key, completedAt] of terminalOrder) {
      if (currentTime - completedAt < retention.terminalTtlMs) break;
      const state = states.get(key);
      if (state?.phase === 'terminal') {
        states.delete(key);
        emit(debugEvent('tool-terminal-evicted', state.request, 'terminal', undefined, 'ttl'));
        changed = true;
      }
      terminalOrder.delete(key);
    }
    while (terminalOrder.size > retention.maxTerminalEntries) {
      const oldest = terminalOrder.entries().next().value as [string, number] | undefined;
      if (!oldest) break;
      const [key] = oldest;
      const state = states.get(key);
      if (state?.phase === 'terminal') {
        states.delete(key);
        emit(debugEvent('tool-terminal-evicted', state.request, 'terminal', undefined, 'capacity'));
        changed = true;
      }
      terminalOrder.delete(key);
    }
    if (changed) notify();
  }

  function requestFromPayload(payload: Record<string, unknown>, sessionId: string): ToolRequest | null {
    const toolCallId = String(payload.toolCallId || '').trim();
    const toolName = String(payload.toolName || '').trim();
    const canonicalSessionId = String(sessionId || payload.sessionId || '').trim();
    const executor = parseExecutor(payload.executor);
    if (!toolCallId || !toolName || !executor) return null;
    return {
      key: encodeV1InvocationKey(canonicalSessionId, toolCallId),
      sessionId: canonicalSessionId,
      toolCallId,
      toolName,
      input: normalizeRecord(payload.input),
      executor,
    };
  }

  function claimRequest(request: ToolRequest): RunningState | null {
    evictTerminalStates();
    const existing = states.get(request.key);
    if (existing) {
      if (existing.request.toolName !== request.toolName) {
        emit(debugEvent('tool-request-identity-conflict', request, publicPhase(existing), undefined, 'tool-name-mismatch'));
      } else if (!sameExecutor(existing.request.executor, request.executor)) {
        emit(debugEvent('tool-request-identity-conflict', request, publicPhase(existing), undefined, 'executor-mismatch'));
      } else if (existing.phase === 'terminal') {
        emit(debugEvent('tool-request-duplicate-terminal', request, 'terminal'));
      } else {
        emit(debugEvent('tool-request-duplicate-active', request, publicPhase(existing)));
        if (existing.phase === 'completing' && !existing.deliveryInFlight && !existing.retryScheduled) {
          void deliverCompletion(request.key);
        }
      }
      return null;
    }
    const state: RunningState = {
      phase: 'running',
      request,
      controller: new AbortController(),
      startedAt: now(),
    };
    setState(request.key, state);
    emit(debugEvent('tool-request-claimed', request, 'running'));
    return state;
  }

  function claimCompletion(state: RunningState | WaitingHumanState | ClaimingHumanState, completion: ToolCompletion): Promise<boolean> | null {
    if (states.get(state.request.key) !== state) return null;
    const completing: CompletingState = {
      phase: 'completing',
      request: state.request,
      completion: canonicalCompletion(completion),
      startedAt: state.startedAt,
      attempt: 0,
      deliveryInFlight: false,
      retryScheduled: false,
    };
    setState(state.request.key, completing);
    emit(debugEvent('tool-completion-claimed', state.request, 'completing'));
    return deliverCompletion(state.request.key);
  }

  async function deliverCompletion(key: string): Promise<boolean> {
    const current = states.get(key);
    if (current?.phase !== 'completing' || current.deliveryInFlight) return false;
    const attempt = current.attempt + 1;
    const delivering: CompletingState = {
      ...current,
      attempt,
      deliveryInFlight: true,
      retryScheduled: false,
    };
    setState(key, delivering);
    emit(debugEvent('tool-result-submit-attempt', delivering.request, 'completing', attempt));
    try {
      await args.submitToolResult({
        sessionId: delivering.request.sessionId,
        toolCallId: delivering.request.toolCallId,
        toolName: delivering.request.toolName,
        executor: cloneExecutor(delivering.request.executor),
        ...delivering.completion,
      });
    } catch (error) {
      if (states.get(key) !== delivering) return false;
      const delayMs = Math.min(retention.resultRetryMaxDelayMs, retention.resultRetryBaseDelayMs * (2 ** Math.max(0, attempt - 1)));
      const waiting: CompletingState = {
        ...delivering,
        deliveryInFlight: false,
        retryScheduled: true,
      };
      setState(key, waiting);
      emit(debugEvent('tool-result-submit-failed', waiting.request, 'completing', attempt, errorMessage(error)));
      scheduleRetry(() => {
        const latest = states.get(key);
        if (latest?.phase !== 'completing' || !latest.retryScheduled) return;
        setState(key, { ...latest, retryScheduled: false });
        void deliverCompletion(key);
      }, delayMs);
      return false;
    }

    if (states.get(key) !== delivering) return false;
    const completedAt = now();
    const terminal: TerminalState = {
      phase: 'terminal',
      request: delivering.request,
      completion: delivering.completion,
      startedAt: delivering.startedAt,
      completedAt,
    };
    setState(key, terminal);
    terminalOrder.set(key, completedAt);
    evictTerminalStates();
    emit(debugEvent('tool-result-acknowledged', terminal.request, 'terminal', attempt));
    return true;
  }

  async function executeFrontendTool(payload: Record<string, unknown>, sessionId = ''): Promise<void> {
    const request = requestFromPayload(payload, sessionId);
    if (!request) {
      const toolCallId = String(payload.toolCallId ?? '').trim();
      const toolName = String(payload.toolName ?? '').trim();
      if (toolCallId && toolName && !parseExecutor(payload.executor)) {
        emit({
          type: 'tool-request-executor-missing',
          sessionId: String(sessionId || payload.sessionId || '').trim(),
          toolCallId,
          toolName,
          reason: 'complete executor identity is required',
        });
      }
      return;
    }
    if (!currentExecutor || !sameExecutor(request.executor, currentExecutor)) {
      emit(debugEvent('tool-request-not-executor', request, undefined, undefined, currentExecutor ? 'assignment-mismatch' : 'assignment-unacknowledged'));
      return;
    }
    const state = claimRequest(request);
    if (!state) return;

    const tool = args.registry.get(request.toolName);
    if (!tool) {
      await claimCompletion(state, { status: 'failed', error: `frontend tool ${request.toolName} is not registered` });
      return;
    }

    const available = typeof tool.available === 'function' ? tool.available() : tool.available !== false;
    if (!available) {
      await claimCompletion(state, { status: 'failed', error: `frontend tool ${request.toolName} is not available` });
      return;
    }

    let input: unknown;
    try {
      input = parseToolInput(tool, request.input);
    } catch (error) {
      await claimCompletion(state, {
        status: 'failed',
        error: `invalid input for frontend tool ${request.toolName}: ${formatToolValidationError(error)}`,
      });
      return;
    }

    if (tool.mode === 'human') {
      const waiting: WaitingHumanState = { phase: 'waiting-human', request, tool, startedAt: state.startedAt };
      if (states.get(request.key) === state) {
        setState(request.key, waiting);
        emit(debugEvent('tool-human-waiting', request, 'waiting-human'));
      }
      return;
    }

    if (tool.mode === 'backend' || !('execute' in tool)) {
      await claimCompletion(state, {
        status: 'failed',
        error: `frontend tool ${request.toolName} is registered as ${tool.mode ?? 'unknown'} and cannot execute in the browser`,
      });
      return;
    }

    try {
      const result = await tool.execute(input, { signal: state.controller.signal, toolCallId: request.toolCallId });
      if (states.get(request.key) !== state) return;
      const parsedResult = parseToolResult(tool, result);
      await claimCompletion(state, { status: 'success', result: normalizeRecord(parsedResult) });
    } catch (error) {
      if (states.get(request.key) !== state) return;
      await claimCompletion(state, {
        status: state.controller.signal.aborted ? 'cancelled' : 'failed',
        error: errorMessage(error),
      });
    }
  }

  function handleFrontendToolUIEvent(frame: CanonicalFrame): void {
    if (String(frame.name ?? '') !== 'ChatFrontendToolCallRequested') return;
    const payload = normalizeRecord(frame.payload);
    void executeFrontendTool(payload, String(frame.sessionId ?? ''));
  }

  function reconcileFrontendToolRequests(requests: Array<Record<string, unknown>>, sessionId = ''): void {
    for (const request of requests) void executeFrontendTool(request, sessionId);
  }

  function matchingState(toolCallId: string, sessionId?: string): InvocationState | null {
    if (sessionId !== undefined) {
      const state = states.get(encodeV1InvocationKey(sessionId, toolCallId)) ?? null;
      return state?.phase === 'terminal' && now() - state.completedAt >= retention.terminalTtlMs ? null : state;
    }
    let match: InvocationState | null = null;
    for (const state of states.values()) {
      if (state.request.toolCallId !== toolCallId) continue;
      if (state.phase === 'terminal' && now() - state.completedAt >= retention.terminalTtlMs) continue;
      if (match) return null;
      match = state;
    }
    return match;
  }

  function stateOf(toolCallId: string, sessionId?: string): ToolInvocationStateView | null {
    const state = matchingState(toolCallId, sessionId);
    if (!state) return null;
    return {
      sessionId: state.request.sessionId,
      toolCallId: state.request.toolCallId,
      toolName: state.request.toolName,
      phase: publicPhase(state),
      startedAt: state.startedAt,
      ...(state.phase === 'completing' ? { attempt: state.attempt } : {}),
      ...(state.phase === 'terminal' ? { completedAt: state.completedAt } : {}),
      executor: cloneExecutor(state.request.executor),
    };
  }

  function isPendingHumanTool(toolCallId: string, sessionId?: string): boolean {
    return matchingState(toolCallId, sessionId)?.phase === 'waiting-human';
  }

  async function completeHumanTool(call: {
    sessionId?: string;
    toolCallId: string;
    toolName: string;
    result?: unknown;
    status?: ToolCompletionStatus;
    error?: string;
  }): Promise<HumanCompletionOutcome> {
    const state = matchingState(call.toolCallId, call.sessionId);
    if (!state || state.request.toolName !== call.toolName) return 'not-pending';
    if (state.phase === 'terminal') return 'terminal';
    if (state.phase === 'completing' || state.phase === 'claiming-human') return 'already-completing';
    if (state.phase !== 'waiting-human') return 'not-pending';

    const claiming: ClaimingHumanState = { phase: 'claiming-human', request: state.request, tool: state.tool, startedAt: state.startedAt };
    setState(state.request.key, claiming);
    const status = call.status ?? 'success';
    let completion: ToolCompletion;
    if (status === 'success') {
      try {
        completion = { status, result: normalizeRecord(parseToolResult(state.tool, call.result ?? {})), error: call.error };
      } catch (error) {
        completion = {
          status: 'failed',
          error: `invalid result for human tool ${call.toolName}: ${formatToolValidationError(error)}`,
        };
      }
    } else {
      completion = { status, result: call.result === undefined ? undefined : normalizeRecord(call.result), error: call.error };
    }
    const delivery = claimCompletion(claiming, completion);
    if (!delivery) return 'already-completing';
    await delivery;
    return 'accepted';
  }

  async function cancelActiveFrontendTools(): Promise<void> {
    const deliveries: Promise<boolean>[] = [];
    for (const state of Array.from(states.values())) {
      if (state.phase === 'running') {
        state.controller.abort();
        const delivery = claimCompletion(state, { status: 'cancelled', error: 'frontend tool execution cancelled' });
        if (delivery) deliveries.push(delivery);
      } else if (state.phase === 'waiting-human') {
        const delivery = claimCompletion(state, { status: 'cancelled', error: 'frontend tool interaction cancelled' });
        if (delivery) deliveries.push(delivery);
      }
    }
    await Promise.all(deliveries);
  }

  function setExecutorIdentity(identity: FrontendToolExecutor | null): void {
    const next = identity === null ? null : parseExecutor(identity);
    if (identity !== null && !next) throw new Error('tool runtime requires a complete executor identity');
    if ((next === null && currentExecutor === null) || (next && currentExecutor && sameExecutor(next, currentExecutor))) return;
    currentExecutor = next === null ? null : freezeExecutor(next);
    emit({
      type: 'tool-executor-assignment-changed',
      sessionId: '',
      toolCallId: '',
      toolName: '',
      ...(currentExecutor ? { executor: cloneExecutor(currentExecutor) } : { reason: 'cleared' }),
    });
    notify();
  }

  return {
    cancelActiveFrontendTools,
    setExecutorIdentity,
    executorIdentity: () => currentExecutor,
    handleFrontendToolUIEvent,
    reconcileFrontendToolRequests,
    stateOf,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    isPendingHumanTool,
    completeHumanTool,
  };
}

function validateRetention(retention: ToolRuntimeRetention): ToolRuntimeRetention {
  for (const [name, value] of Object.entries(retention)) {
    if (!Number.isFinite(value) || value <= 0) throw new Error(`tool runtime ${name} must be a positive finite number`);
  }
  return retention;
}

function encodeV1InvocationKey(sessionId: string, toolCallId: string): string {
  return `${sessionId.length}:${sessionId}${toolCallId.length}:${toolCallId}`;
}

function publicPhase(state: InvocationState): ToolInvocationPhase {
  return state.phase === 'claiming-human' ? 'completing' : state.phase;
}

function canonicalCompletion(completion: ToolCompletion): ToolCompletion {
  try {
    return Object.freeze({
      status: completion.status,
      ...(completion.result === undefined ? {} : { result: cloneJSONRecord(completion.result) }),
      ...(completion.error === undefined ? {} : { error: completion.error }),
    });
  } catch (error) {
    return Object.freeze({
      status: 'failed',
      error: `frontend tool result is not JSON-serializable: ${errorMessage(error)}`,
    });
  }
}

function cloneJSONRecord(value: Record<string, unknown>): Record<string, unknown> {
  return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
}

function normalizeRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { value };
  return value as Record<string, unknown>;
}

function parseExecutor(value: unknown): FrontendToolExecutor | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const clientInstanceId = String(record.clientInstanceId ?? '').trim();
  const connectionId = String(record.connectionId ?? '').trim();
  const assignmentId = String(record.assignmentId ?? '').trim();
  if (!clientInstanceId || !connectionId || !assignmentId) return null;
  return { clientInstanceId, connectionId, assignmentId };
}

function cloneExecutor(executor: FrontendToolExecutor): FrontendToolExecutor {
  return {
    clientInstanceId: executor.clientInstanceId,
    connectionId: executor.connectionId,
    assignmentId: executor.assignmentId,
  };
}

function freezeExecutor(executor: FrontendToolExecutor): FrontendToolExecutor {
  return Object.freeze(cloneExecutor(executor));
}

function sameExecutor(left: FrontendToolExecutor, right: FrontendToolExecutor): boolean {
  return left.clientInstanceId === right.clientInstanceId
    && left.connectionId === right.connectionId
    && left.assignmentId === right.assignmentId;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function debugEvent(
  type: ToolRuntimeDebugEvent['type'],
  request: ToolRequest,
  phase?: ToolInvocationPhase,
  attempt?: number,
  reason?: string,
): ToolRuntimeDebugEvent {
  return {
    type,
    sessionId: request.sessionId,
    toolCallId: request.toolCallId,
    toolName: request.toolName,
    ...(phase ? { phase } : {}),
    ...(attempt !== undefined ? { attempt } : {}),
    ...(reason ? { reason } : {}),
    executor: cloneExecutor(request.executor),
  };
}
