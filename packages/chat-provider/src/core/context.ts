import { createContext, useContext } from 'react';
import type { ChatOverlay } from '../core/createChatOverlay';

export const ChatOverlayContext = createContext<ChatOverlay | null>(null);

export function useChatOverlay(): ChatOverlay {
  const overlay = useContext(ChatOverlayContext);
  if (!overlay) {
    throw new Error('useChatOverlay must be used within a <ChatOverlayProvider>');
  }
  return overlay;
}
