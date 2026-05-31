import { useEffect } from 'react';
import { useChatOverlay } from '../core/context';
import type { HumanTool } from './toolRegistry';

export function useHumanTool<TInput, TResult>(tool: HumanTool<TInput, TResult>, deps: unknown[] = []) {
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
