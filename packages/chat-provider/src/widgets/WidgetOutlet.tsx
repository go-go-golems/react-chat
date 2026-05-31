import { getWidgetDefinition, type WidgetProps } from './widgetRegistry';
import { UnknownWidget } from './UnknownWidget';

export function WidgetOutlet({ instanceId, widgetName, status, props }: WidgetProps) {
  const def = getWidgetDefinition(widgetName);

  if (!def) {
    return <UnknownWidget instanceId={instanceId} widgetName={widgetName} status={status} props={props} />;
  }

  const Component = def.component;
  return <Component instanceId={instanceId} widgetName={widgetName} status={status} props={props} />;
}
