# @go-go-golems/chat-provider

Provider runtime, state, websocket, frontend tool, and widget primitives for embeddable React chat.

## Install

```bash
pnpm add @go-go-golems/chat-provider
```

## Usage

```tsx
import { ChatProvider, useChatClient } from '@go-go-golems/chat-provider';

function OpenChatButton() {
  const client = useChatClient();
  return <button onClick={() => client.open()}>Open chat</button>;
}

export function App() {
  return (
    <ChatProvider config={{ basePrefix: '' }}>
      <OpenChatButton />
    </ChatProvider>
  );
}
```

## Public API

The root export includes:

- `ChatProvider`
- `useChatClient`
- `useChatRuntime`
- `createChatClient`
- Chat-scoped Redux helpers such as `useChatSelector`, `useChatDispatch`, `selectOverlay`, and `selectTimelineEntities`
- tool APIs such as `defineTool`, `defineToolUI`, `useFrontendTool`, and `ToolCallOutlet`
- widget APIs such as `defineWidget`, `useWidget`, and `WidgetOutlet`
- timeline adapter APIs for projecting websocket events into UI state

## Backend contract

The default client creates sessions, sends messages, submits tool manifests/results, and subscribes to websocket timeline events using the configured `basePrefix` and `apiBase`.
