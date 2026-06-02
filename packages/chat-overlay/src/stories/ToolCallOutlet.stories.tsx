import type { Meta, StoryObj } from '@storybook/react-vite';
import { ToolCallOutlet } from '@go-go-golems/chat-provider';
import { defineToolUI } from '../tools/toolRegistry';

const meta = {
  title: 'Chat Overlay/ToolCallOutlet',
  component: ToolCallOutlet,
  parameters: { layout: 'centered' },
} satisfies Meta<typeof ToolCallOutlet>;

export default meta;
type Story = StoryObj<typeof meta>;

defineToolUI({
  name: 'catalog_search',
  mode: 'backend',
  description: 'Render backend catalog search tool calls.',
  render: ({ input, result, status }) => {
    const query = typeof input === 'object' && input && 'query' in input ? String(input.query) : '';
    const products = typeof result === 'object' && result && 'products' in result && Array.isArray(result.products)
      ? result.products
      : [];
    return (
      <div className="border border-mac-black bg-mac-gray-5 p-2 text-[10px]">
        <div className="font-bold uppercase">Catalog Search UI</div>
        <div>Status: {status}</div>
        <div>Query: {query}</div>
        <div>Matches: {products.length}</div>
      </div>
    );
  },
});

export const AutomaticFrontendTool: Story = {
  args: {
    toolCallId: 'tool-cart-add-1',
    toolName: 'cart_add',
    status: 'success',
    input: { sku: 'retro-boot', quantity: 1 },
    result: { ok: true, cartCount: 1 },
  },
};

export const BackendToolUI: Story = {
  args: {
    toolCallId: 'tool-catalog-search-1',
    toolName: 'catalog_search',
    status: 'success',
    input: { query: 'boots' },
    result: { products: [{ id: 'boot-1' }, { id: 'boot-2' }] },
  },
};

export const FailedTool: Story = {
  args: {
    toolCallId: 'tool-failed-1',
    toolName: 'cart_add',
    status: 'failed',
    input: { sku: '' },
    error: 'invalid input for frontend tool cart_add: sku: Too small',
  },
};
