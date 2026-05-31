import type { ChatClient } from './createChatClient';
import type { ToolDefinition } from '../tools/toolRegistry';
import type { WidgetDefinition } from '../widgets/widgetRegistry';

export type ChatToolkit = {
  name?: string;
  tools?: ToolDefinition[];
  widgets?: WidgetDefinition[];
  install?: (client: ChatClient) => void | (() => void);
};

export function defineToolkit<T extends ChatToolkit>(toolkit: T): T {
  return toolkit;
}

export function installToolkit(client: ChatClient, toolkit: ChatToolkit): () => void {
  const cleanupFns: Array<() => void> = [];

  for (const tool of toolkit.tools ?? []) {
    cleanupFns.push(client.tools.register(tool));
  }

  const customCleanup = toolkit.install?.(client);
  if (typeof customCleanup === 'function') {
    cleanupFns.push(customCleanup);
  }

  void client.tools.syncManifest();

  return () => {
    for (let i = cleanupFns.length - 1; i >= 0; i--) {
      cleanupFns[i]?.();
    }
    void client.tools.syncManifest();
  };
}
