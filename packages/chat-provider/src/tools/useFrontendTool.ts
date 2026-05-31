import { useEffect } from 'react';
import { useChatOverlay } from '../core/context';
import type { FrontendTool } from './toolRegistry';

export function useFrontendTool<TInput, TResult>(tool: FrontendTool<TInput, TResult>, deps: unknown[] = []) {
  const overlay = useChatOverlay();

  useEffect(() => {
    const unregister = overlay.tools.register(tool);
    void overlay.tools.syncManifest();
    return () => {
      unregister();
      void overlay.tools.syncManifest();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overlay, ...deps]);
}
