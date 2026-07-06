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

- [ ] Port `StructuredDataTree`
- [ ] Port `SyntaxHighlight`
- [ ] Port `yamlFormat`
- [ ] Port clipboard helper
- [ ] Port and generalize `timelineDebugModel` for `TimelineMirrorState`
- [ ] Add utility tests

## Phase 3: Reusable Event Viewer

- [ ] Add pure `ChatEventViewer`
- [ ] Add store-bound `ChatEventViewerFromStore`
- [ ] Preserve pause, clear, hold/follow, hide text patch, copy, export controls
- [ ] Ensure rows are memoized and payload YAML is lazy
- [ ] Add tests/stories

## Phase 4: Reusable Timeline Debug

- [ ] Add `ChatTimelineDebug` over `TimelineMirrorState`
- [ ] Preserve entity list, kind counts, selected detail, tree/YAML toggle, copy/export
- [ ] Keep REST snapshot fetching out of the reusable component
- [ ] Add tests/stories

## Phase 5: Reusable ChatWindowChrome

- [ ] Add slot-based `ChatWindowChrome`
- [ ] Add stable classes/CSS parts
- [ ] Keep profile fetching, desktop routing, and domain policy downstream
- [ ] Add stories for chrome slot combinations

## Phase 6: Migrate wesen-os launcher

- [ ] Replace local `ChatDebugWindows` implementation with react-chat devtools wrappers
- [ ] Remove local copied debug helpers once unused
- [ ] Remove launcher `@go-go-golems/os-chat` reducer imports after verifying they are unused
- [ ] Remove launcher `@go-go-golems/os-chat/theme` import
- [ ] Validate launcher typecheck/build/browser smoke

## Phase 7: Migrate inventory

- [ ] Replace `InventoryDebugWindows` os-chat helper imports with react-chat devtools exports
- [ ] Remove inventory `@go-go-golems/os-chat` reducer imports after verifying they are unused
- [ ] Remove inventory `@go-go-golems/os-chat/theme` import
- [ ] Validate inventory typecheck/build/browser smoke

## Phase 8: Retire os-chat

- [ ] Remove `@go-go-golems/os-chat` from downstream manifests and lockfiles
- [ ] Decide whether to delete `packages/os-chat` or keep a deprecated stub in go-go-os-frontend
- [ ] If published, deprecate npm package with replacement guidance
- [ ] Audit separate Go `go-go-os-chat` repository before any archive action
