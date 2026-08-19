import { useMemo } from 'react';
import { useChatClient, type TransportStatus } from '@go-go-golems/chat-provider';
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

export function getConnectionStatusPresentation(status: TransportStatus): { label: string; color: string } {
  const presentation: Record<TransportStatus, { label: string; color: string }> = {
    idle: { label: '○', color: 'text-mac-gray-3' },
    connecting: { label: '◐', color: 'text-mac-gray-2' },
    'socket-open': { label: '◐', color: 'text-mac-gray-2' },
    subscribing: { label: '◐', color: 'text-mac-gray-2' },
    hydrating: { label: '◐', color: 'text-mac-gray-2' },
    ready: { label: '●', color: 'text-mac-black' },
    backoff: { label: '↻', color: 'text-mac-gray-2' },
    stopped: { label: '○', color: 'text-mac-gray-3' },
    failed: { label: '✕', color: 'text-mac-black' },
  };
  return presentation[status];
}

function StatusIndicator({ status }: { status: TransportStatus }) {
  const presentation = getConnectionStatusPresentation(status);
  return (
    <span className={`text-xs ${presentation.color}`} title={status}>
      {presentation.label}
    </span>
  );
}
