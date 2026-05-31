import type React from 'react';

export type WidgetProps = {
  instanceId: string;
  widgetName: string;
  status: string;
  props: Record<string, unknown>;
};

export type WidgetDefinition = {
  name: string;
  component: React.ComponentType<WidgetProps>;
};

const registry = new Map<string, WidgetDefinition>();

export function defineWidget(
  name: string,
  component: React.ComponentType<WidgetProps>,
): WidgetDefinition {
  const def = { name, component };
  registry.set(name, def);
  return def;
}

export function getWidgetDefinition(name: string): WidgetDefinition | undefined {
  return registry.get(name);
}

export function getAllWidgetDefinitions(): WidgetDefinition[] {
  return Array.from(registry.values());
}

export function clearWidgetRegistry() {
  registry.clear();
}
