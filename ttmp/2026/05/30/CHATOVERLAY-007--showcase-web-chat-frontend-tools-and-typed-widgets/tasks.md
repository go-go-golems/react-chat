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

- [ ] T2.1 Add a minimal `chatapp.Service.PublishEvent(...)` helper for app-owned sessionstream events.
- [ ] T2.2 Add web-chat frontend-tool result request/response DTOs.
- [ ] T2.3 Add `/api/chat/sessions/{id}/tools/results` routing in web-chat.
- [ ] T2.4 Add an in-memory pending showcase tool result registry.
- [ ] T2.5 Implement showcase result publication as `ChatFrontendToolResultReceived`.
- [ ] T2.6 Add focused Go tests for showcase tool result handling.
- [ ] T2.7 Run focused Go tests.
- [ ] T2.8 Commit backend endpoint support.

## Phase 3: Backend showcase run

- [ ] T3.1 Add `showcase` prompt detection in web-chat submit handling.
- [ ] T3.2 Implement `runCapabilitiesShowcase(...)` with user message, run lifecycle, assistant text, widget start/patch/complete, and frontend tool request events.
- [ ] T3.3 Use `demo.capability_card` as the custom widget name.
- [ ] T3.4 Wait for `browser.confirm_action` result or timeout before final widget patch.
- [ ] T3.5 Ensure normal prompts still use the existing runtime resolver path.
- [ ] T3.6 Add focused Go tests for showcase prompt event flow.
- [ ] T3.7 Run focused Go tests.
- [ ] T3.8 Commit backend showcase run.

## Phase 4: Frontend timeline projection and tool runtime

- [ ] T4.1 Add frontend projection for `ChatFrontendToolCallRequested` and `ChatFrontendToolResultReceived`.
- [ ] T4.2 Add frontend projection for `ChatWidgetInstanceStarted`, `ChatWidgetInstancePatched`, `ChatWidgetInstanceCompleted`, and `ChatWidgetInstanceRemoved`.
- [ ] T4.3 Add a web-chat frontend tool runtime that reacts to frontend tool request UI events.
- [ ] T4.4 Implement `browser.get_page_context` as an automatic frontend tool.
- [ ] T4.5 Implement `browser.confirm_action` as a human-in-the-loop frontend tool.
- [ ] T4.6 Submit frontend tool results to the new web-chat HTTP endpoint.
- [ ] T4.7 Preserve current timeline rendering for normal chat/tool/reasoning entities.
- [ ] T4.8 Run web-chat typecheck.
- [ ] T4.9 Commit frontend projection and tool runtime support.

## Phase 5: Custom widget rendering

- [ ] T5.1 Add a dedicated `CapabilityCard` React renderer for `demo.capability_card` widget entities.
- [ ] T5.2 Update generic `WidgetInstanceCard` to render merged widget props and status clearly.
- [ ] T5.3 Register renderer mapping for `demo.capability_card`.
- [ ] T5.4 Style the showcase card using existing `data-part` theme primitives.
- [ ] T5.5 Run web-chat typecheck/build.
- [ ] T5.6 Commit custom widget rendering.

## Phase 6: Browser smoke and docs closeout

- [ ] T6.1 Add repeatable Playwright smoke script for the capabilities showcase.
- [ ] T6.2 Validate with devctl-managed Pinocchio web-chat.
- [ ] T6.3 Update implementation diary with every implementation phase and validation command.
- [ ] T6.4 Update changelog with commits and validation evidence.
- [ ] T6.5 Relate modified source files to design and diary docs.
- [ ] T6.6 Run `docmgr doctor --ticket CHATOVERLAY-007 --stale-after 30`.
- [ ] T6.7 Commit final documentation and smoke script.
