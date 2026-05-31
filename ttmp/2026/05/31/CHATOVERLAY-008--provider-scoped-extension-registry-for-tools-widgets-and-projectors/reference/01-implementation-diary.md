---
Title: Implementation diary
Ticket: CHATOVERLAY-008
Status: active
Topics:
    - chat-overlay
    - react
    - pinocchio
    - widgets
DocType: reference
Intent: long-term
Owners: []
RelatedFiles:
    - Path: ttmp/2026/05/31/CHATOVERLAY-008--provider-scoped-extension-registry-for-tools-widgets-and-projectors/design-doc/01-provider-scoped-extension-registry-design-and-implementation-guide.md
      Note: Primary design deliverable for this ticket
ExternalSources: []
Summary: Chronological diary for the provider-scoped extension registry design ticket.
LastUpdated: 2026-05-31T11:42:28.8357862-04:00
WhatFor: Track research, design, validation, and delivery of the extension registry design package.
WhenToUse: Read before implementing CHATOVERLAY-008 or resuming the design discussion.
---


# Diary

## Goal

This diary captures the design-only ticket for refactoring `chat-provider` extension registration. The output is a detailed intern-facing architecture and implementation guide, not an implementation commit.

## Step 1: Ticket setup, evidence review, and design guide

I created `CHATOVERLAY-008` to capture the requested clean-cut refactor plan for tools, widgets, and timeline projectors. I then inspected the current provider runtime, tool registry, widget registry, provider-backed Pinocchio web-chat code, and ecommerce demo usage to anchor the design in actual files.

The resulting design recommends provider-scoped extension registries: hook/component registration for tools and widgets, and provider-configured projectors for deterministic WebSocket event projection. It explicitly rejects backwards compatibility shims and import-side-effect widget registration.

### Prompt Context

**User prompt (verbatim):** "ok, so let's do a ticket to refactor chat-provider and its using projects to use hook/component for tools and widgets, and provider config for the projectors. No backwards compatibility, clean cutover, we are going for opinoinated and elegant and \"simple\", while providing the generic flexibility if needed."

**Assistant interpretation:** Create a ticket for a clean refactor of chat-provider extension registration APIs, favoring declarative React registration for tools/widgets and provider config for projectors.

**Inferred user intent:** Establish a clear design direction before implementing a potentially breaking API change across multiple consumers.

**User prompt (verbatim):** "Create  a detailed analysis / design / implementation guide that is for a new intern, explaining all the parts of the system needed to understand what it is, with prose paragraphs and bullet point sand pseudocode and diagrams and api references and file references. It should be very clear and technical. Store in the ticket and the nupload to remarkable."

**Assistant interpretation:** Write the detailed design guide into the docmgr ticket and upload the final document bundle to reMarkable.

**Inferred user intent:** Produce a self-contained onboarding-quality document that someone new can use to implement the refactor correctly.

**Commit (code):** N/A — documentation/design step only.

### What I did
- Created ticket `CHATOVERLAY-008`.
- Added a design document: `design-doc/01-provider-scoped-extension-registry-design-and-implementation-guide.md`.
- Added this implementation diary.
- Added initial tasks for design, file relations, doctor validation, and reMarkable delivery.
- Reviewed evidence in:
  - `packages/chat-provider/src/react/ChatProvider.tsx`
  - `packages/chat-provider/src/core/createChatClient.ts`
  - `packages/chat-provider/src/tools/toolRegistry.ts`
  - `packages/chat-provider/src/tools/useFrontendTool.ts`
  - `packages/chat-provider/src/widgets/widgetRegistry.ts`
  - `packages/chat-provider/src/widgets/WidgetOutlet.tsx`
  - `packages/chat-provider/src/ws/timelineEvents.ts`
  - `web/src/App.tsx`
  - `web/src/ecommerce/CartReview.tsx`
  - `pinocchio/cmd/web-chat/web/src/chat/provider/ProviderBackedChatWidget.tsx`
  - `pinocchio/cmd/web-chat/web/src/chat/provider/ProviderBackedChatWidgetInner.tsx`
  - `pinocchio/cmd/web-chat/web/src/webchat/ProviderDemoPage.tsx`
- Wrote the design guide with diagrams, API sketches, implementation phases, testing strategy, risks, and file references.

### Why
- The current system has two different extension registration patterns: lifecycle-scoped tool hooks and global import-side-effect widget registration.
- The recent reasoning/thinking projection issue showed that timeline projectors need an explicit app-extension story, not ad hoc hard-coded provider cases forever.
- The user asked for an opinionated, elegant, simple clean cutover rather than compatibility shims.

### What worked
- `docmgr ticket create-ticket` and `docmgr doc add` created the expected workspace.
- The current provider code already has useful building blocks: provider-scoped tool registries, `ChatToolkit`, and hook-based tool registration.
- The evidence clearly supports the design direction: widgets are global today, while tools are already close to the desired pattern.

### What didn't work
- N/A. This was a research/design step without implementation failures.

### What I learned
- `ChatToolkit` already includes `widgets?: WidgetDefinition[]`, but the install path currently registers only tools. This is a useful refactor seam.
- `ChatProvider` already creates one runtime per provider instance, so provider-scoped widget/projector registries fit the existing architecture naturally.
- Projectors are more timing-sensitive than tools/widgets because they must be installed before WebSocket events arrive.

### What was tricky to build
- The main design tension is choosing where registration belongs. Hook/component registration is idiomatic for stateful tools and widgets, but projectors should usually live in provider config so they are installed before `client.connect()`.
- Another sharp edge is avoiding over-generalization. The design keeps common use simple with `config.widgets`, `config.tools`, and `config.extensions`, while still allowing advanced projectors and extension install hooks.

### What warrants a second pair of eyes
- Review the proposed projector priority/first-match semantics before implementation.
- Review whether `ChatToolkit` should be renamed to `ChatExtension` in the clean cutover or kept as the final public concept.
- Review whether static widgets should be primarily config-based or component-based in examples.

### What should be done in the future
- Implement the refactor in phases described in the design guide.
- Add provider-level tests for widget registry isolation and projector extension behavior.
- Update all consumer examples after the API cutover.

### Code review instructions
- Start with the design guide’s “Current-state analysis” and “Proposed architecture” sections.
- Verify every proposed API against the file references in the guide.
- During implementation, validate with provider typecheck, ecommerce build/smoke, Pinocchio typecheck/lint/build, and browser smokes.

### Technical details
- Ticket path: `ttmp/2026/05/31/CHATOVERLAY-008--provider-scoped-extension-registry-for-tools-widgets-and-projectors`.
- Primary design doc: `design-doc/01-provider-scoped-extension-registry-design-and-implementation-guide.md`.
