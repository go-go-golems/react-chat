import { defineWidget, type WidgetProps } from '../widgets/widgetRegistry';

type CheckoutNudgeInternalProps = {
  label: string;
  checkoutUrl: string;
  reason: string;
};

export function CheckoutNudgeWidget({ props: rawProps }: WidgetProps) {
  const p = rawProps as unknown as CheckoutNudgeInternalProps;

  return (
    <div className="border-2 border-mac-black px-3 py-2">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-bold uppercase">{p.label || 'Checkout'}</div>
          {p.reason && (
            <div className="text-[10px] text-mac-gray-2 mt-0.5">{p.reason}</div>
          )}
        </div>
        <button
          onClick={() => window.open(p.checkoutUrl, '_blank')}
          className="px-3 py-1 border border-mac-black bg-mac-black text-mac-white text-[11px] font-bold uppercase hover:bg-mac-white hover:text-mac-black"
        >
          GO →
        </button>
      </div>
    </div>
  );
}

export const checkoutNudgeWidget = defineWidget('CheckoutNudge', CheckoutNudgeWidget);
