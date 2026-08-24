import { useSyncExternalStore } from 'react';
import { parseToolInput, parseToolResult, type HumanTool } from './toolRegistry';
import { useChatRuntime } from '../core/context';

type ToolCallOutletProps = {
  toolCallId: string;
  toolName: string;
  status: string;
  input?: unknown;
  result?: unknown;
  error?: string;
};

export function ToolCallOutlet({ toolCallId, toolName, status, input, result, error }: ToolCallOutletProps) {
  const { client, toolRuntime } = useChatRuntime();
  const tool = client.tools.get(toolName);
  const sessionId = client.getStore().getState().overlay.sessionId ?? '';
  const runtimePhase = useSyncExternalStore(
    toolRuntime.subscribe,
    () => toolRuntime.stateOf(toolCallId, sessionId)?.phase ?? null,
    () => null,
  );
  const isHuman = tool?.mode === 'human' && runtimePhase === 'waiting-human' && !result;

  if (isHuman && tool && 'render' in tool) {
    let parsedInput: unknown = input ?? {};
    try {
      parsedInput = parseToolInput(tool, input ?? {});
    } catch {
      // Keep raw input visible; validation failures are submitted by the runtime.
    }
    return (
      <div className="border border-mac-black p-2 bg-mac-gray-5" data-testid="human-tool-card">
        {(tool as HumanTool<any, any>).render({
          toolCallId,
          toolName,
          input: parsedInput,
          status,
          respond: (value) => {
            void toolRuntime.completeHumanTool({ sessionId, toolCallId, toolName, status: 'success', result: value });
          },
          reject: (message = 'User denied the request') => {
            void toolRuntime.completeHumanTool({ sessionId, toolCallId, toolName, status: 'denied', result: { approved: false }, error: message });
          },
        })}
      </div>
    );
  }

  if (tool?.mode === 'human' && runtimePhase === 'completing' && !result) {
    return (
      <div className="border border-mac-black p-2 bg-mac-gray-5 text-xs" data-testid="human-tool-responding" aria-live="polite">
        submitting response…
      </div>
    );
  }

  if (tool?.mode === 'backend' && 'render' in tool && typeof tool.render === 'function') {
    let parsedInput: unknown = input ?? {};
    let parsedResult: unknown = result;
    try { parsedInput = parseToolInput(tool, input ?? {}); } catch { /* keep raw */ }
    if (result !== undefined) {
      try { parsedResult = parseToolResult(tool, result); } catch { /* keep raw */ }
    }
    return <>{tool.render({ input: parsedInput as any, result: parsedResult as any, status })}</>;
  }

  return (
    <div className="border border-mac-black p-2 bg-mac-gray-5 text-xs space-y-1" data-testid="tool-call-card">
      <div className="flex items-center justify-between gap-2">
        <span className="font-bold uppercase">browser tool</span>
        <span className="border border-mac-black px-1" data-testid="tool-call-status">{status}</span>
      </div>
      <div className="font-mono" data-testid="tool-call-name">{toolName}</div>
      <div className="font-mono text-mac-gray-2" data-testid="tool-call-id">{toolCallId}</div>
      {input !== undefined && (
        <pre className="whitespace-pre-wrap break-words border border-mac-gray-4 p-1 bg-mac-white" data-testid="tool-call-input">
          {JSON.stringify(input, null, 2)}
        </pre>
      )}
      {result !== undefined && (
        <pre className="whitespace-pre-wrap break-words border border-mac-gray-4 p-1 bg-mac-white" data-testid="tool-call-result">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
      {error && <div className="text-mac-gray-1" data-testid="tool-call-error">{error}</div>}
    </div>
  );
}
