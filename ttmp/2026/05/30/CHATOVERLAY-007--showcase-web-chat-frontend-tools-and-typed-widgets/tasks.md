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

- [ ] T8.1 Add `createSessionBody` and `sendMessageBody` hooks to `ChatProviderConfig`.
- [ ] T8.2 Thread request adapter bodies through `createChatClient.ensureSession()` and `send()`.
- [ ] T8.3 Preserve current default request body behavior for existing overlay users.
- [ ] T8.4 Run `pnpm --filter @go-go-golems/chat-provider typecheck`.
- [ ] T8.5 Run ecommerce demo build to ensure no regression.
- [ ] T8.6 Commit ChatProvider request adapter support.

## Phase 9: Web-chat provider-compatible backend endpoints

- [ ] T9.1 Add `/api/chat/sessions/{id}/tools/manifest` to web-chat session routing.
- [ ] T9.2 Decode ChatProvider tool manifests into `FrontendToolManifestCommand` descriptors.
- [ ] T9.3 Submit manifests through `chatapp.Service.SubmitCommand(...)` and `frontendtools.Manager`.
- [ ] T9.4 Add focused Go tests for manifest endpoint behavior.
- [ ] T9.5 Run focused Go tests.
- [ ] T9.6 Commit backend manifest endpoint support.

## Phase 10: Web-chat ChatProvider demo page

- [ ] T10.1 Add a `providerDemo=1` web-chat route/page that is wrapped in `ChatProvider` rather than the legacy web-chat Redux store.
- [ ] T10.2 Build a small full-page provider demo shell with transcript, status, and composer.
- [ ] T10.3 Register `browser.get_page_context` using `useFrontendTool`.
- [ ] T10.4 Register `browser.confirm_action` using `useHumanTool` and `ToolCallOutlet`.
- [ ] T10.5 Register/render `demo.capability_card` using `defineWidget` and `WidgetOutlet`.
- [ ] T10.6 Use ChatProvider request adapters in the page config.
- [ ] T10.7 Run web-chat typecheck/build/lint.
- [ ] T10.8 Commit web-chat provider demo page.

## Phase 11: Provider demo smoke and final closeout

- [ ] T11.1 Add a Playwright smoke for `?providerDemo=1`.
- [ ] T11.2 Validate devctl-managed provider demo flow end-to-end.
- [ ] T11.3 Update diary with implementation details, failures, commits, and validation.
- [ ] T11.4 Update changelog and relate new files.
- [ ] T11.5 Run `docmgr doctor --ticket CHATOVERLAY-007 --stale-after 30`.
- [ ] T11.6 Commit final docs and smoke script.
