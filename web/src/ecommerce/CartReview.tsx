import { defineWidget, type WidgetProps } from '../widgets/widgetRegistry';

type CartItem = {
  id: string;
  title: string;
  variant: string;
  quantity: number;
  price: string;
};

type CartReviewInternalProps = {
  items: CartItem[];
  subtotal: string;
  recommendation: string;
};

export function CartReviewWidget({ props: rawProps }: WidgetProps) {
  const p = rawProps as unknown as CartReviewInternalProps;
  const items = p.items || [];

  return (
    <div className="border border-mac-black">
      <div className="border-b border-mac-black px-3 py-1.5">
        <span className="text-[11px] font-bold uppercase tracking-wider">Cart Review</span>
      </div>

      <div className="p-2 space-y-1">
        {items.map((item) => (
          <div key={item.id} className="flex justify-between text-xs">
            <div className="flex-1 min-w-0">
              <span className="font-bold">{item.title}</span>
              <span className="text-mac-gray-2 ml-1">×{item.quantity}</span>
              <div className="text-[10px] text-mac-gray-3">{item.variant}</div>
            </div>
            <span className="text-mac-gray-1 font-mono">{item.price}</span>
          </div>
        ))}
      </div>

      <div className="border-t border-mac-black px-3 py-1.5 flex justify-between">
        <span className="text-xs font-bold uppercase">Subtotal</span>
        <span className="text-xs font-bold font-mono">{p.subtotal}</span>
      </div>

      {p.recommendation && (
        <div className="border-t border-mac-gray-4 px-3 py-1 text-[10px] text-mac-gray-2 italic">
          {p.recommendation}
        </div>
      )}
    </div>
  );
}

export const cartReviewWidget = defineWidget('CartReview', CartReviewWidget);
