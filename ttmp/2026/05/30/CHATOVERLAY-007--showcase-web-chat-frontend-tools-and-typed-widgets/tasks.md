---
Title: Tasks
Ticket: CHATOVERLAY-007
Status: active
Topics:
  - chat-overlay
  - pinocchio
  - web-chat
  - frontend-tools
  - widgets
DocType: tasks
Intent: short-term
Owners: []
RelatedFiles: []
Summary: "Task list for adding a Pinocchio web-chat capabilities showcase with frontend tools and typed widgets."
LastUpdated: 2026-05-31T03:55:00-04:00
---

# Tasks

## Phase 1: Ticket and design setup

- [x] T1.1 Create `CHATOVERLAY-007` ticket workspace.
- [x] T1.2 Create primary design/implementation guide.
- [x] T1.3 Create implementation diary document.
- [x] T1.4 Write detailed design/implementation guide.
- [x] T1.5 Relate initial source files that shape the design.
- [x] T1.6 Commit ticket setup and design docs.

## Phase 2: Backend event and endpoint support

- [x] T2.1 Add a minimal `chatapp.Service.SubmitCommand(...)` helper for app-owned command submission.
- [x] T2.2 Add web-chat frontend-tool result request/response DTOs.
- [x] T2.3 Add `/api/chat/sessions/{id}/tools/results` routing in web-chat.
- [x] T2.4 Allow frontend tool results to be published even when the call was demo-published rather than manager-requested.
- [x] T2.5 Implement showcase result publication as `ChatFrontendToolResultReceived`.
- [x] T2.6 Add focused Go tests for showcase tool result handling.
- [x] T2.7 Run focused Go tests.
- [x] T2.8 Commit backend endpoint support.

## Phase 3: Backend showcase run

- [x] T3.1 Add `showcase` prompt detection in web-chat submit handling.
- [x] T3.2 Implement `runCapabilitiesShowcase(...)` with user message, run lifecycle, assistant text, widget start/patch/complete, and frontend tool request events.
- [x] T3.3 Use `demo.capability_card` as the custom widget name.
- [x] T3.4 Publish a `browser.confirm_action` request and complete the showcase while leaving the result endpoint to update the tool card asynchronously.
- [x] T3.5 Ensure normal prompts still use the existing runtime resolver path.
- [x] T3.6 Add focused Go tests for showcase prompt event flow.
- [x] T3.7 Run focused Go tests.
- [x] T3.8 Commit backend showcase run.

## Phase 4: Frontend timeline projection and tool runtime

- [x] T4.1 Add frontend projection for `ChatFrontendToolCallRequested` and `ChatFrontendToolResultReceived`.
- [x] T4.2 Add frontend projection for `ChatWidgetInstanceStarted`, `ChatWidgetInstancePatched`, `ChatWidgetInstanceCompleted`, and `ChatWidgetInstanceRemoved`.
- [x] T4.3 Add a web-chat frontend tool runtime that reacts to frontend tool request UI events.
- [x] T4.4 Implement `browser.get_page_context` as an automatic frontend tool.
- [x] T4.5 Implement `browser.confirm_action` as a human-in-the-loop frontend tool.
- [x] T4.6 Submit frontend tool results to the new web-chat HTTP endpoint.
- [x] T4.7 Preserve current timeline rendering for normal chat/tool/reasoning entities.
- [x] T4.8 Run web-chat typecheck.
- [x] T4.9 Commit frontend projection and tool runtime support.

## Phase 5: Custom widget rendering

- [x] T5.1 Add a dedicated `CapabilityCard` React renderer for `demo.capability_card` widget entities.
- [x] T5.2 Update generic `WidgetInstanceCard` to render merged widget props and status clearly.
- [x] T5.3 Register renderer mapping for `demo.capability_card`.
- [x] T5.4 Style the showcase card using existing `data-part` theme primitives.
- [x] T5.5 Run web-chat typecheck/build.
- [x] T5.6 Commit custom widget rendering.

## Phase 6: Browser smoke and docs closeout

- [x] T6.1 Add repeatable Playwright smoke script for the capabilities showcase.
- [x] T6.2 Validate with devctl-managed Pinocchio web-chat.
- [x] T6.3 Update implementation diary with every implementation phase and validation command.
- [x] T6.4 Update changelog with commits and validation evidence.
- [x] T6.5 Relate modified source files to design and diary docs.
- [x] T6.6 Run `docmgr doctor --ticket CHATOVERLAY-007 --stale-after 30`.
- [x] T6.7 Commit final documentation and smoke script.

## Phase 7: ChatProvider headless API design update

- [x] T7.1 Update the implementation guide to describe web-chat as a headless ChatProvider showcase.
- [x] T7.2 Add tasks for ChatProvider request adapters, web-chat manifest endpoint, provider-demo page, and smoke validation.
- [x] T7.3 Update the diary with the design pivot from manual wiring to ChatProvider-first showcase.
- [x] T7.4 Commit the guide/task/diary update before code changes.

## Phase 8: ChatProvider request adapter support

- [x] T8.1 Add `createSessionBody` and `sendMessageBody` hooks to `ChatProviderConfig`.
- [x] T8.2 Thread request adapter bodies through `createChatClient.ensureSession()` and `send()`.
- [x] T8.3 Preserve current default request body behavior for existing overlay users.
- [x] T8.4 Run `pnpm --filter @go-go-golems/chat-provider typecheck`.
- [x] T8.5 Run ecommerce demo build to ensure no regression.
- [x] T8.6 Commit ChatProvider request adapter support.

## Phase 9: Web-chat provider-compatible backend endpoints

- [x] T9.1 Add `/api/chat/sessions/{id}/tools/manifest` to web-chat session routing.
- [x] T9.2 Decode ChatProvider tool manifests into `FrontendToolManifestCommand` descriptors.
- [x] T9.3 Submit manifests through `chatapp.Service.SubmitCommand(...)` and `frontendtools.Manager`.
- [x] T9.4 Add focused Go tests for manifest endpoint behavior.
- [x] T9.5 Run focused Go tests.
- [x] T9.6 Commit backend manifest endpoint support.

## Phase 10: Web-chat ChatProvider demo page

- [x] T10.1 Add a `providerDemo=1` web-chat route/page that is wrapped in `ChatProvider` rather than the legacy web-chat Redux store.
- [x] T10.2 Build a small full-page provider demo shell with transcript, status, and composer.
- [x] T10.3 Register `browser.get_page_context` using `defineToolkit`/`defineTool`.
- [x] T10.4 Register `browser.confirm_action` using `defineToolkit`/`defineTool` and render it through `ToolCallOutlet`.
- [x] T10.5 Register/render `demo.capability_card` using `defineWidget` and `WidgetOutlet`.
- [x] T10.6 Use ChatProvider request adapters in the page config.
- [x] T10.7 Run web-chat typecheck/build/lint.
- [x] T10.8 Commit web-chat provider demo page.

## Phase 11: Provider demo smoke and final closeout

- [x] T11.1 Add a Playwright smoke for `?providerDemo=1`.
- [x] T11.2 Validate devctl-managed provider demo flow end-to-end.
- [x] T11.3 Update diary with implementation details, failures, commits, and validation.
- [x] T11.4 Update changelog and relate new files.
- [x] T11.5 Run `docmgr doctor --ticket CHATOVERLAY-007 --stale-after 30`.
- [x] T11.6 Commit final docs and smoke script.

## Phase 12: Port the main web-chat ChatWidget to ChatProvider

- [x] T12.1 Extend the implementation guide with the main-widget migration plan and provider API refinements.
- [x] T12.2 Add ChatProvider session id configuration (`sessionIdParam`, `sessionStorageKey`, `onSessionIdChange`) so web-chat can keep `?sessionId=` behavior.
- [x] T12.3 Validate ChatProvider package and ecommerce demo after session config changes.
- [x] T12.4 Commit provider session API refinements.
- [x] T12.5 Extract/reuse the web-chat provider capabilities toolkit from the provider demo page.
- [x] T12.6 Add a provider-backed main `ChatWidget` shell that keeps profile/header/composer chrome but uses ChatProvider for chat mechanics.
- [x] T12.7 Render provider timeline entities through existing web-chat cards plus `ToolCallOutlet` and `WidgetOutlet`.
- [x] T12.8 Preserve selected profile request bodies through ChatProvider request adapters.
- [x] T12.9 Switch the main web-chat export to the provider-backed widget while keeping the legacy file available for reference.
- [x] T12.10 Run web-chat typecheck/lint/build.
- [x] T12.11 Validate existing main web-chat smoke and capabilities smoke.
- [x] T12.12 Commit the main ChatWidget provider port.
- [x] T12.13 Update diary, changelog, and file relations with the main-widget migration.
- [x] T12.14 Run `docmgr doctor --ticket CHATOVERLAY-007 --stale-after 30`.
- [x] T12.15 Commit final docs for this migration slice.

## Phase 13: Provider parity polish

- [x] T13.1 Add ticket tasks for provider-native export/debug parity and multi-instance validation.
- [x] T13.2 Add a generic ChatProvider debug observer API for raw WS frames, parsed frames, snapshots, UI events, and lifecycle changes.
- [x] T13.3 Wire the Pinocchio provider-backed widget to the existing Stream Debug panel through the generic observer.
- [x] T13.4 Add a provider-safe export menu backed by the provider session id.
- [x] T13.5 Add a repeatable multi-instance provider browser smoke.
- [x] T13.6 Validate provider package, web-chat build/lint/typecheck, main/capabilities/provider-demo smokes, and multi-instance smoke.
- [x] T13.7 Commit provider parity code and smoke.
- [x] T13.8 Update diary/changelog/relations and run docmgr doctor.
- [x] T13.9 Commit provider parity docs.
