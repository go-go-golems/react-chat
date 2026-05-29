import { useState, useCallback, type KeyboardEvent } from 'react';
import { useChatOverlay } from '../core/context';
import { useAppSelector, selectOverlay } from '../store/store';

export function ChatComposer({ disabled = false }: { disabled?: boolean }) {
  const [text, setText] = useState('');
  const overlay = useChatOverlay();
  const { runStatus } = useAppSelector(selectOverlay);

  const send = useCallback(() => {
    if (!text.trim()) return;
    overlay.send(text.trim());
    setText('');
  }, [overlay, text]);

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
    <div className="border-t-2 border-mac-black p-2 flex gap-2">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKeyDown}
        disabled={disabled}
        placeholder={disabled ? 'generating...' : 'Type a message...'}
        rows={1}
        className={[
          'flex-1 resize-none',
          'border border-mac-black px-2 py-1',
          'font-mono text-xs',
          'bg-mac-white text-mac-black',
          'placeholder:text-mac-gray-3',
          'focus:outline-none focus:border-2 focus:border-mac-black',
          disabled ? 'opacity-50 cursor-not-allowed' : '',
        ].join(' ')}
      />
      <button
        onClick={send}
        disabled={disabled || !text.trim()}
        className={[
          'px-3 py-1',
          'border border-mac-black',
          'font-mono text-xs font-bold',
          'bg-mac-white text-mac-black',
          'hover:bg-mac-black hover:text-mac-white',
          'disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-mac-white disabled:hover:text-mac-black',
        ].join(' ')}
      >
        SEND
      </button>
      {runStatus === 'streaming' && (
        <button
          onClick={() => overlay.stop()}
          className="px-2 py-1 border border-mac-black font-mono text-xs font-bold bg-mac-white hover:bg-mac-black hover:text-mac-white"
        >
          STOP
        </button>
      )}
    </div>
  );
}
