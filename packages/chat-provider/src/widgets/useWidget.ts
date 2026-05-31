import { useEffect } from 'react';
import { useChatRuntime } from '../core/context';
import type { WidgetDefinition } from './widgetRegistry';

export function useWidget(widget: WidgetDefinition, deps: unknown[] = []) {
  const { widgetRegistry } = useChatRuntime();

  useEffect(() => {
    return widgetRegistry.register(widget);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [widgetRegistry, ...deps]);
}
