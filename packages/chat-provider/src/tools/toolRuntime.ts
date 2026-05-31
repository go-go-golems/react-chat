import { formatToolValidationError, parseToolInput, parseToolResult, type ToolRegistry } from './toolRegistry';
import type { CanonicalFrame } from '../ws/protocol';

type SubmitToolResult = (result: {
  toolCallId: string;
  toolName: string;
  status: 'success' | 'failed' | 'cancelled' | 'denied';
  result?: Record<string, unknown>;
  error?: string;
}) => Promise<void>;

export type ToolRuntime = {
  cancelActiveFrontendTools: () => void;
  handleFrontendToolUIEvent: (frame: CanonicalFrame) => void;
  isPendingHumanTool: (toolCallId: string) => boolean;
  respondToHumanTool: (args: {
    toolCallId: string;
    toolName: string;
    result?: Record<string, unknown>;
    status?: 'success' | 'denied' | 'failed' | 'cancelled';
    error?: string;
  }) => Promise<void>;
};

export function createToolRuntime(args: { registry: ToolRegistry; submitToolResult: SubmitToolResult }): ToolRuntime {
  const activeControllers = new Map<string, AbortController>();
  const pendingHumanTools = new Set<string>();

  function cancelActiveFrontendTools() {
    for (const controller of activeControllers.values()) {
      controller.abort();
    }
    activeControllers.clear();
    pendingHumanTools.clear();
  }

  function handleFrontendToolUIEvent(frame: CanonicalFrame) {
    const name = (frame as any).name as string;
    if (name !== 'ChatFrontendToolCallRequested') return;
    const payload = ((frame as any).payload as Record<string, unknown>) || {};
    void executeFrontendTool(payload);
  }

  async function executeFrontendTool(payload: Record<string, unknown>) {
    const toolCallId = String(payload.toolCallId || '');
    const toolName = String(payload.toolName || '');
    if (!toolCallId || !toolName) return;

    const tool = args.registry.get(toolName);
    if (!tool) {
      await args.submitToolResult({ toolCallId, toolName, status: 'failed', error: `frontend tool ${toolName} is not registered` });
      return;
    }

    const available = typeof tool.available === 'function' ? tool.available() : tool.available !== false;
    if (!available) {
      await args.submitToolResult({ toolCallId, toolName, status: 'failed', error: `frontend tool ${toolName} is not available` });
      return;
    }

    let input: unknown;
    try {
      input = parseToolInput(tool, normalizeRecord(payload.input));
    } catch (err) {
      await args.submitToolResult({
        toolCallId,
        toolName,
        status: 'failed',
        error: `invalid input for frontend tool ${toolName}: ${formatToolValidationError(err)}`,
      });
      return;
    }

    if (tool.mode === 'human') {
      pendingHumanTools.add(toolCallId);
      return;
    }

    if (tool.mode === 'backend' || !('execute' in tool)) {
      await args.submitToolResult({
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
      const result = await tool.execute(input, { signal: controller.signal, toolCallId });
      const parsedResult = parseToolResult(tool, result);
      await args.submitToolResult({ toolCallId, toolName, status: 'success', result: normalizeRecord(parsedResult) });
    } catch (err) {
      await args.submitToolResult({
        toolCallId,
        toolName,
        status: controller.signal.aborted ? 'cancelled' : 'failed',
        error: err instanceof Error ? err.message : String(err),
      });
    } finally {
      activeControllers.delete(toolCallId);
    }
  }

  function isPendingHumanTool(toolCallId: string): boolean {
    return pendingHumanTools.has(toolCallId);
  }

  async function respondToHumanTool(call: {
    toolCallId: string;
    toolName: string;
    result?: Record<string, unknown>;
    status?: 'success' | 'denied' | 'failed' | 'cancelled';
    error?: string;
  }) {
    pendingHumanTools.delete(call.toolCallId);
    await args.submitToolResult({
      toolCallId: call.toolCallId,
      toolName: call.toolName,
      status: call.status ?? 'success',
      result: call.result ?? {},
      error: call.error,
    });
  }

  return { cancelActiveFrontendTools, handleFrontendToolUIEvent, isPendingHumanTool, respondToHumanTool };
}

function normalizeRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { value };
  return value as Record<string, unknown>;
}
