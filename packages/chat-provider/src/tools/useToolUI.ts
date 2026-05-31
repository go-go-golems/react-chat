import { useEffect } from 'react';
import { useChatClient } from '../core/context';
import type { BackendToolUI } from './toolRegistry';

export function useToolUI<TInput, TResult>(tool: BackendToolUI<TInput, TResult>, deps: unknown[] = []) {
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
