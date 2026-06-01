---
Title: Investigation diary
Ticket: CHATOVERLAY-010
Status: active
Topics:
    - chat-provider
    - web-chat
    - architecture
    - parity
DocType: reference
Intent: long-term
Owners: []
RelatedFiles: []
ExternalSources: []
Summary: "Chronological diary for the unified timeline adapter API ticket."
LastUpdated: 2026-05-31T20:35:09.274152988-04:00
WhatFor: "Track design and implementation work for CHATOVERLAY-010."
WhenToUse: "Before resuming timeline adapter API implementation."
---

# Diary

## Goal

Capture the design and implementation journey for a unified timeline adapter API that registers live event projection and snapshot hydration together.

## Step 1: Create the timeline adapter API ticket and design package

This step created a dedicated ticket for the live/hydration registration problem exposed by `mock_parity` rehydration. The important conclusion is that targeted app-side hydration patches are not sufficient; the provider extension mechanism needs one adapter API that owns both live UI-event projection and durable snapshot hydration.

The ticket intentionally specifies a clean cutover. Existing live-only projectors should be replaced, not preserved through compatibility aliases, so app authors cannot register live behavior and forget hydration behavior.

### Prompt Context

**User prompt (verbatim):** "create a ticket to create timeline adapter API, and add a detailed design + implementation guide. Add a task in the current ticket to first implement this adapter API.\n\nAdd a detailed set of tasks to the timeline adapter API, so that we can properly make sure everything is registered correctly. No backwards compatibility code, we should make the API impossible to utilise in a wrong manner, and replace whatever is necessary to make it so."

**Assistant interpretation:** Create a new docmgr ticket for a unified timeline adapter API, write a detailed design/implementation plan, add detailed tasks, and update CHATOVERLAY-009 so this adapter API is implemented before legacy deletion.

**Inferred user intent:** Prevent future live-vs-hydration drift by making the ChatProvider extension API enforce paired registration.

### What I did
- Created CHATOVERLAY-010: `Create unified timeline adapter API`.
- Added `design-doc/01-timeline-adapter-api-design-and-implementation-guide.md`.
- Replaced `tasks.md` with a phased implementation checklist.
- Added a Phase 7 gate task in CHATOVERLAY-009 requiring CHATOVERLAY-010 before legacy deletion.

### Why
- The `AgentMode` hydration bug happened because live projectors and snapshot mappers are separate mechanisms.
- A unified adapter API makes it explicit when an app-owned timeline concept supports live projection, hydration, both, or intentionally only one side.

### What worked
- The design now has concrete API sketches for `TimelineAdapter`, hydration policies, adapter registry methods, strict factory helpers, and migration phases.
- The task list includes validation, tests, migration, and grep-based cleanup gates.

### What didn't work
- N/A; this step was planning/documentation only.

### What I learned
- The current provider extension API has a structural gap: `projectors` are live-only, while snapshots are hardcoded in a separate file.
- The old legacy Pinocchio code had app-specific snapshot normalization, so any clean provider cutover needs an app-owned hydration registration mechanism.

### What was tricky to build
- The API must allow rare live-only or hydrate-only cases without making them accidental. The design uses explicit factory helpers and a required unsupported-hydration reason for live-only adapters.

### What warrants a second pair of eyes
- Review whether unknown snapshot fallback should remain enabled by default or become a development warning/drop behavior.
- Review whether adapter names should be globally unique or extension-scoped.

### What should be done in the future
- Implement CHATOVERLAY-010 before deleting legacy Redux/WebSocket hydration code in CHATOVERLAY-009.

### Code review instructions
- Start with `design-doc/01-timeline-adapter-api-design-and-implementation-guide.md`.
- Then review `tasks.md` for implementation order and acceptance gates.
- Confirm CHATOVERLAY-009 has the Phase 7 prerequisite task.

### Technical details
- No source code changed in this step.
- The intended clean-cutover removes `projectors?: TimelineProjector[]` rather than keeping a compatibility alias.
