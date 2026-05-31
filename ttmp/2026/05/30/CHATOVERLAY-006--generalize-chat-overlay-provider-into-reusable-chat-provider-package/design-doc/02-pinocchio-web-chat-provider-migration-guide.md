---
Title: Pinocchio Web Chat Provider Migration Guide
Ticket: CHATOVERLAY-006
Status: active
Topics:
    - chat-overlay
    - pinocchio
    - frontend
    - web-chat
DocType: design-doc
Intent: long-term
Owners: []
RelatedFiles:
    - Path: ../../../../../../../../pinocchio/cmd/web-chat/web/src/webchat/ChatWidget.tsx
      Note: Current UI shell and request orchestration
    - Path: ../../../../../../../../pinocchio/cmd/web-chat/web/src/ws/protocol.ts
      Note: First migration seam for shared sessionstream protocol primitives
    - Path: ../../../../../../../../pinocchio/cmd/web-chat/web/src/ws/wsManager.ts
      Note: Current Pinocchio transport loop that will later move to a provider adapter
    - Path: ../../../../../../../packages/chat-provider/src/ws/protocol.ts
      Note: Shared protocol primitives now used by web-chat
    - Path: ../../../../../../../pinocchio/cmd/web-chat/web/package.json
      Note: Declares local chat-provider dependency (commit 6192886)
    - Path: ../../../../../../../pinocchio/cmd/web-chat/web/src/ws/protocol.ts
      Note: Now re-exports shared chat-provider protocol helpers (commit 6192886)
ExternalSources: []
Summary: Implementation guide for migrating Pinocchio web-chat toward the generic chat-provider framework.
LastUpdated: 2026-05-30T23:10:00-04:00
WhatFor: Use when migrating Pinocchio web-chat from local duplicated transport helpers to the shared chat-provider runtime.
WhenToUse: Before changing Pinocchio web-chat frontend transport, projection, or provider wrapping.
---


# Pinocchio Web Chat Provider Migration Guide

## Purpose

This guide explains how Pinocchio `cmd/web-chat/web` should move onto the generic `@go-go-golems/chat-provider` framework. The goal is not to replace the web-chat interface with the chat-overlay interface. The goal is to remove duplicated sessionstream mechanics while preserving Pinocchio's full-page chat shell, profile selector, export actions, stream debug panel, and renderer extension API.

The first implementation slice should be deliberately small: import shared sessionstream protocol primitives from `@go-go-golems/chat-provider/ws`. This creates a real dependency on the generic package without changing Pinocchio's UI or store. Later slices can replace the local WebSocket manager with a provider transport adapter and then move create/send/stop orchestration behind request adapters.

## Current state

Pinocchio web-chat has three layers mixed together in one frontend app:

1. **UI shell**: `ChatWidget.tsx`, default header, statusbar, composer, timeline, debug panel, themes, and renderers.
2. **Application policy**: profile selection, profile mutation, export APIs, debug routes, URL session ids.
3. **Protocol mechanics**: WebSocket URL construction, subscribe-frame encoding, server-frame normalization, snapshot hydration, and UI-event projection.

Only the third layer belongs in `chat-provider` by default. The first two layers are Pinocchio application code.

The evidence is in the current files:

- `ChatWidget.tsx` performs session creation, WebSocket connection, and message POSTs, but also owns profile UI and renderer selection.
- `ws/wsManager.ts` performs connection lifecycle, buffering, hydration, debug recording, and Redux dispatch.
- `ws/protocol.ts` defines `buildWebSocketURL`, `encodeSubscribeFrame`, `parseServerFrame`, and frame normalization. This file duplicates the same logic now available in `@go-go-golems/chat-provider/ws`.

## Migration phases

### Phase 1: Shared protocol primitives

Replace local protocol helpers with exports from `@go-go-golems/chat-provider/ws`:

```ts
export type {
  CanonicalFrame,
  SnapshotEntityFrame,
} from '@go-go-golems/chat-provider/ws';

export {
  asRecord,
  asString,
  buildWebSocketURL,
  encodeSubscribeFrame,
  normalizeServerFrame,
  parseServerFrame,
  safeOrdinal,
  unwrapAnyPayload,
} from '@go-go-golems/chat-provider/ws';
```

This is safe because Pinocchio already expects the same canonical frame shape. It also keeps all existing web-chat tests meaningful: if a future provider change breaks protocol normalization, Pinocchio tests should fail.

### Phase 2: Transport factory adapter

After Phase 1, create a transport adapter that lets Pinocchio keep its `appSlice`, `errorsSlice`, and debug stream recording while using provider-owned connection mechanics. The provider should expose a lower-level `createSessionstreamTransport` that accepts callbacks:

```ts
createSessionstreamTransport({
  basePrefix,
  onStatus(status) { dispatch(appSlice.actions.setWsStatus(status)); },
  onSnapshot(frame) { applySnapshot(frame, dispatch, sessionId); },
  onUIEvent(frame) { applyUIEvent(frame, dispatch, sessionId); },
  onRawFrame(raw) { recordRawWS(sessionId, raw); },
  onParsedFrame(frame) { recordParsedFrame(sessionId, frame); },
});
```

Pinocchio should not import the provider's Redux store. Pinocchio has its own store because it has profile API middleware, error state, debug state, and application status.

### Phase 3: Request adapters

Once the transport is shared, move create/send/stop orchestration out of `ChatWidget.tsx` and into a provider client configured with request adapters:

```ts
createChatClient({
  createSessionBody: ({ app }) => ({ profile: app.selectedProfile }),
  submitMessageBody: ({ prompt, app }) => ({ prompt, profile: app.selectedProfile }),
});
```

This phase should preserve the Pinocchio UI. `ChatWidget` should become a view that calls `useChatActions()` rather than performing low-level fetches itself.

## Implementation in this slice

The implementation in this slice is Phase 1 only:

- Add `@go-go-golems/chat-provider` as a local file dependency in `cmd/web-chat/web/package.json`.
- Replace `src/ws/protocol.ts` with a re-export of the provider protocol primitives.
- Run web-chat typecheck/build and devctl Playwright smoke.

This is intentionally modest. It makes the dependency real while avoiding an unsafe store/provider migration before the provider exposes extension reducers, request adapters, and debug sinks.

## Validation

Run:

```bash
cd pinocchio/cmd/web-chat/web
npm run typecheck
npm run build

cd ../../..
devctl up --force
# from chat-overlay repo ticket scripts:
node ttmp/.../scripts/03-pinocchio-webchat-devctl-playwright.js
```

The expected browser outcome is unchanged: web-chat loads, creates a session, connects the WebSocket, sends a prompt, and reaches a finished run state.
