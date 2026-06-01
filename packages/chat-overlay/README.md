# @go-go-golems/chat-overlay

Floating React chat overlay UI and retro theme for `@go-go-golems/chat-provider`.

## Install

```bash
pnpm add @go-go-golems/chat-provider @go-go-golems/chat-overlay
```

## Usage

```tsx
import { ChatProvider } from '@go-go-golems/chat-provider';
import { ChatOverlayProvider } from '@go-go-golems/chat-overlay';
import '@go-go-golems/chat-overlay/theme/retro-mac.css';

export function App() {
  return (
    <ChatProvider config={{ basePrefix: '' }}>
      <ChatOverlayProvider />
    </ChatProvider>
  );
}
```

## Exports

- `@go-go-golems/chat-overlay` — overlay React components.
- `@go-go-golems/chat-overlay/theme/retro-mac.css` — default retro Mac theme CSS.
