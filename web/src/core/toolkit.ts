import type { ChatOverlay } from './createChatOverlay';
import type { ToolDefinition } from '../tools/toolRegistry';
import type { WidgetDefinition } from '../widgets/widgetRegistry';

export type ChatOverlayToolkit = {
  name?: string;
  tools?: ToolDefinition[];
  widgets?: WidgetDefinition[];
  install?: (overlay: ChatOverlay) => void | (() => void);
};

export function defineToolkit<T extends ChatOverlayToolkit>(toolkit: T): T {
  return toolkit;
}

export function installToolkit(overlay: ChatOverlay, toolkit: ChatOverlayToolkit): () => void {
  const cleanupFns: Array<() => void> = [];

  for (const tool of toolkit.tools ?? []) {
    cleanupFns.push(overlay.tools.register(tool));
  }

  const customCleanup = toolkit.install?.(overlay);
  if (typeof customCleanup === 'function') {
    cleanupFns.push(customCleanup);
  }

  void overlay.tools.syncManifest();

  return () => {
    for (const cleanup of cleanupFns.toReversed()) {
      cleanup();
    }
    void overlay.tools.syncManifest();
  };
}
