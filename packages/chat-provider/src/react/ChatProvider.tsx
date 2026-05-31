import { type ReactNode, useMemo } from 'react';
import { Provider } from 'react-redux';
import { createChatOverlay } from '../core/createChatOverlay';
import { ChatOverlayContext } from '../core/context';
import { store } from '../store/store';

export type ChatProviderProps = {
  children: ReactNode;
  config?: Parameters<typeof createChatOverlay>[0];
};

export function ChatProvider({ children, config }: ChatProviderProps) {
  const client = useMemo(() => createChatOverlay(config), [config]);

  return (
    <Provider store={store}>
      <ChatOverlayContext.Provider value={client}>
        {children}
      </ChatOverlayContext.Provider>
    </Provider>
  );
}
