import type { ToolDefinition, ToolRegistry } from '../tools/toolRegistry';
import type { TimelineAdapter, TimelineAdapterRegistry } from '../ws/timelineAdapterRegistry';
import type { WidgetDefinition, WidgetRegistry } from '../widgets/widgetRegistry';
import type { ChatClient } from './createChatClient';

export type ChatRuntimeApi = {
  client: ChatClient;
  tools: ToolRegistry;
  widgets: WidgetRegistry;
  timelineAdapters: TimelineAdapterRegistry;
};

export type ChatExtension = {
  name?: string;
  tools?: ToolDefinition[];
  widgets?: WidgetDefinition[];
  timelineAdapters?: TimelineAdapter[];
  install?: (runtime: ChatRuntimeApi) => void | (() => void);
};

export type ChatExtensionConfig = {
  extensions?: ChatExtension[];
  tools?: ToolDefinition[];
  widgets?: WidgetDefinition[];
  timelineAdapters?: TimelineAdapter[];
};

export function defineChatExtensions<T extends ChatExtension>(extension: T): T {
  return extension;
}

export function normalizeChatExtensions(config?: ChatExtensionConfig): ChatExtension[] {
  const extensions = [...(config?.extensions ?? [])];
  if (config?.tools?.length || config?.widgets?.length || config?.timelineAdapters?.length) {
    extensions.unshift({
      name: 'chat-provider.config',
      tools: config.tools,
      widgets: config.widgets,
      timelineAdapters: config.timelineAdapters,
    });
  }
  return extensions;
}

export function installChatExtension(runtime: ChatRuntimeApi, extension: ChatExtension): () => void {
  const cleanupFns: Array<() => void> = [];
  const owner = extension.name?.trim() || 'chat-provider.extension';

  for (const tool of extension.tools ?? []) cleanupFns.push(runtime.tools.register(tool, { owner }));
  for (const widget of extension.widgets ?? []) cleanupFns.push(runtime.widgets.register(widget));
  for (const adapter of extension.timelineAdapters ?? []) cleanupFns.push(runtime.timelineAdapters.register(adapter));

  const customCleanup = extension.install?.(runtime);
  if (typeof customCleanup === 'function') cleanupFns.push(customCleanup);

  syncManifestInBackground(runtime.client);

  return () => {
    for (let i = cleanupFns.length - 1; i >= 0; i--) cleanupFns[i]?.();
    syncManifestInBackground(runtime.client);
  };
}

function syncManifestInBackground(client: ChatClient): void {
  void client.tools.syncManifest().catch(() => undefined);
}

export function installChatExtensions(runtime: ChatRuntimeApi, extensions: ChatExtension[]): () => void {
  const cleanupFns = extensions.map((extension) => installChatExtension(runtime, extension));
  return () => {
    for (let i = cleanupFns.length - 1; i >= 0; i--) cleanupFns[i]?.();
  };
}
