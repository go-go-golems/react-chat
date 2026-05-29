import { useChatOverlay } from '../core/context';
import { useAppSelector, selectOverlay } from '../store/store';
import { ChatMessages } from './ChatMessages';
import { ChatComposer } from './ChatComposer';

export function ChatPanel() {
  const overlay = useChatOverlay();
  const { isOpen, runStatus, wsStatus, error } = useAppSelector(selectOverlay);

  if (!isOpen) return null;

  const isStreaming = runStatus === 'streaming';

  return (
    <div className={[
      'fixed bottom-16 right-4 z-40',
      'w-96 h-[32rem]',
      'border-2 border-mac-black bg-mac-white',
      'flex flex-col',
      'shadow-none',
    ].join(' ')}>
      {/* Header */}
      <div className="border-b-2 border-mac-black px-3 py-2 flex items-center justify-between">
        <span className="font-bold text-sm tracking-wide">CHAT</span>
        <div className="flex items-center gap-2">
          <StatusIndicator status={wsStatus} />
          <button
            onClick={() => overlay.close()}
            className="w-5 h-5 border border-mac-black flex items-center justify-center text-xs font-bold hover:bg-mac-black hover:text-mac-white"
          >
            ×
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        <ChatMessages />
      </div>

      {/* Error bar */}
      {error && (
        <div className="border-t-2 border-mac-black px-3 py-1.5 bg-mac-black text-mac-white text-xs">
          {error}
        </div>
      )}

      {/* Status bar */}
      {isStreaming && (
        <div className="border-t border-mac-gray-4 px-3 py-1 text-xs text-mac-gray-2">
          <span className="cursor-blink">▌</span> generating...
        </div>
      )}

      {/* Composer */}
      <ChatComposer disabled={isStreaming} />
    </div>
  );
}

function StatusIndicator({ status }: { status: string }) {
  const label: Record<string, string> = {
    connected: '●',
    hydrated: '●',
    disconnected: '○',
    connecting: '◐',
    closed: '○',
    error: '✕',
  };
  const color: Record<string, string> = {
    connected: 'text-mac-black',
    hydrated: 'text-mac-black',
    disconnected: 'text-mac-gray-3',
    connecting: 'text-mac-gray-2',
    closed: 'text-mac-gray-3',
    error: 'text-mac-black',
  };
  return (
    <span className={`text-xs ${color[status] ?? 'text-mac-gray-3'}`} title={status}>
      {label[status] ?? '?'}
    </span>
  );
}
