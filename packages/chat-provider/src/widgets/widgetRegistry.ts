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

export type WidgetRegistry = {
  register: (widget: WidgetDefinition) => () => void;
  get: (name: string) => WidgetDefinition | undefined;
  list: () => WidgetDefinition[];
  revision: () => number;
};

export class ChatWidgetRegistry implements WidgetRegistry {
  private widgets = new Map<string, WidgetDefinition>();
  private registryRevision = 0;

  register(widget: WidgetDefinition): () => void {
    const name = widget.name.trim();
    if (!name) throw new Error('widget requires a name');
    const normalized = { ...widget, name };
    this.widgets.set(name, normalized);
    this.registryRevision++;
    return () => {
      const current = this.widgets.get(name);
      if (current === normalized) {
        this.widgets.delete(name);
        this.registryRevision++;
      }
    };
  }

  get(name: string): WidgetDefinition | undefined {
    return this.widgets.get(name);
  }

  list(): WidgetDefinition[] {
    return Array.from(this.widgets.values());
  }

  revision(): number {
    return this.registryRevision;
  }
}

export function createWidgetRegistry(): WidgetRegistry {
  return new ChatWidgetRegistry();
}

export function defineWidget(name: string, component: React.ComponentType<WidgetProps>): WidgetDefinition {
  return { name, component };
}
