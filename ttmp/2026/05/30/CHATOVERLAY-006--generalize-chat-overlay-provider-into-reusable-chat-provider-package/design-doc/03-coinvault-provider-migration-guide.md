---
Title: CoinVault Provider Migration Guide
Ticket: CHATOVERLAY-006
Status: active
Topics:
    - chat-overlay
    - frontend
    - sessionstream
DocType: design-doc
Intent: long-term
Owners: []
RelatedFiles:
    - Path: ../../../../../../../../2026-03-16--gec-rag/web/src/app/CoinVaultApp.tsx
      Note: Current CoinVault chat orchestration and domain UI shell
    - Path: ../../../../../../../../2026-03-16--gec-rag/web/src/ws/parsing.ts
      Note: CoinVault-specific protobuf decoding that remains app-owned
    - Path: ../../../../../../../../2026-03-16--gec-rag/web/src/ws/wsManager.ts
      Note: Current CoinVault WebSocket manager and first migration seam
    - Path: ../../../../../../../2026-03-16--gec-rag/web/package.json
      Note: Declares local chat-provider dependency (commit cdc3ee1)
    - Path: ../../../../../../../2026-03-16--gec-rag/web/src/ws/wsManager.ts
      Note: Uses shared chat-provider buildWebSocketURL helper (commit cdc3ee1)
    - Path: ../../../../../../../packages/chat-provider/src/ws/protocol.ts
      Note: Shared WebSocket URL/protocol helpers used in the first slice
ExternalSources: []
Summary: Implementation guide for migrating CoinVault toward shared chat-provider sessionstream primitives.
LastUpdated: 2026-05-30T23:10:00-04:00
WhatFor: Use when reducing duplicated CoinVault chat transport code and moving toward the generic provider framework.
WhenToUse: Before changing CoinVault chat WebSocket, timeline projection, or provider integration.
---


# CoinVault Provider Migration Guide

## Purpose

This guide explains how CoinVault should adopt the generic `@go-go-golems/chat-provider` framework without losing its domain-specific inventory UI. CoinVault is not a generic chat demo. It has an inventory dashboard, profile selectors, export actions, query suggestions, custom timeline renderers, and protobuf-specific sessionstream decoding. The provider migration should therefore happen in layers.

The first implementation slice should only share the stable protocol primitive that CoinVault and the generic provider already agree on: constructing the `/api/chat/ws` WebSocket URL. Later slices can share more transport lifecycle and projection behavior once the provider exposes app-owned parser/projector callbacks.

## Current state

CoinVault has its own frontend chat runtime:

- `CoinVaultApp.tsx` owns conversation ids, profile state, create-session mutations, submit mutations, stop mutations, URL synchronization, and UI status.
- `useChatStream.ts` subscribes to `wsManager` through `useSyncExternalStore` and acquires/releases a WebSocket connection for a conversation id.
- `wsManager.ts` owns the WebSocket lifecycle and records stream debug data.
- `ws/parsing.ts` re-exports CoinVault-specific protobuf decoders and mappers.

The important difference from chat-overlay is that CoinVault's event parser is strongly tied to generated protobuf code under `web/src/pb/external`. It maps sessionstream frames into CoinVault `TimelineEntity` objects with `data` fields, cancellation tracking, table projection behavior, and domain widgets. The generic provider should not replace that parser in one step.

## Migration phases

### Phase 1: Shared protocol helper

Use `buildWebSocketURL` from `@go-go-golems/chat-provider/ws` inside CoinVault's `wsManager.ts`:

```ts
import { buildWebSocketURL } from '@go-go-golems/chat-provider/ws';

export function buildWSURL(args: Pick<ConnectArgs, 'basePrefix'>): string {
  return buildWebSocketURL({ basePrefix: args.basePrefix });
}
```

This removes one duplicated protocol helper and creates a real dependency on the shared package without changing CoinVault's parser, store, or UI.

### Phase 2: Transport lifecycle callbacks

The next provider capability CoinVault needs is a lower-level transport factory that does not assume the provider's Redux store. CoinVault should be able to pass callbacks for:

- raw frame recording,
- parsed frame recording,
- snapshot handling,
- UI event handling,
- lifecycle status updates,
- error text updates.

The target shape is:

```ts
createSessionstreamTransport({
  buildURL: ({ basePrefix }) => buildWebSocketURL({ basePrefix }),
  encodeSubscribe: coinvaultEncodeSubscribeFrame,
  decodeFrame: coinvaultDecodeServerFrame,
  onSnapshot(snapshot) { applyCoinVaultSnapshot(snapshot); },
  onUIEvent(event) { applyCoinVaultUIEvent(event); },
});
```

The generic provider should own connection ordering and buffering. CoinVault should keep protobuf decoding and domain projection.

### Phase 3: Request adapter integration

CoinVault's create/send bodies include application profile, inference profile, and registry values. The generic provider should support request adapters before CoinVault moves `submitPrompt` out of `CoinVaultApp.tsx`.

The adapter would look like:

```ts
createChatClient({
  createSessionBody: ({ app }) => ({
    application_profile: app.applicationProfile,
    profile: app.inferenceProfile,
    registry: app.registry,
  }),
  submitMessageBody: ({ prompt, app }) => ({
    prompt,
    application_profile: app.applicationProfile,
    profile: app.inferenceProfile,
    registry: app.registry,
  }),
});
```

This should not happen until the provider supports external app state cleanly.

## Implementation in this slice

The implementation in this slice is Phase 1 only:

- Add `@go-go-golems/chat-provider` as a local file dependency in CoinVault `web/package.json`.
- Import `buildWebSocketURL` from `@go-go-golems/chat-provider/ws` in `web/src/ws/wsManager.ts`.
- Keep CoinVault's protobuf parsing, timeline entity shape, store, profile logic, and UI unchanged.
- Run CoinVault typecheck/build and devctl Playwright smoke.

This is the safe first step. It proves the dependency can be consumed and establishes a shared protocol source of truth while respecting CoinVault's domain-specific state model.

## Validation

Run:

```bash
cd 2026-03-16--gec-rag/web
pnpm install
pnpm typecheck
pnpm build

cd ..
devctl up --force
# from chat-overlay repo ticket scripts:
node ttmp/.../scripts/04-coinvault-devctl-playwright.js
```

The expected browser outcome is unchanged: the CoinVault dashboard loads, the inventory stats render, and a quick query creates a conversation.
