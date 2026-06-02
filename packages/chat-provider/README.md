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

## Tool naming convention

Frontend and human tool names must be provider-safe because manifests may be forwarded to model providers such as OpenAI Responses. Use only letters, numbers, underscores, and hyphens (`^[a-zA-Z0-9_-]+$`). Prefer names such as `cart_add`, `checkout_confirm`, or `catalog_search`; do not use dotted names such as `cart.add`.

`defineTool`, `defineToolUI`, and `ChatToolRegistry.register` validate this convention so provider errors are caught in the browser/runtime before a model request is sent.

## Backend contract

The default client creates sessions, sends messages, submits tool manifests/results, and subscribes to websocket timeline events using the configured `basePrefix` and `apiBase`.
