import type { Meta, StoryObj } from '@storybook/react';
import { ChatOverlayProvider, ChatPanel } from '../core/index';
import '../ecommerce';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { timelineSlice, type TimelineEntity } from '../store/timelineSlice';
import { overlaySlice } from '../store/overlaySlice';

function makeStore(entities: TimelineEntity[] = [], overlayState = {}) {
  const byId: Record<string, TimelineEntity> = {};
  const order: string[] = [];
  for (const e of entities) {
    byId[e.id] = e;
    order.push(e.id);
  }
  return configureStore({
    reducer: {
      timeline: timelineSlice.reducer,
      overlay: overlaySlice.reducer,
    },
    preloadedState: {
      timeline: { byId, order },
      overlay: {
        sessionId: 'test-session',
        runStatus: 'idle',
        wsStatus: 'connected',
        isOpen: true,
        error: null,
        ...overlayState,
      },
    },
  });
}

const meta: Meta<typeof ChatPanel> = {
  title: 'Overlay/ChatPanel',
  component: ChatPanel,
  decorators: [
    (Story, { parameters }) => {
      const store = parameters.store ?? makeStore();
      return (
        <Provider store={store}>
          <ChatOverlayProvider>
            <div className="chat-overlay-root" style={{ position: 'relative', height: '600px' }}>
              <Story />
            </div>
          </ChatOverlayProvider>
        </Provider>
      );
    },
  ],
};

export default meta;
type Story = StoryObj<typeof ChatPanel>;

export const Empty: Story = {
  parameters: {
    store: makeStore([]),
  },
};

export const WithMessages: Story = {
  parameters: {
    store: makeStore([
      {
        id: 'msg-1',
        kind: 'message',
        createdAt: Date.now(),
        props: { role: 'user', content: 'show me boots', status: 'accepted' },
      },
      {
        id: 'msg-2',
        kind: 'message',
        createdAt: Date.now(),
        props: { role: 'assistant', content: 'Here are some great boots I found for you:', status: 'finished' },
      },
    ]),
  },
};

export const Streaming: Story = {
  parameters: {
    store: makeStore(
      [
        {
          id: 'msg-1',
          kind: 'message',
          createdAt: Date.now(),
          props: { role: 'user', content: 'hello', status: 'accepted' },
        },
        {
          id: 'msg-2:text:1',
          kind: 'message',
          createdAt: Date.now(),
          props: { role: 'assistant', content: 'Here are some gr', status: 'streaming', streaming: true },
        },
      ],
      { runStatus: 'streaming' },
    ),
  },
};

export const WithWidget: Story = {
  parameters: {
    store: makeStore([
      {
        id: 'msg-1',
        kind: 'message',
        createdAt: Date.now(),
        props: { role: 'user', content: 'show me boots', status: 'accepted' },
      },
      {
        id: 'msg-2',
        kind: 'message',
        createdAt: Date.now(),
        props: { role: 'assistant', content: 'Here are some great boots:', status: 'finished' },
      },
      {
        id: 'widget-1',
        kind: 'widget',
        createdAt: Date.now(),
        props: {
          instanceId: 'widget-1',
          widgetName: 'ProductCarousel',
          status: 'READY',
          props: {
            title: 'Recommended Boots',
            products: [
              { id: 'boot-1', title: 'TrailBlazer Pro', price: { amount: 149.99, currency: 'USD' }, badges: ['Best Seller'], imageUrl: '' },
              { id: 'boot-2', title: 'ArcticShield Deluxe', price: { amount: 199.99, currency: 'USD' }, badges: ['New'], imageUrl: '' },
              { id: 'boot-3', title: 'UrbanWalker Everyday', price: { amount: 89.99, currency: 'USD' }, badges: [], imageUrl: '' },
            ],
            reason: 'Based on your interest in outdoor gear',
          },
        },
      },
    ]),
  },
};

export const WithCartReview: Story = {
  parameters: {
    store: makeStore([
      {
        id: 'msg-1',
        kind: 'message',
        createdAt: Date.now(),
        props: { role: 'user', content: 'review my cart', status: 'accepted' },
      },
      {
        id: 'msg-2',
        kind: 'message',
        createdAt: Date.now(),
        props: { role: 'assistant', content: "Here's what's in your cart:", status: 'finished' },
      },
      {
        id: 'widget-1',
        kind: 'widget',
        createdAt: Date.now(),
        props: {
          instanceId: 'widget-1',
          widgetName: 'CartReview',
          status: 'READY',
          props: {
            items: [
              { id: 'item-1', title: 'TrailBlazer Pro', variant: 'Size 10 / Brown', quantity: 1, price: '$149.99' },
              { id: 'item-2', title: 'Wool Socks 3-Pack', variant: 'One Size', quantity: 2, price: '$24.99' },
            ],
            subtotal: '$199.97',
            recommendation: 'Add the ArcticShield Deluxe for 20% off!',
          },
        },
      },
    ]),
  },
};

export const WithCheckoutNudge: Story = {
  parameters: {
    store: makeStore([
      {
        id: 'msg-1',
        kind: 'message',
        createdAt: Date.now(),
        props: { role: 'user', content: 'checkout', status: 'accepted' },
      },
      {
        id: 'msg-2',
        kind: 'message',
        createdAt: Date.now(),
        props: { role: 'assistant', content: "Ready to check out? Here's a quick summary:", status: 'finished' },
      },
      {
        id: 'widget-1',
        kind: 'widget',
        createdAt: Date.now(),
        props: {
          instanceId: 'widget-1',
          widgetName: 'CheckoutNudge',
          status: 'READY',
          props: {
            label: 'Complete Your Order',
            checkoutUrl: 'https://example.com/checkout',
            reason: 'Your cart total is $199.97. Free shipping on orders over $150!',
          },
        },
      },
    ]),
  },
};

export const WithUnknownWidget: Story = {
  parameters: {
    store: makeStore([
      {
        id: 'msg-1',
        kind: 'message',
        createdAt: Date.now(),
        props: { role: 'assistant', content: 'Here is a custom widget:', status: 'finished' },
      },
      {
        id: 'widget-1',
        kind: 'widget',
        createdAt: Date.now(),
        props: {
          instanceId: 'widget-1',
          widgetName: 'CustomWidget',
          status: 'READY',
          props: { customField: 'custom value', count: 42 },
        },
      },
    ]),
  },
};

export const ErrorState: Story = {
  parameters: {
    store: makeStore(
      [
        {
          id: 'msg-1',
          kind: 'message',
          createdAt: Date.now(),
          props: { role: 'user', content: 'error test', status: 'accepted' },
        },
      ],
      { error: 'Something went wrong during inference' },
    ),
  },
};
