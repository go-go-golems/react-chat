import { ChatProvider, WidgetOutlet } from '@go-go-golems/chat-provider';
import type { Meta, StoryObj } from '@storybook/react';

import { ecommerceExtensions } from '../../../web/src/ecommerce';
import '../theme/retro-mac.css';

const meta: Meta<typeof WidgetOutlet> = {
  title: 'Widgets/WidgetOutlet',
  component: WidgetOutlet,
  decorators: [
    (Story) => {
      return (
        <ChatProvider config={{ extensions: [ecommerceExtensions] }}>
          <div className="chat-overlay-root" style={{ width: '384px' }}>
            <Story />
          </div>
        </ChatProvider>
      );
    },
  ],
};

export default meta;
type Story = StoryObj<typeof WidgetOutlet>;

export const ProductCarousel: Story = {
  args: {
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
};

export const ProductCarouselStreaming: Story = {
  args: {
    instanceId: 'widget-2',
    widgetName: 'ProductCarousel',
    status: 'STREAMING',
    props: {
      title: 'Recommended Boots',
      products: [
        { id: 'boot-1', title: 'TrailBlazer Pro', price: { amount: 149.99, currency: 'USD' }, badges: ['Best Seller'], imageUrl: '' },
      ],
      reason: '',
    },
  },
};

export const ProductCarouselEmpty: Story = {
  args: {
    instanceId: 'widget-3',
    widgetName: 'ProductCarousel',
    status: 'STREAMING',
    props: {
      title: 'Searching...',
      products: [],
      reason: '',
    },
  },
};

export const CartReview: Story = {
  args: {
    instanceId: 'widget-4',
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
};

export const CheckoutNudge: Story = {
  args: {
    instanceId: 'widget-5',
    widgetName: 'CheckoutNudge',
    status: 'READY',
    props: {
      label: 'Complete Your Order',
      checkoutUrl: 'https://example.com/checkout',
      reason: 'Your cart total is $199.97. Free shipping on orders over $150!',
    },
  },
};

export const UnknownWidget: Story = {
  args: {
    instanceId: 'widget-6',
    widgetName: 'WeatherWidget',
    status: 'READY',
    props: {
      city: 'San Francisco',
      temperature: 18,
      condition: 'Foggy',
    },
  },
};
