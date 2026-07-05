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
      Note: Investigation source for renderer extension gap
    - Path: packages/chat-provider/src/store/timelineMerge.ts
      Note: Phase 1 implementation details recorded in Step 3 (commit 0c934ee)
    - Path: packages/chat-provider/src/store/timelineMirror.ts
      Note: Phase 1 implementation details recorded in Step 3 (commit 0c934ee)
    - Path: packages/chat-provider/src/store/timelineSlice.ts
      Note: Investigation source for Tier 1 timeline semantics
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
