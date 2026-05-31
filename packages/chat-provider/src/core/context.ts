import { createContext, useContext } from 'react';
import type { ChatClient } from './createChatClient';
import type { ToolRuntime } from '../tools/toolRuntime';

export type ChatRuntimeContextValue = {
  client: ChatClient;
  toolRuntime: ToolRuntime;
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
