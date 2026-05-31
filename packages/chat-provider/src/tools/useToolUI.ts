import { useEffect } from 'react';
import { useChatOverlay } from '../core/context';
import type { BackendToolUI } from './toolRegistry';

export function useToolUI<TInput, TResult>(toolUI: BackendToolUI<TInput, TResult>, deps: unknown[] = []) {
  const overlay = useChatOverlay();

  useEffect(() => {
    const unregister = overlay.tools.register(toolUI);
    void overlay.tools.syncManifest();
    return () => {
      unregister();
      void overlay.tools.syncManifest();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overlay, ...deps]);
}
