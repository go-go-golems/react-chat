---
Title: Implementation diary
Ticket: CHATOVERLAY-007
Status: active
Topics:
  - chat-overlay
  - pinocchio
  - web-chat
  - frontend-tools
  - widgets
DocType: reference
Intent: long-term
Owners: []
RelatedFiles: []
Summary: "Chronological diary for the web-chat capabilities showcase implementation."
LastUpdated: 2026-05-31T03:55:00-04:00
---

# Diary

## Goal

This diary captures the implementation journey for adding a Pinocchio web-chat capabilities showcase that demonstrates frontend tool calls and typed custom widgets.

## Step 1: Ticket setup and design plan

I created a new `CHATOVERLAY-007` docmgr ticket and wrote the first full design/implementation guide before changing runtime code. The design chooses a deliberately narrow showcase flow: an explicit demo prompt publishes normal chat lifecycle events, a `demo.capability_card` widget, and a `browser.confirm_action` frontend tool request.

The important constraint is that web-chat should demonstrate generic chatbot package capabilities without becoming the ecommerce overlay or adopting the full `ChatProvider` UI. The design therefore keeps the normal runtime resolver path untouched and adds the showcase as a separate, explicit branch.

### Prompt Context

**User prompt (verbatim):** "createa  new ticket witha detailed design and implementation guide and add detailed list of tasks, then work on them one by one , committing at appropriate intervals, keeping a detailed diary a s you work"

**Assistant interpretation:** Create a new docmgr ticket for the web-chat capabilities showcase, write detailed design/tasks, then implement incrementally with commits and diary entries.

**Inferred user intent:** Keep the feature development auditable and reviewable while adding a demo frontend tool call and custom widget to Pinocchio web-chat.

**Commit (code):** Pending at this step.

### What I did
- Created ticket `CHATOVERLAY-007`.
- Created design doc `design-doc/01-web-chat-capabilities-showcase-design-and-implementation-guide.md`.
- Created diary doc `reference/01-implementation-diary.md`.
- Replaced the generated task list with phased implementation tasks.
- Inspected the current backend/frontend seams that shape the design:
  - `pinocchio/cmd/web-chat/app/server.go`
  - `pinocchio/pkg/chatapp/service.go`
  - `pinocchio/pkg/chatapp/frontendtools/manager.go`
  - `pinocchio/pkg/chatapp/widgets/plugin.go`
  - `pinocchio/cmd/web-chat/web/src/ws/timelineEvents.ts`
  - `pinocchio/cmd/web-chat/web/src/webchat/cards.tsx`

### Why
- The user explicitly asked for a new ticket, detailed design/implementation guide, detailed tasks, one-by-one implementation, commits, and a detailed diary.
- Writing the plan first makes it easier to avoid over-migrating web-chat or mixing showcase UI with the existing LLM profile/runtime path.

### What worked
- `docmgr ticket create-ticket`, `docmgr doc add`, and direct task/design/diary authoring all succeeded.
- Existing Pinocchio packages already contain most backend primitives needed for the showcase: frontend tool event contracts and widget event contracts.

### What didn't work
- N/A in this setup step.

### What I learned
- Pinocchio web-chat already has generic widget and frontend-tool schemas in core packages, but its web UI does not yet project those live events into dedicated renderable entities.
- The cleanest first implementation path is app-owned event publication plus a narrow demo endpoint, not a full `ChatProvider` UI migration.

### What was tricky to build
- The main design tension is avoiding a package cycle. `pkg/chatapp/frontendtools` imports `pkg/chatapp`, so core `chatapp` should not import `frontendtools`. The design keeps frontend-tool-specific demo logic in `cmd/web-chat/app` and only adds a generic `Service.PublishEvent(...)` method to core.

### What warrants a second pair of eyes
- Review whether `Service.PublishEvent(...)` is the right reusable API name/scope or whether it should be restricted to app packages.
- Review whether the showcase trigger phrases are explicit enough to avoid surprising normal prompts.

### What should be done in the future
- Add a generalized frontend tool transport path after the showcase proves the UX.
- Consider turning the demo into a first-class profile or suggested prompt once stable.

### Code review instructions
- Start with the design doc to confirm scope.
- Then review implementation commits in task order.
- Validate using the commands recorded in later diary steps.

### Technical details
- Ticket path: `ttmp/2026/05/30/CHATOVERLAY-007--showcase-web-chat-frontend-tools-and-typed-widgets`.
- Primary design doc: `design-doc/01-web-chat-capabilities-showcase-design-and-implementation-guide.md`.
