---
Title: ""
Ticket: ""
Status: ""
Topics: []
DocType: ""
Intent: ""
Owners: []
RelatedFiles:
    - Path: ../../../../../../../pinocchio/cmd/web-chat/web/.storybook/main.ts
      Note: Storybook discovery evidence
    - Path: ../../../../../../../pinocchio/cmd/web-chat/web/package.json
      Note: Validation scripts and dependency/package-manager evidence
    - Path: ../../../../../../../pinocchio/cmd/web-chat/web/scripts/print-dev-url.mjs
      Note: Phase 0 devctl URL helper (commit fe5b00f)
    - Path: ../../../../../../../pinocchio/cmd/web-chat/web/src/MIGRATION_CHECKLIST.md
      Note: Phase 0 path/deletion checklist (commit fe5b00f)
    - Path: ../../../../../../../pinocchio/cmd/web-chat/web/src/README.md
      Note: Phase 0 architecture guardrails (commit fe5b00f)
    - Path: ../../../../../../../pinocchio/cmd/web-chat/web/src/app/App.tsx
      Note: Phase 1 app route switch (commit bf3a98b)
    - Path: ../../../../../../../pinocchio/cmd/web-chat/web/src/app/routeMode.ts
      Note: Phase 1 typed route-mode parser (commit bf3a98b)
    - Path: ../../../../../../../pinocchio/cmd/web-chat/web/src/webchat/index.ts
      Note: Canonical versus legacy export evidence
    - Path: ../../../../../../../pinocchio/cmd/web-chat/web/vite.config.ts
      Note: Vite build/proxy setup evidence
ExternalSources: []
Summary: ""
LastUpdated: 0001-01-01T00:00:00Z
WhatFor: ""
WhenToUse: ""
---



# Diary

## Goal

This diary records the investigation and documentation work for a new Pinocchio `cmd/web-chat/web` frontend cleanup ticket. It explains what was inspected, what evidence shaped the assessment, what was written, and how the result was validated and delivered.

## Step 1: Create the cleanup ticket and define the review scope

The work began by creating a dedicated docmgr ticket for a broad frontend review rather than mixing this cleanup planning into the provider-extension implementation ticket. The requested deliverable is not a code change; it is a deep intern-facing architecture/code-review/refactoring plan with enough context for a new contributor to understand the web-chat React app and Storybook setup.

I created the primary design document, the investigation diary, and a small task checklist that mirrors the requested review scope: topology, app boot, provider/legacy boundaries, Storybook/component layout, code quality classification, documentation, validation, and reMarkable upload.

### Prompt Context

**User prompt (verbatim):** "Ok, let's create a new ticket to clean up web-chat's web/ react setup, because it's getting quite messy. 

Create  a detailed analysis / design / code review and refactoring brainstorming that is for a new intern, explaining all the parts of the system needed to understand what it is, with prose paragraphs and bullet point sand pseudocode and diagrams and api references and file references. It should be very clear and technical. Store in the ticket and the nupload to remarkable.

we want a consistent layout for our react + storybook apps (one folder per component, with types.ts and index.ts and $WIDGET.tsx and $WIDGET.stories.tsx, etc... We also want to identify legacy/deprecated code (we want to be clean and opinionated, to make for a great example project), unclear code, APIs that are problematic, etc... But also things that are valuable, and others that are promising but could be improved. 

Review acribically.

Keep a diary as you work."

**Assistant interpretation:** Create a new docmgr ticket for a deep frontend architecture/code-quality review of Pinocchio `cmd/web-chat/web`, write an intern-facing assessment and refactoring plan, keep a diary, and upload the finished bundle to reMarkable.

**Inferred user intent:** Turn the increasingly messy React/Storybook web-chat frontend into a clean, opinionated example project with explicit boundaries, component-folder conventions, and a roadmap for removing or quarantining legacy code.

### What I did
- Created ticket `CHATOVERLAY-009` titled `Clean up Pinocchio web-chat React and Storybook architecture`.
- Added design doc `design-doc/01-web-chat-react-and-storybook-cleanup-assessment.md`.
- Added diary doc `reference/01-investigation-diary.md`.
- Added tasks for topology review, runtime boundary review, Storybook/component organization, code classification, final writing, bookkeeping, and upload.

### Why
- The existing provider-extension ticket is implementation-focused; this request is a separate cleanup assessment.
- A dedicated ticket gives the review its own changelog, task list, file relationships, and reMarkable bundle.

### What worked
- `docmgr ticket create-ticket` successfully created the workspace under `ttmp/2026/05/31/CHATOVERLAY-009--clean-up-pinocchio-web-chat-react-and-storybook-architecture`.
- `docmgr doc add` created both the primary design doc and the diary with the requested topics.

### What didn't work
- No blocker in this step.

### What I learned
- The ticket vocabulary already accepts `frontend`, `pinocchio`, `web-chat`, `storybook`, and `architecture`, so no vocabulary addition was needed during creation.

### What was tricky to build
- The scope is deliberately broad. I converted it into concrete review tasks so the final report would not become a loose opinion piece.

### What warrants a second pair of eyes
- Confirm that `CHATOVERLAY-009` is the right ticket series/name for Pinocchio web-chat cleanup work, since the work is adjacent to but not purely inside chat-overlay.

### What should be done in the future
- Use this ticket as the root for actual cleanup PRs, each with smaller implementation tasks.

### Code review instructions
- Review the ticket artifacts first:
  - `ttmp/2026/05/31/CHATOVERLAY-009--clean-up-pinocchio-web-chat-react-and-storybook-architecture/index.md`
  - `tasks.md`
  - `design-doc/01-web-chat-react-and-storybook-cleanup-assessment.md`
  - `reference/01-investigation-diary.md`

### Technical details
- Commands used:
  - `docmgr status --summary-only`
  - `docmgr ticket create-ticket --ticket CHATOVERLAY-009 --title "Clean up Pinocchio web-chat React and Storybook architecture" --topics frontend,pinocchio,web-chat,storybook,architecture`
  - `docmgr doc add --ticket CHATOVERLAY-009 --doc-type design-doc --title "Web Chat React and Storybook Cleanup Assessment"`
  - `docmgr doc add --ticket CHATOVERLAY-009 --doc-type reference --title "Investigation Diary"`
  - `docmgr task add ...`

## Step 2: Gather evidence from the web-chat frontend

This step inspected the actual `cmd/web-chat/web` tree before writing recommendations. I focused on package/build setup, Storybook setup, app routing, provider-backed production chat, legacy Redux/WebSocket chat, timeline projection, card rendering, debug UI boundaries, CSS/theming, and signs of deprecated or unclear APIs.

The important discovery is that the app is not one frontend anymore. It contains the production provider-backed web-chat, a legacy Redux/WebSocket chat implementation, provider demo routes, a provider multi-instance smoke page, and a separate debug UI app. That explains why the folder structure feels messy: the runtime migration has succeeded technically, but the source tree has not yet been reorganized to match the new architecture.

### Prompt Context

**User prompt (verbatim):** (same as Step 1)

**Assistant interpretation:** Audit the current frontend implementation with concrete file-backed evidence before writing the cleanup plan.

**Inferred user intent:** Make the assessment reliable and actionable, not speculative.

### What I did
- Inspected `package.json`, `vite.config.ts`, `.storybook/main.ts`, and `.storybook/preview.tsx`.
- Counted source files and large files under `src/`.
- Listed Storybook files and confirmed there is currently one story file: `src/webchat/ChatWidget.stories.tsx`.
- Reviewed app boot in `src/main.tsx` and route-mode branching in `src/App.tsx`.
- Reviewed the provider-backed widget under `src/chat/provider/`.
- Reviewed the legacy widget and WebSocket pipeline under `src/webchat/ChatWidget.tsx` and `src/ws/`.
- Reviewed component APIs in `src/webchat/components/`, `src/webchat/types.ts`, `src/webchat/parts.ts`, renderer registries, cards, and CSS.
- Reviewed debug UI entry/store boundaries under `src/debug-ui/`.

### Why
- The final report needed to explain the whole system to a new intern.
- The cleanup recommendations needed to be anchored to real files and current code paths.

### What worked
- Fast repository discovery exposed the main hotspots:
  - one large `webchat.css`,
  - one large legacy `ChatWidget.tsx`,
  - one large `cards.tsx`,
  - one large legacy `timelineEvents.ts`,
  - one large provider demo file.
- Reading `src/webchat/index.ts` clarified the subtle but important fact that public `ChatWidget` is provider-backed while old `ChatWidget.tsx` is exported as `LegacyChatWidget`.

### What didn't work
- The first line-number collection command printed too much output and hit the tool's output truncation limit. I switched to targeted file reads for important files.

### What I learned
- `src/App.tsx` has four route modes selected by URL query parameters: debug, provider demo, provider multi-demo, and default chat.
- The main provider-backed chat still needs the legacy Redux store for profile API/chrome state.
- Storybook is configured broadly but currently exercises mostly legacy chat through `src/webchat/ChatWidget.stories.tsx` importing `./ChatWidget`.
- The codebase already has a strong CSS part model (`data-pwchat`, `data-part`) but it is concentrated in a large CSS file and not fully reflected in the public `ChatPart` type.

### What was tricky to build
- The term `ChatWidget` is ambiguous. The file `src/webchat/ChatWidget.tsx` is legacy, but the package-facing `ChatWidget` export is provider-backed through `src/webchat/index.ts`. This is exactly the kind of confusion the cleanup plan needs to remove.
- There are two stores in play: the app/profile Redux store and the provider runtime store. The debug UI has a third store. The report needed to describe those stores without implying they should all be merged.

### What warrants a second pair of eyes
- Confirm whether legacy `src/ws/*` and `src/webchat/ChatWidget.tsx` can be deleted after parity, or whether they must remain as comparison/debug tooling.
- Inspect `src/debug-ui/ws/debugWsManager.ts` importing the main app `AppDispatch` type; that looks like a boundary leak worth verifying before refactoring.

### What should be done in the future
- Add automated architecture checks or lint conventions after the folder layout is finalized.

### Code review instructions
- Start with these files to verify the core finding:
  - `/home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/web/src/App.tsx`
  - `/home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/web/src/webchat/index.ts`
  - `/home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/web/src/chat/provider/ProviderBackedChatWidget.tsx`
  - `/home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/web/src/webchat/ChatWidget.tsx`

### Technical details
- Commands used included:
  - `find src -type f`
  - `find src -name '*.stories.*'`
  - `wc -l $(find src -type f ...)`
  - `rg -n "LegacyChatWidget|ProviderBacked|rendererRegistry|timelinePropsRegistry|style=|any\\b|TODO|FIXME|deprecated|legacy|compat" src -S`
  - targeted `read` calls for app, provider, legacy, Storybook, store, timeline, and debug UI files.

## Step 3: Write the intern-facing assessment and refactoring plan

This step turned the evidence into the primary design document. The report is intentionally explanatory: it starts with a mental model of what the app does, then maps current-state architecture, then reviews each subsystem, then proposes a target layout and phased roadmap.

The main recommendation is to make `ChatProvider` the canonical production runtime, move or delete legacy Redux/WebSocket chat code after parity review, and reorganize authored React code into one-folder-per-component feature folders with colocated `types.ts`, `index.ts`, component implementation, and stories.

### Prompt Context

**User prompt (verbatim):** (same as Step 1)

**Assistant interpretation:** Produce the actual long-form design/code-review/refactoring document requested by the user.

**Inferred user intent:** Give a new intern enough context and direction to begin cleanup work safely.

### What I did
- Wrote `design-doc/01-web-chat-react-and-storybook-cleanup-assessment.md`.
- Included sections for:
  - executive summary,
  - scope/evidence base,
  - intern mental model,
  - build/package setup,
  - app entry/routing,
  - production provider-backed shell,
  - legacy chat implementation,
  - timeline/cards/renderers,
  - provider demo/capabilities,
  - Pinocchio projectors,
  - debug UI,
  - CSS/theming,
  - Storybook,
  - state management,
  - global registries,
  - target architecture,
  - folder convention,
  - dependency diagrams,
  - API sketches,
  - code review classifications,
  - phased roadmap,
  - validation plan,
  - open questions,
  - reference file list.

### Why
- The user explicitly asked for prose paragraphs, bullets, pseudocode, diagrams, API references, and file references.
- The one-folder-per-component convention needed to be concrete enough that an intern can apply it without guessing.

### What worked
- The current architecture naturally split into clear categories: canonical provider-backed code, compatibility/legacy code, demo code, debug UI, shared components, generated code, and styles.
- The report could preserve valuable patterns such as `data-part` theming while still being critical of global registries, ambiguous naming, inline styles, and underused Storybook.

### What didn't work
- No blocker in the writing step.

### What I learned
- The cleanup should not start by deleting code. The safest first phase is to move files and add READMEs/boundary names without changing runtime behavior.
- Storybook is the best forcing function for the desired folder layout because each component folder can prove its API with colocated stories.

### What was tricky to build
- The report needed to be acerbic enough to identify bad patterns while still preserving context for why they exist. Many issues are migration artifacts, not careless design.
- It was important not to recommend merging all stores. The better recommendation is to make each store boundary explicit and eliminate legacy runtime state only after provider parity is accepted.

### What warrants a second pair of eyes
- Review the proposed target tree before implementation. It is intentionally opinionated, but there may be Pinocchio repository conventions that suggest different names.
- Review whether generated protobuf code should move to `src/generated/` or stay in `src/chatapp/pb` for Buf compatibility.

### What should be done in the future
- Turn the roadmap phases into implementation tickets or subtasks once the architecture direction is accepted.

### Code review instructions
- Review the design doc from the top; do not skip the mental model section because it defines terminology used later.
- Pay special attention to the `Legacy/deprecated candidates`, `Proposed target architecture`, and `Refactoring roadmap` sections.

### Technical details
- Primary output:
  - `/home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/ttmp/2026/05/31/CHATOVERLAY-009--clean-up-pinocchio-web-chat-react-and-storybook-architecture/design-doc/01-web-chat-react-and-storybook-cleanup-assessment.md`

## Step 4: Validate current web-chat checks and Storybook build

After writing the report, I validated that the current Pinocchio web-chat frontend still typechecks, lints, and can build Storybook. This did not change code, but it gives the assessment a baseline: the current setup is messy structurally, yet mechanically healthy enough to refactor incrementally.

The Storybook build result also reinforced one of the report's findings. Storybook builds, but the output is centered on the single `ChatWidget.stories.tsx` bundle. That confirms Storybook infrastructure exists and works, while the story inventory is underdeveloped.

### Prompt Context

**User prompt (verbatim):** (same as Step 1)

**Assistant interpretation:** Validate enough of the reviewed frontend surface to make the cleanup plan safe and evidence-based.

**Inferred user intent:** Ensure the recommendation package is grounded in a currently working app, not a broken checkout.

### What I did
- Ran Pinocchio web-chat validation commands:
  - `npm run typecheck`
  - `npm run lint`
  - `npm run build-storybook`

### Why
- A refactoring assessment should record the baseline health of the system before proposing reorganizations.
- Since the ticket specifically calls out Storybook, building Storybook is a direct validation step.

### What worked
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run build-storybook` passed and wrote output to `storybook-static`.

### What didn't work
- No validation failure occurred.
- Storybook emitted normal warnings:
  - Storybook runtime uses `eval`, which Vite warns about.
  - Some chunks are larger than 500 kB after minification.
  - Storybook anonymous telemetry notice appeared.

### What I learned
- The current Storybook setup is viable as a migration target. We can add colocated stories incrementally without first fixing build infrastructure.

### What was tricky to build
- The Storybook build creates `storybook-static`, but it is ignored by git in this repository, so no cleanup was needed afterward.

### What warrants a second pair of eyes
- Decide whether Storybook telemetry should be disabled in CI or developer docs.
- Decide whether chunk-size warnings matter for Storybook or should be ignored.

### What should be done in the future
- Add `npm run build-storybook` to cleanup PR validation once component stories start expanding.

### Code review instructions
- Verify that the assessment's Storybook recommendations match the working configuration in `.storybook/main.ts` and `.storybook/preview.tsx`.

### Technical details
- Command directory:
  - `/home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/web`
- Exact commands:
  - `npm run typecheck`
  - `npm run lint`
  - `npm run build-storybook`

## Step 5: Validate docmgr hygiene and upload to reMarkable

This final delivery step cleaned up docmgr metadata, added missing vocabulary entries, ran doctor, and uploaded the completed assessment bundle to reMarkable. The bundle includes the ticket index, primary assessment, diary, task list, and changelog.

The upload target is `/ai/2026/05/31/CHATOVERLAY-009`, with the PDF name `CHATOVERLAY-009 Web Chat React Storybook Cleanup Assessment.pdf`.

### Prompt Context

**User prompt (verbatim):** (same as Step 1)

**Assistant interpretation:** Finish the ticket deliverable and publish it to reMarkable.

**Inferred user intent:** Make the review easy to read away from the terminal and preserve the ticket artifacts for future implementation work.

### What I did
- Ran `docmgr doctor --ticket CHATOVERLAY-009 --stale-after 30`.
- Added missing vocabulary topics:
  - `architecture`,
  - `storybook`.
- Re-ran doctor successfully.
- Ran `remarquee upload bundle --dry-run ... --non-interactive`.
- Ran the actual `remarquee upload bundle ... --non-interactive`.

### Why
- The ticket should validate cleanly before handoff.
- The user explicitly requested upload to reMarkable.

### What worked
- Doctor passed after adding the missing vocabulary topics.
- Dry-run bundle listed the intended files correctly.
- Upload succeeded.

### What didn't work
- Initial doctor reported unknown topic warnings for `architecture` and `storybook`:
  - `unknown_topics — unknown topics: [architecture storybook]`
- I fixed this with `docmgr vocab add` for both topics.

### What I learned
- The chat-overlay docmgr vocabulary had frontend/web-chat topics but did not yet include general architecture or Storybook topics.

### What was tricky to build
- The report uses cross-repository file references into Pinocchio while the ticket lives in the chat-overlay docmgr workspace. I used absolute file relationships so future readers can jump to the right repository paths.

### What warrants a second pair of eyes
- Verify the reMarkable PDF formatting for very long code blocks and diagrams; the Markdown source is the canonical version if any wrapping looks awkward.

### What should be done in the future
- Split the roadmap into implementation tickets if the assessment direction is accepted.

### Code review instructions
- Start with the uploaded bundle or the local design doc.
- Verify doctor with `docmgr doctor --ticket CHATOVERLAY-009 --stale-after 30`.

### Technical details
- Upload command included:
  - `ttmp/.../index.md`
  - `design-doc/01-web-chat-react-and-storybook-cleanup-assessment.md`
  - `reference/01-investigation-diary.md`
  - `tasks.md`
  - `changelog.md`
- Remote directory:
  - `/ai/2026/05/31/CHATOVERLAY-009`

## Step 6: Expand the cleanup plan into implementation phases

This step converted the broad assessment roadmap into a detailed implementation backlog. The important product-direction changes are now explicit: the provider demo/capability showcase code should be deleted, and the legacy Redux/WebSocket chat implementation should be deleted after provider-backed parity is proven.

I updated both the ticket task list and the primary assessment. The task list now has concrete phase-by-phase checkboxes that can be assigned to an intern or split into follow-up tickets. The assessment now explains the intent behind each phase, including the deletion plan for demo capability code and legacy code.

### Prompt Context

**User prompt (verbatim):** "create detailed phases and tasks, we definitely want to delete the demo capabtiility code and delete the legacy code after parity. The other suggestions are great too."

**Assistant interpretation:** Expand CHATOVERLAY-009 from a high-level assessment into an actionable phased implementation plan, making demo deletion and legacy deletion after parity explicit decisions.

**Inferred user intent:** Turn the review into a concrete cleanup backlog that enforces a clean, opinionated example project rather than preserving old demo/legacy surfaces.

### What I did
- Rewrote `tasks.md` into detailed phases:
  - Phase 0: safety rails and decision log,
  - Phase 1: app shell and route-mode cleanup,
  - Phase 2: feature-folder layout,
  - Phase 3: component folders and Storybook foundation,
  - Phase 4: card renderer decomposition,
  - Phase 5: delete demo capability code,
  - Phase 6: parity gate for legacy deletion,
  - Phase 7: delete legacy Redux/WebSocket chat code,
  - Phase 8: replace global registries,
  - Phase 9: Pinocchio projector hardening,
  - Phase 10: CSS/theming modularization,
  - Phase 11: debug UI boundary cleanup,
  - Phase 12: generated code and package-management cleanup,
  - Phase 13: final cleanup verification.
- Updated the design doc's roadmap section to mirror the accepted direction.
- Updated open questions so legacy deletion and demo deletion are no longer phrased as undecided.

### Why
- The original assessment had a roadmap, but not enough granular tasks to drive implementation.
- The user's preference is now clear: delete temporary capability-demo code and delete legacy code after parity.

### What worked
- The existing design doc structure made it easy to replace the high-level roadmap with a more actionable phase plan.
- The task list is now explicit enough to support piecemeal implementation.

### What didn't work
- No blocker in this step.

### What I learned
- The cleanup should treat `ProviderDemoPage`, `demo.capability_card`, and `run the capabilities demo` as scaffolding, not product surface.
- Legacy deletion needs a parity gate so removal is safe and reviewable.

### What was tricky to build
- The task list needed to be detailed without becoming an implementation patch itself. I split destructive work into two phases: first prove parity, then delete legacy code.
- Demo deletion also needs replacement tests, otherwise removing demo smokes could reduce confidence in provider tools/widgets.

### What warrants a second pair of eyes
- Review the Phase 6 parity checklist before deleting legacy code.
- Review Phase 5 replacement-smoke requirements so demo deletion does not remove useful provider coverage.

### What should be done in the future
- Split the phases into separate implementation PRs or tickets once the team approves sequencing.

### Code review instructions
- Start with `tasks.md` to review the implementation backlog.
- Then review the updated `Refactoring roadmap and implementation phases` section in the design doc.

### Technical details
- Updated files:
  - `ttmp/2026/05/31/CHATOVERLAY-009--clean-up-pinocchio-web-chat-react-and-storybook-architecture/tasks.md`
  - `ttmp/2026/05/31/CHATOVERLAY-009--clean-up-pinocchio-web-chat-react-and-storybook-architecture/design-doc/01-web-chat-react-and-storybook-cleanup-assessment.md`
  - `ttmp/2026/05/31/CHATOVERLAY-009--clean-up-pinocchio-web-chat-react-and-storybook-architecture/reference/01-investigation-diary.md`

## Step 7: Implement Phase 0 guardrails

This step started the actual cleanup implementation with guardrails rather than runtime moves. I added source-tree documentation, a migration checklist, and a helper script for discovering the actual devctl URL when web-chat runs on ephemeral ports.

The goal was to make the accepted decisions visible in the repository before code starts moving: provider-backed `ChatProvider` is canonical, provider capability demo code is temporary and should be deleted, and legacy Redux/WebSocket chat should be deleted after parity rather than preserved indefinitely.

### Prompt Context

**User prompt (verbatim):** "do phase 0 + 1, keep a diary as you work, commit at appropriate intervals"

**Assistant interpretation:** Implement CHATOVERLAY-009 Phase 0 and Phase 1, validate, commit focused changes, and update the ticket diary as work progresses.

**Inferred user intent:** Begin the web-chat cleanup in small safe steps that make future refactors easier to review.

**Commit (code):** fe5b00f — "docs: add web-chat cleanup guardrails"

### What I did
- Added `pinocchio/cmd/web-chat/web/src/README.md` documenting canonical boundaries and runtime decisions.
- Added `pinocchio/cmd/web-chat/web/src/MIGRATION_CHECKLIST.md` mapping current paths to target paths and recording deletion gates.
- Added `pinocchio/cmd/web-chat/web/scripts/print-dev-url.mjs` to read `.devctl/state.json` and print the real Vite/backend URLs.
- Added `npm run dev:url` to `package.json`.
- Validated with:
  - `npm run typecheck`
  - `npm run lint`
  - `npm run dev:url`

### Why
- Phase 0 is about making architectural intent explicit before moving code.
- The devctl URL helper addresses a concrete problem found earlier: smoke scripts can restart web-chat on free ephemeral ports, so `5174` is not always correct.

### What worked
- Typecheck and lint passed.
- `npm run dev:url` prints the active Vite and backend URLs from the Pinocchio repo's `.devctl/state.json`.

### What didn't work
- The first version of `print-dev-url.mjs` walked only three directories up from `cmd/web-chat/web/scripts`, resolving to `pinocchio/cmd` instead of the Pinocchio repo root. It failed with:
  - `Could not read devctl state at /home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/.devctl/state.json.`
- I fixed it by walking four directories up: `../../../..`.

### What I learned
- Small operational helpers belong in Phase 0 because they reduce confusion during later smoke validation.
- Repository-level decisions need to live near the code, not only in docmgr.

### What was tricky to build
- The helper script runs from `cmd/web-chat/web/scripts`, but devctl state lives at the Pinocchio repository root. The relative path is easy to get wrong because `web-chat` is nested under `cmd/`.

### What warrants a second pair of eyes
- Review whether `src/README.md` is the right location or whether it should become `src/architecture/README.md` later.
- Review the migration checklist for any missing path categories before Phase 2 starts.

### What should be done in the future
- Add a devctl command for URL discovery if `devctl` itself supports custom commands for this profile.

### Code review instructions
- Start with `cmd/web-chat/web/src/README.md` and `src/MIGRATION_CHECKLIST.md`.
- Then inspect `scripts/print-dev-url.mjs` and `package.json`.
- Validate with `cd cmd/web-chat/web && npm run dev:url` while devctl is running.

### Technical details
- Validation output included:
  - `npm run typecheck` passed.
  - `npm run lint` passed.
  - `npm run dev:url` printed `web-chat: http://127.0.0.1:5174/` and backend profile URL when default ports were active.

## Step 8: Implement Phase 1 app route-mode split

This step moved root app routing out of the monolithic top-level `src/App.tsx` into a small typed `src/app/` layer. Runtime behavior is intentionally unchanged: `?debug=1`, `?providerDemo=1`, `?providerMultiDemo=1`, and default production chat still render the same screens as before.

The difference is that each route mode now has a named root component, and query parsing is unit-tested. This creates a safe landing zone for later phases where provider demo roots will be deleted and production web-chat files move into feature folders.

### Prompt Context

**User prompt (verbatim):** (same as Step 7)

**Assistant interpretation:** Implement the Phase 1 route/app-shell cleanup without changing runtime behavior.

**Inferred user intent:** Make the app shell easier for an intern to understand before deeper file moves begin.

**Commit (code):** bf3a98b — "refactor: split web-chat app route modes"

### What I did
- Added `src/app/routeMode.ts` with typed `WebChatRouteMode` and `routeModeFromSearch(...)` / `routeModeFromLocation(...)`.
- Added `src/app/routeMode.test.ts` covering default, debug, provider demo, provider multi-demo, disabled flags, and deterministic priority.
- Added named root components:
  - `src/app/MainWebChatRoot.tsx`
  - `src/app/DebugUiRoot.tsx`
  - `src/app/ProviderDemoRoot.tsx`
  - `src/app/ProviderMultiDemoRoot.tsx`
- Added `src/app/App.tsx` to switch on the typed route mode.
- Replaced top-level `src/App.tsx` with a compatibility re-export from `src/app`.
- Validated with:
  - `npx vitest run src/app/routeMode.test.ts`
  - `npm run typecheck`
  - `npm run lint`
  - `npm run build`
  - `npm run build-storybook`
  - main web-chat devctl Playwright smoke
  - capabilities showcase smoke
  - provider demo smoke
  - provider multi-instance smoke

### Why
- Route-mode parsing was duplicated inline in `src/App.tsx`, making temporary demo/debug routes look like normal root application structure.
- Named root components give Phase 5 a clear place to delete provider demo scaffolding later.

### What worked
- Route mode tests passed: 7 tests.
- Typecheck, lint, build, Storybook build, and all four web-chat smokes passed.
- The compatibility top-level `src/App.tsx` kept `main.tsx` unchanged.

### What didn't work
- No code blocker in this step.
- Build still emits the existing Vite warnings:
  - non-module `app-config.js` note,
  - large chunk warning.
- Storybook still emits the existing warnings about Storybook runtime `eval` and large chunks.

### What I learned
- Separating route parsing first is a low-risk way to start the cleanup: it changes file organization but not user-visible behavior.
- Keeping `ProviderDemoRoot` and `ProviderMultiDemoRoot` explicitly temporary documents the future deletion path in code comments.

### What was tricky to build
- The priority order had to preserve old behavior. The previous app checked `debug`, then `providerDemo`, then `providerMultiDemo`, then default. The new parser keeps the same order and has tests for multiple flags.

### What warrants a second pair of eyes
- Review whether route-mode priority should remain debug > provider demo > provider multi-demo. It preserves existing behavior, but once demo routes are removed this becomes less important.
- Review whether `ProviderDemoRoot` and `ProviderMultiDemoRoot` should move to a `demos/` folder before deletion or simply be deleted in Phase 5.

### What should be done in the future
- Phase 2 should create `features/web-chat/` and move provider-backed production files under that boundary.
- Phase 5 should delete the provider demo roots and their associated demo capability code.

### Code review instructions
- Start with `cmd/web-chat/web/src/app/routeMode.ts` and `routeMode.test.ts`.
- Then inspect `src/app/App.tsx` and the four root components.
- Confirm top-level `src/App.tsx` is only a compatibility re-export.
- Validate with the commands listed above.

### Technical details
- Smoke commands run from the chat-overlay repo:
  - `03-pinocchio-webchat-devctl-playwright.js`
  - `01-webchat-capabilities-showcase-smoke.js`
  - `02-webchat-chatprovider-demo-smoke.js`
  - `03-webchat-provider-multi-instance-smoke.js`
