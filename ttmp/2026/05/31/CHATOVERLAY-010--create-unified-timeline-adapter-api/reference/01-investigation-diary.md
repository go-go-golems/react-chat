---
Title: Investigation diary
Ticket: CHATOVERLAY-010
Status: active
Topics:
    - chat-provider
    - web-chat
    - architecture
    - parity
DocType: reference
Intent: long-term
Owners: []
RelatedFiles:
    - Path: ../../../../../../../pinocchio/cmd/web-chat/web/src/features/web-chat/extensions/pinocchio-timeline-adapters/pinocchioTimelineAdapters.test.ts
      Note: Pinocchio AgentMode and backend tool hydration parity baseline tests
    - Path: ../../../../../../../pinocchio/cmd/web-chat/web/src/features/web-chat/extensions/pinocchio-timeline-adapters/pinocchioTimelineAdapters.ts
      Note: Pinocchio app-owned timeline adapters
    - Path: packages/chat-provider/src/ws/timelineAdapterRegistry.test.ts
      Note: Provider adapter registry and ChatMessage parity baseline tests
    - Path: packages/chat-provider/src/ws/timelineAdapterRegistry.ts
      Note: New provider adapter registry and validation API
    - Path: packages/chat-provider/src/ws/timelineEvents.ts
      Note: Core adapters replace old coreChatProjector
    - Path: packages/chat-provider/src/ws/timelineSnapshot.ts
      Note: Snapshot hydration now uses adapter registry
    - Path: ttmp/2026/05/31/CHATOVERLAY-010--create-unified-timeline-adapter-api/scripts/01-mock-profile-hydration-smoke.js
      Note: Repeatable hydration parity smoke
    - Path: ttmp/2026/05/31/CHATOVERLAY-010--create-unified-timeline-adapter-api/tasks.md
      Note: Closure note and final validation status
ExternalSources: []
Summary: Chronological diary for the unified timeline adapter API ticket.
LastUpdated: 2026-05-31T20:35:09.274152988-04:00
WhatFor: Track design and implementation work for CHATOVERLAY-010.
WhenToUse: Before resuming timeline adapter API implementation.
---




# Diary

## Goal

Capture the design and implementation journey for a unified timeline adapter API that registers live event projection and snapshot hydration together.

## Step 1: Create the timeline adapter API ticket and design package

This step created a dedicated ticket for the live/hydration registration problem exposed by `mock_parity` rehydration. The important conclusion is that targeted app-side hydration patches are not sufficient; the provider extension mechanism needs one adapter API that owns both live UI-event projection and durable snapshot hydration.

The ticket intentionally specifies a clean cutover. Existing live-only projectors should be replaced, not preserved through compatibility aliases, so app authors cannot register live behavior and forget hydration behavior.

### Prompt Context

**User prompt (verbatim):** "create a ticket to create timeline adapter API, and add a detailed design + implementation guide. Add a task in the current ticket to first implement this adapter API.\n\nAdd a detailed set of tasks to the timeline adapter API, so that we can properly make sure everything is registered correctly. No backwards compatibility code, we should make the API impossible to utilise in a wrong manner, and replace whatever is necessary to make it so."

**Assistant interpretation:** Create a new docmgr ticket for a unified timeline adapter API, write a detailed design/implementation plan, add detailed tasks, and update CHATOVERLAY-009 so this adapter API is implemented before legacy deletion.

**Inferred user intent:** Prevent future live-vs-hydration drift by making the ChatProvider extension API enforce paired registration.

### What I did
- Created CHATOVERLAY-010: `Create unified timeline adapter API`.
- Added `design-doc/01-timeline-adapter-api-design-and-implementation-guide.md`.
- Replaced `tasks.md` with a phased implementation checklist.
- Added a Phase 7 gate task in CHATOVERLAY-009 requiring CHATOVERLAY-010 before legacy deletion.

### Why
- The `AgentMode` hydration bug happened because live projectors and snapshot mappers are separate mechanisms.
- A unified adapter API makes it explicit when an app-owned timeline concept supports live projection, hydration, both, or intentionally only one side.

### What worked
- The design now has concrete API sketches for `TimelineAdapter`, hydration policies, adapter registry methods, strict factory helpers, and migration phases.
- The task list includes validation, tests, migration, and grep-based cleanup gates.

### What didn't work
- N/A; this step was planning/documentation only.

### What I learned
- The current provider extension API has a structural gap: `projectors` are live-only, while snapshots are hardcoded in a separate file.
- The old legacy Pinocchio code had app-specific snapshot normalization, so any clean provider cutover needs an app-owned hydration registration mechanism.

### What was tricky to build
- The API must allow rare live-only or hydrate-only cases without making them accidental. The design uses explicit factory helpers and a required unsupported-hydration reason for live-only adapters.

### What warrants a second pair of eyes
- Review whether unknown snapshot fallback should remain enabled by default or become a development warning/drop behavior.
- Review whether adapter names should be globally unique or extension-scoped.

### What should be done in the future
- Implement CHATOVERLAY-010 before deleting legacy Redux/WebSocket hydration code in CHATOVERLAY-009.

### Code review instructions
- Start with `design-doc/01-timeline-adapter-api-design-and-implementation-guide.md`.
- Then review `tasks.md` for implementation order and acceptance gates.
- Confirm CHATOVERLAY-009 has the Phase 7 prerequisite task.

### Technical details
- No source code changed in this step.
- The intended clean-cutover removes `projectors?: TimelineProjector[]` rather than keeping a compatibility alias.

## Step 2: Replace live-only projectors with strict timeline adapters

This step implemented the clean cutover requested by CHATOVERLAY-010. The provider no longer exposes or installs `TimelineProjector` registrations; it creates a `TimelineAdapterRegistry`, registers core adapters before WebSocket traffic can arrive, and routes both live UI events and snapshot hydration through the same adapter registry.

Pinocchio web-chat moved its app-owned reasoning, agent-mode, and backend tool mappings into `pinocchio-timeline-adapters`. Durable `AgentMode`, `ChatToolCall`, and `ChatToolResult` snapshots now hydrate through the same extension registration that handles live events, and a Playwright smoke reloads a `mock_parity` session to verify that hydrated cards do not fall back to raw protobuf JSON.

### Prompt Context

**User prompt (verbatim):** "Work on the “timeline adapter” ticket, aggressively remove old code, proceed task-by-task, commit at appropriate intervals, and keep a diary."

**Assistant interpretation:** Implement CHATOVERLAY-010 in task order, remove the old projector API instead of preserving compatibility shims, commit coherent code changes, and record the work.

**Inferred user intent:** Make the provider extension API impossible to misuse for live-only timeline concepts and unblock safe removal of legacy web-chat timeline code later.

**Commit (code):** d810976 — "refactor: add unified timeline adapters"

**Commit (code):** 322fa70 — "refactor: migrate web-chat to timeline adapters"

### What I did
- Added `packages/chat-provider/src/ws/timelineAdapterRegistry.ts` with `TimelineAdapter`, `HydrationPolicy`, live/snapshot contexts, strict helper factories, duplicate-name rejection, priority ordering, cleanup, and coverage reporting.
- Rewrote `packages/chat-provider/src/ws/timelineEvents.ts` around built-in adapters for run status, messages, widgets, frontend tools, and unknown snapshot fallback.
- Rewrote `packages/chat-provider/src/ws/timelineSnapshot.ts` so snapshot hydration clears the timeline and calls `adapterRegistry.projectSnapshot` for every snapshot entity.
- Updated `wsManager`, `createChatClient`, `ChatProvider`, runtime context, extension installation, and exports to use `TimelineAdapterRegistry` and `timelineAdapters`.
- Deleted `packages/chat-provider/src/ws/projectorRegistry.ts` and stopped exporting `TimelineProjector`/`createTimelineProjectorRegistry`.
- Renamed Pinocchio `pinocchio-projectors` to `pinocchio-timeline-adapters` and updated `WebChatProviderShell` to register `pinocchioWebChatTimelineAdapters`.
- Implemented live + hydrate adapters for Pinocchio agent-mode and backend tool entities; encoded reasoning as live-only with an explicit reason that durable reasoning snapshots are generic `ChatMessage` entities.
- Added `scripts/01-mock-profile-hydration-smoke.js` under CHATOVERLAY-010 to run `mock_parity`, reload the session, and assert hydrated `AgentMode`/tool cards render through `[data-part="card"]` without raw protobuf `@type` JSON.

### Why
- The old API made it easy to register app-specific live projection without registering matching hydration logic.
- The `mock_parity` `AgentMode` regression showed that split mechanisms let live cards render correctly while reloads hydrate as raw JSON.
- A strict adapter API makes live/hydration support a property of one named extension object and removes the live-only `projectors` escape hatch.

### What worked
- `npm run typecheck` passed in `packages/chat-provider`.
- `npm run typecheck` passed in `pinocchio/cmd/web-chat/web`.
- `npm run lint` passed in `pinocchio/cmd/web-chat/web`.
- `npm run build` passed in `pinocchio/cmd/web-chat/web` with the known Vite non-module `app-config.js` note and large-chunk warning.
- `node ttmp/2026/05/31/CHATOVERLAY-009--clean-up-pinocchio-web-chat-react-and-storybook-architecture/scripts/04-phase6-mock-profile-parity-smoke.js` passed.
- `node ttmp/2026/05/31/CHATOVERLAY-010--create-unified-timeline-adapter-api/scripts/01-mock-profile-hydration-smoke.js` passed and wrote `/tmp/pinocchio-chatprovider-timeline-adapter-hydration.json`.
- `rg "TimelineProjector|projectorRegistry|projectors\\??:|createTimelineProjectorRegistry|defineTimelineProjector|coreChatProjector|pinocchioWebChatProjectors|pinocchio-projectors|timelineMutationFromUIEvent|timelineEntityFromSnapshotEntity" 2026-05-29--chatbot-overlay-glm/packages/chat-provider pinocchio/cmd/web-chat/web/src/features/web-chat -S` returned no matches.
- `docmgr doctor --ticket CHATOVERLAY-010 --stale-after 30` passed.

### What didn't work
- There is no existing test runner/script in `packages/chat-provider` beyond `tsc --noEmit`, so registry behavior is currently protected by typecheck plus browser smokes rather than dedicated provider unit tests.
- The broader Pinocchio legacy `src/ws` still contains `timelineMutationFromUIEvent` and `timelineEntityFromSnapshotEntity`; that is intentionally outside the provider-backed feature folder and remains a CHATOVERLAY-009 Phase 7 deletion candidate.

### What I learned
- Built-in provider behavior maps naturally to adapters: run-status can be live-only, message/widget/frontend-tool concepts can be live+hydrate, and unknown snapshot rendering can be hydrate-only.
- Pinocchio reasoning hydration does not need an app-specific snapshot adapter as long as the backend persists reasoning as `ChatMessage` with `role: thinking`.
- Adapter registration order matters because built-ins must be present before session start/hydration and app adapters must have priority over unknown fallback.

### What was tricky to build
- The important ordering constraint is that adapters must be registered before buffered live events are replayed or snapshots are applied. `ChatProvider` now creates the registry, installs core adapters, creates the client with that registry, and then installs extension adapters from config.
- Snapshot payloads can arrive wrapped as protobuf `Any`, so `timelineSnapshot.ts` normalizes entity payloads before adapter projection and Pinocchio adapters read plain payload records.
- Backend tool live events are patches, while snapshot entities are durable final state. The backend tool adapter therefore has separate live patch handling and snapshot final-state hydration while still producing the same `tool_call`/`tool_result` card kinds.

### What warrants a second pair of eyes
- Review `timelineAdapterRegistry.ts` API naming and whether `assertHydrationCoverage()` should become part of runtime diagnostics rather than just test/helper surface.
- Review the Pinocchio `AgentMode` snapshot payload fields against backend persistence guarantees, especially whether preview entities should ever persist.
- Review whether the unknown snapshot fallback should remain in production or become a development-only diagnostic after app adapters are complete.

### What should be done in the future
- Add dedicated unit tests for adapter registry validation, priority ordering, cleanup, and built-in live/hydration parity once the package test harness is chosen.
- Add Pinocchio unit tests for app adapters without going through Playwright.
- Run web-chat build/Storybook build before closing CHATOVERLAY-010.
- Only then resume CHATOVERLAY-009 Phase 7 legacy Redux/WebSocket deletion.

### Code review instructions
- Start in `packages/chat-provider/src/ws/timelineAdapterRegistry.ts` to review the new public API and validation rules.
- Then review `packages/chat-provider/src/ws/timelineEvents.ts`, `packages/chat-provider/src/ws/timelineSnapshot.ts`, and `packages/chat-provider/src/ws/wsManager.ts` to verify both live and hydration paths use the adapter registry.
- Review `pinocchio/cmd/web-chat/web/src/features/web-chat/extensions/pinocchio-timeline-adapters/pinocchioTimelineAdapters.ts` for app-owned entity mappings.
- Validate with:
  - `cd 2026-05-29--chatbot-overlay-glm/packages/chat-provider && npm run typecheck`
  - `cd pinocchio/cmd/web-chat/web && npm run typecheck && npm run lint`
  - `cd 2026-05-29--chatbot-overlay-glm && node ttmp/2026/05/31/CHATOVERLAY-010--create-unified-timeline-adapter-api/scripts/01-mock-profile-hydration-smoke.js`

### Technical details
- Core provider commit: `d810976`.
- Pinocchio web-chat commit: `322fa70`.
- Hydration smoke evidence path: `/tmp/pinocchio-chatprovider-timeline-adapter-hydration.json`.
- Mock parity smoke evidence path: `/tmp/pinocchio-phase6-mock-profile-parity-smoke.json`.

## Step 3: Add a bare baseline unit-test safety net

This step added the minimal useful unit tests requested after the adapter cutover. The scope is intentionally small: it protects duplicate registration, accidental live-only hydration omissions, adapter precedence, the provider `ChatMessage` live/hydration contract, and the two Pinocchio snapshot regressions that would visibly break cards after reload.

The tests are not exhaustive. They are a focused baseline so future refactors get fast feedback before relying on Playwright smokes.

### Prompt Context

**User prompt (verbatim):** "ok do it."

**Assistant interpretation:** Add the six-test baseline we just agreed on for the timeline adapter API.

**Inferred user intent:** Get practical unit-level coverage for the adapter regression class without expanding into a large testing effort.

**Commit (code):** 5e2c704 — "test: add timeline adapter baseline coverage"

**Commit (code):** 1a005b0 — "test: add web-chat adapter parity coverage"

### What I did
- Added Vitest to the chat-overlay workspace and a root `test` script.
- Added `packages/chat-provider/src/ws/timelineAdapterRegistry.test.ts` covering:
  - duplicate adapter name rejection,
  - live-only adapter missing/empty hydration reason rejection,
  - priority ordering and stable same-priority registration order,
  - built-in `ChatMessage` live and snapshot projection to `kind: message`.
- Added a Pinocchio web-chat `test` script.
- Added `pinocchioTimelineAdapters.test.ts` covering:
  - live and hydrated `AgentMode` projection to `kind: agent_mode`,
  - hydrated `ChatToolCall` and `ChatToolResult` projection to `tool_call`/`tool_result`.
- Updated CHATOVERLAY-010 task status for the baseline tests.

### Why
- The adapter API should fail fast for the core misuse patterns that caused live/hydration drift.
- Unit tests make the expected render-contract parity explicit without requiring a browser reload for every small refactor.

### What worked
- `pnpm test packages/chat-provider/src/ws/timelineAdapterRegistry.test.ts` passed: 1 file, 4 tests.
- `npm test -- src/features/web-chat/extensions/pinocchio-timeline-adapters/pinocchioTimelineAdapters.test.ts` passed: 1 file, 2 tests.
- `pnpm typecheck` passed in `packages/chat-provider`.
- `npm run typecheck` and `npm run lint` passed in Pinocchio web-chat.
- Pinocchio pre-commit hook reran web typecheck/lint and passed.

### What didn't work
- N/A; the baseline tests passed on the first run after writing them.

### What I learned
- The baseline can stay compact while still exercising the provider registry and Pinocchio app adapters through the real public `createTimelineAdapterRegistry()` flow.
- The existing Pinocchio web package already had Vitest installed; only the overlay workspace needed Vitest added for provider tests.

### What was tricky to build
- The provider package previously had only typecheck/build scripts, so the smallest non-invasive setup was adding Vitest at the overlay workspace root and running the provider test by path.
- The Pinocchio backend-tool test focuses on snapshot hydration because the browser regression was specifically reload-time card fallback. Live backend tool coverage remains available through the Playwright smoke and can be expanded later if needed.

### What warrants a second pair of eyes
- Review whether the chat-overlay root `test` script should eventually be split into package-level scripts or workspace filters.
- Review whether the `ChatMessage` built-in parity test should include finished events in addition to the minimal patch event.

### What should be done in the future
- Add cleanup/unregister tests and unsupported-hydration coverage reporting tests if the registry API evolves.
- Add widget/frontend-tool parity tests when those mock scenarios are implemented.

### Code review instructions
- Start with `packages/chat-provider/src/ws/timelineAdapterRegistry.test.ts` for the provider baseline.
- Then review `pinocchio/cmd/web-chat/web/src/features/web-chat/extensions/pinocchio-timeline-adapters/pinocchioTimelineAdapters.test.ts` for app adapter parity.
- Validate with:
  - `cd 2026-05-29--chatbot-overlay-glm && pnpm test packages/chat-provider/src/ws/timelineAdapterRegistry.test.ts`
  - `cd pinocchio/cmd/web-chat/web && npm test -- src/features/web-chat/extensions/pinocchio-timeline-adapters/pinocchioTimelineAdapters.test.ts`

### Technical details
- Chat-provider test commit: `5e2c704`.
- Pinocchio test commit: `1a005b0`.

## Step 4: Close CHATOVERLAY-010 and hand back to legacy cleanup

This step completed the remaining closure validation for CHATOVERLAY-010 and recorded why the ticket can close with a small unit-test baseline rather than exhaustive registry testing. The adapter API is implemented, Pinocchio is migrated, hydration parity is protected by unit tests plus Playwright reload smoke, and the old provider projector API is gone.

The only unchecked items left in the task file are explicitly deferred exhaustive test cases. They are useful follow-ups, but not required for the user-approved bare baseline or for unblocking CHATOVERLAY-009 Phase 7.

### Prompt Context

**User prompt (verbatim):** "close 010, resume 009"

**Assistant interpretation:** Finish CHATOVERLAY-010 bookkeeping/validation, mark it closed, and continue the previously blocked CHATOVERLAY-009 legacy deletion work.

**Inferred user intent:** Treat the timeline adapter work as complete enough to unblock deletion of the old Redux/WebSocket chat runtime.

### What I did
- Ran remaining closure validation:
  - `npm run build-storybook` in `pinocchio/cmd/web-chat/web`.
  - `go test ./cmd/web-chat/mockruntime ./cmd/web-chat ./cmd/web-chat/app ./cmd/web-chat/profiles ./pkg/chatapp -count=1` in Pinocchio.
- Updated CHATOVERLAY-010 tasks with a closure note explaining deferred exhaustive unit tests.
- Marked the CHATOVERLAY-009 unblock task as complete.
- Prepared the ticket for `docmgr ticket close`.

### Why
- CHATOVERLAY-009 Phase 7 was intentionally blocked until live projection and snapshot hydration shared a strict adapter API.
- That condition is now satisfied by the adapter registry, app adapter migration, unit tests, and hydration smoke.

### What worked
- Storybook build passed with known Storybook `eval` warnings and known large-chunk warning.
- Focused Go tests passed:
  - `cmd/web-chat/mockruntime`
  - `cmd/web-chat`
  - `cmd/web-chat/app`
  - `cmd/web-chat/profiles` (`[no test files]`)
  - `pkg/chatapp`

### What didn't work
- N/A.

### What I learned
- Closing this ticket does not require converting every possible registry behavior into unit tests immediately; the key value is that the public API now makes live/hydration drift difficult and the known app entities are covered.

### What was tricky to build
- The closure boundary needed to distinguish mandatory adapter parity from optional exhaustive test hardening. The task file now keeps deferred tests visible while still documenting why the ticket can close.

### What warrants a second pair of eyes
- Confirm that the deferred registry tests should stay in CHATOVERLAY-010 as visible follow-ups rather than being moved into a separate hardening ticket.

### What should be done in the future
- Add optional registry cleanup/unsupported-hydration tests if the adapter API continues to evolve.

### Code review instructions
- Review the CHATOVERLAY-010 task closure note and the baseline tests from Step 3.
- Re-run `docmgr doctor --ticket CHATOVERLAY-010 --stale-after 30` after the close command.

### Technical details
- Closure depends on overlay commits `d810976`, `5e2c704`, `889c5cf`, `b47eb03`, `77bf493` and Pinocchio commits `322fa70`, `1a005b0`.
