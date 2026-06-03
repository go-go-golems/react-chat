---
Title: Private Redux Context and Chat Hook Rename Implementation Guide
Ticket: CHATOVERLAY-015
Status: active
Topics:
    - chat-provider
    - react
    - typescript
    - pinocchio
    - architecture
DocType: design-doc
Intent: long-term
Owners: []
RelatedFiles:
    - Path: 2026-05-27--ttc-design-system/web/packages/ttc-garden-assistant/src/features/chat/TtcGardenChatOverlay.tsx
      Note: TTC provider-store consumer updated to useChatSelector
    - Path: 2026-05-29--chatbot-overlay-glm/packages/chat-overlay/package.json
      Note: Bumps overlay to 0.2.0 for companion release using new provider hooks
    - Path: 2026-05-29--chatbot-overlay-glm/packages/chat-overlay/src/overlay/ChatPanel.tsx
      Note: Overlay consumer updated to use chat-scoped selector
    - Path: 2026-05-29--chatbot-overlay-glm/packages/chat-provider/package.json
      Note: Bumps provider to 0.2.0 for breaking hook rename release
    - Path: 2026-05-29--chatbot-overlay-glm/packages/chat-provider/src/index.ts
      Note: Public API exports for new hook names
    - Path: 2026-05-29--chatbot-overlay-glm/packages/chat-provider/src/react/ChatProvider.tsx
      Note: Renders provider store through private React-Redux context
    - Path: 2026-05-29--chatbot-overlay-glm/packages/chat-provider/src/store/store.ts
      Note: Defines private ChatReduxContext and chat-scoped selector/dispatch/store hooks
    - Path: pinocchio/cmd/web-chat/web/package.json
      Note: Temporarily points at rebuilt local provider dist until breaking API is published
    - Path: pinocchio/cmd/web-chat/web/src/features/web-chat/WebChatApp/WebChatApp.tsx
      Note: Pinocchio provider-store consumer updated to useChatSelector
ExternalSources: []
Summary: Design and implementation record for moving chat-provider onto a private React-Redux context and replacing ambiguous useAppSelector/useAppDispatch exports with chat-scoped hook names.
LastUpdated: 2026-06-02T21:58:00-04:00
WhatFor: Use before reviewing chat-provider Redux context changes or updating downstream consumers from useAppSelector to useChatSelector.
WhenToUse: Read when embedding ChatProvider inside another Redux app, updating Pinocchio/TTC consumers, or validating package dist builds after chat-provider API cleanup.
---



# Private Redux Context and Chat Hook Rename Implementation Guide

## Executive summary

`@go-go-golems/chat-provider` previously exported Redux hooks named `useAppSelector` and `useAppDispatch` and rendered its internal store through the default React-Redux context. That created two problems:

1. The names looked like host-application hooks rather than chat-provider hooks.
2. Rendering `<ChatProvider>` inside another Redux app could shadow the host app's default Redux context for all children.

This ticket hard-cuts the API to clearer names and a safer store boundary. There are intentionally no compatibility aliases. The package now exposes chat-scoped hooks:

```ts
useChatSelector
useChatDispatch
useChatStore
```

and `ChatProvider` passes a private `ChatReduxContext` to React-Redux's `<Provider>`. This lets downstream apps keep their own `useAppSelector` hooks for host state while using `useChatSelector` for provider timeline/overlay state.

The implementation also updates the known consumers:

- `packages/chat-overlay`
- `pinocchio/cmd/web-chat/web`
- `2026-05-27--ttc-design-system/web/packages/ttc-garden-assistant`

## Problem statement

The old provider store API was:

```ts
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
```

These hooks were bound to the default React-Redux context. That is acceptable for an app that has only one Redux store. It is fragile for a reusable package whose whole purpose is to be embedded in other apps.

The failure mode is easiest to see with CoinVault or Pinocchio:

```tsx
<Provider store={hostStore}>
  <ChatProvider config={config}>
    <HostComponentThatUsesHostUseAppSelector />
  </ChatProvider>
</Provider>
```

Before this ticket, `HostComponentThatUsesHostUseAppSelector` would see the nearest default Redux provider, which was the chat-provider store, not the host store. That makes app-local hooks unsafe below `ChatProvider`.

Pinocchio already had one example of this mixed state boundary: `ChatStatusbar/ExportMenu.tsx` uses Pinocchio's app-store selector under the provider-backed web-chat tree. A private provider context makes this safe.

## Proposed solution

Use React-Redux's custom context support. The provider creates a private context:

```ts
export const ChatReduxContext = createContext<ReactReduxContextValue | null>(null);
```

Then binds hooks to that context:

```ts
export const useChatDispatch = createDispatchHook(ChatReduxContext).withTypes<AppDispatch>();
export const useChatSelector = createSelectorHook(ChatReduxContext).withTypes<RootState>();
export const useChatStore = createStoreHook(ChatReduxContext).withTypes<ChatStore>();
```

Finally, `ChatProvider` renders:

```tsx
<Provider store={runtime.store} context={ChatReduxContext}>
  <ChatRuntimeContext.Provider value={runtime.context}>
    {children}
  </ChatRuntimeContext.Provider>
</Provider>
```

There are no `useAppSelector`/`useAppDispatch` aliases. Consumers must import the new names.

## API changes

### Removed exports

```ts
useAppSelector
useAppDispatch
```

### Added exports

```ts
ChatReduxContext
useChatSelector
useChatDispatch
useChatStore
```

### Kept exports

```ts
createChatStore
selectOverlay
selectTimelineEntities
ChatProvider
useChatClient
useChatRuntime
```

## Implementation summary

### chat-provider

Changed `packages/chat-provider/src/store/store.ts`:

- Imported `createContext` from React.
- Imported `createDispatchHook`, `createSelectorHook`, `createStoreHook`, and `ReactReduxContextValue` from React-Redux.
- Added `ChatReduxContext`.
- Replaced `useAppSelector`/`useAppDispatch` with `useChatSelector`/`useChatDispatch`/`useChatStore`.
- Memoized `selectTimelineEntities` with `createSelector` to remove the React-Redux selector stability warning seen in TTC browser/unit smokes.

Changed `packages/chat-provider/src/react/ChatProvider.tsx`:

- Passed `context={ChatReduxContext}` to React-Redux `Provider`.

Changed `packages/chat-provider/src/index.ts`:

- Exported the new chat-scoped hook names.
- Removed the old app-scoped hook names.

Changed `packages/chat-provider/README.md`:

- Documented chat-scoped Redux helpers.

### chat-overlay

Updated overlay components to import `useChatSelector`:

- `ChatBubble.tsx`
- `ChatComposer.tsx`
- `ChatPanel.tsx`
- `ChatMessages.tsx`

### Pinocchio web-chat

Updated provider-store consumers to import `useChatSelector`:

- `WebChatApp/WebChatApp.tsx`
- `WebChatApp/ProviderStatusbar.tsx`

Also changed `pinocchio/cmd/web-chat/web/package.json` to consume the local built provider dist while this breaking API is not yet published:

```json
"@go-go-golems/chat-provider": "file:../../../../2026-05-29--chatbot-overlay-glm/packages/chat-provider/dist"
```

`npm install` regenerated `package-lock.json`.

### TTC Garden Assistant

Updated provider-store consumers to import `useChatSelector`:

- `web/packages/ttc-garden-assistant/src/features/chat/TtcGardenChatOverlay.tsx`

TTC already consumes provider from the local built dist, so rebuilding provider dist was sufficient for validation.

## Validation

Commands run successfully:

```bash
cd 2026-05-29--chatbot-overlay-glm
pnpm --filter @go-go-golems/chat-provider typecheck
pnpm --filter @go-go-golems/chat-provider test
pnpm --filter @go-go-golems/chat-overlay typecheck
npm run build:dist -w packages/chat-provider
```

```bash
cd pinocchio/cmd/web-chat/web
npm install
npm run typecheck
npm test -- --run src/features/web-chat/extensions/pinocchio-timeline-adapters/pinocchioTimelineAdapters.test.ts src/features/web-chat/renderers.test.ts
```

```bash
cd 2026-05-27--ttc-design-system/web/packages/ttc-garden-assistant
pnpm run typecheck
pnpm vitest run src/features/chat/TtcChatProviderShell.test.tsx src/features/chat/TtcChatTools.test.tsx
```

Browser smokes run successfully:

```bash
node 2026-05-29--chatbot-overlay-glm/ttmp/2026/05/31/CHATOVERLAY-010--create-unified-timeline-adapter-api/scripts/01-mock-profile-hydration-smoke.js
node 2026-05-29--chatbot-overlay-glm/ttmp/2026/05/30/CHATOVERLAY-005--move-typed-widget-plugin-support-into-pinocchio-chatapp/scripts/03-pinocchio-webchat-devctl-playwright.js
```

TTC simple browser smoke run successfully against `devctl up --force`: open the Garden Assistant overlay, send a prompt, verify the prompt renders, verify a session id is persisted, and verify there are no console errors. The deterministic failure-path script `scripts/ttc_mock_failure_playwright_smoke.mjs` was also attempted, but it failed because the running backend streamed a normal provider-style answer and the snapshot remained `streaming` instead of `failed`; that failure did not indicate a Redux-hook regression.

## Review checklist

- Confirm no `@go-go-golems/chat-provider` import uses `useAppSelector` or `useAppDispatch`.
- Confirm host-app `useAppSelector` imports in Pinocchio still come from `../../../store/hooks`, not from chat-provider.
- Confirm `ChatProvider` passes `context={ChatReduxContext}`.
- Confirm TTC no longer logs the `selectTimelineEntities returned a different result` warning in unit/browser smokes.
- Confirm Pinocchio and TTC use a provider dependency that contains the new API until the next npm publish.

## Follow-up

- Publish a new `@go-go-golems/chat-provider` version containing the breaking hook rename and private Redux context.
- After publishing, switch Pinocchio back from local `file:` dist to the new npm semver range.
- Decide whether TTC should continue linking local dist or consume the published package.
