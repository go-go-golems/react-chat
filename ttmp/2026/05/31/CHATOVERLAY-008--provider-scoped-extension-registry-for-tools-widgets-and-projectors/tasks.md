# Tasks

## TODO

- [x] Add tasks here

- [x] Create evidence-backed design and implementation guide for provider-scoped tools/widgets/projectors
- [x] Relate relevant provider, web-chat, and ecommerce files
- [x] Run docmgr doctor
- [ ] Upload final bundle to reMarkable

## Phase 1: Provider-scoped registry primitives

- [ ] T5: Replace global widget registry with `createWidgetRegistry()` and pure `defineWidget()` descriptors.
- [ ] T6: Add `useWidget()` hook and make `WidgetOutlet` resolve through provider runtime context.
- [ ] T7: Add generic timeline projector descriptor/registry APIs with priority-ordered first-match projection.
- [ ] T8: Convert the built-in provider timeline event mapper into the default core projector.
- [ ] T9: Add `ChatExtension` descriptors and `useChatExtensions()` registration for tools/widgets/projectors.
- [ ] T10: Extend `ChatProviderConfig` with `extensions`, `tools`, `widgets`, and `projectors` and install them during provider runtime creation.
- [ ] T11: Remove public `defineToolkit`/`useToolkit` exports in favor of `defineChatExtensions`/`useChatExtensions`.
- [ ] T12: Validate `@go-go-golems/chat-provider` typecheck.
- [ ] T13: Commit provider registry primitives.

## Phase 2: Consumer migration

- [ ] T14: Migrate ecommerce widgets away from import-side-effect registration.
- [ ] T15: Migrate ecommerce app to explicit widget extensions while keeping stateful tools hook/component-based.
- [ ] T16: Migrate chat-overlay Storybook widget stories to provider-scoped widget config.
- [ ] T17: Migrate Pinocchio provider demo from toolkit terminology to `ChatExtension` terminology.
- [ ] T18: Migrate Pinocchio provider-backed web-chat to provider config extensions.
- [ ] T19: Validate ecommerce package build and Pinocchio web-chat typecheck/lint/build.
- [ ] T20: Commit consumer migration.

## Phase 3: Projector extraction and Pinocchio parity

- [ ] T21: Move Pinocchio-specific provider projectors into `cmd/web-chat/web/src/chat/provider/projectors`.
- [ ] T22: Install Pinocchio reasoning, agent-mode, backend-tool, widget, and frontend-tool projectors through provider config.
- [ ] T23: Trim generic provider core projector to protocol-generic chat text/widget/frontend-tool cases only where appropriate.
- [ ] T24: Add/adjust tests or smokes for thinking, widgets, tools, and multi-instance isolation.
- [ ] T25: Validate main web-chat smoke, capabilities smoke, provider demo smoke, multi-instance smoke, and provider typecheck.
- [ ] T26: Commit projector extraction and validation scripts if changed.

## Phase 4: Documentation closeout

- [ ] T27: Update implementation diary after each commit with commands, failures, and review notes.
- [ ] T28: Update changelog and file relations for provider and consumer changes.
- [ ] T29: Run `docmgr doctor --ticket CHATOVERLAY-008 --stale-after 30`.
- [ ] T30: Commit final ticket documentation.
