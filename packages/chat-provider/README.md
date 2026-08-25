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

## Migrating to 0.5

Version 0.5 makes the SessionStream transport the shared owner of WebSocket lifecycle behavior. It adds typed protobuf-JSON frame decoding, heartbeat pong replies, bounded reconnect, snapshot hydration, and committed-ordinal resume.

This is a breaking pre-1.0 release:

- `send` accepts a `SendMessageRequest` rather than a bare string.
- session creation, upload, removal, and message submission use typed request objects;
- persistence behavior is selected through `sessionPolicy`;
- authentication and WebSocket URL customization use the request and URL hooks in `ChatProviderConfig`;
- attachment references are first-class message inputs;
- raw-frame diagnostics are disabled unless explicitly enabled.

Consumers should remove local heartbeat and reconnect loops after adopting 0.5. The shared transport must remain the single owner of ping/pong, backoff, resubscription, and resume cursors.

## Executor assignment contract

The next breaking package release requires a server that implements the concise frontend-tool executor contract. Each browser tab keeps a `clientInstanceId` in `sessionStorage`, each ready transport generation creates a fresh `connectionId`, and the server returns an `assignmentId` from manifest synchronization.

Requests and results carry the complete executor tuple:

```ts
type FrontendToolExecutor = {
  clientInstanceId: string;
  connectionId: string;
  assignmentId: string;
};
```

The runtime filters a request before automatic execution or human presentation unless it exactly matches the acknowledged tuple. Result retries retain the invocation's original tuple even if a reconnect or another tab changes current ownership.

Manifest responses must include the exact accepted revision and assignment:

```json
{
  "accepted": true,
  "revision": 12,
  "executor": {
    "clientInstanceId": "client-a",
    "connectionId": "connection-a1",
    "assignmentId": "assignment-1"
  }
}
```

Missing, partial, stale, or mismatched assignments fail closed. There is no legacy unassigned execution fallback.

Tests and non-browser hosts can inject deterministic identity behavior:

```tsx
<ChatProvider
  config={{
    executorIdentity: {
      clientInstanceId: "test-client",
      createId: () => crypto.randomUUID(),
    },
  }}
>
  <App />
</ChatProvider>
```

Production normally omits this option and uses `sessionStorage` plus `crypto.randomUUID()`.
