import { useChatRuntime } from '../core/context';
import { UnknownWidget } from './UnknownWidget';
import type { WidgetProps } from './widgetRegistry';

export function WidgetOutlet({ instanceId, widgetName, status, props }: WidgetProps) {
  const { widgetRegistry } = useChatRuntime();
  const def = widgetRegistry.get(widgetName);

  if (!def) {
    return <UnknownWidget instanceId={instanceId} widgetName={widgetName} status={status} props={props} />;
  }

  const Component = def.component;
  return <Component instanceId={instanceId} widgetName={widgetName} status={status} props={props} />;
}
