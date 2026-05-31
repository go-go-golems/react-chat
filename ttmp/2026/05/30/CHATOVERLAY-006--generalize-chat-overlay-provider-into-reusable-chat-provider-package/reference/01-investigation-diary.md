---
Title: Investigation Diary
Ticket: CHATOVERLAY-006
Status: active
Topics:
    - chat-overlay
    - pinocchio
    - frontend
    - web-chat
DocType: reference
Intent: long-term
Owners: []
RelatedFiles:
    - Path: ../../../../../../../web/src/core/createChatOverlay.ts
      Note: Primary chat-overlay runtime inspected for generalization
    - Path: ../../../../../../../web/src/overlay/ChatOverlayProvider.tsx
      Note: Current provider wrapper inspected for singleton and overlay coupling
    - Path: ../../../../../../../../pinocchio/cmd/web-chat/web/src/webchat/ChatWidget.tsx
      Note: Pinocchio web-chat interaction component inspected for migration requirements
Summary: "Diary for CHATOVERLAY-006 provider generalization analysis."
LastUpdated: 2026-05-30T22:55:00-04:00
WhatFor: "Record the analysis work that produced the generic ChatProvider guide."
WhenToUse: "Read before implementing the provider extraction or web-chat migration."
---

# Diary

## Goal

Capture the investigation, report-writing, package split, runtime cleanup, and validation work for turning the chat-overlay frontend into a generic provider plus overlay preset.

## Step 1: Analyze provider generalization and write the implementation guide

This step created a new ticket and wrote the design guide for turning the chat-overlay frontend runtime into a reusable chat provider package. The work is documentation-only. It does not change frontend behavior, but it identifies the package seams, risks, API shape, and migration order needed for implementation.

The conclusion is affirmative but conditional: the provider should be extracted as a headless sessionstream chat runtime plus React provider, not merely renamed. Chat-overlay should keep an overlay preset, while Pinocchio web-chat should first consume the shared transport/projection/hooks and keep its current UI shell.

### Prompt Context

**User prompt (verbatim):** "can we modify chatoverlayprovider to be a chatprovider in general, and use the npm package as the basis for the web-chat/web interaction framework? what would be needed? 

Write a detailed report / analysis guide, using a textbook writing style, and upload to remarkable after you oare done"

**Assistant interpretation:** Create an evidence-backed design report explaining whether and how to generalize `ChatOverlayProvider` into a reusable frontend chat provider package for chat-overlay and Pinocchio web-chat, then upload the resulting guide to reMarkable.

**Inferred user intent:** Plan the next frontend architecture extraction so the frontend package mirrors the backend migrations already completed for `serverkit`, `frontendtools`, and `widgets`.

**Commit (code):** N/A — documentation and analysis only.

### What I did
- Created ticket `CHATOVERLAY-006` with a design document and investigation diary.
- Inspected chat-overlay provider/runtime files:
  - `web/src/overlay/ChatOverlayProvider.tsx`
  - `web/src/core/createChatOverlay.ts`
  - `web/src/ws/wsManager.ts`
  - `web/src/store/store.ts`
  - `web/src/tools/toolRegistry.ts`
  - `web/src/widgets/widgetRegistry.ts`
- Inspected Pinocchio web-chat frontend files:
  - `pinocchio/cmd/web-chat/web/src/webchat/ChatWidget.tsx`
  - `pinocchio/cmd/web-chat/web/src/ws/wsManager.ts`
  - `pinocchio/cmd/web-chat/web/src/store/store.ts`
  - `pinocchio/cmd/web-chat/web/src/webchat/types.ts`
  - `pinocchio/cmd/web-chat/web/src/webchat/rendererRegistry.ts`
- Wrote the design guide in `design-doc/01-generic-chat-provider-framework-analysis.md`.

### Why
- The backend has already moved shared chat mechanics into Pinocchio packages. The frontend now has duplicated sessionstream interaction code between chat-overlay and Pinocchio web-chat.
- A generic provider package would let applications share transport, hydration, projection, tool, and widget mechanics while preserving application-specific UI and policies.

### What worked
- The existing code has a clear shared protocol path: create session, connect WebSocket, subscribe, hydrate snapshot, buffer live events, submit messages, and project UI events.
- The existing Pinocchio `ChatWidget` already has strong UI extension points (`components`, `renderers`, `partProps`, themes), so it can keep its UI while replacing interaction internals.
- The previous `CHATOVERLAY-004` and `CHATOVERLAY-005` backend migrations make frontend sharing more realistic because frontend tools and widgets now target Pinocchio-owned backend protocol packages.

### What didn't work
- There was no implementation work in this step, so no build/test failures occurred.
- The current chat-overlay package is not yet a real reusable npm package: its `web/package.json` is private and named `web`, so package extraction is a required implementation step.

### What I learned
- A direct rename from `ChatOverlayProvider` to `ChatProvider` would preserve too much overlay-specific coupling: singleton store, singleton tool registry, singleton WebSocket manager, fixed session storage key, and fixed root CSS class.
- Pinocchio web-chat's profile and debug behavior should be extension policy, not core provider behavior.
- The safest first migration is to share transport/projection/hooks, not visual components.

### What was tricky to build
- The main design challenge was separating protocol responsibility from visual responsibility. Both frontends share sessionstream mechanics, but they do not share the same product surface. The guide resolves this by proposing a headless provider package plus separate UI presets.
- Naming also needs care because Pinocchio already uses `ChatProviderCall...` for model provider telemetry. The guide recommends documenting the distinction or using `ChatRuntimeProvider` internally if the ambiguity becomes expensive.

### What warrants a second pair of eyes
- Review whether `@go-go-golems/chat-provider` should be a new package or whether `@go-go-golems/chat-overlay` should become the generic package with overlay as a preset.
- Review whether Redux Toolkit should remain part of the public package contract or only be the default internal implementation.
- Review the proposed extension points for profile-aware request bodies, debug sinks, and app-specific timeline projectors.

### What should be done in the future
- Implement the extraction in phases: compatibility aliases, instance factories, package boundary, chat-overlay self-consumption, then Pinocchio web-chat migration.
- Add package-level tests for protocol normalization, transport, projection, registry isolation, and React provider instance isolation.
- Use the devctl-backed Playwright scripts from `CHATOVERLAY-005` as cross-app smoke tests during migration.

### Code review instructions
- Start with `design-doc/01-generic-chat-provider-framework-analysis.md`.
- Compare its claims against the referenced chat-overlay and Pinocchio web-chat files.
- Pay special attention to the proposed boundaries: headless provider vs overlay preset vs Pinocchio app extensions.

### Technical details
- No code changed.
- The design recommends extracting a package with modules for `core`, `react`, `sessionstream`, `store`, `timeline`, `tools`, and `widgets`.
- The design recommends retaining `ChatOverlayProvider` as a compatibility/preset API while introducing `ChatProvider` or `ChatRuntimeProvider` as the generic layer.

## Step 2: Split the frontend into provider, overlay, and ecommerce packages

This step implemented the first package-boundary version of the design. The repository is now a pnpm workspace with a generic `@go-go-golems/chat-provider` package, a `@go-go-golems/chat-overlay` preset package, and the existing Vite app renamed to `@go-go-golems/chat-overlay-ecommerce-demo`.

The split is intentionally structural. It moves generic chat mechanics out of the ecommerce app, moves overlay chrome into a separate overlay package, and leaves product widgets plus demo cart tools in the ecommerce app. The runtime still worked after the move, which means the package boundaries are now real enough for follow-up cleanup.

### Prompt Context

**User prompt (verbatim):** "ok, whatever, keep themsplit. implement chat-provider package and make this a pnpm multi-package workspace, so that we have chat-provider, chat-overlay, and then the ecommerce website which imports both of them."

**Assistant interpretation:** Implement the package split immediately: create a pnpm workspace, extract provider code into `chat-provider`, overlay UI into `chat-overlay`, and make the ecommerce app import both packages.

**Inferred user intent:** Move from design to a practical repository structure that enforces the provider/overlay/app separation.

**Commit (code):** 575552d — "feat: split frontend into chat provider workspace"

### What I did
- Added root `package.json`, `pnpm-workspace.yaml`, and `pnpm-lock.yaml`.
- Created `packages/chat-provider` with `package.json`, `tsconfig.json`, and source folders for `core`, `store`, `tools`, `widgets`, and `ws`.
- Created `packages/chat-overlay` with `package.json`, `tsconfig.json`, overlay components, stories, and the retro Mac theme.
- Renamed the Vite app package to `@go-go-golems/chat-overlay-ecommerce-demo`.
- Updated ecommerce app imports so hooks/tools/widgets come from `@go-go-golems/chat-provider` and overlay UI comes from `@go-go-golems/chat-overlay`.
- Kept ecommerce widget definitions and demo cart logic in the app.
- Updated devctl to use pnpm workspace commands instead of npm commands.
- Removed old duplicated implementation folders from `web/src`.

### Why
- The package split makes the architectural boundary enforceable by imports rather than just documentation.
- The ecommerce demo should prove that `chat-provider` and `chat-overlay` are usable as packages.
- Devctl needed to follow the new package manager and workspace build commands so local validation stayed one-command repeatable.

### What worked
- `pnpm -r typecheck` passed for the extracted packages.
- `pnpm --filter @go-go-golems/chat-overlay-ecommerce-demo build` passed.
- `go test ./...` passed.
- `devctl validate`, `devctl up --force`, and `devctl widget-smoke` passed after updating devctl to pnpm.

### What didn't work
- The first devctl Vite command used `pnpm --dir web dev -- --host ...`, but devctl already set `cwd` to `web`, so pnpm looked for `web/web` and failed with `ENOENT: no such file or directory, lstat '.../web/web'`.
- The next command used `pnpm dev -- --host ...`; pnpm forwarded the extra arguments after Vite's script delimiter and Vite ignored the requested port, starting on `5174` after reporting `Port 5173 is in use`. I fixed this by launching Vite directly with `pnpm exec vite --host 127.0.0.1 --port ... --clearScreen false`.
- Running `pnpm install` replaced npm-managed `web/node_modules` contents and produced warnings about packages installed by a different package manager. This was expected during the npm-to-pnpm migration.

### What I learned
- The repo can build as a pnpm workspace without changing the Go backend or the sessionstream protocol.
- Vite dev-server argument forwarding is safer through `pnpm exec vite ...` than through a package script when devctl needs exact host/port control.
- Keeping ecommerce widgets in the app makes the package split easy to reason about: provider owns mechanics, overlay owns chrome, ecommerce owns domain behavior.

### What was tricky to build
- The main issue was preserving behavior while moving files. The first split intentionally kept compatibility names and singleton runtime shape so package-boundary problems could be separated from runtime-isolation problems.
- The devctl launch command had to be corrected because the combination of workspace commands, service cwd, and pnpm argument forwarding changed how Vite saw its CLI arguments.

### What warrants a second pair of eyes
- Review whether package exports are narrow enough before publishing anything externally.
- Review whether Storybook stories should remain under `chat-overlay` or move into a separate docs/demo workspace.
- Review whether `web` should eventually move under `apps/ecommerce` for a cleaner workspace layout.

### What should be done in the future
- Remove compatibility names from `chat-provider` internals.
- Make runtime state instance-scoped instead of singleton-scoped.
- Add package-level tests for provider instance isolation.

### Code review instructions
- Start with `pnpm-workspace.yaml`, root `package.json`, and package manifests.
- Review `packages/chat-provider/src/index.ts` and `packages/chat-overlay/src/index.ts` for public API shape.
- Review `web/src/App.tsx` and `web/src/ecommerce/*.tsx` to confirm the app imports packages rather than old local implementation folders.
- Validate with `pnpm -r typecheck`, `pnpm --filter @go-go-golems/chat-overlay-ecommerce-demo build`, `go test ./...`, and `devctl widget-smoke`.

### Technical details
- `@go-go-golems/chat-provider` exports generic runtime, store, tools, widgets, and WebSocket utilities.
- `@go-go-golems/chat-overlay` exports overlay UI components and the retro Mac theme.
- `@go-go-golems/chat-overlay-ecommerce-demo` imports both packages and owns ecommerce widgets/tools.

## Step 3: Remove compatibility shims and make provider runtime instance-scoped

This step cleaned up the package split after the user explicitly asked for elegance and no backward-compatibility wrappers. The provider now exposes neutral names such as `createChatClient`, `ChatClient`, `ChatProviderConfig`, and `useChatClient`; the old `createChatOverlay` implementation was removed from `chat-provider`.

The runtime is also more correctly scoped. `ChatProvider` creates its own store, tool registry, tool runtime, and WebSocket manager. This does not yet solve every possible multi-instance concern, but it removes the most important global singletons from the provider runtime path.

### Prompt Context

**User prompt (verbatim):** "remove any backwards compatibility / wrapper stuff as well, we don't have any other users for now. We go for elegance, simplicity, opinionated per default."

**Assistant interpretation:** Remove compatibility aliases/wrappers from the new provider package and prefer the clean generic API, even if this breaks old local names.

**Inferred user intent:** Avoid carrying historical naming debt into the package before there are external consumers.

**Commit (code):** 3c20046 — "refactor: make chat provider runtime instance scoped"

### What I did
- Added `packages/chat-provider/src/core/createChatClient.ts` as the neutral runtime implementation.
- Removed `packages/chat-provider/src/core/createChatOverlay.ts`.
- Replaced public provider exports with `ChatClient`, `ChatProviderConfig`, `ChatClientTools`, `createChatClient`, and `useChatClient`.
- Replaced `ChatOverlayContext` with `ChatRuntimeContext` and `useChatClient`.
- Converted `store` singleton export into `createChatStore()`.
- Converted `defaultToolRegistry` into `createToolRegistry()` / `ChatToolRegistry`.
- Converted global tool runtime state into `createToolRuntime()`.
- Converted global `wsManager` into `createWsManager()` / `WsManager`.
- Threaded `ToolRuntime` into WebSocket UI-event projection so frontend tool execution is provider-instance-owned.
- Updated `ToolCallOutlet` and tool hooks to read the provider-scoped client/runtime from context.
- Updated overlay components to use `useChatClient` instead of `useChatOverlay`.

### Why
- The package has no external users yet, so this is the right time to remove old names rather than preserve them.
- Generic package names make the API easier to understand: `chat-provider` should expose chat-provider concepts, not chat-overlay concepts.
- Instance-scoped runtime objects reduce cross-test, cross-story, and multi-chat contamination risks.

### What worked
- `pnpm -r typecheck` passed after the cleanup.
- `pnpm --filter @go-go-golems/chat-overlay-ecommerce-demo build` passed.
- `go test ./...` passed.
- `devctl down`, `devctl up --force`, and `devctl widget-smoke` passed.
- `rg` confirmed no stale `createChatOverlay`, `useChatOverlay`, `ChatOverlayToolkit`, `defaultToolRegistry`, or global runtime configuration references remained in active package/app code, except the intentional `ChatOverlayProvider` overlay preset name.

### What didn't work
- Typecheck initially failed in `createChatClient.ts` because the `tools` object referenced `syncManifest` even though the function was named `syncToolManifest`.
  - Exact error: `src/core/createChatClient.ts(136,5): error TS2552: Cannot find name 'syncManifest'. Did you mean 'syncToolManifest'?`
  - Fix: changed the property to `syncManifest: syncToolManifest`.
- Typecheck then failed in `ChatComposer.tsx` because a callback dependency still referenced the old variable name `overlay` after renaming the variable to `client`.
  - Exact error: `src/overlay/ChatComposer.tsx(14,7): error TS2304: Cannot find name 'overlay'.`
  - Fix: changed the dependency list to `[client, text]`.

### What I learned
- Removing global tool runtime state required updating both projection and UI rendering paths. It was not enough to make the registry instance-scoped; `ToolCallOutlet` also had to use the provider-scoped runtime to detect and answer pending human tools.
- The cleanest provider context value is not just the client. It also needs the runtime services that UI outlets consume, currently `{ client, toolRuntime }`.
- The overlay package can keep the `ChatOverlayProvider` name as the UI preset name without polluting provider internals.

### What was tricky to build
- The runtime construction has a small initialization cycle: `createToolRuntime` needs a submit-result function, while `createChatClient` creates the final `client.tools.submitResult`. The implementation resolves this by closing over a `submitToolResult` variable that is assigned immediately after client creation. This deserves review because a tool event before assignment would throw, though normal UI flow cannot request a tool before the client exists and a session is connected.
- Threading `toolRuntime` through `WsManager.connect` and `applyUIEvent` was necessary to remove the previous module-level tool runtime. This makes the call path slightly more explicit but eliminates hidden global state.

### What warrants a second pair of eyes
- Review `ChatProvider.tsx` for the submit-result closure initialization pattern.
- Review whether `ChatRuntimeContext` should expose more named services now or keep only `{ client, toolRuntime }`.
- Review whether `createChatStore()` should eventually accept extension reducers/middleware for Pinocchio profile support.

### What should be done in the future
- Add explicit provider multi-instance tests.
- Rename `overlaySlice` to a neutral `chatSlice` or split overlay open/close state out of provider state.
- Add request adapters for Pinocchio profile-aware create/send bodies before migrating Pinocchio web-chat.
- Consider moving `web` to `apps/ecommerce` once the package split stabilizes.

### Code review instructions
- Start with `packages/chat-provider/src/react/ChatProvider.tsx` to understand runtime construction.
- Review `packages/chat-provider/src/core/createChatClient.ts` for request/session/tool behavior.
- Review `packages/chat-provider/src/tools/toolRuntime.ts`, `ToolCallOutlet.tsx`, and `ws/timelineEvents.ts` together to verify frontend tool/human tool execution remains scoped.
- Review `packages/chat-overlay/src/overlay/*.tsx` to verify only overlay UI imports `useChatClient` and package state selectors.
- Validate with `pnpm -r typecheck`, `pnpm --filter @go-go-golems/chat-overlay-ecommerce-demo build`, `go test ./...`, and `devctl widget-smoke`.

### Technical details
- Public provider names are now generic: `ChatClient`, `ChatProviderConfig`, `ChatClientTools`, `createChatClient`, `ChatProvider`, `useChatClient`, and `useChatRuntime`.
- `createChatStore`, `createToolRegistry`, `createToolRuntime`, and `createWsManager` are the instance factories used by `ChatProvider`.
- The only remaining overlay-named provider component is intentionally in `@go-go-golems/chat-overlay`: `ChatOverlayProvider`.

## Step 4: Adopt shared provider protocol primitives in web-chat and CoinVault

This step wrote two implementation guides and completed the first safe adoption slice in both downstream frontends. Pinocchio web-chat and CoinVault now depend on `@go-go-golems/chat-provider` and consume its shared sessionstream protocol helper surface instead of keeping every protocol primitive local.

The implementation is intentionally conservative. Pinocchio and CoinVault both have application-specific stores, profile policy, debug handling, and projection logic. Replacing those with `ChatProvider` directly would be premature because the provider still needs explicit extension points for foreign Redux stores, request adapters, debug sinks, and custom protobuf/entity projection. The completed slice establishes the dependency and removes duplicated protocol utility code without destabilizing either application.

### Prompt Context

**User prompt (verbatim):** "now use the generic framework for web-chat and coinvault, create two design / implementation guides (one for each page), then implement them"

**Assistant interpretation:** Write one guide for Pinocchio web-chat and one guide for CoinVault explaining how each should adopt the generic provider framework, then implement the first migration slice for both applications.

**Inferred user intent:** Begin consuming the new `chat-provider` package outside chat-overlay and document the remaining migration path for each downstream frontend.

**Commit (code):** Pending at diary-writing time — changes span Pinocchio, CoinVault, and CHATOVERLAY-006 docs.

### What I did
- Added `design-doc/02-pinocchio-web-chat-provider-migration-guide.md`.
- Added `design-doc/03-coinvault-provider-migration-guide.md`.
- Added `@go-go-golems/chat-provider` as a local file dependency in `pinocchio/cmd/web-chat/web/package.json`.
- Replaced `pinocchio/cmd/web-chat/web/src/ws/protocol.ts` with re-exports from `@go-go-golems/chat-provider/ws`.
- Added `@go-go-golems/chat-provider` as a local file dependency in `2026-03-16--gec-rag/web/package.json`.
- Updated `2026-03-16--gec-rag/web/src/ws/wsManager.ts` so `buildWSURL(...)` delegates to provider `buildWebSocketURL(...)`.
- Ran typecheck/build and devctl Playwright smoke validation for both apps.

### Why
- Both downstream frontends speak the same sessionstream chat route shape, but their stores and UI policy are application-specific.
- Sharing the protocol primitives first creates a real dependency on `chat-provider` while preserving behavior.
- The guides define the later phases needed before a deeper migration: callback-based transport, request adapters, external store integration, and app-specific projectors.

### What worked
- Pinocchio web-chat accepted the provider file dependency and passed:
  - `npm run typecheck`
  - `npm run build`
  - `node .../scripts/03-pinocchio-webchat-devctl-playwright.js`
- CoinVault accepted the provider file dependency and passed:
  - `pnpm typecheck`
  - `pnpm build`
  - `node .../scripts/04-coinvault-devctl-playwright.js`
- The shared `buildWebSocketURL`, `encodeSubscribeFrame`, `parseServerFrame`, and related protocol exports were compatible with Pinocchio web-chat's existing canonical frame usage.
- CoinVault's narrower adoption of `buildWebSocketURL` preserved its protobuf-specific parsing and entity mapping.

### What didn't work
- This slice deliberately did not wrap Pinocchio or CoinVault in `ChatProvider`. Both apps currently have their own Redux stores and projection pipelines; wrapping them with the current `ChatProvider` would install a nested provider store and interfere with app hooks.
- CoinVault's parser is protobuf-specific and maps to a `TimelineEntity` shape with `data`, while `chat-provider` currently uses `props`. A direct projector swap would be incorrect.
- Pinocchio's WebSocket manager includes debug recording and app status integration that the current provider transport does not yet expose as callback extension points.

### What I learned
- Pinocchio web-chat is ready to share protocol normalization, but deeper migration requires provider APIs that do not assume the provider's internal Redux store.
- CoinVault should move more slowly than Pinocchio because its generated protobuf parser and domain timeline shape are more specialized.
- The next useful provider feature is not another React component; it is a lower-level callback-based sessionstream transport factory.

### What was tricky to build
- The package dependency paths are local and cross-repository. Pinocchio uses npm and CoinVault uses pnpm, so the dependency wiring had to match each repo's package-manager expectations.
- The implementation needed to avoid over-migration. A visual or store-level provider swap would have been more invasive and less reliable than sharing protocol utilities first.

### What warrants a second pair of eyes
- Review the local file dependency paths before publishing or moving directories.
- Review whether provider `ws/protocol.ts` should become a stable public subpath export before more apps depend on it.
- Review the next transport-factory API so Pinocchio debug sinks and CoinVault protobuf parsing can plug in cleanly.

### What should be done in the future
- Add `createSessionstreamTransport(...)` to `chat-provider` with parser/projector/debug callbacks.
- Add request adapters to `createChatClient` for Pinocchio and CoinVault profile-aware request bodies.
- Add optional external store / extension reducer support before attempting to wrap full app shells with `ChatProvider`.
- Migrate Pinocchio web-chat's local WebSocket manager to the callback transport before migrating CoinVault's more specialized manager.

### Code review instructions
- For Pinocchio, start with `cmd/web-chat/web/src/ws/protocol.ts` and verify it only re-exports provider protocol primitives.
- For CoinVault, start with `web/src/ws/wsManager.ts` and verify only URL construction moved to provider code.
- Review both migration guides to confirm the limited implementation matches the documented phase-one scope.
- Validate with the exact commands listed in `What worked`.

### Technical details
- Pinocchio dependency: `@go-go-golems/chat-provider` via local `file:` dependency in `cmd/web-chat/web/package.json`.
- CoinVault dependency: `@go-go-golems/chat-provider` via local `file:` dependency in `web/package.json`.
- Pinocchio imports the provider subpath `@go-go-golems/chat-provider/ws`.
- CoinVault imports `buildWebSocketURL` from `@go-go-golems/chat-provider/ws`.
