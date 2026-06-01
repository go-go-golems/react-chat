# React Chat

Reusable React packages for embedding a websocket-backed assistant chat runtime and a floating overlay UI.

## Packages

- `@go-go-golems/chat-provider` — provider runtime, Redux state, websocket timeline projection, frontend tool registration, and widget registration APIs.
- `@go-go-golems/chat-overlay` — floating chat bubble/panel UI and the retro Mac CSS theme built on top of the provider package.

## Install

```bash
pnpm add @go-go-golems/chat-provider @go-go-golems/chat-overlay
```

```tsx
import { ChatProvider } from '@go-go-golems/chat-provider';
import { ChatOverlayProvider } from '@go-go-golems/chat-overlay';
import '@go-go-golems/chat-overlay/theme/retro-mac.css';

export function App() {
  return (
    <ChatProvider config={{ basePrefix: '' }}>
      <main>Your application</main>
      <ChatOverlayProvider />
    </ChatProvider>
  );
}
```

## Backend contract

The provider expects a backend exposing:

- `POST /api/chat/sessions`
- `POST /api/chat/sessions/{sessionId}/messages`
- `POST /api/chat/sessions/{sessionId}/stop`
- `POST /api/chat/sessions/{sessionId}/tools/manifest`
- `POST /api/chat/sessions/{sessionId}/tools/results`
- a websocket endpoint derived from the configured `basePrefix`

## Development

```bash
pnpm install
pnpm -r typecheck
pnpm test
npm run build:publish
npm run pack:smoke
```

Publishing is handled by the manual `publish-npm` GitHub Actions workflow.
