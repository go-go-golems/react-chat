import { useChatOverlay } from '@go-go-golems/chat-provider';
import { useAppSelector, selectOverlay } from '@go-go-golems/chat-provider';

export function ChatBubble() {
  const overlay = useChatOverlay();
  const { isOpen } = useAppSelector(selectOverlay);

  return (
    <button
      onClick={() => overlay.toggle()}
      className={[
        'fixed bottom-4 right-4 z-50',
        'w-10 h-10',
        'border-2 border-mac-black bg-mac-white',
        'flex items-center justify-center',
        'text-lg font-bold leading-none',
        'hover:bg-mac-black hover:text-mac-white',
        'transition-colors duration-0',
        'select-none',
      ].join(' ')}
      title={isOpen ? 'Close chat' : 'Open chat'}
    >
      {isOpen ? '×' : '💬'}
    </button>
  );
}
