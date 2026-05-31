import { useChatClient } from '@go-go-golems/chat-provider';
import { useAppSelector, selectOverlay } from '@go-go-golems/chat-provider';

export function ChatBubble() {
  const client = useChatClient();
  const { isOpen } = useAppSelector(selectOverlay);

  return (
    <button
      onClick={() => client.toggle()}
      className="chat-overlay-bubble"
      title={isOpen ? 'Close chat' : 'Open chat'}
    >
      {isOpen ? '×' : '💬'}
    </button>
  );
}
