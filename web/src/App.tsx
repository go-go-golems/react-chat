import { useRef, useState } from 'react';
import { z } from 'zod';
import { ChatOverlayProvider, ChatPanel, ChatBubble, useFrontendTool, useHumanTool } from './core/index';
import './ecommerce'; // register ecommerce widgets

type DemoCartItem = {
  sku: string;
  name: string;
  quantity: number;
};

const CartAddInputSchema = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  quantity: z.number().int().positive().default(1),
  reason: z.string().optional(),
});

const CartAddResultSchema = z.object({
  ok: z.boolean(),
  cartCount: z.number().int().nonnegative(),
  added: z.object({
    sku: z.string(),
    name: z.string(),
    quantity: z.number().int().positive(),
  }),
});

const CheckoutConfirmInputSchema = z.object({
  subtotal: z.string().min(1),
  reason: z.string().min(1),
});

const CheckoutConfirmResultSchema = z.object({
  approved: z.boolean(),
  approvalCount: z.number().int().nonnegative().optional(),
});

const CHAT_OVERLAY_CONFIG = { basePrefix: '' };

function DemoTools() {
  const [items, setItems] = useState<DemoCartItem[]>([]);
  const [checkoutApprovals, setCheckoutApprovals] = useState(0);
  const itemsRef = useRef<DemoCartItem[]>([]);

  useFrontendTool<z.infer<typeof CartAddInputSchema>, z.infer<typeof CartAddResultSchema>>({
    name: 'cart.add',
    description: 'Add one product to the local browser demo cart.',
    parameters: CartAddInputSchema,
    resultSchema: CartAddResultSchema,
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

  useHumanTool<z.infer<typeof CheckoutConfirmInputSchema>, z.infer<typeof CheckoutConfirmResultSchema>>({
    name: 'checkout.confirm',
    description: 'Ask the user to confirm before opening checkout.',
    mode: 'human',
    parameters: CheckoutConfirmInputSchema,
    resultSchema: CheckoutConfirmResultSchema,
    render: ({ input, respond, reject }) => (
      <div className="border border-mac-black p-2 bg-mac-gray-5" data-testid="checkout-approval-card">
        <div className="font-bold uppercase mb-1">Approve checkout?</div>
        <p className="mb-2">{String(input.reason || 'The assistant wants to open checkout.')}</p>
        <p className="mb-2 font-mono">Subtotal: {String(input.subtotal || '$149.99')}</p>
        <div className="flex gap-2">
          <button
            className="border border-mac-black px-2 py-1 bg-mac-white hover:bg-mac-black hover:text-mac-white"
            data-testid="approve-checkout"
            onClick={() => {
              setCheckoutApprovals((count) => count + 1);
              respond({ approved: true, approvalCount: checkoutApprovals + 1 });
            }}
          >
            APPROVE
          </button>
          <button
            className="border border-mac-black px-2 py-1 bg-mac-white hover:bg-mac-black hover:text-mac-white"
            data-testid="deny-checkout"
            onClick={() => reject('User denied checkout approval')}
          >
            DENY
          </button>
        </div>
      </div>
    ),
  }, [checkoutApprovals]);

  const count = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="border-2 border-mac-black bg-mac-white p-3 text-xs shadow-mac" data-testid="demo-cart">
      <div className="flex items-center justify-between border-b border-mac-gray-3 pb-1 mb-2">
        <span className="font-bold uppercase">Browser demo cart</span>
        <span data-testid="demo-cart-count">{count} item{count === 1 ? '' : 's'} · {checkoutApprovals} approval{checkoutApprovals === 1 ? '' : 's'}</span>
      </div>
      <p className="text-mac-gray-2 mb-2">
        The page registers a client-side tool named <code className="font-mono">cart.add</code>.
        Ask the chat to <strong>add boots to cart</strong> to run it in the browser, or <strong>approve checkout</strong> to test a human approval tool.
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
    <ChatOverlayProvider config={CHAT_OVERLAY_CONFIG}>
      <div className="min-h-screen bg-mac-gray-5 p-8">
        <div className="max-w-2xl mx-auto space-y-4">
          <div>
            <h1 className="text-2xl font-bold mb-2 font-mono">Chat Overlay</h1>
            <p className="text-sm text-mac-gray-2 mb-2">
              Type a message to start a conversation. Try: "show me boots", "review my cart", "checkout", "add boots to cart", or "approve checkout".
            </p>
            <p className="text-xs text-mac-gray-3">
              Smoke test: open the chat bubble and send <span className="font-mono">add boots to cart</span>. The backend will request browser tool <span className="font-mono">cart.add</span>, the page will execute it, and the assistant will continue after the result returns.
            </p>
          </div>
          <DemoTools />
        </div>
      </div>
      <ChatPanel />
      <ChatBubble />
    </ChatOverlayProvider>
  );
}
