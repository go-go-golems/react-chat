import { useEffect } from 'react';
import { useChatClient } from '../core/context';
import type { HumanTool } from './toolRegistry';

export function useHumanTool<TInput, TResult>(tool: HumanTool<TInput, TResult>, deps: unknown[] = []) {
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
