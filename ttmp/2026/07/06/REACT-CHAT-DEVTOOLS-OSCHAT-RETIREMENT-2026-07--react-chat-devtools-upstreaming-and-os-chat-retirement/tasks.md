# Tasks

## Phase 0: Audit and acceptance criteria

- [x] Create ticket and intern-facing design guide
- [x] Record current launcher/inventory/os-chat evidence
- [ ] Produce a short active-import audit table in the implementation PR
- [ ] Confirm no active `ChatConversationWindow` imports remain

## Phase 1: Provider debug primitives

- [x] Add `packages/chat-provider/src/debug/classifyDebugEvent.ts`
- [x] Add `packages/chat-provider/src/debug/debugEventStore.ts`
- [x] Export debug primitives from provider
- [x] Add classifier/store tests

## Phase 2: Overlay devtool utilities

- [x] Port `StructuredDataTree`
- [x] Port `SyntaxHighlight`
- [x] Port `yamlFormat`
- [x] Port clipboard helper
- [x] Port and generalize `timelineDebugModel` for `TimelineMirrorState`
- [x] Add utility tests

## Phase 3: Reusable Event Viewer

- [x] Add pure `ChatEventViewer`
- [x] Add store-bound `ChatEventViewerFromStore`
- [x] Preserve pause, clear, hold/follow, hide text patch, copy, export controls
- [x] Ensure rows are memoized and payload YAML is lazy
- [x] Add tests/stories

## Phase 4: Reusable Timeline Debug

- [x] Add `ChatTimelineDebug` over `TimelineMirrorState`
- [x] Preserve entity list, kind counts, selected detail, tree/YAML toggle, copy/export
- [x] Keep REST snapshot fetching out of the reusable component
- [x] Add tests/stories

## Phase 5: Reusable ChatWindowChrome

- [x] Add slot-based `ChatWindowChrome`
- [x] Add stable classes/CSS parts
- [x] Keep profile fetching, desktop routing, and domain policy downstream
- [x] Add stories for chrome slot combinations

## Phase 6: Migrate wesen-os launcher

- [x] Replace local `ChatDebugWindows` implementation with react-chat devtools wrappers
- [x] Remove local copied debug helpers once unused
- [x] Remove launcher `@go-go-golems/os-chat` reducer imports after verifying they are unused
- [x] Remove launcher `@go-go-golems/os-chat/theme` import
- [x] Validate launcher typecheck/build/build validation (browser smoke still pending)

## Phase 7: Migrate inventory

- [x] Replace `InventoryDebugWindows` os-chat helper imports with react-chat devtools exports
- [x] Remove inventory `@go-go-golems/os-chat` reducer imports after verifying they are unused
- [x] Remove inventory `@go-go-golems/os-chat/theme` import
- [x] Validate inventory typecheck/build/build validation (browser smoke still pending)

## Phase 8: Retire os-chat

- [x] Remove `@go-go-golems/os-chat` from downstream direct downstream manifests (lockfile still has transitive os-frontend consumers)
- [ ] Decide whether to delete `packages/os-chat` or keep a deprecated stub in go-go-os-frontend
- [ ] If published, deprecate npm package with replacement guidance
- [ ] Audit separate Go `go-go-os-chat` repository before any archive action
