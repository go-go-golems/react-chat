import { useEffect } from 'react';
import { useChatClient } from '../core/context';
import type { ToolDefinition } from './toolRegistry';

export function useTool(tool: ToolDefinition, deps: unknown[] = []) {
  const client = useChatClient();

  useEffect(() => {
    function syncManifestInBackground(): void {
      void client.tools.syncManifest().catch(() => undefined);
    }

    const unregister = client.tools.register(tool, { owner: `react-hook:${tool.name}` });
    syncManifestInBackground();
    return () => {
      unregister();
      syncManifestInBackground();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, ...deps]);
}
