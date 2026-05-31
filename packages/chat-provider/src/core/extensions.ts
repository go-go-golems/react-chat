import type { ToolDefinition, ToolRegistry } from '../tools/toolRegistry';
import type { TimelineProjector, TimelineProjectorRegistry } from '../ws/projectorRegistry';
import type { WidgetDefinition, WidgetRegistry } from '../widgets/widgetRegistry';
import type { ChatClient } from './createChatClient';

export type ChatRuntimeApi = {
  client: ChatClient;
  tools: ToolRegistry;
  widgets: WidgetRegistry;
  projectors: TimelineProjectorRegistry;
};

export type ChatExtension = {
  name?: string;
  tools?: ToolDefinition[];
  widgets?: WidgetDefinition[];
  projectors?: TimelineProjector[];
  install?: (runtime: ChatRuntimeApi) => void | (() => void);
};

export type ChatExtensionConfig = {
  extensions?: ChatExtension[];
  tools?: ToolDefinition[];
  widgets?: WidgetDefinition[];
  projectors?: TimelineProjector[];
};

export function defineChatExtensions<T extends ChatExtension>(extension: T): T {
  return extension;
}

export function normalizeChatExtensions(config?: ChatExtensionConfig): ChatExtension[] {
  const extensions = [...(config?.extensions ?? [])];
  if (config?.tools?.length || config?.widgets?.length || config?.projectors?.length) {
    extensions.unshift({
      name: 'chat-provider.config',
      tools: config.tools,
      widgets: config.widgets,
      projectors: config.projectors,
    });
  }
  return extensions;
}

export function installChatExtension(runtime: ChatRuntimeApi, extension: ChatExtension): () => void {
  const cleanupFns: Array<() => void> = [];

  for (const tool of extension.tools ?? []) cleanupFns.push(runtime.tools.register(tool));
  for (const widget of extension.widgets ?? []) cleanupFns.push(runtime.widgets.register(widget));
  for (const projector of extension.projectors ?? []) cleanupFns.push(runtime.projectors.register(projector));

  const customCleanup = extension.install?.(runtime);
  if (typeof customCleanup === 'function') cleanupFns.push(customCleanup);

  void runtime.client.tools.syncManifest();

  return () => {
    for (let i = cleanupFns.length - 1; i >= 0; i--) cleanupFns[i]?.();
    void runtime.client.tools.syncManifest();
  };
}

export function installChatExtensions(runtime: ChatRuntimeApi, extensions: ChatExtension[]): () => void {
  const cleanupFns = extensions.map((extension) => installChatExtension(runtime, extension));
  return () => {
    for (let i = cleanupFns.length - 1; i >= 0; i--) cleanupFns[i]?.();
  };
}
