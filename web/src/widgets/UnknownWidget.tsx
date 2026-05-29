import type { WidgetProps } from './widgetRegistry';

export function UnknownWidget({ widgetName, status, props }: WidgetProps) {
  return (
    <div className="border border-mac-black px-3 py-2 bg-mac-gray-5">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] uppercase font-bold text-mac-gray-2">
          widget:{widgetName}
        </span>
        <span className="text-[10px] text-mac-gray-3">{status}</span>
      </div>
      <pre className="text-[10px] text-mac-gray-2 whitespace-pre-wrap break-words max-h-24 overflow-y-auto">
        {JSON.stringify(props, null, 2)}
      </pre>
    </div>
  );
}
