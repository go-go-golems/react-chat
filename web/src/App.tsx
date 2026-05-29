import { useRef, useState } from 'react';
import { ChatOverlayProvider, ChatPanel, ChatBubble, useFrontendTool } from './core/index';
import './ecommerce'; // register ecommerce widgets

type DemoCartItem = {
  sku: string;
  name: string;
  quantity: number;
};

function DemoCartTool() {
  const [items, setItems] = useState<DemoCartItem[]>([]);
  const itemsRef = useRef<DemoCartItem[]>([]);

  useFrontendTool<Record<string, unknown>, Record<string, unknown>>({
    name: 'cart.add',
    description: 'Add one product to the local browser demo cart.',
    inputSchema: {
      type: 'object',
      properties: {
        sku: { type: 'string' },
        name: { type: 'string' },
        quantity: { type: 'number' },
      },
      required: ['sku'],
    },
    execute: async (input) => {
      const sku = String(input.sku || 'unknown-sku');
      const name = String(input.name || sku);
      const quantity = Number(input.quantity || 1);
      const next = [...itemsRef.current, { sku, name, quantity }];
      itemsRef.current = next;
      setItems(next);
      const cartCount = next.reduce((sum, item) => sum + item.quantity, 0);
      return { ok: true, cartCount, added: { sku, name, quantity } };
    },
  }, []);

  const count = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="border-2 border-mac-black bg-mac-white p-3 text-xs shadow-mac" data-testid="demo-cart">
      <div className="flex items-center justify-between border-b border-mac-gray-3 pb-1 mb-2">
        <span className="font-bold uppercase">Browser demo cart</span>
        <span data-testid="demo-cart-count">{count} item{count === 1 ? '' : 's'}</span>
      </div>
      <p className="text-mac-gray-2 mb-2">
        The page registers a client-side tool named <code className="font-mono">cart.add</code>.
        Ask the chat to <strong>add boots to cart</strong> to run it in the browser.
      </p>
      {items.length === 0 ? (
        <p className="text-mac-gray-3 italic">No browser-side cart items yet.</p>
      ) : (
        <ul className="space-y-1" data-testid="demo-cart-items">
          {items.map((item, index) => (
            <li key={`${item.sku}-${index}`} className="font-mono">
              {item.quantity} × {item.name} ({item.sku})
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function App() {
  return (
    <ChatOverlayProvider config={{ basePrefix: '' }}>
      <div className="min-h-screen bg-mac-gray-5 p-8">
        <div className="max-w-2xl mx-auto space-y-4">
          <div>
            <h1 className="text-2xl font-bold mb-2 font-mono">Chat Overlay</h1>
            <p className="text-sm text-mac-gray-2 mb-2">
              Type a message to start a conversation. Try: "show me boots", "review my cart", "checkout", or "add boots to cart".
            </p>
            <p className="text-xs text-mac-gray-3">
              Smoke test: open the chat bubble and send <span className="font-mono">add boots to cart</span>. The backend will request browser tool <span className="font-mono">cart.add</span>, the page will execute it, and the assistant will continue after the result returns.
            </p>
          </div>
          <DemoCartTool />
        </div>
      </div>
      <ChatPanel />
      <ChatBubble />
    </ChatOverlayProvider>
  );
}
