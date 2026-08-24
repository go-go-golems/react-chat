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
  const owner = toolkit.name?.trim() || 'chat-provider.toolkit';

  for (const tool of toolkit.tools ?? []) {
    cleanupFns.push(client.tools.register(tool, { owner }));
  }

  const customCleanup = toolkit.install?.(client);
  if (typeof customCleanup === 'function') {
    cleanupFns.push(customCleanup);
  }

  syncManifestInBackground(client);

  return () => {
    for (let i = cleanupFns.length - 1; i >= 0; i--) {
      cleanupFns[i]?.();
    }
    syncManifestInBackground(client);
  };
}

function syncManifestInBackground(client: ChatClient): void {
  void client.tools.syncManifest().catch(() => undefined);
}
