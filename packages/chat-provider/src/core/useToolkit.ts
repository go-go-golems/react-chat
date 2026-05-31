import { useEffect } from 'react';
import { useChatClient } from './context';
import { installToolkit, type ChatToolkit } from './toolkit';

export function useToolkit(toolkit: ChatToolkit, deps: unknown[] = []) {
  const client = useChatClient();

  useEffect(() => {
    return installToolkit(client, toolkit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, ...deps]);
}
