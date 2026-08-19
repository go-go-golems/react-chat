import { useState, useCallback, type KeyboardEvent } from 'react';
import { useChatClient } from '@go-go-golems/chat-provider';
import { useChatSelector, selectOverlay } from '@go-go-golems/chat-provider';

export function ChatComposer({ disabled = false }: { disabled?: boolean }) {
  const [text, setText] = useState('');
  const client = useChatClient();
  const { runStatus } = useChatSelector(selectOverlay);

  const send = useCallback(() => {
    if (!text.trim()) return;
    void client.send({ prompt: text.trim() }).catch(() => undefined);
    setText('');
  }, [client, text]);

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        send();
      }
    },
    [send],
  );

  return (
    <div className="chat-overlay-composer">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKeyDown}
        disabled={disabled}
        placeholder={disabled ? 'generating...' : 'Type a message...'}
        rows={1}
        className="chat-overlay-composer-input"
      />
      <button
        onClick={send}
        disabled={disabled || !text.trim()}
        className="chat-overlay-composer-button"
      >
        SEND
      </button>
      {runStatus === 'streaming' && (
        <button
          onClick={() => { void client.stop().catch(() => undefined); }}
          className="chat-overlay-composer-button"
        >
          STOP
        </button>
      )}
    </div>
  );
}
