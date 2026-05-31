import type { Meta, StoryObj } from '@storybook/react';
import { ChatBubble } from '@go-go-golems/chat-provider';
import { ChatOverlayProvider } from '@go-go-golems/chat-provider';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { timelineSlice } from '../store/timelineSlice';
import { overlaySlice } from '../store/overlaySlice';

const meta: Meta<typeof ChatBubble> = {
  title: 'Overlay/ChatBubble',
  component: ChatBubble,
  decorators: [
    (Story, { parameters }) => {
      const store = configureStore({
        reducer: { timeline: timelineSlice.reducer, overlay: overlaySlice.reducer },
        preloadedState: {
          timeline: { byId: {}, order: [] },
          overlay: {
            sessionId: '',
            runStatus: 'idle',
            wsStatus: 'disconnected',
            isOpen: parameters.isOpen ?? false,
            error: null,
          },
        },
      });
      return (
        <Provider store={store}>
          <ChatOverlayProvider>
            <div className="chat-overlay-root" style={{ position: 'relative', height: '200px' }}>
              <Story />
            </div>
          </ChatOverlayProvider>
        </Provider>
      );
    },
  ],
};

export default meta;
type Story = StoryObj<typeof ChatBubble>;

export const Closed: Story = {
  parameters: { isOpen: false },
};

export const Open: Story = {
  parameters: { isOpen: true },
};
