import { useEffect } from 'react';
import { useChatRuntime } from './context';
import { installChatExtension, type ChatExtension } from './extensions';

export function useChatExtensions(extension: ChatExtension, deps: unknown[] = []) {
  const runtime = useChatRuntime();

  useEffect(() => {
    return installChatExtension(
      {
        client: runtime.client,
        tools: runtime.toolRegistry,
        widgets: runtime.widgetRegistry,
        projectors: runtime.projectorRegistry,
      },
      extension,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runtime, ...deps]);
}
