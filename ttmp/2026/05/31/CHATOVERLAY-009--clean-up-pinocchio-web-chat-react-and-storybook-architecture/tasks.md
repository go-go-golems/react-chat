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

- [ ] Move `src/webchat/components/Header.tsx` to `src/features/web-chat/ChatHeader/ChatHeader.tsx`.
- [ ] Add `src/features/web-chat/ChatHeader/types.ts` and `index.ts`.
- [ ] Add `ChatHeader.stories.tsx` with default, many-profiles, error-count, and narrow-width examples.
- [ ] Move `src/webchat/components/Statusbar.tsx` to `src/features/web-chat/ChatStatusbar/ChatStatusbar.tsx`.
- [ ] Add `ChatStatusbar.stories.tsx` with connected, disconnected, error, and export-visible states.
- [ ] Move `src/webchat/components/Composer.tsx` to `src/features/web-chat/ChatComposer/ChatComposer.tsx`.
- [ ] Add `ChatComposer.stories.tsx` with empty, typed, disabled/streaming, and long-text states.
- [ ] Move `src/webchat/components/Timeline.tsx` to `src/features/web-chat/ChatTimeline/ChatTimeline.tsx`.
- [ ] Add `ChatTimeline.stories.tsx` with empty, message-only, tool/widget, error-panel, and detached-scroll examples.
- [ ] Move `src/webchat/hooks/useStickyScrollFollow.ts` into `ChatTimeline/` or `shared/hooks/` with tests preserved.
- [ ] Replace the monolithic `src/webchat/ChatWidget.stories.tsx` with focused component stories.
- [ ] Ensure every new component folder has `Component.tsx`, `Component.stories.tsx`, `types.ts`, and `index.ts` unless explicitly documented.
- [ ] Validate with `npm run build-storybook` after each group of moves.

## Phase 4 — Card renderer decomposition

Goal: split large card/rendering code into typed, story-backed card components.

- [ ] Create `src/features/web-chat/cards/MessageCard/` with component, types, stories, fixtures, and index.
- [ ] Create `ToolCallCard/` with requested, running, completed, failed, and human-tool states.
- [ ] Create `ToolResultCard/` with JSON, text, empty, and error states.
- [ ] Create `AgentModeCard/` with preview and committed states.
- [ ] Create `WidgetInstanceCard/` with streaming, ready, failed, and unknown-widget states.
- [ ] Create `GenericCard/` for unknown entity fallback states.
- [ ] Move markdown rendering into `Markdown/` with stories for links, code blocks, lists, and unsafe URL cases.
- [ ] Replace `src/webchat/cards.tsx` with explicit exports or delete it once imports are migrated.
- [ ] Add typed fixture builders for `RenderEntity` variants.
- [ ] Validate visual stories and existing smokes.

## Phase 5 — Delete demo capability code

Goal: remove provider-demo/capability showcase code rather than preserving it as production architecture.

- [ ] Remove `WebChatProviderCapabilities` from the production provider-backed widget path.
- [ ] Delete `webChatProviderCapabilitiesExtension` once no production code imports it.
- [ ] Delete frontend demo widget `demo.capability_card` and its `CapabilityCard` component unless replaced by a real product widget.
- [ ] Delete frontend demo tools `browser.get_page_context` and `browser.confirm_action` from web-chat demo code unless replaced by real app-owned tools.
- [ ] Remove `?providerDemo=1` route after parity smokes have replacement coverage.
- [ ] Remove `?providerMultiDemo=1` route or move it to a test-only harness outside production app routing.
- [ ] Delete or archive Playwright smokes that depend on `run the capabilities demo`.
- [ ] Replace deleted demo smokes with production-relevant tests: main chat connect/send, typed widget rendering, real frontend tool path if still supported, and provider isolation unit tests.
- [ ] Check backend showcase endpoints/tooling for dead code after frontend demo deletion.
- [ ] Update docs so users no longer see `run the capabilities demo` as a supported prompt.
- [ ] Validate with main web-chat smoke and new production-focused replacement smokes.

## Phase 6 — Parity gate for legacy deletion

Goal: prove provider-backed web-chat covers required behavior before removing legacy Redux/WebSocket chat.

- [ ] Define a parity checklist for legacy `ChatWidget.tsx` versus provider-backed `WebChatApp`.
- [ ] Verify session creation and URL/session-id persistence parity.
- [ ] Verify profile loading, profile switching, and profile error behavior parity.
- [ ] Verify WebSocket connect, reconnect, snapshot hydration, and buffered event behavior parity.
- [ ] Verify user message sending and run status transitions parity.
- [ ] Verify reasoning/thinking message rendering parity.
- [ ] Verify backend tool call/result rendering parity.
- [ ] Verify typed widget rendering parity.
- [ ] Verify frontend tool request/result behavior parity if retained after demo deletion.
- [ ] Verify export menu parity using provider session id.
- [ ] Verify stream debug panel parity or explicitly mark it dev-only.
- [ ] Run full validation suite and record results in the ticket diary.

## Phase 7 — Delete legacy Redux/WebSocket chat code after parity

Goal: remove old runtime paths so the example project is clean and opinionated.

- [ ] Delete `src/webchat/ChatWidget.tsx` after parity sign-off.
- [ ] Delete `LegacyChatWidget` export from `src/webchat/index.ts`.
- [ ] Delete legacy singleton `src/ws/wsManager.ts` if no tests or production code import it.
- [ ] Delete legacy `src/ws/timelineEvents.ts` after provider projector tests replace useful coverage.
- [ ] Delete legacy `src/ws/timelineSnapshot.ts` after provider snapshot/projector coverage replaces useful coverage.
- [ ] Delete or move legacy `src/ws/*` tests to provider/projector tests as appropriate.
- [ ] Delete `src/store/timelineSlice.ts` if production no longer uses the legacy timeline store.
- [ ] Delete `src/store/errorsSlice.ts` if provider/app shell no longer needs legacy error panel state.
- [ ] Keep `profileApi` and minimal app/profile slice only if still used by provider-backed shell.
- [ ] Remove compatibility re-exports `src/webchat/ProviderBackedChatWidget.tsx` and `src/webchat/ProviderMultiDemoPage.tsx` after imports move.
- [ ] Run `rg "LegacyChatWidget|wsManager|timelineEvents|timelineSnapshot|timelineSlice" src` and confirm only intended references remain.
- [ ] Validate with typecheck, lint, build, Storybook, and production smokes.

## Phase 8 — Replace global registries with explicit APIs

Goal: align web-chat rendering extension points with provider-scoped extension design.

- [ ] Replace `rendererRegistry.ts` global registration with `createWebChatRenderers({ overrides })` or equivalent factory.
- [ ] Update `WebChatApp` to pass renderer maps explicitly.
- [ ] Delete `registerTimelineRenderer`, `unregisterTimelineRenderer`, and `clearRegisteredTimelineRenderers` if no external users remain.
- [ ] Replace `timelinePropsRegistry.ts` global registration with projector-local normalization or renderer-local props adapters.
- [ ] Delete `registerTimelinePropsNormalizer`, `unregisterTimelinePropsNormalizer`, and `clearRegisteredTimelinePropsNormalizers` if no external users remain.
- [ ] Introduce typed render entity unions for message, tool call, tool result, widget, agent mode, and generic entities.
- [ ] Remove `RenderEntity.props: any` and replace with discriminated union props where practical.
- [ ] Remove `getDefaultMiddleware: any` in `src/store/store.ts`.
- [ ] Add unit tests for renderer factory override precedence.

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

- [ ] Split `src/webchat/styles/webchat.css` into `root.css`, `layout.css`, `header.css`, `statusbar.css`, `timeline.css`, `cards.css`, `composer.css`, and `debug-panel.css`.
- [ ] Create `src/features/web-chat/styles/index.css` that imports the modular files in deterministic order.
- [ ] Keep `theme-default.css` as theme tokens or move it to `styles/themes/default.css`.
- [ ] Expand `ChatPart`/`WebChatPart` type to cover documented public `data-part` values.
- [ ] Move inline styles from `ExportMenu`, `StreamDebugPanel`, cards, and provider demo code into CSS classes or component parts.
- [ ] Add a style README documenting token names, public parts, and private/internal parts.
- [ ] Validate theme override and unstyled Storybook stories.

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
