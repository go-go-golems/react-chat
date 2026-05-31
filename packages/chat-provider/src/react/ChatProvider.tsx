import { type ReactNode, useMemo } from 'react';
import { Provider } from 'react-redux';
import { createChatClient, type ChatProviderConfig } from '../core/createChatClient';
import { ChatRuntimeContext } from '../core/context';
import { installChatExtensions, normalizeChatExtensions } from '../core/extensions';
import { createChatStore } from '../store/store';
import { createToolRegistry } from '../tools/toolRegistry';
import { createToolRuntime } from '../tools/toolRuntime';
import { coreChatProjector } from '../ws/timelineEvents';
import { createTimelineProjectorRegistry } from '../ws/projectorRegistry';
import { createWidgetRegistry } from '../widgets/widgetRegistry';
import { createWsManager } from '../ws/wsManager';

export type ChatProviderProps = {
  children: ReactNode;
  config?: ChatProviderConfig;
};

export function ChatProvider({ children, config }: ChatProviderProps) {
  const runtime = useMemo(() => {
    const store = createChatStore();
    const toolRegistry = createToolRegistry();
    const widgetRegistry = createWidgetRegistry();
    const projectorRegistry = createTimelineProjectorRegistry();
    projectorRegistry.register(coreChatProjector);

    let submitToolResult: Parameters<typeof createToolRuntime>[0]['submitToolResult'] = async () => {
      throw new Error('chat client is not initialized');
    };
    const toolRuntime = createToolRuntime({
      registry: toolRegistry,
      submitToolResult: (result) => submitToolResult(result),
    });
    const client = createChatClient({
      config,
      store,
      toolRegistry,
      toolRuntime,
      projectorRegistry,
      wsManager: createWsManager(),
    });
    submitToolResult = client.tools.submitResult;

    const context = { client, toolRuntime, toolRegistry, widgetRegistry, projectorRegistry };
    installChatExtensions(
      { client, tools: toolRegistry, widgets: widgetRegistry, projectors: projectorRegistry },
      normalizeChatExtensions(config),
    );
    return { store, context };
  }, [config]);

  return (
    <Provider store={runtime.store}>
      <ChatRuntimeContext.Provider value={runtime.context}>
        {children}
      </ChatRuntimeContext.Provider>
    </Provider>
  );
}
