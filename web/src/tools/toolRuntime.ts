import { defaultToolRegistry } from './toolRegistry';
import type { CanonicalFrame } from '../ws/protocol';

type SubmitToolResult = (result: {
  toolCallId: string;
  toolName: string;
  status: 'success' | 'failed' | 'cancelled' | 'denied';
  result?: Record<string, unknown>;
  error?: string;
}) => Promise<void>;

let submitToolResult: SubmitToolResult | null = null;
const activeControllers = new Map<string, AbortController>();
const pendingHumanTools = new Set<string>();

export function configureToolRuntime(args: { submitToolResult: SubmitToolResult }) {
  submitToolResult = args.submitToolResult;
}

export function cancelActiveFrontendTools() {
  for (const controller of activeControllers.values()) {
    controller.abort();
  }
  activeControllers.clear();
  pendingHumanTools.clear();
}

export function handleFrontendToolUIEvent(frame: CanonicalFrame) {
  const name = (frame as any).name as string;
  if (name !== 'ChatFrontendToolCallRequested') return;
  const payload = ((frame as any).payload as Record<string, unknown>) || {};
  void executeFrontendTool(payload);
}

async function executeFrontendTool(payload: Record<string, unknown>) {
  const toolCallId = String(payload.toolCallId || '');
  const toolName = String(payload.toolName || '');
  if (!toolCallId || !toolName) return;

  const submit = submitToolResult;
  if (!submit) {
    console.warn('frontend tool requested before runtime was configured', payload);
    return;
  }

  const tool = defaultToolRegistry.get(toolName);
  if (!tool) {
    await submit({
      toolCallId,
      toolName,
      status: 'failed',
      error: `frontend tool ${toolName} is not registered`,
    });
    return;
  }

  const available = typeof tool.available === 'function' ? tool.available() : tool.available !== false;
  if (!available) {
    await submit({
      toolCallId,
      toolName,
      status: 'failed',
      error: `frontend tool ${toolName} is not available`,
    });
    return;
  }

  if (tool.mode === 'human') {
    pendingHumanTools.add(toolCallId);
    return;
  }

  if (tool.mode === 'backend' || !('execute' in tool)) {
    await submit({
      toolCallId,
      toolName,
      status: 'failed',
      error: `frontend tool ${toolName} is registered as ${tool.mode ?? 'unknown'} and cannot execute in the browser`,
    });
    return;
  }

  const controller = new AbortController();
  activeControllers.set(toolCallId, controller);
  try {
    const input = normalizeRecord(payload.input);
    const result = await tool.execute(input, { signal: controller.signal, toolCallId });
    await submit({
      toolCallId,
      toolName,
      status: 'success',
      result: normalizeRecord(result),
    });
  } catch (err) {
    await submit({
      toolCallId,
      toolName,
      status: controller.signal.aborted ? 'cancelled' : 'failed',
      error: err instanceof Error ? err.message : String(err),
    });
  } finally {
    activeControllers.delete(toolCallId);
  }
}

export function isPendingHumanTool(toolCallId: string): boolean {
  return pendingHumanTools.has(toolCallId);
}

export async function respondToHumanTool(args: {
  toolCallId: string;
  toolName: string;
  result?: Record<string, unknown>;
  status?: 'success' | 'denied' | 'failed' | 'cancelled';
  error?: string;
}) {
  if (!submitToolResult) {
    throw new Error('frontend tool runtime is not configured');
  }
  pendingHumanTools.delete(args.toolCallId);
  await submitToolResult({
    toolCallId: args.toolCallId,
    toolName: args.toolName,
    status: args.status ?? 'success',
    result: args.result ?? {},
    error: args.error,
  });
}

function normalizeRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { value };
  }
  return value as Record<string, unknown>;
}
