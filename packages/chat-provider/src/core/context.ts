import { createContext, useContext } from 'react';
import type { ToolRuntime } from '../tools/toolRuntime';
import type { ToolRegistry } from '../tools/toolRegistry';
import type { TimelineProjectorRegistry } from '../ws/projectorRegistry';
import type { WidgetRegistry } from '../widgets/widgetRegistry';
import type { ChatClient } from './createChatClient';

export type ChatRuntimeContextValue = {
  client: ChatClient;
  toolRuntime: ToolRuntime;
  toolRegistry: ToolRegistry;
  widgetRegistry: WidgetRegistry;
  projectorRegistry: TimelineProjectorRegistry;
};

export const ChatRuntimeContext = createContext<ChatRuntimeContextValue | null>(null);

export function useChatRuntime(): ChatRuntimeContextValue {
  const runtime = useContext(ChatRuntimeContext);
  if (!runtime) throw new Error('useChatRuntime must be used within <ChatProvider>');
  return runtime;
}

export function useChatClient(): ChatClient {
  return useChatRuntime().client;
}
