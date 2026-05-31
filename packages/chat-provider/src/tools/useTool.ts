import { useEffect } from 'react';
import { useChatClient } from '../core/context';
import type { ToolDefinition } from './toolRegistry';

export function useTool(tool: ToolDefinition, deps: unknown[] = []) {
  const client = useChatClient();

  useEffect(() => {
    const unregister = client.tools.register(tool);
    void client.tools.syncManifest();
    return () => {
      unregister();
      void client.tools.syncManifest();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, ...deps]);
}
