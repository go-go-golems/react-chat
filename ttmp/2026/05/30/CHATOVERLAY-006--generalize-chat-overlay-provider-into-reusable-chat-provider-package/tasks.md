# Tasks

## Phase 1: Analysis and design package

- [x] T1.1 Create ticket workspace.
- [x] T1.2 Inspect chat-overlay provider, runtime, store, WebSocket, tool, and widget files.
- [x] T1.3 Inspect Pinocchio web-chat interaction, store, transport, renderer, and component extension files.
- [x] T1.4 Write generic ChatProvider design and implementation guide.
- [x] T1.5 Write initial investigation diary.
- [x] T1.6 Relate files, update changelog, run doctor, close ticket, and upload initial design bundle to reMarkable.

## Phase 2: Workspace and package split

- [x] T2.1 Add root `package.json` for the frontend workspace.
- [x] T2.2 Add `pnpm-workspace.yaml` with package and ecommerce app members.
- [x] T2.3 Generate and commit `pnpm-lock.yaml`.
- [x] T2.4 Create `packages/chat-provider` with package manifest and TypeScript config.
- [x] T2.5 Create `packages/chat-overlay` with package manifest and TypeScript config.
- [x] T2.6 Rename the Vite app package to `@go-go-golems/chat-overlay-ecommerce-demo`.
- [x] T2.7 Replace npm-oriented frontend install/build flow in devctl with pnpm workspace commands.

## Phase 3: Move generic runtime into `chat-provider`

- [x] T3.1 Move core chat runtime files into `packages/chat-provider/src/core`.
- [x] T3.2 Move Redux chat/timeline state into `packages/chat-provider/src/store`.
- [x] T3.3 Move sessionstream protocol, hydration, and WebSocket code into `packages/chat-provider/src/ws`.
- [x] T3.4 Move frontend tool registry/runtime/hooks/outlet into `packages/chat-provider/src/tools`.
- [x] T3.5 Move widget registry/outlet/unknown fallback into `packages/chat-provider/src/widgets`.
- [x] T3.6 Add public package exports for core, store, tools, widgets, and WebSocket utilities.

## Phase 4: Move overlay UI into `chat-overlay`

- [x] T4.1 Move `ChatBubble` into `packages/chat-overlay`.
- [x] T4.2 Move `ChatPanel` into `packages/chat-overlay`.
- [x] T4.3 Move `ChatComposer` and `ChatMessages` into `packages/chat-overlay`.
- [x] T4.4 Move sticky scroll helper into `packages/chat-overlay`.
- [x] T4.5 Move retro Mac theme into `packages/chat-overlay`.
- [x] T4.6 Implement `ChatOverlayProvider` as an overlay preset over generic `ChatProvider`.
- [x] T4.7 Export overlay components from `@go-go-golems/chat-overlay`.

## Phase 5: Ecommerce app migration

- [x] T5.1 Update ecommerce app imports to use `@go-go-golems/chat-provider` for hooks/tools/widgets.
- [x] T5.2 Update ecommerce app imports to use `@go-go-golems/chat-overlay` for overlay UI.
- [x] T5.3 Keep ecommerce widgets and demo cart/tool behavior in the app, not in provider/overlay packages.
- [x] T5.4 Remove old duplicated implementation folders from `web/src`.
- [x] T5.5 Remove old `web/package-lock.json` in favor of workspace `pnpm-lock.yaml`.

## Phase 6: Opinionated cleanup, no compatibility shims

- [x] T6.1 Remove `createChatOverlay` implementation from `chat-provider`.
- [x] T6.2 Replace compatibility API with `createChatClient`, `ChatClient`, `ChatProviderConfig`, and `useChatClient`.
- [x] T6.3 Make chat store creation instance-scoped with `createChatStore`.
- [x] T6.4 Make frontend tool registry instance-scoped with `createToolRegistry`.
- [x] T6.5 Make frontend tool runtime instance-scoped with `createToolRuntime`.
- [x] T6.6 Make WebSocket manager instance-scoped with `createWsManager`.
- [x] T6.7 Thread tool runtime into UI-event projection instead of using global tool runtime state.
- [x] T6.8 Update overlay components to use `useChatClient` and generic provider exports.
- [x] T6.9 Remove stale backwards-compatibility names from public exports.

## Phase 7: Validation

- [x] T7.1 Run `pnpm -r typecheck`.
- [x] T7.2 Run `pnpm --filter @go-go-golems/chat-overlay-ecommerce-demo build`.
- [x] T7.3 Run `go test ./...`.
- [x] T7.4 Run `devctl validate` after pnpm workspace changes.
- [x] T7.5 Run `devctl up --force` after pnpm workspace changes.
- [x] T7.6 Run `devctl widget-smoke` after package split and runtime cleanup.

## Phase 8: Pinocchio web-chat provider adoption

- [x] T8.1 Write Pinocchio web-chat provider migration guide.
- [x] T8.2 Add `@go-go-golems/chat-provider` as a local web-chat dependency.
- [x] T8.3 Replace Pinocchio local `ws/protocol.ts` implementation with shared provider protocol exports.
- [x] T8.4 Run Pinocchio web-chat typecheck.
- [x] T8.5 Run Pinocchio web-chat build.
- [x] T8.6 Run Pinocchio web-chat devctl Playwright smoke.

## Phase 9: CoinVault provider adoption

- [x] T9.1 Write CoinVault provider migration guide.
- [x] T9.2 Add `@go-go-golems/chat-provider` as a local CoinVault web dependency.
- [x] T9.3 Replace CoinVault duplicated WebSocket URL helper with shared provider `buildWebSocketURL`.
- [x] T9.4 Run CoinVault web typecheck.
- [x] T9.5 Run CoinVault web build.
- [x] T9.6 Run CoinVault devctl Playwright smoke.

## Phase 10: Documentation closeout

- [x] T10.1 Update task list with completed implementation phases.
- [x] T10.2 Fill implementation diary with package split and runtime cleanup details.
- [x] T10.3 Fill implementation diary with web-chat and CoinVault provider adoption details.
- [x] T10.4 Relate newly changed package files to the ticket.
- [x] T10.5 Update changelog with implementation commits and validation commands.
- [x] T10.6 Run `docmgr doctor --ticket CHATOVERLAY-006 --stale-after 30`.
- [x] T10.7 Commit documentation updates.
