import { useEffect } from 'react';
import { useChatOverlay } from './context';
import { installToolkit, type ChatOverlayToolkit } from './toolkit';

export function useToolkit(toolkit: ChatOverlayToolkit, deps: unknown[] = []) {
  const overlay = useChatOverlay();

  useEffect(() => {
    return installToolkit(overlay, toolkit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overlay, ...deps]);
}
