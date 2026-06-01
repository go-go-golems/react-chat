# Tasks

## Completed assessment work

- [x] Create CHATOVERLAY-009 ticket workspace
- [x] Map `cmd/web-chat/web` repo topology and build/Storybook setup
- [x] Review app boot, provider-backed chat runtime, and legacy webchat boundaries
- [x] Review Storybook/component organization and propose one-folder-per-component layout
- [x] Identify legacy, deprecated, unclear, problematic, valuable, and promising code
- [x] Write intern-facing design/code-review/refactoring assessment
- [x] Update diary, relationships, changelog, and doctor validation
- [x] Upload final assessment bundle to reMarkable

## Phase 0 — Refactor safety rails and decision log

Goal: make the cleanup executable without changing runtime behavior accidentally.

- [x] Add a `src/architecture/README.md` or `src/README.md` explaining canonical app boundaries: `app/`, `features/`, `shared/`, `generated/`, and `legacy/`.
- [x] Add a decision note stating that provider-backed `ChatProvider` runtime is canonical for production web-chat.
- [x] Add a decision note stating that provider demo/capability showcase code is temporary and should be deleted, not polished.
- [x] Add a decision note stating that legacy Redux/WebSocket chat code will be deleted after parity, not kept indefinitely.
- [x] Add a migration checklist document that maps old paths to target paths.
- [x] Capture the current validation baseline in the ticket: `npm run typecheck`, `npm run lint`, `npm run build`, `npm run build-storybook`, and the four Playwright smokes.
- [x] Add a small script or documented command to print the actual devctl Vite URL from `.devctl/state.json`.

## Phase 1 — App shell and route-mode cleanup

Goal: make app entrypoints and dev/demo routes explicit before moving components.

- [x] Create `src/app/routeMode.ts` with a typed route-mode parser for `debug`, `providerDemo`, `providerMultiDemo`, and normal chat.
- [x] Move root app composition from `src/App.tsx` into `src/app/App.tsx`.
- [x] Create `src/app/MainWebChatRoot.tsx` for the production web-chat route.
- [x] Create `src/app/DebugUiRoot.tsx` for the debug UI route.
- [x] Create temporary `src/app/ProviderDemoRoot.tsx` and `src/app/ProviderMultiDemoRoot.tsx` wrappers so demo deletion is isolated later.
- [x] Keep `src/App.tsx` as a short compatibility re-export or wrapper during the move.
- [x] Add unit tests for `routeMode.ts` covering all query modes and default behavior.
- [x] Validate app shell move with `npm run typecheck`, `npm run lint`, and main web-chat smoke.

## Phase 2 — Establish feature-folder layout

Goal: introduce the target folder convention without changing component behavior.

- [x] Create `src/features/web-chat/README.md` documenting canonical production web-chat ownership.
- [x] Create `src/features/web-chat/WebChatApp/` with `WebChatApp.tsx`, `types.ts`, `index.ts`, and `WebChatApp.stories.tsx`.
- [x] Create `src/features/web-chat/WebChatProviderShell/` with provider config and profile bridge boundaries.
- [x] Move provider-backed production files from `src/chat/provider/*` into `src/features/web-chat/WebChatApp/` and `WebChatProviderShell/`.
- [x] Move `providerSession.ts`, `providerDebug.ts`, and `providerTimeline.ts` into clearly named provider support folders.
- [x] Keep old `src/chat/provider/index.ts` exports only as temporary compatibility wrappers.
- [x] Update imports in `src/webchat/index.ts` and app routes to point at the new feature paths.
- [x] Validate with typecheck, lint, build, and provider multi-instance smoke.

## Phase 3 — Component folders and Storybook foundation

Goal: convert reusable UI pieces to one folder per component with colocated stories.

- [x] Move `src/webchat/components/Header.tsx` to `src/features/web-chat/ChatHeader/ChatHeader.tsx`.
- [x] Add `src/features/web-chat/ChatHeader/types.ts` and `index.ts`.
- [x] Add `ChatHeader.stories.tsx` with default, many-profiles, error-count, and narrow-width examples.
- [x] Move `src/webchat/components/Statusbar.tsx` to `src/features/web-chat/ChatStatusbar/ChatStatusbar.tsx`.
- [x] Add `ChatStatusbar.stories.tsx` with connected, disconnected, error, and export-visible states.
- [x] Move `src/webchat/components/Composer.tsx` to `src/features/web-chat/ChatComposer/ChatComposer.tsx`.
- [x] Add `ChatComposer.stories.tsx` with empty, typed, disabled/streaming, and long-text states.
- [x] Move `src/webchat/components/Timeline.tsx` to `src/features/web-chat/ChatTimeline/ChatTimeline.tsx`.
- [x] Add `ChatTimeline.stories.tsx` with empty, message-only, tool/widget, error-panel, and detached-scroll examples.
- [x] Move `src/webchat/hooks/useStickyScrollFollow.ts` into `ChatTimeline/` or `shared/hooks/` with tests preserved.
- [x] Replace the monolithic `src/webchat/ChatWidget.stories.tsx` with focused component stories.
- [x] Ensure every new component folder has `Component.tsx`, `Component.stories.tsx`, `types.ts`, and `index.ts` unless explicitly documented.
- [x] Validate with `npm run build-storybook` after each group of moves.

## Phase 4 — Card renderer decomposition

Goal: split large card/rendering code into typed, story-backed card components.

- [x] Create `src/features/web-chat/cards/MessageCard/` with component, types, stories, fixtures, and index.
- [x] Create `ToolCallCard/` with requested, running, completed, failed, and human-tool states.
- [x] Create `ToolResultCard/` with JSON, text, empty, and error states.
- [x] Create `AgentModeCard/` with preview and committed states.
- [x] Create `WidgetInstanceCard/` with streaming, ready, failed, and unknown-widget states.
- [x] Create `GenericCard/` for unknown entity fallback states.
- [x] Move markdown rendering into `Markdown/` with stories for links, code blocks, lists, and unsafe URL cases.
- [x] Replace `src/webchat/cards.tsx` with explicit exports or delete it once imports are migrated.
- [x] Add typed fixture builders for `RenderEntity` variants.
- [x] Validate visual stories and existing smokes.

## Phase 5 — Delete demo capability code

Goal: remove provider-demo/capability showcase code rather than preserving it as production architecture.

- [x] Remove `WebChatProviderCapabilities` from the production provider-backed widget path.
- [x] Delete `webChatProviderCapabilitiesExtension` once no production code imports it.
- [x] Delete frontend demo widget `demo.capability_card` and its `CapabilityCard` component unless replaced by a real product widget.
- [x] Delete frontend demo tools `browser.get_page_context` and `browser.confirm_action` from web-chat demo code unless replaced by real app-owned tools.
- [x] Remove `?providerDemo=1` route after parity smokes have replacement coverage.
- [x] Remove `?providerMultiDemo=1` route or move it to a test-only harness outside production app routing.
- [x] Delete or archive Playwright smokes that depend on `run the capabilities demo`.
- [x] Replace deleted demo smokes with production-relevant tests: main chat connect/send, typed widget rendering, real frontend tool path if still supported, and provider isolation unit tests.
- [x] Check backend showcase endpoints/tooling for dead code after frontend demo deletion.
- [x] Update docs so users no longer see `run the capabilities demo` as a supported prompt.
- [x] Validate with main web-chat smoke and new production-focused replacement smokes.

## Phase 6 — Parity gate for legacy deletion

Goal: prove provider-backed web-chat covers required behavior before removing legacy Redux/WebSocket chat.

- [x] Define a parity checklist for legacy `ChatWidget.tsx` versus provider-backed `WebChatApp`.
- [x] Verify session creation and URL/session-id persistence parity.
- [x] Verify profile loading, profile switching, and profile error behavior parity.
- [x] Verify WebSocket connect, reconnect, snapshot hydration, and buffered event behavior parity.
- [x] Verify user message sending and run status transitions parity.
- [x] Verify reasoning/thinking message rendering parity.
- [x] Verify backend tool call/result rendering parity.
- [x] Verify typed widget rendering parity.
- [x] Verify frontend tool request/result behavior parity if retained after demo deletion.
- [x] Verify export menu parity using provider session id.
- [x] Verify stream debug panel parity or explicitly mark it dev-only.
- [x] Run full validation suite and record results in the ticket diary.

## Phase 6A — Deterministic mock inference profile before legacy deletion

Goal: make provider parity testable without a live LLM by selecting an explicit `mock_parity` profile that short-circuits normal runtime composition and returns a deterministic mock engine.

- [x] Add `mock_parity` to the dev/test profile list or profile fixture loaded by web-chat devctl.
- [x] Add `cmd/web-chat/mockruntime` with a small Geppetto-compatible mock `engine.Engine`.
- [x] Add a hardcoded resolver shortcut in `cmd/web-chat/canonical_runtime_resolver.go`: `profile=mock_parity` returns the mock engine; all other profiles use the existing resolver/composer path.
- [x] Keep prompt text irrelevant to mock activation; remove/avoid `/mock` or `mock:all` prompt checks.
- [x] Implement a first text-streaming mock scenario with deterministic assistant chunks and stable IDs.
- [x] Add resolver tests proving `mock_parity` uses the mock engine and normal profiles still delegate to normal runtime composition.
- [x] Add mock engine tests asserting deterministic event order for text streaming.
- [x] Extend the mock scenario to emit reasoning/thinking Geppetto events.
- [x] Extend the mock scenario to emit backend tool-call Geppetto events for started, args, requested, execution, result, and finished states.
- [x] Extend the mock scenario to emit app-owned special events such as agent-mode commit if straightforward through existing plugin paths.
- [x] Add app/server integration tests that submit a message with `profile=mock_parity` and assert deterministic timeline entities.
- [x] Decide whether widget/frontend-tool coverage is needed in the first mock pass or can be Phase 6A follow-up.
- [ ] If widget/frontend-tool coverage is included, add only a minimal context bridge using the existing `PromptRequest.RuntimeContext` hook.
- [ ] If widget/frontend-tool coverage is included, add app-owned `mockParityExtension` with `app.confirm_action`, optional `app.mock_echo`, and `mock.progress`.
- [x] Add a Playwright script under this ticket's `scripts/` folder for mock profile parity.
- [ ] Add a Playwright script under this ticket's `scripts/` folder for mock profile hydration.
- [x] Update `reference/02-provider-parity-checklist.md` with mock-profile evidence.
- [x] Re-run Phase 6 validation and block Phase 7 legacy deletion until mock-profile parity passes.

## Phase 7 — Delete legacy Redux/WebSocket chat code after parity

Goal: remove old runtime paths so the example project is clean and opinionated.

- [x] First implement CHATOVERLAY-010 unified timeline adapter API so live projection and snapshot hydration cannot drift for app-owned timeline entities.
- [x] Delete `src/webchat/ChatWidget.tsx` after parity sign-off.
- [x] Delete `LegacyChatWidget` export from `src/webchat/index.ts`.
- [x] Delete legacy singleton `src/ws/wsManager.ts` if no tests or production code import it.
- [x] Delete legacy `src/ws/timelineEvents.ts` after provider projector tests replace useful coverage.
- [x] Delete legacy `src/ws/timelineSnapshot.ts` after provider snapshot/projector coverage replaces useful coverage.
- [x] Delete or move legacy `src/ws/*` tests to provider/projector tests as appropriate.
- [x] Delete `src/store/timelineSlice.ts` if production no longer uses the legacy timeline store.
- [x] Delete `src/store/errorsSlice.ts` if provider/app shell no longer needs legacy error panel state.
- [x] Keep `profileApi` and minimal app/profile slice only if still used by provider-backed shell.
- [x] Remove compatibility re-exports `src/webchat/ProviderBackedChatWidget.tsx` and `src/webchat/ProviderMultiDemoPage.tsx` after imports move.
- [x] Run `rg "LegacyChatWidget|wsManager|timelineEvents|timelineSnapshot|timelineSlice" src` and confirm only intended references remain.
- [x] Validate with typecheck, lint, build, Storybook, and production smokes.

## Phase 8 — Replace global registries with explicit APIs

Goal: align web-chat rendering extension points with provider-scoped extension design.

- [x] Replace `rendererRegistry.ts` global registration with `createWebChatRenderers({ overrides })` or equivalent factory.
- [x] Update `WebChatApp` to pass renderer maps explicitly.
- [x] Delete `registerTimelineRenderer`, `unregisterTimelineRenderer`, and `clearRegisteredTimelineRenderers` if no external users remain.
- [x] Replace `timelinePropsRegistry.ts` global registration with projector-local normalization or renderer-local props adapters.
- [x] Delete `registerTimelinePropsNormalizer`, `unregisterTimelinePropsNormalizer`, and `clearRegisteredTimelinePropsNormalizers` if no external users remain.
- [x] Introduce typed render entity unions for message, tool call, tool result, widget, agent mode, and generic entities.
- [x] Remove `RenderEntity.props: any` and replace with discriminated union props where practical.
- [x] Remove `getDefaultMiddleware: any` in `src/store/store.ts`.
- [x] Add unit tests for renderer factory override precedence.

## Phase 9 — Pinocchio projector hardening

Goal: keep app-specific live event projection explicit and well-tested.

- [ ] Move `pinocchioProjectors.ts` into `src/features/web-chat/extensions/pinocchio-projectors/`.
- [ ] Split reasoning, agent-mode, and backend-tool projectors into separate files.
- [ ] Add fixtures for representative sessionstream frames.
- [ ] Add unit tests for reasoning patch append, snapshot, and finish behavior.
- [ ] Add unit tests for agent-mode preview, commit, and clear behavior.
- [ ] Add unit tests for backend tool argument patch merge and result projection.
- [ ] Document projector priority and first-match behavior.
- [ ] Validate projectors against at least one captured real event sequence if available.

## Phase 10 — CSS/theming modularization

Goal: keep the good `data-pwchat`/`data-part` design but make CSS easier to own.

- [x] Split `src/webchat/styles/webchat.css` into `root.css`, `layout.css`, `header.css`, `statusbar.css`, `timeline.css`, `cards.css`, `composer.css`, and `debug-panel.css`.
- [x] Create `src/features/web-chat/styles/index.css` that imports the modular files in deterministic order.
- [x] Keep `theme-default.css` as theme tokens or move it to `styles/themes/default.css`.
- [x] Expand `ChatPart`/`WebChatPart` type to cover documented public `data-part` values.
- [x] Move inline styles from `ExportMenu`, `StreamDebugPanel`, cards, and provider demo code into CSS classes or component parts.
- [x] Add a style README documenting token names, public parts, and private/internal parts.
- [x] Validate theme override and unstyled Storybook stories.

## Phase 11 — Debug UI boundary cleanup

Goal: keep debug UI useful but prevent it from leaking types/state into production web-chat.

- [ ] Move debug UI to `src/features/debug-ui/` or add README boundaries if moving is too noisy.
- [ ] Fix `src/debug-ui/ws/debugWsManager.ts` if it imports main app store types instead of debug store types.
- [ ] Add stories for `AppShell`, `TimelineLanes`, `EventTrackLane`, `ProjectionLane`, and `NowMarker`.
- [ ] Ensure debug UI CSS is imported only by debug UI or Storybook debug stories.
- [ ] Decide whether `?debug=1` remains in production app or becomes dev-only build/routing behavior.
- [ ] Validate debug route manually and with a lightweight smoke if feasible.

## Phase 12 — Generated code and package-management cleanup

Goal: reduce noise for new contributors.

- [ ] Move generated protobuf output from `src/chatapp/pb` to `src/generated/chatapp` if Buf/Vite imports allow it.
- [ ] Add `src/generated/README.md` saying generated files are not hand-edited.
- [ ] Decide whether this app is npm-only or pnpm-based.
- [ ] Remove the non-canonical lockfile after package-manager decision.
- [ ] Document the temporary local `@go-go-golems/chat-provider` file dependency and removal plan.
- [ ] Add `npm run check:storybook` or include Storybook build in CI if desired.
- [ ] Update `README.md` with devctl commands and actual-port discovery.

## Phase 13 — Final cleanup verification

Goal: prove the cleaned app is a better example project.

- [ ] Run `npm run typecheck`.
- [ ] Run `npm run lint`.
- [ ] Run `npm run build`.
- [ ] Run `npm run build-storybook`.
- [ ] Run main web-chat Playwright smoke.
- [ ] Run production widget/tool smoke replacements.
- [ ] Run provider isolation/projector unit tests.
- [ ] Run `rg` checks for deleted concepts: `ProviderDemoPage`, `capability_card`, `run the capabilities demo`, `LegacyChatWidget`, `wsManager`.
- [ ] Update CHATOVERLAY-009 design doc with final architecture deltas.
- [ ] Update diary with exact validation output and any migration surprises.
- [ ] Upload final cleanup implementation report to reMarkable.
