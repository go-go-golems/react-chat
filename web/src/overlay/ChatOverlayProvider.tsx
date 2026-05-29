import { type ReactNode, useMemo } from 'react';
import { Provider } from 'react-redux';
import { store } from '../store/store';
import { createChatOverlay } from '../core/index';
import { ChatOverlayContext } from '../core/context';
import '../theme/retro-mac.css';

export type ChatOverlayProviderProps = {
  children: ReactNode;
  config?: Parameters<typeof createChatOverlay>[0];
};

export function ChatOverlayProvider({ children, config }: ChatOverlayProviderProps) {
  const overlay = useMemo(() => createChatOverlay(config), [config]);

  return (
    <Provider store={store}>
      <ChatOverlayContext.Provider value={overlay}>
        <div className="chat-overlay-root">
          {children}
        </div>
      </ChatOverlayContext.Provider>
    </Provider>
  );
}
