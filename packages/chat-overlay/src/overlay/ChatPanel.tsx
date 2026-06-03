import { useMemo } from 'react';
import { useChatClient } from '@go-go-golems/chat-provider';
import { useChatSelector, selectOverlay, selectTimelineEntities } from '@go-go-golems/chat-provider';
import { ChatMessages } from './ChatMessages';
import { ChatComposer } from './ChatComposer';
import { useStickyScrollFollow } from './useStickyScrollFollow';

export function ChatPanel() {
  const client = useChatClient();
  const { isOpen, runStatus, wsStatus, error, sessionId } = useChatSelector(selectOverlay);
  const entities = useChatSelector(selectTimelineEntities);
  const contentVersion = useMemo(() => entities.map((entity) => `${entity.id}:${entity.kind}:${entity.props.status ?? ''}:${String(entity.props.content ?? '').length}`).join('|'), [entities]);
  const isStreaming = runStatus === 'streaming';
  const scroll = useStickyScrollFollow({
    enabled: isOpen,
    contentVersion,
    resetKey: sessionId,
  });

  if (!isOpen) return null;

  return (
    <div className="chat-overlay-panel">
      {/* Header */}
      <div className="chat-overlay-panel-header">
        <span className="chat-overlay-panel-title">CHAT</span>
        <div className="chat-overlay-panel-actions">
          <StatusIndicator status={wsStatus} />
          <button
            onClick={() => client.close()}
            className="chat-overlay-close-button"
          >
            ×
          </button>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scroll.containerRef}
        onScroll={scroll.onScroll}
        onWheel={scroll.onWheel}
        className="chat-overlay-messages-scroll"
      >
        <ChatMessages bottomRef={scroll.tailRef} />
      </div>

      {scroll.mode === 'detached' && (
        <button
          type="button"
          onClick={scroll.jumpToLatest}
          className="chat-overlay-jump-button"
        >
          Jump to latest
        </button>
      )}

      {/* Error bar */}
      {error && (
        <div className="chat-overlay-error-bar">
          {error}
        </div>
      )}

      {/* Status bar */}
      {isStreaming && (
        <div className="chat-overlay-streaming-bar">
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
    subscribed: '●',
    disconnected: '○',
    connecting: '◐',
    closed: '○',
    error: '✕',
  };
  const color: Record<string, string> = {
    connected: 'text-mac-black',
    hydrated: 'text-mac-black',
    subscribed: 'text-mac-black',
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
