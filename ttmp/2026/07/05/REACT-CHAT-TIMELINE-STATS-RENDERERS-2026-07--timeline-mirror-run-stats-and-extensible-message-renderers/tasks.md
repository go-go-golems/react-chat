# Tasks

## TODO

### Phase 0: Tracking and baseline

- [x] Create ticket, design guide, and investigation diary.
- [x] Relate current provider/overlay/downstream evidence files.
- [x] Add detailed phase/task breakdown before implementation.
- [ ] Record each implementation phase in the diary with commands, failures, and commit hashes.

### Phase 1: Provider-owned timeline merge and mirror API

- [ ] Extract `TimelineEntity` / `TimelineState` into reusable provider store types without breaking existing imports from `timelineSlice.ts`.
- [ ] Move `applyStreamPatch`, `mergePropsWithPatches`, and `mergeTimelineEntity` semantics into a pure merge helper module.
- [ ] Update `timelineSlice` reducers to call the pure helper module.
- [ ] Add `applyTimelineMutationToTimelineState` for provider-owned mutation folding.
- [ ] Add `createEmptyTimelineMirror`, `applyTimelineMutationToMirror`, `createTimelineMirror`, and mirror selectors.
- [ ] Export the mirror/types API from `@go-go-golems/chat-provider`.
- [ ] Add provider tests proving mirror and Redux reducer produce equivalent timeline state for append/replace patches, widget prop patches, `upsertIfExists`, and delete.
- [ ] Run focused provider tests/typecheck and commit Phase 1.

### Phase 2: Run stats slice and selectors

- [ ] Add `runStatsSlice` with public `ChatUsageTotals` and `ChatRunStats` selector shape.
- [ ] Add usage parsing and `applyRunStatsEvent` for `ChatRunStarted`, `ChatTextPatch`, `ChatProviderCallMetadataUpdated`, `ChatProviderCallFinished`, and terminal run events.
- [ ] Register `runStats` reducer in `createChatStore`.
- [ ] Reset run stats in `ChatClient.reset()`.
- [ ] Export `runStatsSlice`, stats types, and selectors from `@go-go-golems/chat-provider`.
- [ ] Add provider tests for streaming token estimates, usage override, multi-call run accumulation, terminal run commit, and reset.
- [ ] Run focused provider tests/typecheck and commit Phase 2.

### Phase 3: Extensible ChatMessages renderers

- [ ] Add `ChatMessagesProps`, `ChatMessageRenderMode`, `TimelineEntityRenderer`, and renderer context types.
- [ ] Extract built-in renderers for `message`, `widget`, and `tool_call`.
- [ ] Add collapsed raw fallback renderer for unknown timeline entity kinds.
- [ ] Preserve existing default UI when no renderer props are supplied.
- [ ] Add support for app-supplied per-kind renderers, `fallbackRenderer`, `visibleKinds`, `renderMode`, and custom empty state.
- [ ] Export renderer types/default helpers from `@go-go-golems/chat-overlay`.
- [ ] Run overlay typecheck plus full package typecheck/test and commit Phase 3.

### Phase 4: Final validation and documentation closeout

- [ ] Run repository-level tests/typecheck for the implemented scope.
- [ ] Update design guide if implementation differs from the proposed API.
- [ ] Check off completed tasks and update changelog with commit hashes.
- [ ] Run `docmgr doctor` for the ticket.
- [ ] Upload updated bundle to reMarkable.

## Deferred / explicitly out of scope

- [ ] Downstream `wesen-os` migration after package publish.
- [ ] Storybook examples for downstream-specific renderers.
- [ ] Chrome/devtools work tracked by `REACT-CHAT-CHROME-DEVTOOLS-2026-07`.
- [ ] HyperCard artifact transforms, profile endpoint hook, and generated app persistence.
