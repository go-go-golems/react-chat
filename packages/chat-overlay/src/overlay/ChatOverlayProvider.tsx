import { type ReactNode } from 'react';
import { ChatProvider, type ChatProviderConfig } from '@go-go-golems/chat-provider';
import '../theme/retro-mac.css';

export type ChatOverlayProviderProps = {
  children: ReactNode;
  config?: ChatProviderConfig;
};

export function ChatOverlayProvider({ children, config }: ChatOverlayProviderProps) {
  return (
    <ChatProvider config={config}>
      <div className="chat-overlay-root">
        {children}
      </div>
    </ChatProvider>
  );
}
