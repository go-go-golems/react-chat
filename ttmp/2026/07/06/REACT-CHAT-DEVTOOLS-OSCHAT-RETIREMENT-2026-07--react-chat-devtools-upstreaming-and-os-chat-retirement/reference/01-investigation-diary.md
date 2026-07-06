---
Title: Investigation diary
Ticket: REACT-CHAT-DEVTOOLS-OSCHAT-RETIREMENT-2026-07
Status: active
Topics:
    - chat-overlay
    - chat-provider
    - architecture
    - react
    - typescript
DocType: reference
Intent: long-term
Owners: []
RelatedFiles:
    - Path: /home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/apps/os-launcher/src/chat/ChatDebugWindows.tsx
      Note: Evidence source for launcher-local devtools rebuilt on chat-provider events.
    - Path: /home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-app-inventory/apps/inventory/src/launcher/chat/InventoryDebugWindows.tsx
      Note: Evidence source for inventory-local devtools and remaining os-chat helper imports.
    - Path: /home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/packages/os-chat/src/chat/index.ts
      Note: Evidence source for legacy os-chat export surface.
ExternalSources: []
Summary: Chronological investigation diary for upstreaming devtools into react-chat and retiring os-chat.
LastUpdated: 2026-07-06T17:45:00-04:00
WhatFor: Resume or review the devtools upstreaming and os-chat retirement work.
WhenToUse: Before implementing REACT-CHAT-DEVTOOLS-OSCHAT-RETIREMENT-2026-07.
---

# Diary

## Goal

Record the investigation and design work for moving Event Viewer, Timeline Debug, and supporting debug display helpers into `react-chat`, then removing the remaining `os-chat` dependency from active downstream apps.

## Step 1: Create ticket and design the devtools upstreaming / os-chat retirement plan

This step created the new docmgr ticket and wrote the intern-facing implementation guide. I treated the earlier chrome/devtools ticket as useful prior art, but created a new ticket because the user expanded the scope: upstream the reusable devtools, remove downstream `os-chat` imports, and deprecate or remove the old `os-chat` package after migration.

The main conclusion is that `react-chat` should supersede `os-chat`, not absorb new work back into `os-chat`. The current debug windows already consume `chat-provider` debug events and timeline mirror APIs. The remaining `os-chat` imports are legacy reducers/theme and debug helper utilities, so the right direction is to move the helpers/devtools into `react-chat` and then retire `os-chat` from the active apps.

### Prompt Context

**User prompt (verbatim):** "Create a new docmgr ticket for that, and then upstream the components into react-chat, remove os-chat imports, and deprecated / remove os-chat entirely after that. (I don't know if it's its own repo, in that case, archive it).

Create  a detailed analysis / design / implementation guide that is for a new intern, explaining all the parts of the system needed to understand what it is, with prose paragraphs and bullet point sand pseudocode and diagrams and api references and file references. It should be very clear and technical. Store in the ticket and the nupload to remarkable."

**Assistant interpretation:** Create a fresh react-chat docmgr ticket that plans reusable devtools upstreaming and downstream os-chat retirement, with enough architecture context and implementation detail for a new intern.

**Inferred user intent:** The user wants to finish the chat migration by making the Event Viewer/Timeline Debug reusable in `react-chat`, removing the last active `os-chat` dependencies, and deciding how to retire the legacy package/repository.

**Commit (code):** N/A — documentation/design only in this step.

### What I did
- Created ticket `REACT-CHAT-DEVTOOLS-OSCHAT-RETIREMENT-2026-07` in `/home/manuel/code/wesen/go-go-golems/react-chat/ttmp`.
- Added the design document `design-doc/01-react-chat-devtools-and-os-chat-retirement-intern-guide.md`.
- Added this investigation diary.
- Rewrote `tasks.md` into phased implementation tasks.
- Gathered evidence from:
  - `wesen-os/apps/os-launcher/src/chat/ChatDebugWindows.tsx`
  - `wesen-os/workspace-links/go-go-app-inventory/apps/inventory/src/launcher/chat/InventoryDebugWindows.tsx`
  - `wesen-os/apps/os-launcher/src/app/store.ts`
  - `wesen-os/apps/os-launcher/src/main.tsx`
  - `wesen-os/workspace-links/go-go-app-inventory/apps/inventory/src/app/store.ts`
  - `wesen-os/workspace-links/go-go-app-inventory/apps/inventory/src/main.tsx`
  - `wesen-os/workspace-links/go-go-os-frontend/packages/os-chat/src/chat/index.ts`
  - old `os-chat` Event Viewer and Timeline Debug source files.

### Why
- The current downstream debug windows are good prototypes but are duplicated.
- Inventory still imports debug display helpers from `@go-go-golems/os-chat`.
- `os-chat` still exports the old SEM/webchat runtime, so keeping new reusable components there would preserve the wrong package boundary.
- A phased ticket is needed before implementation because the cleanup crosses three repositories/packages: `react-chat`, `wesen-os`, and `go-go-os-frontend`/inventory.

### What worked
- The current launcher debug window already uses `chat-provider` timeline mirror helpers, so it is a strong source for the upstream implementation.
- The inventory debug window clearly identifies the remaining `os-chat` helper dependency.
- `os-chat/src/chat/index.ts` gives a concise map of the legacy export surface that must be retired.

### What didn't work
- I did not implement code in this step.
- I did not run downstream removal experiments yet because the ticket first needed to define API boundaries and migration phases.

### What I learned
- `ChatConversationWindow` itself is no longer actively imported by launcher or inventory chat, but `os-chat` remains through reducers/theme and debug helpers.
- The old `os-chat` devtools are useful as reference material but depend on old event bus/timeline assumptions; the current launcher port is closer to the desired `react-chat` implementation.
- The separate Go repository `go-go-os-chat` should not be archived as part of a frontend package cleanup without an explicit Go dependency audit.

### What was tricky to build
- The tricky boundary is that the devtools are both generic and detached. They should be reusable, but they cannot assume they live inside the same `ChatProvider` React tree as the original chat window. The guide resolves this by specifying pure components over entries/timeline state plus store-bound convenience wrappers.

### What warrants a second pair of eyes
- Whether debug event classifier/store primitives should live in `chat-provider` or entirely in `chat-overlay/devtools`.
- Whether `os-chat` should be deleted outright from `go-go-os-frontend` or kept as a deprecated stub for one release.
- Whether any remaining `os-chat` reducers still carry behavior outside active chat windows.

### What should be done in the future
- Implement Phase 1 provider debug primitives.
- Port devtool utilities and components into `chat-overlay/devtools`.
- Migrate launcher and inventory wrappers.
- Remove remaining `os-chat` imports and dependency entries.

### Code review instructions
- Start with the design doc to understand package boundaries and API sketches.
- During implementation, review files in this order:
  1. `packages/chat-provider/src/debug/*`
  2. `packages/chat-overlay/src/devtools/*`
  3. launcher `ChatDebugWindows.tsx` migration
  4. inventory `InventoryDebugWindows.tsx` migration
  5. remaining `os-chat` dependency removal.
- Validate with provider/overlay tests and downstream typecheck/build commands listed in the design doc.

### Technical details
- Ticket path: `ttmp/2026/07/06/REACT-CHAT-DEVTOOLS-OSCHAT-RETIREMENT-2026-07--react-chat-devtools-upstreaming-and-os-chat-retirement`.
- Main guide: `design-doc/01-react-chat-devtools-and-os-chat-retirement-intern-guide.md`.
