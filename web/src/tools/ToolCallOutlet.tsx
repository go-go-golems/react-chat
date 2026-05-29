type ToolCallOutletProps = {
  toolCallId: string;
  toolName: string;
  status: string;
  input?: Record<string, unknown>;
  result?: Record<string, unknown>;
  error?: string;
};

export function ToolCallOutlet({ toolCallId, toolName, status, input, result, error }: ToolCallOutletProps) {
  const statusText = status || 'requested';
  return (
    <div className="border border-mac-black bg-mac-white shadow-mac p-2 text-xs" data-testid="tool-call-card">
      <div className="flex items-center justify-between border-b border-mac-gray-3 pb-1 mb-1">
        <span className="font-bold uppercase">browser tool</span>
        <span className="text-[10px] text-mac-gray-2" data-testid="tool-call-status">{statusText}</span>
      </div>
      <div className="font-mono text-[11px]" data-testid="tool-call-name">{toolName}</div>
      <div className="text-[10px] text-mac-gray-3 mb-1">{toolCallId}</div>
      {input ? (
        <pre className="bg-mac-gray-5 border border-mac-gray-4 p-1 overflow-auto text-[10px]">{JSON.stringify(input, null, 2)}</pre>
      ) : null}
      {result ? (
        <pre className="mt-1 bg-mac-gray-5 border border-mac-gray-4 p-1 overflow-auto text-[10px]" data-testid="tool-call-result">{JSON.stringify(result, null, 2)}</pre>
      ) : null}
      {error ? <div className="mt-1 text-[10px] text-mac-black">Error: {error}</div> : null}
    </div>
  );
}
