# Tasks

## Closure note

CHATOVERLAY-010 is closed with a deliberately small baseline unit-test suite plus Playwright hydration smoke coverage. The remaining unchecked registry tests are useful follow-ups, but were not required for the closure gate after the user chose a bare-but-useful baseline.

## Phase 0 — Ticket setup and current-state confirmation

Goal: preserve the exact problem statement and verify the split live/hydration architecture before implementation.

- [x] Create CHATOVERLAY-010 ticket workspace.
- [x] Write the timeline adapter API design and implementation guide.
- [x] Reproduce the hydration regression with `mock_parity`: live `AgentMode` renders as a card, rehydrated `AgentMode` falls back to raw JSON without the temporary patch.
- [x] Capture current live path files and snapshot path files in the diary with line references.
- [x] Confirm all current extension registrations that use `projectors`.
- [x] Confirm all current snapshot mappings in `chat-provider/src/ws/timelineSnapshot.ts`.
- [x] Confirm Pinocchio temporary hydration patch cases in `providerTimeline.ts`.

## Phase 1 — Introduce strict timeline adapter types

Goal: add the new API surface in chat-provider without migrating call sites yet.

- [x] Create `packages/chat-provider/src/ws/timelineAdapterRegistry.ts`.
- [x] Define `TimelineAdapter`, `HydrationPolicy`, `LiveProjectionContext`, and `SnapshotProjectionContext` types.
- [x] Define `TimelineProjectionResult` with `adapterName` and `mutation`.
- [x] Add `defineTimelineAdapter` runtime validation helper.
- [x] Add `defineLiveAndHydrateAdapter` helper.
- [x] Add `defineLiveOnlyAdapter` helper requiring non-empty `hydrationUnsupportedReason`.
- [x] Add `defineHydrateOnlyAdapter` helper.
- [ ] Add tests rejecting adapters with neither live nor hydrate support.
- [x] Add tests rejecting live adapters with missing/empty hydration policy.
- [x] Add tests rejecting duplicate adapter names in a registry.
- [x] Add tests for priority ordering and registration order stability.

## Phase 2 — Build adapter registry mechanics

Goal: make one registry own both live projection and hydration projection.

- [x] Implement `createTimelineAdapterRegistry()`.
- [x] Implement `register(adapter): cleanup` with duplicate-name checks.
- [x] Implement `projectLive(frame, ctx)` using adapter priority and `live.accepts`.
- [x] Implement `projectSnapshot(entity, ctx)` using hydration policy.
- [x] Implement `list()` for diagnostics/tests.
- [x] Implement `assertHydrationCoverage()` or equivalent coverage-report helper.
- [ ] Add tests for cleanup/unregister restoring previous state.
- [ ] Add tests for live first-match behavior.
- [ ] Add tests for snapshot first-match behavior.
- [ ] Add tests that unsupported hydration policy returns no projection and records/exposes the explicit reason.

## Phase 3 — Convert ChatProvider built-ins to adapters

Goal: remove the split between `coreChatProjector` and hardcoded snapshot mapper.

- [x] Convert run-status handling to a built-in adapter.
- [x] Convert generic chat message live events to a built-in message adapter.
- [x] Convert `ChatMessage` snapshot hydration to the same built-in message adapter.
- [x] Convert widget live events to a built-in widget adapter.
- [x] Convert `ChatWidgetInstance` snapshot hydration to the same built-in widget adapter.
- [x] Convert frontend tool live events to a built-in frontend-tool adapter.
- [x] Convert `ChatFrontendToolCall` snapshot hydration to the same built-in frontend-tool adapter.
- [x] Add an explicit unknown-snapshot fallback adapter if fallback rendering remains desired.
- [x] Delete or stop exporting `coreChatProjector`.
- [x] Delete or stop using direct `timelineEntityFromSnapshotEntity` hardcoded kind checks outside adapters.
- [x] Add tests proving generic built-ins render the same normalized kinds after live and hydration paths.

## Phase 4 — Replace extension API with timeline adapters

Goal: make wrong API usage impossible by removing live-only projector registration.

- [x] Update `ChatExtension` to use `timelineAdapters?: TimelineAdapter[]`.
- [x] Remove `projectors?: TimelineProjector[]` from extension config; do not keep a compatibility alias.
- [x] Update `ChatRuntimeApi` to expose `timelineAdapters` or `timeline` registry instead of `projectors`.
- [x] Update `installChatExtension` to register adapters.
- [x] Update `ChatProvider` runtime creation to create and install an adapter registry.
- [x] Register built-in adapters before app extensions and before WebSocket connect/hydration.
- [x] Update `createChatClient`, `wsManager`, and `timelineEvents` to call `adapterRegistry.projectLive`.
- [x] Update snapshot hydration to call `adapterRegistry.projectSnapshot`.
- [x] Remove `createTimelineProjectorRegistry` exports.
- [x] Remove `TimelineProjector` type exports unless a renamed internal type remains.
- [x] Run TypeScript compile and fix all projectors call sites as hard failures, not compatibility wrappers.

## Phase 5 — Migrate Pinocchio web-chat projectors to adapters

Goal: Pinocchio app-specific live and hydration mappings are registered together.

- [x] Rename/split `pinocchio-projectors` into `pinocchio-timeline-adapters`.
- [x] Implement `pinocchio.reasoning` adapter.
- [x] Explicitly document/encode whether reasoning snapshot hydration relies on generic `ChatMessage` hydration or has its own hydration handler.
- [x] Implement `pinocchio.agent-mode` adapter live handlers for preview, commit, and clear.
- [x] Implement `pinocchio.agent-mode` hydration handler for durable `AgentMode` entities.
- [x] Implement `pinocchio.backend-tool` live handlers for `ChatToolCall*` and `ChatToolResultReady`.
- [x] Implement `pinocchio.backend-tool` hydration handler for `ChatToolCall` entities.
- [x] Implement `pinocchio.backend-tool` hydration handler for `ChatToolResult` entities.
- [x] Update `WebChatProviderShell` to register `timelineAdapters`.
- [x] Remove app extension usage of `projectors` entirely.
- [x] Add tests for live and hydrated `AgentMode` producing `kind: agent_mode`.
- [x] Add tests for live and hydrated backend tool calls producing `kind: tool_call` and `kind: tool_result`.

## Phase 6 — Remove temporary hydration normalization and legacy assumptions

Goal: ensure there is only one source of truth for timeline normalization.

- [x] Remove `AgentMode`, `ChatToolCall`, and `ChatToolResult` special cases from `providerTimeline.ts`.
- [x] Reduce `providerTimeline.ts` to shape conversion only, or delete it if no longer needed.
- [x] Search for `timelineEntityFromSnapshotEntity` and ensure only adapter-backed paths remain.
- [x] Search for `projectorRegistry` and ensure no production code remains.
- [x] Search for `projectors:` in ChatProvider/web-chat extension config and ensure none remain.
- [x] Update docs/comments mentioning projectors to timeline adapters.
- [x] Update existing Playwright scripts if names/diagnostics changed.

## Phase 7 — Hydration parity tests and smokes

Goal: prove live and hydrated paths cannot drift for registered adapters.

- [x] Add chat-provider unit tests for built-in live/hydration parity.
- [x] Add Pinocchio unit tests for agent-mode live/hydration parity.
- [x] Add Pinocchio unit tests for backend tool live/hydration parity.
- [x] Add a hydration Playwright smoke under CHATOVERLAY-010 `scripts/`.
- [x] The smoke should select `mock_parity`, send a prompt, capture `sessionId`, reload, and assert `AgentModeCard` layout.
- [x] The smoke should assert hydrated backend tool calls render in `[data-part="card"]` layout.
- [x] The smoke should assert raw protobuf `@type` JSON is not visible for adapter-owned entities.
- [x] Add the smoke to the validation instructions in the design doc.
- [x] Store script evidence under `/tmp` or ticket var output without committing generated evidence.

## Phase 8 — Validation and cleanup gate

Goal: make CHATOVERLAY-010 safe to land before CHATOVERLAY-009 legacy deletion.

- [x] Run chat-provider tests.
- [x] Run Pinocchio web-chat typecheck.
- [x] Run Pinocchio web-chat lint.
- [x] Run Pinocchio web-chat build.
- [x] Run Pinocchio Storybook build if adapter changes affect stories.
- [x] Run focused Go tests if mock profile tests are touched.
- [x] Run `04-phase6-mock-profile-parity-smoke.js`.
- [x] Run the new CHATOVERLAY-010 hydration smoke.
- [x] Run `rg "projectors?:|projectorRegistry|createTimelineProjectorRegistry|pinocchio-projectors"` and document remaining matches.
- [x] Update CHATOVERLAY-009 tasks to unblock Phase 7 only after adapter API is complete.
- [x] Update diary and changelog with exact commands and outcomes.
- [x] Run `docmgr doctor --ticket CHATOVERLAY-010 --stale-after 30`.
