import { type ReactNode, useMemo } from 'react';
import { Provider } from 'react-redux';
import { createChatClient, type ChatProviderConfig } from '../core/createChatClient';
import { ChatRuntimeContext } from '../core/context';
import { installChatExtensions, normalizeChatExtensions } from '../core/extensions';
import { ChatReduxContext, createChatStore } from '../store/store';
import { createToolRegistry } from '../tools/toolRegistry';
import { createToolRuntime } from '../tools/toolRuntime';
import { createTimelineAdapterRegistry } from '../ws/timelineAdapterRegistry';
import { coreTimelineAdapters } from '../ws/timelineEvents';
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
    const adapterRegistry = createTimelineAdapterRegistry();
    for (const adapter of coreTimelineAdapters) adapterRegistry.register(adapter);

    let submitToolResult: Parameters<typeof createToolRuntime>[0]['submitToolResult'] = async () => {
      throw new Error('chat client is not initialized');
    };
    const toolRuntime = createToolRuntime({
      registry: toolRegistry,
      submitToolResult: (result) => submitToolResult(result),
      onDebugEvent: config?.onDebugEvent,
    });
    const client = createChatClient({
      config,
      store,
      toolRegistry,
      toolRuntime,
      adapterRegistry,
      wsManager: createWsManager(config?.transport),
    });
    submitToolResult = client.tools.submitResult;

    const context = { client, toolRuntime, toolRegistry, widgetRegistry, adapterRegistry };
    installChatExtensions(
      { client, tools: toolRegistry, widgets: widgetRegistry, timelineAdapters: adapterRegistry },
      normalizeChatExtensions(config),
    );
    return { store, context };
  }, [config]);

  return (
    <Provider store={runtime.store} context={ChatReduxContext}>
      <ChatRuntimeContext.Provider value={runtime.context}>
        {children}
      </ChatRuntimeContext.Provider>
    </Provider>
  );
}
