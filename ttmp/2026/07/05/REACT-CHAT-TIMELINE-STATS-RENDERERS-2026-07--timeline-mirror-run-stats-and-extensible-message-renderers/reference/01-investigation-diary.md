---
Title: Investigation diary
Ticket: REACT-CHAT-TIMELINE-STATS-RENDERERS-2026-07
Status: active
Topics:
    - chat-provider
    - chat-overlay
    - architecture
    - react
    - typescript
DocType: reference
Intent: long-term
Owners: []
RelatedFiles:
    - Path: packages/chat-overlay/src/overlay/ChatMessages.tsx
      Note: |-
        Investigation source for renderer extension gap
        Phase 3 implementation details recorded in Step 5 (commit 42e0517)
    - Path: packages/chat-provider/src/store/runStatsSlice.ts
      Note: Phase 2 implementation details recorded in Step 4 (commit 87e1601)
    - Path: packages/chat-provider/src/store/timelineMerge.ts
      Note: Phase 1 implementation details recorded in Step 3 (commit 0c934ee)
    - Path: packages/chat-provider/src/store/timelineMirror.ts
      Note: Phase 1 implementation details recorded in Step 3 (commit 0c934ee)
    - Path: packages/chat-provider/src/store/timelineSlice.ts
      Note: Investigation source for Tier 1 timeline semantics
    - Path: packages/chat-provider/src/ws/runStatsEvents.ts
      Note: Phase 2 implementation details recorded in Step 4 (commit 87e1601)
ExternalSources: []
Summary: Chronological diary for the Tier 1 react-chat upstreaming design.
LastUpdated: 2026-07-05T16:10:00-04:00
WhatFor: Resume or review the timeline mirror, run stats, and renderer extension upstreaming work.
WhenToUse: Before implementing REACT-CHAT-TIMELINE-STATS-RENDERERS-2026-07.
---





# Diary

## Goal

Record the investigation and design work for upstreaming react-chat Tier 1 foundations: timeline mirror/subscription, run stats, and extensible message renderers.

## Step 1: Map provider timeline/state gaps and write the upstreaming guide

This step created the ticket and wrote the intern-facing design guide for the three foundational upstream additions. I inspected the current `chat-provider` timeline slice, websocket projection path, store selectors, and `chat-overlay` message renderer, then compared them to the downstream duplicated launcher/inventory code described in the prompt.

The key conclusion is that these additions are generic enough for `react-chat`: timeline merge semantics, run usage stats, and renderer extension points are core chat infrastructure. The design intentionally excludes HyperCard parsing, profiles, generated-card persistence, and app window routing.

### Prompt Context

**User prompt (verbatim):** "Ok, create a new docmgr ticket in react-chat (with `docmgr --root REACT_CHAT_PATH/ttmp ...` and for 1-3, and another one for 4 and 6. we're leaving the rest out for later. 

For each ticket, Create  a detailed analysis / design / implementation guide that is for a new intern, explaining all the parts of the system needed to understand what it is, with prose paragraphs and bullet point sand pseudocode and diagrams and api references and file references. It should be very clear and technical. Store in the ticket and the nupload to remarkable."

**Assistant interpretation:** Create two docmgr tickets in the `react-chat` repo; this ticket covers items 1-3 from the colleague assessment: timeline mirror/external subscription, run stats, and renderer extension points.

**Inferred user intent:** The user wants an actionable upstreaming plan that lets a new intern safely add reusable foundations to `react-chat` and later delete duplicated code in downstream apps.

**Commit (code):** N/A — documentation only.

### What I did
- Located `react-chat` at `/home/manuel/code/wesen/go-go-golems/react-chat`.
- Created ticket `REACT-CHAT-TIMELINE-STATS-RENDERERS-2026-07` with `docmgr --root /home/manuel/code/wesen/go-go-golems/react-chat/ttmp ...`.
- Created the design doc and this diary.
- Inspected:
  - `packages/chat-provider/src/store/timelineSlice.ts`
  - `packages/chat-provider/src/ws/timelineEvents.ts`
  - `packages/chat-provider/src/ws/wsManager.ts`
  - `packages/chat-provider/src/ws/timelineSnapshot.ts`
  - `packages/chat-provider/src/store/store.ts`
  - `packages/chat-provider/src/core/createChatClient.ts`
  - `packages/chat-overlay/src/overlay/ChatMessages.tsx`
  - `packages/chat-overlay/src/overlay/ChatPanel.tsx`
  - downstream `wesen-os` copies of `timelineMirror.ts`, `chatStatsStore.ts`, and `StatsFooter.tsx`.

### Why
- Timeline merging is provider-owned correctness logic and should not be copied downstream.
- Provider-call usage metadata is already on the event stream and should become provider state/selectors rather than debug-event scraping.
- `ChatMessages` currently silently drops unknown timeline kinds, which is unsafe for an extensible chat foundation.

### What worked
- The existing provider code already has clear seams: timeline slice, timeline adapters, `applyUIEvent`, and selectors.
- The existing overlay code has a small `ChatMessages` surface that can be extended without changing the entire panel.
- Downstream duplicated code gave concrete acceptance criteria.

### What didn't work
- I did not implement or run tests in this step.
- I did not inspect the inventory duplicate in depth; the design relies on the known duplication and launcher copy as representative evidence.

### What I learned
- The provider's merge semantics are currently private functions in `timelineSlice.ts`.
- `runStatusTimelineAdapter` updates coarse run status but not usage statistics.
- `ChatMessages` filters to `message`, `widget`, and `tool_call`, causing custom kinds to disappear.

### What was tricky to build
- The main design tension is public API stability. Exporting every merge helper would freeze internals; exporting a mirror/controller and mutation application contract gives downstream consumers the behavior they need without promising every implementation detail.

### What warrants a second pair of eyes
- Whether the mirror API should expose mutable or immutable semantics by default.
- Whether stats handling should be its own slice or a non-timeline side effect in the adapter registry.
- Whether the `ChatMessages` fallback should show raw props by default or require opt-in for privacy.

### What should be done in the future
- Implement the Tier 1 APIs and tests before starting the chrome/devtools timeline-debug component, because timeline debug should reuse the mirror API.

### Code review instructions
- Start with `packages/chat-provider/src/store/timelineSlice.ts`; check that reducer and mirror use the same merge implementation.
- Review `packages/chat-provider/src/ws/timelineEvents.ts` for stats event projection.
- Review `packages/chat-overlay/src/overlay/ChatMessages.tsx` for backward-compatible defaults and non-dropping fallback.
- Validate with package tests and Storybook examples.

### Technical details
- Main guide: `ttmp/2026/07/05/REACT-CHAT-TIMELINE-STATS-RENDERERS-2026-07--timeline-mirror-run-stats-and-extensible-message-renderers/design-doc/01-timeline-mirror-run-stats-and-renderer-extension-intern-guide.md`.

## Step 2: Break the implementation into checkable phases

This step converted the design guide into a detailed task checklist before editing source code. The checklist now tracks Phase 1 timeline mirror work, Phase 2 run stats work, Phase 3 renderer extension work, and Phase 4 validation/documentation closeout.

The intent is to keep commits reviewable and avoid mixing provider state changes, overlay renderer changes, and documentation bookkeeping in one large untraceable patch.

### Prompt Context

**User prompt (verbatim):** "Ok, let's work on the timeline/stats/renderers, add detailed tasks per phase so we can precisely keep track of our current progress, and then implement one by one, committing at appropriate intervals, and keeping a detailed diary as you work."

**Assistant interpretation:** Start implementing the Tier 1 ticket, but first expand the ticket task list so progress can be checked off phase-by-phase; commit focused changes and keep this diary updated.

**Inferred user intent:** The user wants implementation discipline: precise tracking, incremental commits, and enough diary detail for another engineer to resume or review the work.

**Commit (code):** pending — documentation/task setup before implementation.

### What I did
- Rewrote `tasks.md` with detailed phase sections and specific checkboxes.
- Split implementation into:
  - Phase 1: provider-owned timeline merge/mirror API.
  - Phase 2: run stats slice/selectors.
  - Phase 3: extensible `ChatMessages` renderers.
  - Phase 4: final validation and documentation closeout.
- Loaded git commit hygiene instructions and inspected the repository status before implementation.

### Why
- The original task list had coarse items that would not support precise progress tracking.
- Timeline, stats, and renderers touch different package boundaries and should be committed separately.

### What worked
- The existing design guide already mapped cleanly into implementation phases.
- The checklist now has concrete validation and commit points.

### What didn't work
- N/A — no code was changed in this step.

### What I learned
- There are already untracked docmgr ticket files under `ttmp/2026/07/`; commits must stage intentionally so unrelated ticket docs are not accidentally bundled with code changes.

### What was tricky to build
- The main sharp edge is Git hygiene: the prior documentation tickets are still untracked, so each commit must stage only the relevant ticket files and implementation files.

### What warrants a second pair of eyes
- Confirm that the task breakdown is granular enough for the desired review cadence.

### What should be done in the future
- Check off phase tasks as code lands.
- Add commit hashes to this diary and the changelog after each focused implementation commit.

### Code review instructions
- Review `tasks.md` first to understand the intended order of work.
- Then review each subsequent commit against the corresponding phase checklist.

### Technical details
- Task list: `ttmp/2026/07/05/REACT-CHAT-TIMELINE-STATS-RENDERERS-2026-07--timeline-mirror-run-stats-and-extensible-message-renderers/tasks.md`.

## Step 3: Implement provider-owned timeline merge and mirror API

This step implemented Phase 1. The provider timeline merge semantics are now in a shared pure helper module, and both the Redux timeline slice and the new mirror API use those same semantics. This removes the need for downstream detached windows to copy provider merge logic.

The new mirror API supports immutable mutation folding, subscriptions, snapshot replacement, clearing, and ordered timeline selectors. The tests compare mirror results against the Redux reducer for streaming text patches, widget prop patches, `upsertIfExists`, and deletion.

### Prompt Context

**User prompt (verbatim):** (see Step 2)

**Assistant interpretation:** Implement the first phase of the timeline/stats/renderers ticket and commit it separately.

**Inferred user intent:** Land the provider-owned timeline mirror foundation before building stats and renderer features on top.

**Commit (code):** `0c934eea310f568f430d1a897b458c69b2c78ba2` — "Add timeline mirror API"

### What I did
- Added `packages/chat-provider/src/store/timelineTypes.ts` for shared `TimelineEntity` and `TimelineState` types.
- Added `packages/chat-provider/src/store/timelineMerge.ts` for provider-owned patch and entity merge helpers.
- Added `packages/chat-provider/src/store/timelineMirror.ts` with `createTimelineMirror`, `applyTimelineMutationToMirror`, and mirror selectors.
- Rewrote `timelineSlice.ts` so reducers call `mergeTimelineEntityIntoState` instead of carrying private duplicate logic.
- Exported mirror, merge, and type APIs from `packages/chat-provider/src/index.ts`.
- Added `packages/chat-provider/src/store/timelineMirror.test.ts`.
- Ran focused tests and typecheck.

### Why
- Detached timeline consumers need provider-owned merge semantics without copying private reducer code.
- Timeline Debug in the later chrome/devtools ticket should depend on this API rather than another local mirror copy.

### What worked
- The reducer and mirror parity tests passed.
- Existing provider tests continued to pass.
- Typecheck passed after installing workspace dependencies.

### What didn't work
- Initial test command failed because dependencies were not installed:
  - Command: `pnpm --filter @go-go-golems/chat-provider test`
  - Error: `sh: 1: vitest: not found` and `Local package.json exists, but node_modules missing, did you mean to install?`
- Fix: ran `pnpm install`, which restored workspace `node_modules`, then reran tests/typecheck successfully.

### What I learned
- The existing timeline merge helpers were small enough to extract without changing reducer behavior.
- Testing mirror vs reducer directly is an effective guard against drift.

### What was tricky to build
- The widget props patch semantics are subtle: `propsPatch` updates nested `entity.props.props`, and `patchPaths` can append array fields instead of replacing them. The parity test explicitly covers this because it is the kind of behavior downstream mirrors are likely to get wrong.

### What warrants a second pair of eyes
- Confirm whether exporting `mergePropsWithPatches` and `mergeTimelineEntityIntoState` is acceptable API surface, or whether only the mirror-level functions should remain public.
- Review whether `cloneTimelineState` should deep-clone only one `props` level, as implemented, or recursively clone for stronger isolation.

### What should be done in the future
- Build Timeline Debug on `createTimelineMirror` instead of copying merge logic.
- Consider documenting public/private stability levels for merge helper exports before npm publish.

### Code review instructions
- Start with `packages/chat-provider/src/store/timelineMerge.ts` and compare behavior to the removed helper code in `timelineSlice.ts`.
- Then review `packages/chat-provider/src/store/timelineMirror.ts` for immutable snapshot behavior and subscription semantics.
- Validate with:
  - `pnpm --filter @go-go-golems/chat-provider test`
  - `pnpm --filter @go-go-golems/chat-provider typecheck`

### Technical details
- Successful validation:
  - `pnpm --filter @go-go-golems/chat-provider test` — 3 files, 12 tests passed.
  - `pnpm --filter @go-go-golems/chat-provider typecheck` — passed.

## Step 4: Add provider run stats state and selectors

This step implemented Phase 2. `chat-provider` now has a `runStats` store slice that consumes the provider-call metadata UI events directly in the normal websocket event path. Downstream apps no longer need to scrape `parsed-frame` debug events just to compute token counts and throughput.

The implementation keeps provider-call usage optional. If a backend never emits `ChatProviderCallMetadataUpdated` or `ChatProviderCallFinished`, the stats selectors stay empty instead of fabricating completed usage. Live streaming still exposes a rough output-token estimate from text patch length until real usage arrives.

### Prompt Context

**User prompt (verbatim):** (see Step 2)

**Assistant interpretation:** Implement the run stats phase as a focused provider change after the timeline mirror commit.

**Inferred user intent:** Replace downstream stats stores with a stable upstream provider selector that is fed by protocol events rather than debug scraping.

**Commit (code):** `87e160124eb8d3d1f4cae3b4b6208a5cd38e9eec` — "Add chat run stats state"

### What I did
- Added `packages/chat-provider/src/store/runStatsSlice.ts` with `ChatUsageTotals`, `ChatRunStats`, public conversion helpers, reducers, and scratch state.
- Added `packages/chat-provider/src/ws/runStatsEvents.ts` with `usageFromPayload` and `applyRunStatsEvent`.
- Registered `runStats` in `createChatStore`.
- Added `selectRunStats` and `selectHasRunUsage` selectors.
- Called `applyRunStatsEvent` from `applyUIEvent` so stats update on the normal websocket path.
- Reset stats in `ChatClient.reset()`.
- Exported stats APIs from `packages/chat-provider/src/index.ts`.
- Added `packages/chat-provider/src/store/runStatsSlice.test.ts`.

### Why
- Run stats are provider/session state, not debug UI state.
- The event stream already carries provider-call usage metadata, so the provider should expose it through stable selectors.

### What worked
- Focused provider test suite passed: 4 test files, 18 tests.
- Provider typecheck passed.
- The stats tests cover live estimates, metadata override, multi-call accumulation, runs without usage, reset, and usage normalization.

### What didn't work
- No new failures in this phase.

### What I learned
- `applyUIEvent` is the right narrow hook point: it sees every `ui-event` after hydration buffering and before/alongside timeline projection.
- Keeping run scratch fields inside the slice makes terminal run handling deterministic and testable.

### What was tricky to build
- The stats state has two layers: public snapshot fields and per-run scratch fields. The scratch fields must reset on `ChatRunStarted`, accumulate across multiple provider calls, and only commit to public `lastRun`/`totals` when a terminal run event arrives.

### What warrants a second pair of eyes
- Confirm whether `selectHasRunUsage` should return true while streaming, or only after real provider-call metadata appears.
- Confirm whether the `ChatTextPatch` token estimate should use `text.length / 4` as downstream did, or be configurable.

### What should be done in the future
- Build a reusable `StatsFooter` after downstream migration or as part of the later chrome ticket.
- Consider hydration behavior if future snapshots persist provider-call metadata.

### Code review instructions
- Start with `packages/chat-provider/src/store/runStatsSlice.ts` for reducer semantics.
- Review `packages/chat-provider/src/ws/runStatsEvents.ts` for event-name handling and usage parsing.
- Confirm `applyUIEvent` still applies timeline mutations after stats updates.
- Validate with:
  - `pnpm --filter @go-go-golems/chat-provider test`
  - `pnpm --filter @go-go-golems/chat-provider typecheck`

### Technical details
- Successful validation:
  - `pnpm --filter @go-go-golems/chat-provider test` — 4 files, 18 tests passed.
  - `pnpm --filter @go-go-golems/chat-provider typecheck` — passed.

## Step 5: Make ChatMessages extensible and non-dropping

This step implemented Phase 3. `ChatMessages` now accepts app-supplied per-kind renderers while preserving built-in rendering for `message`, `widget`, and `tool_call`. Unknown timeline kinds are no longer silently filtered out; they render through a collapsed raw fallback by default.

This turns the local downstream `ChatTimeline` replacement into an upstream extension point. Apps can keep domain-specific entity renderers app-side, but the overlay owns the generic renderer map, fallback behavior, render mode, visible-kind filtering, and empty state plumbing.

### Prompt Context

**User prompt (verbatim):** (see Step 2)

**Assistant interpretation:** Implement the renderer extension phase after provider timeline and stats foundations.

**Inferred user intent:** Allow downstream apps to delete local timeline renderer forks while still supporting custom timeline entity kinds.

**Commit (code):** `42e0517cf9adc0e31d065be2c790137a6843ddc2` — "Add extensible chat message renderers"

### What I did
- Reworked `packages/chat-overlay/src/overlay/ChatMessages.tsx` around `ChatMessagesProps`.
- Added `ChatMessageRenderMode`, `TimelineEntityRendererContext`, and `TimelineEntityRenderer` types.
- Extracted built-in default renderers for `message`, `widget`, and `tool_call`.
- Added `RawTimelineEntityFallback` for unknown timeline entity kinds.
- Added `renderers`, `fallbackRenderer`, `visibleKinds`, `renderMode`, and `empty` props.
- Exported renderer helpers/types from `packages/chat-overlay/src/index.ts`.
- Ran overlay typecheck, overlay tests, and workspace typecheck.

### Why
- The previous `ChatMessages` filtered to three hardcoded kinds and dropped every other timeline entity.
- A reusable chat foundation must let applications render custom timeline kinds without replacing the entire message list.

### What worked
- Existing default usage remains simple: `<ChatMessages bottomRef={...} />` still works.
- Unknown kinds now have a safe default representation.
- Overlay typecheck passed and the package test command handled no-test-files successfully.

### What didn't work
- There are no overlay test files currently, so `pnpm --filter @go-go-golems/chat-overlay test` reports “No test files found” with exit code 0 due `--passWithNoTests`. This validates command wiring, not renderer DOM behavior.

### What I learned
- The renderer API can be added without changing `ChatPanel`; `ChatPanel` continues using default renderers.
- Exporting renderer types from `chat-overlay` is enough for downstream apps to type their custom renderer maps.

### What was tricky to build
- The non-dropping behavior changes the default visible set from “only known kinds” to “everything unless filtered.” That is correct for debugging and safety, but it means apps that intentionally want a narrow view should pass `visibleKinds`.

### What warrants a second pair of eyes
- Confirm the wrapper `<div data-timeline-kind=...>` around each rendered entity does not disrupt existing widget/tool styling.
- Confirm whether the raw fallback should truncate very large payloads before the first release.

### What should be done in the future
- Add React/DOM tests or Storybook stories for custom renderer and unknown fallback behavior.
- Migrate downstream local `ChatTimeline` components to `ChatMessages` renderer maps after publish.

### Code review instructions
- Start with `packages/chat-overlay/src/overlay/ChatMessages.tsx` and check default render parity.
- Verify unknown timeline entities render through `RawTimelineEntityFallback`.
- Validate with:
  - `pnpm --filter @go-go-golems/chat-overlay typecheck`
  - `pnpm --filter @go-go-golems/chat-overlay test`
  - `pnpm typecheck`

### Technical details
- Successful validation:
  - `pnpm --filter @go-go-golems/chat-overlay typecheck` — passed.
  - `pnpm --filter @go-go-golems/chat-overlay test` — no test files found, exit 0 due `--passWithNoTests`.
  - `pnpm typecheck` — provider and overlay passed.

## Step 6: Final validation, doc closeout, and reMarkable refresh

This step closed out the implemented Tier 1 scope. I ran repository-level validation, aligned the design guide with the exact implemented selector API, checked off completed tasks, ran docmgr doctor, and refreshed the reMarkable bundle.

The implementation now has three focused code commits plus diary commits. The only remaining work in this ticket is downstream migration/publish work that was explicitly deferred.

### Prompt Context

**User prompt (verbatim):** (see Step 2)

**Assistant interpretation:** Finish the current implementation pass with validation, documentation bookkeeping, and upload.

**Inferred user intent:** Leave the ticket in a reviewable state with code, docs, validation evidence, and reMarkable copy synchronized.

**Commit (code):** N/A — validation/documentation closeout after code commits `0c934ee`, `87e1601`, and `42e0517`.

### What I did
- Ran repository-level tests: `pnpm test`.
- Ran repository-level typecheck: `pnpm typecheck`.
- Ran `docmgr --root /home/manuel/code/wesen/go-go-golems/react-chat/ttmp doctor --ticket REACT-CHAT-TIMELINE-STATS-RENDERERS-2026-07 --stale-after 30`.
- Updated the design guide to reflect the implemented selector set: `selectRunStats` and `selectHasRunUsage`; a formatted summary selector is deferred to chrome/footer work.
- Uploaded the updated bundle to reMarkable with `--force` because the original ticket bundle already existed.
- Checked off completed task-list items.

### Why
- The code and docs had diverged slightly around the proposed `selectRunStatsSummary`; the guide now matches implementation.
- ReMarkable needed to be refreshed after implementation diary updates.

### What worked
- `pnpm test` passed: 4 test files, 18 tests.
- `pnpm typecheck` passed for provider and overlay packages.
- `docmgr doctor` passed.
- reMarkable upload succeeded after using `--force`.

### What didn't work
- The first non-dry-run upload skipped because the bundle already existed:
  - `SKIP: REACT-CHAT-TIMELINE-STATS-RENDERERS-2026-07 - Tier 1 upstreaming already exists in /ai/2026/07/05/REACT-CHAT-TIMELINE-STATS-RENDERERS-2026-07 (use --force to overwrite)`
- Fix: reran `remarquee upload bundle --force ...`.

### What I learned
- The final docs upload path already existed from the design-only pass, so implementation refreshes need `--force`.
- The repository-level test command currently exercises provider tests; overlay has no test files yet.

### What was tricky to build
- The closeout needed to preserve the distinction between completed upstream implementation and deferred downstream migration. I left publish/migration, Storybook examples, and chrome/devtools work unchecked under the deferred section.

### What warrants a second pair of eyes
- Review the exported API surface before npm publish, especially whether merge helper exports should be considered stable public API.
- Review `RawTimelineEntityFallback` for payload size/privacy behavior before downstream apps enable it broadly.

### What should be done in the future
- Add DOM/Storybook coverage for `ChatMessages` custom renderers and fallback rendering.
- Implement the chrome/devtools ticket on top of the new mirror API.
- Publish package versions and migrate downstream `wesen-os` local copies.

### Code review instructions
- Review code commits in this order:
  1. `0c934ee` — timeline merge/mirror API.
  2. `87e1601` — run stats state/selectors.
  3. `42e0517` — extensible `ChatMessages` renderers.
- Validate with:
  - `pnpm test`
  - `pnpm typecheck`
  - `docmgr --root /home/manuel/code/wesen/go-go-golems/react-chat/ttmp doctor --ticket REACT-CHAT-TIMELINE-STATS-RENDERERS-2026-07 --stale-after 30`

### Technical details
- reMarkable path: `/ai/2026/07/05/REACT-CHAT-TIMELINE-STATS-RENDERERS-2026-07`.
- Bundle: `REACT-CHAT-TIMELINE-STATS-RENDERERS-2026-07 - Tier 1 upstreaming`.
