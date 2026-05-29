import { defineWidget, type WidgetProps } from '../widgets/widgetRegistry';

// ─── Types ───────────────────────────────────────────────────────────

type Money = { amount: number; currency: string };
type ProductCard = {
  id: string;
  handle: string;
  title: string;
  imageUrl: string;
  price: Money;
  badges: string[];
};

type ProductCarouselInternalProps = {
  title: string;
  products: ProductCard[];
  reason: string;
};

// ─── Component ───────────────────────────────────────────────────────

export function ProductCarouselWidget({ status, props: rawProps }: WidgetProps) {
  const p = rawProps as unknown as ProductCarouselInternalProps;
  const isStreaming = status === 'STREAMING' || status === 'WIDGET_STATUS_STREAMING';
  const products = p.products || [];

  return (
    <div className="border border-mac-black">
      {/* Title bar */}
      <div className="border-b border-mac-black px-3 py-1.5 flex items-center justify-between bg-mac-white">
        <span className="text-[11px] font-bold uppercase tracking-wider">{p.title || 'Products'}</span>
        <span className="text-[10px] text-mac-gray-3">
          {isStreaming ? 'loading...' : `${products.length} items`}
        </span>
      </div>

      {/* Products */}
      <div className="p-2 space-y-1.5">
        {products.map((product) => (
          <div key={product.id} className="flex gap-2 items-start border-b border-mac-gray-4 pb-1.5 last:border-b-0">
            {/* Product image placeholder */}
            <div className="w-10 h-10 border border-mac-black bg-mac-gray-5 flex-shrink-0 flex items-center justify-center text-[8px] text-mac-gray-3">
              IMG
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold truncate">{product.title}</div>
              <div className="text-[10px] text-mac-gray-2">
                {product.price?.currency === 'USD' ? '$' : ''}{product.price?.amount?.toFixed(2)}
              </div>
              {product.badges?.length > 0 && (
                <div className="flex gap-1 mt-0.5">
                  {product.badges.map((badge) => (
                    <span key={badge} className="text-[9px] border border-mac-black px-1">
                      {badge}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Streaming placeholder */}
        {isStreaming && products.length === 0 && (
          <div className="text-xs text-mac-gray-3 italic">
            <span className="cursor-blink">▌</span> loading products...
          </div>
        )}
      </div>

      {/* Reason */}
      {p.reason && (
        <div className="border-t border-mac-gray-4 px-3 py-1 text-[10px] text-mac-gray-2 italic">
          {p.reason}
        </div>
      )}
    </div>
  );
}

// ─── Registration ────────────────────────────────────────────────────

export const productCarouselWidget = defineWidget('ProductCarousel', ProductCarouselWidget);
