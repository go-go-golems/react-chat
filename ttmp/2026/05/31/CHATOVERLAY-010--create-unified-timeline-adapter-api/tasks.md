# Tasks

## Phase 0 — Ticket setup and current-state confirmation

Goal: preserve the exact problem statement and verify the split live/hydration architecture before implementation.

- [x] Create CHATOVERLAY-010 ticket workspace.
- [x] Write the timeline adapter API design and implementation guide.
- [ ] Reproduce the hydration regression with `mock_parity`: live `AgentMode` renders as a card, rehydrated `AgentMode` falls back to raw JSON without the temporary patch.
- [ ] Capture current live path files and snapshot path files in the diary with line references.
- [ ] Confirm all current extension registrations that use `projectors`.
- [ ] Confirm all current snapshot mappings in `chat-provider/src/ws/timelineSnapshot.ts`.
- [ ] Confirm Pinocchio temporary hydration patch cases in `providerTimeline.ts`.

## Phase 1 — Introduce strict timeline adapter types

Goal: add the new API surface in chat-provider without migrating call sites yet.

- [ ] Create `packages/chat-provider/src/ws/timelineAdapterRegistry.ts`.
- [ ] Define `TimelineAdapter`, `HydrationPolicy`, `LiveProjectionContext`, and `SnapshotProjectionContext` types.
- [ ] Define `TimelineProjectionResult` with `adapterName` and `mutation`.
- [ ] Add `defineTimelineAdapter` runtime validation helper.
- [ ] Add `defineLiveAndHydrateAdapter` helper.
- [ ] Add `defineLiveOnlyAdapter` helper requiring non-empty `hydrationUnsupportedReason`.
- [ ] Add `defineHydrateOnlyAdapter` helper.
- [ ] Add tests rejecting adapters with neither live nor hydrate support.
- [ ] Add tests rejecting live adapters with missing/empty hydration policy.
- [ ] Add tests rejecting duplicate adapter names in a registry.
- [ ] Add tests for priority ordering and registration order stability.

## Phase 2 — Build adapter registry mechanics

Goal: make one registry own both live projection and hydration projection.

- [ ] Implement `createTimelineAdapterRegistry()`.
- [ ] Implement `register(adapter): cleanup` with duplicate-name checks.
- [ ] Implement `projectLive(frame, ctx)` using adapter priority and `live.accepts`.
- [ ] Implement `projectSnapshot(entity, ctx)` using hydration policy.
- [ ] Implement `list()` for diagnostics/tests.
- [ ] Implement `assertHydrationCoverage()` or equivalent coverage-report helper.
- [ ] Add tests for cleanup/unregister restoring previous state.
- [ ] Add tests for live first-match behavior.
- [ ] Add tests for snapshot first-match behavior.
- [ ] Add tests that unsupported hydration policy returns no projection and records/exposes the explicit reason.

## Phase 3 — Convert ChatProvider built-ins to adapters

Goal: remove the split between `coreChatProjector` and hardcoded snapshot mapper.

- [ ] Convert run-status handling to a built-in adapter.
- [ ] Convert generic chat message live events to a built-in message adapter.
- [ ] Convert `ChatMessage` snapshot hydration to the same built-in message adapter.
- [ ] Convert widget live events to a built-in widget adapter.
- [ ] Convert `ChatWidgetInstance` snapshot hydration to the same built-in widget adapter.
- [ ] Convert frontend tool live events to a built-in frontend-tool adapter.
- [ ] Convert `ChatFrontendToolCall` snapshot hydration to the same built-in frontend-tool adapter.
- [ ] Add an explicit unknown-snapshot fallback adapter if fallback rendering remains desired.
- [ ] Delete or stop exporting `coreChatProjector`.
- [ ] Delete or stop using direct `timelineEntityFromSnapshotEntity` hardcoded kind checks outside adapters.
- [ ] Add tests proving generic built-ins render the same normalized kinds after live and hydration paths.

## Phase 4 — Replace extension API with timeline adapters

Goal: make wrong API usage impossible by removing live-only projector registration.

- [ ] Update `ChatExtension` to use `timelineAdapters?: TimelineAdapter[]`.
- [ ] Remove `projectors?: TimelineProjector[]` from extension config; do not keep a compatibility alias.
- [ ] Update `ChatRuntimeApi` to expose `timelineAdapters` or `timeline` registry instead of `projectors`.
- [ ] Update `installChatExtension` to register adapters.
- [ ] Update `ChatProvider` runtime creation to create and install an adapter registry.
- [ ] Register built-in adapters before app extensions and before WebSocket connect/hydration.
- [ ] Update `createChatClient`, `wsManager`, and `timelineEvents` to call `adapterRegistry.projectLive`.
- [ ] Update snapshot hydration to call `adapterRegistry.projectSnapshot`.
- [ ] Remove `createTimelineProjectorRegistry` exports.
- [ ] Remove `TimelineProjector` type exports unless a renamed internal type remains.
- [ ] Run TypeScript compile and fix all projectors call sites as hard failures, not compatibility wrappers.

## Phase 5 — Migrate Pinocchio web-chat projectors to adapters

Goal: Pinocchio app-specific live and hydration mappings are registered together.

- [ ] Rename/split `pinocchio-projectors` into `pinocchio-timeline-adapters`.
- [ ] Implement `pinocchio.reasoning` adapter.
- [ ] Explicitly document/encode whether reasoning snapshot hydration relies on generic `ChatMessage` hydration or has its own hydration handler.
- [ ] Implement `pinocchio.agent-mode` adapter live handlers for preview, commit, and clear.
- [ ] Implement `pinocchio.agent-mode` hydration handler for durable `AgentMode` entities.
- [ ] Implement `pinocchio.backend-tool` live handlers for `ChatToolCall*` and `ChatToolResultReady`.
- [ ] Implement `pinocchio.backend-tool` hydration handler for `ChatToolCall` entities.
- [ ] Implement `pinocchio.backend-tool` hydration handler for `ChatToolResult` entities.
- [ ] Update `WebChatProviderShell` to register `timelineAdapters`.
- [ ] Remove app extension usage of `projectors` entirely.
- [ ] Add tests for live and hydrated `AgentMode` producing `kind: agent_mode`.
- [ ] Add tests for live and hydrated backend tool calls producing `kind: tool_call` and `kind: tool_result`.

## Phase 6 — Remove temporary hydration normalization and legacy assumptions

Goal: ensure there is only one source of truth for timeline normalization.

- [ ] Remove `AgentMode`, `ChatToolCall`, and `ChatToolResult` special cases from `providerTimeline.ts`.
- [ ] Reduce `providerTimeline.ts` to shape conversion only, or delete it if no longer needed.
- [ ] Search for `timelineEntityFromSnapshotEntity` and ensure only adapter-backed paths remain.
- [ ] Search for `projectorRegistry` and ensure no production code remains.
- [ ] Search for `projectors:` in ChatProvider/web-chat extension config and ensure none remain.
- [ ] Update docs/comments mentioning projectors to timeline adapters.
- [ ] Update existing Playwright scripts if names/diagnostics changed.

## Phase 7 — Hydration parity tests and smokes

Goal: prove live and hydrated paths cannot drift for registered adapters.

- [ ] Add chat-provider unit tests for built-in live/hydration parity.
- [ ] Add Pinocchio unit tests for agent-mode live/hydration parity.
- [ ] Add Pinocchio unit tests for backend tool live/hydration parity.
- [ ] Add a hydration Playwright smoke under CHATOVERLAY-010 `scripts/`.
- [ ] The smoke should select `mock_parity`, send a prompt, capture `sessionId`, reload, and assert `AgentModeCard` layout.
- [ ] The smoke should assert hydrated backend tool calls render in `[data-part="card"]` layout.
- [ ] The smoke should assert raw protobuf `@type` JSON is not visible for adapter-owned entities.
- [ ] Add the smoke to the validation instructions in the design doc.
- [ ] Store script evidence under `/tmp` or ticket var output without committing generated evidence.

## Phase 8 — Validation and cleanup gate

Goal: make CHATOVERLAY-010 safe to land before CHATOVERLAY-009 legacy deletion.

- [ ] Run chat-provider tests.
- [ ] Run Pinocchio web-chat typecheck.
- [ ] Run Pinocchio web-chat lint.
- [ ] Run Pinocchio web-chat build.
- [ ] Run Pinocchio Storybook build if adapter changes affect stories.
- [ ] Run focused Go tests if mock profile tests are touched.
- [ ] Run `04-phase6-mock-profile-parity-smoke.js`.
- [ ] Run the new CHATOVERLAY-010 hydration smoke.
- [ ] Run `rg "projectors?:|projectorRegistry|createTimelineProjectorRegistry|pinocchio-projectors"` and document remaining matches.
- [ ] Update CHATOVERLAY-009 tasks to unblock Phase 7 only after adapter API is complete.
- [ ] Update diary and changelog with exact commands and outcomes.
- [ ] Run `docmgr doctor --ticket CHATOVERLAY-010 --stale-after 30`.
