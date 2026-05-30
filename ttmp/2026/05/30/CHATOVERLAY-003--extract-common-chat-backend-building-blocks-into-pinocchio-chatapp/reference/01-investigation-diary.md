---
Title: Investigation Diary
Ticket: CHATOVERLAY-003
Status: active
Topics:
    - chat-overlay
    - pinocchio
    - sessionstream
    - backend
DocType: reference
Intent: long-term
Owners: []
RelatedFiles: []
ExternalSources: []
Summary: "Chronological diary for common backend extraction design."
LastUpdated: 2026-05-30T16:25:00-04:00
WhatFor: "Record design-package creation and future implementation steps."
WhenToUse: "Read before continuing CHATOVERLAY-003 work."
---

# Investigation Diary

## Goal

Capture the initial investigation and design-package creation for CHATOVERLAY-003.

## Step 1: Create the design package

This step created a focused ticket workspace and wrote the implementation guide for the requested refactor. The work is documentation-only: it maps the current chat-overlay and Pinocchio web-chat architecture, identifies the reusable seams, and gives a new intern an implementation path with API sketches, diagrams, file references, and validation steps.

### Prompt Context

**User prompt (verbatim):** "ok, so we have 3 things i want to do :

- move the common go part from web-chat and chatoverlay into pkg/chatapp
- move frontend tools support into pkg/chatapp too
- move widget plugin support into pkg/chatapp too.

Create 3 tickets for these, and then for each ticket:

Create  a detailed analysis / design / implementation guide that is for a new intern, explaining all the parts of the system needed to understand what it is, with prose paragraphs and bullet point sand pseudocode and diagrams and api references and file references. It should be very clear and technical. Store in the ticket and the nupload to remarkable."

**Assistant interpretation:** Create the first of three tickets and design the shared backend/server/store extraction from chat-overlay and web-chat into Pinocchio chatapp.

**Inferred user intent:** Prepare an intern-ready plan for reducing duplicated Go backend plumbing and keeping package ownership correct.

**Commit (code):** N/A — documentation and planning only.

### What I did
- Created the `CHATOVERLAY-003` docmgr ticket workspace.
- Added a design document and this investigation diary.
- Read the relevant chat-overlay and Pinocchio files.
- Wrote an intern-oriented implementation guide with current-state evidence, proposed APIs, pseudocode, migration phases, tests, risks, and references.

### Why
- The refactor affects package boundaries between chat-overlay and Pinocchio. A design-first handoff reduces the risk of moving app-specific code into core packages or creating circular dependencies.

### What worked
- The existing code already exposes clear seams: `chatapp.ChatPlugin`, `chatapp.Service`, `infruntime.ComposedRuntime`, sessionstream projections, and route-level handlers.

### What didn't work
- N/A. This step did not modify code.

### What I learned
- Pinocchio web-chat and chat-overlay overlap heavily at the server/sessionstream layer, but each also has product-specific extensions that must remain separate until their contracts are generalized.

### What was tricky to build
- The main challenge was choosing package boundaries that do not invert dependencies. Pinocchio packages must not import chat-overlay; chat-overlay should consume Pinocchio's reusable chatapp packages.

### What warrants a second pair of eyes
- Review whether the proposed package names are stable enough before implementation begins.
- Review whether any app-specific behavior was accidentally proposed for Pinocchio core.

### What should be done in the future
- Implement the design in small migrations with tests after each package extraction.

### Code review instructions
- Start with the design document in this ticket.
- Compare each proposed move against the referenced source files.
- Validate implementation with the commands listed in the design document.

### Technical details
- No code changed in this step.
