---
Title: ""
Ticket: ""
Status: ""
Topics: []
DocType: ""
Intent: ""
Owners: []
RelatedFiles:
    - Path: ../../../../../../../pinocchio/cmd/web-chat/app/server.go
      Note: Removed special capabilities prompt branch (commit 1a76cbe)
    - Path: ../../../../../../../pinocchio/cmd/web-chat/app/server_test.go
      Note: Mock runtime integration snapshot test (commit aee7029)
    - Path: ../../../../../../../pinocchio/cmd/web-chat/canonical_runtime_resolver.go
      Note: mock_parity resolver shortcut (commit aee7029)
    - Path: ../../../../../../../pinocchio/cmd/web-chat/mockruntime/engine.go
      Note: Deterministic mock parity engine (commit aee7029)
    - Path: ../../../../../../../pinocchio/cmd/web-chat/profiles/api.go
      Note: Profile API exposes/selects mock_parity (commit aee7029)
    - Path: ../../../../../../../pinocchio/cmd/web-chat/web/.storybook/main.ts
      Note: Storybook discovery evidence
    - Path: ../../../../../../../pinocchio/cmd/web-chat/web/package.json
      Note: Validation scripts and dependency/package-manager evidence
    - Path: ../../../../../../../pinocchio/cmd/web-chat/web/scripts/print-dev-url.mjs
      Note: Phase 0 devctl URL helper (commit fe5b00f)
    - Path: ../../../../../../../pinocchio/cmd/web-chat/web/src
      Note: Source tree no longer contains migration Markdown (commit e0ac7de)
    - Path: ../../../../../../../pinocchio/cmd/web-chat/web/src/MIGRATION_CHECKLIST.md
      Note: Phase 0 path/deletion checklist (commit fe5b00f)
    - Path: ../../../../../../../pinocchio/cmd/web-chat/web/src/README.md
      Note: Phase 0 architecture guardrails (commit fe5b00f)
    - Path: ../../../../../../../pinocchio/cmd/web-chat/web/src/app/App.tsx
      Note: Phase 1 app route switch (commit bf3a98b)
    - Path: ../../../../../../../pinocchio/cmd/web-chat/web/src/app/routeMode.ts
      Note: |-
        Phase 1 typed route-mode parser (commit bf3a98b)
        Provider demo flags now fall back to production chat (commit 1a76cbe)
    - Path: ../../../../../../../pinocchio/cmd/web-chat/web/src/chat/provider/index.ts
      Note: Temporary compatibility export for old provider path (commit 833fa7c)
    - Path: ../../../../../../../pinocchio/cmd/web-chat/web/src/features/web-chat/ChatComposer/ChatComposer.tsx
      Note: Phase 3 composer component folder (commit 0c897b1)
    - Path: ../../../../../../../pinocchio/cmd/web-chat/web/src/features/web-chat/ChatHeader/ChatHeader.tsx
      Note: Phase 3 header component folder (commit 0c897b1)
    - Path: ../../../../../../../pinocchio/cmd/web-chat/web/src/features/web-chat/ChatStatusbar/ChatStatusbar.tsx
      Note: Phase 3 statusbar component folder (commit 0c897b1)
    - Path: ../../../../../../../pinocchio/cmd/web-chat/web/src/features/web-chat/ChatTimeline/ChatTimeline.tsx
      Note: Phase 3 timeline component folder (commit 0c897b1)
    - Path: ../../../../../../../pinocchio/cmd/web-chat/web/src/features/web-chat/ChatTimeline/useStickyScrollFollow.ts
      Note: Sticky scroll hook moved with timeline (commit 0c897b1)
    - Path: ../../../../../../../pinocchio/cmd/web-chat/web/src/features/web-chat/README.md
      Note: Phase 2 feature boundary README (commit 833fa7c)
    - Path: ../../../../../../../pinocchio/cmd/web-chat/web/src/features/web-chat/WebChatApp/WebChatApp.tsx
      Note: |-
        Provider-backed web-chat chrome moved to feature folder (commit 833fa7c)
        Removed demo extension installation from production provider-backed app (commit 1a76cbe)
    - Path: ../../../../../../../pinocchio/cmd/web-chat/web/src/features/web-chat/WebChatProviderShell/WebChatProviderShell.tsx
      Note: Provider config/profile bridge moved to feature folder (commit 833fa7c)
    - Path: ../../../../../../../pinocchio/cmd/web-chat/web/src/features/web-chat/cards/Markdown/Markdown.tsx
      Note: Markdown renderer moved into card support folder (commit cb52e41)
    - Path: ../../../../../../../pinocchio/cmd/web-chat/web/src/features/web-chat/cards/MessageCard/MessageCard.tsx
      Note: Phase 4 message card folder (commit cb52e41)
    - Path: ../../../../../../../pinocchio/cmd/web-chat/web/src/features/web-chat/cards/ToolCallCard/ToolCallCard.tsx
      Note: Phase 4 tool call card folder (commit cb52e41)
    - Path: ../../../../../../../pinocchio/cmd/web-chat/web/src/features/web-chat/cards/ToolResultCard/ToolResultCard.tsx
      Note: Phase 4 tool result card folder (commit cb52e41)
    - Path: ../../../../../../../pinocchio/cmd/web-chat/web/src/features/web-chat/cards/fixtures/renderEntities.ts
      Note: Typed story fixture builders for card render entities (commit cb52e41)
    - Path: ../../../../../../../pinocchio/cmd/web-chat/web/src/features/web-chat/extensions/pinocchio-projectors/pinocchioProjectors.ts
      Note: Pinocchio projectors moved under feature extensions (commit 833fa7c)
    - Path: ../../../../../../../pinocchio/cmd/web-chat/web/src/webchat/index.ts
      Note: Canonical versus legacy export evidence
    - Path: ../../../../../../../pinocchio/cmd/web-chat/web/src/ws/frontendTools.ts
      Note: Removed browser.get_page_context auto-demo behavior (commit 1a76cbe)
    - Path: ../../../../../../../pinocchio/cmd/web-chat/web/vite.config.ts
      Note: Vite build/proxy setup evidence
    - Path: ../../../../../../../pinocchio/pkg/chatapp/demo.go
      Note: Removed capabilities-showcase inference branch (commit 1a76cbe)
    - Path: ttmp/2026/05/31/CHATOVERLAY-009--clean-up-pinocchio-web-chat-react-and-storybook-architecture/reference/02-provider-parity-checklist.md
      Note: Phase 6 provider parity gate
    - Path: ttmp/2026/05/31/CHATOVERLAY-009--clean-up-pinocchio-web-chat-react-and-storybook-architecture/scripts/01-phase6-webchat-parity-smoke.js
      Note: Repeatable main web-chat parity smoke
    - Path: ttmp/2026/05/31/CHATOVERLAY-009--clean-up-pinocchio-web-chat-react-and-storybook-architecture/scripts/02-phase6-route-flag-regression.js
      Note: Repeatable route flag regression smoke
    - Path: ttmp/2026/05/31/CHATOVERLAY-009--clean-up-pinocchio-web-chat-react-and-storybook-architecture/scripts/03-phase6-validation-suite.js
      Note: Repeatable Phase 6 validation suite
    - Path: ttmp/2026/05/31/CHATOVERLAY-009--clean-up-pinocchio-web-chat-react-and-storybook-architecture/scripts/04-phase6-mock-profile-parity-smoke.js
      Note: Mock profile Playwright smoke
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

## Step 9: Implement Phase 2 feature-folder layout for provider-backed web-chat

This step moved the provider-backed production web-chat files out of the migration-era `src/chat/provider` folder and into the new `src/features/web-chat` boundary. The app behavior is still intended to be unchanged: old import paths continue through small compatibility re-exports, while new code can import the canonical feature-folder surface.

The move also created the first component-style folders for the provider-backed shell: `WebChatProviderShell` owns provider configuration and the profile bridge, while `WebChatApp` owns the provider-backed chrome/body. Provider support helpers and Pinocchio projectors now live under named subfolders instead of being mixed with route/demo files.

### Prompt Context

**User prompt (verbatim):** "phase 2"

**Assistant interpretation:** Implement CHATOVERLAY-009 Phase 2: create the `features/web-chat` folder, move provider-backed production files there, keep compatibility wrappers, validate, update docs/diary, and commit.

**Inferred user intent:** Continue the cleanup by making the provider-backed production web-chat feature boundary concrete without breaking existing routes or smokes.

**Commit (code):** 833fa7c — "refactor: move web-chat provider files to feature folder"

### What I did
- Added `cmd/web-chat/web/src/features/web-chat/README.md`.
- Created `src/features/web-chat/WebChatProviderShell/`:
  - `WebChatProviderShell.tsx`
  - `types.ts`
  - `index.ts`
- Created `src/features/web-chat/WebChatApp/`:
  - `WebChatApp.tsx`
  - `types.ts`
  - `index.ts`
  - provider-specific renderer/statusbar components.
- Moved provider support helpers into `src/features/web-chat/provider-support/`:
  - `providerDebug.ts`
  - `providerSession.ts`
  - `providerTimeline.ts`
- Moved Pinocchio projectors into `src/features/web-chat/extensions/pinocchio-projectors/`.
- Moved provider multi-demo into `src/features/web-chat/demos/ProviderMultiDemo/` so it is visibly temporary/demo-scoped ahead of Phase 5.
- Kept compatibility exports:
  - `src/chat/provider/index.ts`
  - `src/webchat/ProviderBackedChatWidget.tsx`
  - `src/webchat/ProviderMultiDemoPage.tsx`
- Updated `src/webchat/ProviderDemoPage.tsx` to import projectors from the feature boundary.
- Updated `src/MIGRATION_CHECKLIST.md` to mark the moved provider files as done/moved.

### Why
- `src/chat/provider` was a migration staging area, not a clear feature boundary.
- New contributors need one obvious home for canonical production web-chat code.
- Keeping compatibility wrappers makes this a safe structural move before later deletion phases.

### What worked
- TypeScript typecheck passed after import rewrites.
- Biome import organization fixed the new barrel/type files.
- Build, Storybook build, route-mode unit test, and provider multi-instance smoke all passed.

### What didn't work
- Initial lint failed because newly created export/type files did not match Biome import/export sorting. I fixed it with:
  - `npx --yes @biomejs/biome@2.3.8 check --write src/features/web-chat src/webchat/ProviderDemoPage.tsx src/webchat/ProviderBackedChatWidget.tsx src/webchat/ProviderMultiDemoPage.tsx src/chat/provider/index.ts`
- Relative imports were easy to get wrong after moving deeply nested files. I corrected paths from `features/web-chat/...` back to `store`, `utils`, `webchat`, and `ws`.

### What I learned
- The provider-backed shell naturally splits into two concepts: provider/profile configuration (`WebChatProviderShell`) and render/chrome composition (`WebChatApp`).
- Demo code should live under `demos/` even before deletion so it stops looking canonical.

### What was tricky to build
- The move had to preserve existing public names (`ProviderBackedChatWidget`, `ProviderMultiDemoPage`) while introducing cleaner new names (`WebChatProviderShell`, `WebChatApp`). The compatibility exports keep the old names alive without forcing new code to import them.
- `ProviderDemoPage` still lives under `webchat` until Phase 5, so it imports feature projectors across the old/new boundary. That is temporary and documented.

### What warrants a second pair of eyes
- Review whether `pinocchioProjectors.ts` should have waited until Phase 9 to move. I moved it now because it is part of the provider-backed feature boundary, but it still needs Phase 9 splitting/tests.
- Review whether the provider multi-demo should remain under `features/web-chat/demos` or move directly into a test harness before Phase 5.

### What should be done in the future
- Phase 3 should move visual components (`Header`, `Statusbar`, `Composer`, `Timeline`) into one-folder-per-component feature folders.
- Phase 5 should delete or move demo routes and capability code.

### Code review instructions
- Start with `src/features/web-chat/README.md`.
- Then review `WebChatProviderShell/WebChatProviderShell.tsx` and `WebChatApp/WebChatApp.tsx`.
- Confirm compatibility wrappers are small and temporary.
- Validate with `npm run typecheck`, `npm run lint`, `npm run build`, `npm run build-storybook`, and the provider multi-instance smoke.

### Technical details
- Validation commands run:
  - `npm run typecheck`
  - `npm run lint`
  - `npm run build`
  - `npm run build-storybook`
  - `npx vitest run src/app/routeMode.test.ts`
  - `node .../03-webchat-provider-multi-instance-smoke.js`

## Step 10: Implement Phase 3 component folders and Storybook foundation

This step moved the first production visual components into one-folder-per-component feature directories. The goal was to make the Storybook surface match the desired architecture: contributors can now inspect header, statusbar, composer, and timeline behavior without loading the whole legacy chat widget.

The move deliberately leaves deeper card renderer extraction for Phase 4. Phase 3 only establishes the folder convention, focused stories, and compatibility imports so both the provider-backed app and the legacy widget can consume the same canonical component locations while the legacy runtime still exists.

### Prompt Context

**User prompt (verbatim):** "phase 3"

**Assistant interpretation:** Implement CHATOVERLAY-009 Phase 3 by moving core visual components into component folders, adding stories and type/index files, replacing the monolithic widget story, validating, updating docs, and committing.

**Inferred user intent:** Continue the web-chat cleanup with a concrete Storybook/component architecture foundation that is easier to review and evolve.

**Commit (code):** 0c897b1 — "refactor: add web-chat component story folders"

### What I did
- Moved `src/webchat/components/Header.tsx` to `src/features/web-chat/ChatHeader/ChatHeader.tsx`.
- Added `ChatHeader/types.ts`, `index.ts`, and `ChatHeader.stories.tsx`.
- Moved `src/webchat/components/Statusbar.tsx` to `src/features/web-chat/ChatStatusbar/ChatStatusbar.tsx`.
- Added `ChatStatusbar/types.ts`, `index.ts`, and `ChatStatusbar.stories.tsx`.
- Moved `src/webchat/components/Composer.tsx` to `src/features/web-chat/ChatComposer/ChatComposer.tsx`.
- Added `ChatComposer/types.ts`, `index.ts`, and `ChatComposer.stories.tsx`.
- Moved `src/webchat/components/Timeline.tsx` to `src/features/web-chat/ChatTimeline/ChatTimeline.tsx`.
- Moved `useStickyScrollFollow.ts` into `ChatTimeline/` and exported it from the timeline folder.
- Added `ChatTimeline/types.ts`, `index.ts`, and `ChatTimeline.stories.tsx`.
- Removed the monolithic `src/webchat/ChatWidget.stories.tsx` in favor of focused component stories.
- Updated `WebChatApp`, legacy `ChatWidget`, `src/webchat/index.ts`, `src/features/web-chat/index.ts`, `src/MIGRATION_CHECKLIST.md`, and `src/features/web-chat/README.md`.

### Why
- Phase 3 needed a canonical pattern for component ownership before the larger renderer/card split in Phase 4.
- Focused stories reduce the need to boot the entire chat runtime just to inspect simple component states.
- Keeping the legacy widget pointed at the new components avoids duplicating visual components during the parity period.

### What worked
- The component moves preserved typecheck/build behavior.
- Storybook now builds individual chunks for `ChatHeader`, `ChatStatusbar`, `ChatComposer`, and `ChatTimeline` stories.
- Existing main web-chat and provider multi-instance smokes still pass.

### What didn't work
- The first lint run failed with Biome import/export ordering after the moves. I fixed it with:
  - `npx --yes @biomejs/biome@2.3.8 check --write src/webchat src/features/web-chat`
- The initial statusbar export-visible story did not actually seed a session id, so `ExportMenu` could render nothing. I added a story render wrapper that dispatches `appSlice.actions.setConvId('story-session-123')`.

### What I learned
- The current `DefaultStatusbar` still depends on the Redux-backed `ExportMenu`, even though the provider-backed app uses `ProviderStatusbar`. That coupling is acceptable for legacy compatibility but should be revisited when legacy Redux code is deleted.
- `ChatTimeline` is a good home for `useStickyScrollFollow` because its refs and scroll mode are tightly coupled to the timeline layout.

### What was tricky to build
- The trickiest part was avoiding a half-migration where provider-backed code imports new component folders while legacy code imports deleted paths. I updated both `WebChatApp` and legacy `ChatWidget` to import the canonical feature components.
- Storybook stories had to be pure enough to avoid runtime transport, but still realistic enough to exercise `data-part` styling and state variants.

### What warrants a second pair of eyes
- Review whether `ExportMenu` should move with `ChatStatusbar` or remain under legacy `webchat/components` until provider-safe export work is consolidated.
- Review whether the old `ChatWidget` story deletion removed any useful full-widget scenarios that should be recreated later as provider-shell stories.

### What should be done in the future
- Phase 4 should extract card renderers into focused folders and fixtures.
- Phase 8 should split style files so the component folders and CSS organization align.

### Code review instructions
- Start with the new folders under `src/features/web-chat/ChatHeader`, `ChatStatusbar`, `ChatComposer`, and `ChatTimeline`.
- Confirm each folder has `Component.tsx`, `Component.stories.tsx`, `types.ts`, and `index.ts`.
- Then review import changes in `WebChatApp.tsx`, legacy `ChatWidget.tsx`, and `src/webchat/index.ts`.
- Validate with `npm run typecheck`, `npm run lint`, `npm run build`, `npm run build-storybook`, and the main/provider multi-instance smokes.

### Technical details
- Validation commands run:
  - `npm run typecheck`
  - `npm run lint`
  - `npm run build`
  - `npm run build-storybook`
  - `npx vitest run src/app/routeMode.test.ts`
  - `node .../03-pinocchio-webchat-devctl-playwright.js`
  - `node .../03-webchat-provider-multi-instance-smoke.js`

## Step 11: Implement Phase 4 card renderer decomposition

This step split the monolithic web-chat card renderer file into focused card folders. The production renderer behavior remains wired through the existing `rendererRegistry`, but the card implementations now live under `src/features/web-chat/cards/*`, each with types, stories, and fixture-backed examples.

The work also moved Markdown rendering into its own card support folder and added a small URL-safety guard for links. The old `src/webchat/cards.tsx` and `src/webchat/Markdown.tsx` now act as compatibility barrels so older imports continue to work during the cleanup sequence.

### Prompt Context

**User prompt (verbatim):** "continue"

**Assistant interpretation:** Continue with the next CHATOVERLAY-009 implementation phase after Phase 3, which is Phase 4 card renderer decomposition.

**Inferred user intent:** Keep advancing the web-chat cleanup by decomposing card renderers and Storybook fixtures before demo and legacy deletion phases.

**Commit (code):** cb52e41 — "refactor: split web-chat card renderers"

### What I did
- Created `src/features/web-chat/cards/MessageCard/` with component, types, story, and index.
- Created `ToolCallCard/` with requested, running, completed, failed, and human-tool stories.
- Created `ToolResultCard/` with JSON, text, empty, and error stories.
- Created `AgentModeCard/` with preview and committed stories.
- Created `WidgetInstanceCard/` with streaming, ready, failed, unknown-widget, and temporary capability-demo stories.
- Created `GenericCard/` with unknown and empty fallback stories.
- Created `Markdown/` with links, code blocks, lists, and unsafe URL stories.
- Added typed fixture builders in `cards/fixtures/renderEntities.ts`.
- Added `cards/storyDecorators.tsx` and `cards/index.ts`.
- Replaced `src/webchat/cards.tsx` and `src/webchat/Markdown.tsx` with compatibility barrels.
- Updated `rendererRegistry.ts` to import built-in card renderers from the feature card barrel.
- Updated `src/features/web-chat/index.ts`, `src/MIGRATION_CHECKLIST.md`, and `src/features/web-chat/README.md`.

### Why
- Card rendering was too dense for safe review and story coverage in one file.
- Phase 4 creates the target shape required for later renderer typing and style decomposition.
- Focused stories let reviewers inspect each card state without running real backend streams.

### What worked
- Typecheck, lint, production build, Storybook build, route-mode test, main web-chat smoke, and provider multi-instance smoke all passed.
- Storybook now emits separate chunks for card stories, which confirms the focused stories are discovered.
- Existing runtime imports still work through compatibility barrels.

### What didn't work
- Initial lint failed on export ordering in new barrel files. I fixed it with:
  - `npx --yes @biomejs/biome@2.3.8 check --write src/features/web-chat/cards src/webchat/Markdown.tsx src/webchat/cards.tsx src/webchat/rendererRegistry.ts src/features/web-chat/index.ts`

### What I learned
- `WidgetInstanceCard` still contains temporary `demo.capability_card` behavior. That should be deleted in Phase 5 rather than polished further.
- Markdown link handling previously passed through any string. The new card-local Markdown component renders unsafe URLs as non-clickable spans.

### What was tricky to build
- The split had to preserve renderer names and exports used by the legacy registry while moving implementations to feature folders. The compatibility barrels are intentionally small and temporary.
- Tool call rendering still includes frontend tool result submission for the legacy/capability flow. This means the card split is structural only; semantic cleanup belongs to Phase 5 and later provider-tool parity work.

### What warrants a second pair of eyes
- Review the Markdown URL-safety change to ensure no expected internal URL patterns are accidentally de-linked.
- Review whether `LogCard` should remain as a separate folder even though Phase 4 did not explicitly list it; it was kept because the renderer registry still has a `log` renderer.
- Review whether `src/webchat/cards.tsx` should be deleted in Phase 6/7 once all imports move.

### What should be done in the future
- Phase 5 should remove temporary capability-demo card/tool code.
- Phase 6 should define parity gates before legacy Redux/WebSocket deletion.
- Phase 8 should remove inline card styles while splitting CSS.

### Code review instructions
- Start with `src/features/web-chat/cards/index.ts` and the individual card folders.
- Review compatibility barrels in `src/webchat/cards.tsx` and `src/webchat/Markdown.tsx`.
- Review `src/webchat/rendererRegistry.ts` to confirm renderer keys still map to the same card components.
- Validate with `npm run typecheck`, `npm run lint`, `npm run build`, `npm run build-storybook`, and the main/provider multi-instance smokes.

### Technical details
- Validation commands run:
  - `npm run typecheck`
  - `npm run lint`
  - `npm run build-storybook`
  - `npm run build`
  - `npx vitest run src/app/routeMode.test.ts`
  - `node .../03-pinocchio-webchat-devctl-playwright.js`
  - `node .../03-webchat-provider-multi-instance-smoke.js`

## Step 12: Implement Phase 5 capability-demo deletion

This step removed the temporary provider capability showcase from the production web-chat path. The demo route flags no longer select special pages, the main provider-backed web-chat no longer installs demo-only tools/widgets, and the backend no longer treats “run the capabilities demo” as a special prompt.

The remaining frontend-tool endpoint support is generic: the server still accepts manifests/results, and the card renderer can still render a human-confirm style tool call when a real app provides confirm metadata. What was removed is the web-chat-specific `browser.*` demo tooling and `demo.capability_card` widget path.

### Prompt Context

**User prompt (verbatim):** "go ahead"

**Assistant interpretation:** Continue with the next cleanup phase, Phase 5: delete provider capability demo scaffolding and replace its coverage with production-focused validation.

**Inferred user intent:** Stop carrying temporary demo/capability showcase code in production web-chat now that provider-backed parity and Storybook coverage exist.

**Commit (code):** 1a76cbe — "refactor: remove web-chat capability demo"

### What I did
- Removed `WebChatProviderCapabilities` from `WebChatApp`.
- Deleted the provider demo route/page files:
  - `src/app/ProviderDemoRoot.tsx`
  - `src/webchat/ProviderDemoPage.tsx`
- Removed provider multi-demo from production route parsing:
  - deleted `src/app/ProviderMultiDemoRoot.tsx`
  - deleted old `src/webchat/ProviderMultiDemoPage.tsx` compatibility export
  - removed `ProviderMultiDemoPage` from `src/chat/provider/index.ts`
- Simplified route parsing so `providerDemo=1` and `providerMultiDemo=1` fall back to normal chat.
- Removed `demo.capability_card` special rendering/export from widget cards and stories.
- Generalized the human-confirm tool card away from the hard-coded `browser.confirm_action` demo name.
- Removed automatic `browser.get_page_context` handling from legacy WebSocket code.
- Removed backend special-casing for capabilities-showcase prompts from `cmd/web-chat/app`.
- Removed the package-level demo branch that emitted `demo.capability_card` and `browser.confirm_action` from `pkg/chatapp/demo.go`.
- Updated backend tests to use a neutral `app.confirm_action` frontend tool name.
- Updated migration checklist and feature README.

### Why
- The capability showcase was useful for proving framework mechanics, but it made demo-only concepts look supported in production.
- Provider-backed production chat now has direct Storybook/card coverage and route tests, so the demo route is no longer needed.
- The codebase should not teach users to prompt “run the capabilities demo” as an application feature.

### What worked
- Full frontend validation passed.
- Go app/package tests passed.
- The main web-chat Playwright smoke passed after deleting demo routes.
- The commit hook also ran `go generate ./...`, frontend build, Go build, golangci-lint, Go tests, typecheck, and Biome lint successfully.

### What didn't work
- First validation failed because `ToolCallCard` used `inputRecord` before declaration after the human-confirm condition was generalized:
  - `src/features/web-chat/cards/ToolCallCard/ToolCallCard.tsx(15,74): error TS2448: Block-scoped variable 'inputRecord' used before its declaration.`
  - Fixed by moving `const inputRecord = asRecord(input)` before `isHumanConfirm`.
- Go test initially failed because `cmd/web-chat/app/server_test.go` still imported `widgets` after deleting the showcase test:
  - `cmd/web-chat/app/server_test.go:24:2: "github.com/go-go-golems/pinocchio/pkg/chatapp/widgets" imported and not used`
  - Fixed by removing the unused import.

### What I learned
- The provider demo had leaked into multiple layers: route parsing, app roots, provider extension installation, widget card special handling, automatic frontend-tool handling, backend prompt special-casing, and package-level demo inference.
- Keeping frontend-tool endpoint tests generic preserves useful protocol coverage without retaining browser-demo names.

### What was tricky to build
- Removing the demo while preserving generic frontend-tool behavior required separating demo names from the mechanism. `submitFrontendToolResult` remains, but `browser.get_page_context` auto-handling is gone and `browser.confirm_action` is no longer hard-coded as the only human-confirm tool.
- Route deletion needed to avoid breaking normal chat when old query flags are present. The route parser now ignores removed provider demo flags and falls back to production chat.

### What warrants a second pair of eyes
- Review whether the remaining `features/web-chat/demos/ProviderMultiDemo/` files should move into a test-only directory or be deleted in a later pass. They are no longer reachable from production routing or compatibility exports.
- Review whether generic human-confirm detection should become a typed renderer concern in Phase 11 instead of keying off confirm metadata.

### What should be done in the future
- Phase 6 should define and execute the legacy/provider parity checklist before deleting the old Redux/WebSocket runtime.
- Phase 8 should remove remaining inline styles from card/tool renderers.

### Code review instructions
- Start with `src/app/routeMode.ts` and `src/app/App.tsx` to confirm demo routes are gone.
- Review `src/features/web-chat/WebChatApp/WebChatApp.tsx` to confirm demo extensions are no longer installed.
- Review `pkg/chatapp/demo.go` and `cmd/web-chat/app/server.go` to confirm showcase prompt branching was removed.
- Validate with frontend checks, Go tests, and main web-chat smoke.

### Technical details
- Validation commands run:
  - `npm run typecheck`
  - `npm run lint`
  - `npm run build`
  - `npm run build-storybook`
  - `npx vitest run src/app/routeMode.test.ts`
  - `go test ./cmd/web-chat/app ./pkg/chatapp -count=1`
  - `node .../03-pinocchio-webchat-devctl-playwright.js`
- Commit hook additionally ran:
  - `go generate ./...`
  - `go build ./...`
  - `golangci-lint run`
  - `go test ./...`

## Step 13: Implement Phase 6 parity checklist and repeatable feedback scripts

This step created the parity gate for deleting the legacy Redux/WebSocket chat runtime. The checklist now lives inside the ticket workspace, not in the application source tree, and records the evidence for session handling, profile handling, WebSocket/hydration behavior, message sending, reasoning/tool/widget projection, export, stream debug, and generic frontend-tool support.

I also added repeatable Playwright/validation scripts under the ticket `scripts/` directory so the same feedback can be collected without reconstructing commands from the diary. Following the user correction, I moved all markdown guardrail/checklist documents that had been placed under `cmd/web-chat/web/src` into ticket reference documents.

### Prompt Context

**User prompt (verbatim):** "go ahead"

**Assistant interpretation:** Continue with Phase 6: define and validate the provider-backed parity gate before legacy deletion.

**Inferred user intent:** Gather enough repeatable evidence to safely proceed to deleting legacy Redux/WebSocket chat code.

**Commit (code):** e0ac7de — "docs: move web-chat markdown to ticket"

### Prompt Context Addendum

**User prompt (verbatim):** "write playwright scripts if you want so that it's easier to repeat the different stepsa nd gather the necessary feedback information"

**Assistant interpretation:** Add repeatable scripts for collecting browser-based parity evidence.

**Inferred user intent:** Make later review/validation less manual and easier to rerun.

**User prompt (verbatim):** "save all the scripts in the scripts/ folder of the ticket"

**Assistant interpretation:** Store all new validation scripts under the CHATOVERLAY-009 ticket `scripts/` directory.

**Inferred user intent:** Keep ticket-specific tooling with the ticket, not scattered across app source folders.

**User prompt (verbatim):** "mv the parity checklist to the ticket as well. we don't really want markdown files outside of the ticket"

**Assistant interpretation:** Move the newly created parity checklist out of source and into the ticket workspace.

**Inferred user intent:** Keep planning/checklist Markdown in docmgr ticket docs, not in the production source tree.

**User prompt (verbatim):** "that goes for /home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/web/src/features/web-chat/README.md aas well"

**Assistant interpretation:** Move the feature-boundary README out of source as well, and by extension remove the remaining source Markdown guardrails from `src`.

**Inferred user intent:** Ensure web-chat source contains code, not migration documentation.

### What I did
- Created `reference/02-provider-parity-checklist.md` inside the ticket.
- Moved source Markdown documents into ticket references:
  - `src/features/web-chat/PARITY_CHECKLIST.md` -> `reference/02-provider-parity-checklist.md`
  - `src/features/web-chat/README.md` -> `reference/03-web-chat-feature-boundary.md`
  - `src/README.md` -> `reference/04-web-chat-src-architecture-readme.md`
  - `src/MIGRATION_CHECKLIST.md` -> `reference/05-web-chat-migration-checklist.md`
- Deleted those Markdown files from Pinocchio source in commit `e0ac7de`.
- Added ticket scripts:
  - `scripts/01-phase6-webchat-parity-smoke.js`
  - `scripts/02-phase6-route-flag-regression.js`
  - `scripts/03-phase6-validation-suite.js`
- Ran the route-flag Playwright script.
- Ran the main web-chat parity Playwright script.
- Re-ran focused frontend and Go validation.

### Why
- Phase 6 must produce reviewable evidence before Phase 7 deletes legacy runtime code.
- Scripts make the evidence repeatable and less dependent on one-off terminal history.
- Migration/checklist Markdown belongs to the ticket knowledge base, not production source.

### What worked
- `02-phase6-route-flag-regression.js` passed and wrote evidence to `/tmp/pinocchio-phase6-route-flag-regression.json`.
- `01-phase6-webchat-parity-smoke.js` passed and wrote evidence to `/tmp/pinocchio-phase6-webchat-parity-smoke.json`.
- `npm run typecheck`, `npm run lint`, route-mode Vitest, and focused Go tests passed.
- Pinocchio pre-commit hook passed for the source Markdown deletion commit.

### What didn't work
- No code failures occurred in this step. The only correction was user-directed: the initial parity checklist and source README placement was wrong for this workflow, so I moved the Markdown into the ticket.

### What I learned
- The ticket workspace should be the canonical home for migration rationale, parity gates, and repeated validation scripts.
- Keeping scripts in the ticket makes it clear which validation belongs to this phase, independent of whether scripts are later promoted into CI.

### What was tricky to build
- The Playwright scripts need to discover devctl's actual Vite URL because smokes may run on ephemeral ports. Both scripts read `.devctl/state.json` and fall back to `http://127.0.0.1:5174`.
- The main parity smoke gathers evidence without writing artifacts into the repo by default; it writes JSON into `/tmp` unless `EVIDENCE_PATH` is set.

### What warrants a second pair of eyes
- Review the parity checklist to confirm it is strong enough to authorize Phase 7 legacy deletion.
- Review whether the ticket scripts should later be promoted into a package script or CI job.

### What should be done in the future
- Phase 7 should delete legacy files only after reviewers accept `reference/02-provider-parity-checklist.md`.
- If Phase 7 uncovers gaps, add focused scripts/tests here rather than reintroducing source Markdown.

### Code review instructions
- Start with `reference/02-provider-parity-checklist.md`.
- Review scripts under `scripts/01-*`, `scripts/02-*`, and `scripts/03-*`.
- Confirm source Markdown files were removed from `pinocchio/cmd/web-chat/web/src`.
- Re-run scripts with `node ttmp/.../scripts/01-phase6-webchat-parity-smoke.js` and `node ttmp/.../scripts/02-phase6-route-flag-regression.js`.

### Technical details
- Validation commands run:
  - `node .../scripts/02-phase6-route-flag-regression.js`
  - `node .../scripts/01-phase6-webchat-parity-smoke.js`
  - `npm run typecheck`
  - `npm run lint`
  - `npx vitest run src/app/routeMode.test.ts`
  - `go test ./cmd/web-chat/app ./pkg/chatapp -count=1`

## Step 14: Design profile-driven deterministic mock inference mode

This step corrected the mock-inference direction before implementation. A prompt-triggered mock path would have been a shortcut in the wrong layer, so I removed the uncommitted exploratory code and wrote a profile-driven implementation guide instead.

The guide defines `mock_parity` as an explicit runtime/profile choice. It keeps normal prompts normal, avoids reintroducing provider demo routes, and gives Phase 6 a deterministic way to exercise reasoning, chat streaming, backend tool calls, frontend tool calls, widgets, and app-owned special events without a live LLM.

### Prompt Context

**User prompt (verbatim):** "can we create a mock inference engine in web-chat so that we can test all the different scenarios of events (tool call, thinking streaming, chat streaming, special events, frontend tool call, registered widget) quickly and withouth aving to rely on an llm? that way doing proper parity testing will be much easier, as well as automated testing in the future"

**Assistant interpretation:** Explore adding a deterministic mock inference path for parity and automation coverage.

**Inferred user intent:** Make provider-backed parity tests reliable and independent of LLM availability or probabilistic output.

**User prompt (verbatim):** "let's do it through a custom profile"

**Assistant interpretation:** Use profile/runtime configuration as the activation mechanism, not prompt text or route hacks.

**Inferred user intent:** Keep mock mode explicit, architectural, and consistent with web-chat profile selection.

**User prompt (verbatim):** "not through hacks like these."

**Assistant interpretation:** Revert the exploratory prompt-triggered mock code and document the proper design before implementation.

**Inferred user intent:** Avoid hidden behavior and keep production architecture clean.

**User prompt (verbatim):** "add a detailed guide to the ticket on how to implement this mock mode, in detail, then add phases and tasks to the ticket."

**Assistant interpretation:** Write a ticket-local implementation guide and update the ticket task plan with phases/tasks for profile-driven mock inference.

**Inferred user intent:** Plan the work carefully before coding and preserve the design in docmgr.

### What I did
- Reverted uncommitted exploratory prompt-triggered mock changes in Pinocchio.
- Added `design-doc/02-deterministic-mock-inference-profile-guide.md`.
- Added `Phase 6A — Deterministic mock inference profile before legacy deletion` to `tasks.md`.
- Related the guide to the relevant Pinocchio runtime/profile/chatapp files.

### Why
- Mock mode should be activated by an explicit profile such as `mock_parity`, not by prompt matching.
- A deterministic profile is the right foundation for reliable Playwright and future CI tests.

### What worked
- The ticket now has a detailed implementation plan covering backend profile schema, runtime composition, mock engine scenarios, frontend tools/widgets, tests, and Playwright scripts.
- The Pinocchio working tree was restored to clean before documenting the proper design.

### What didn't work
- The initial exploratory approach used prompt detection and frontend fixture registration directly in production setup. That was intentionally discarded before commit.

### What I learned
- The existing `PromptRequest.RuntimeContext` hook is the right mechanism for passing session id/message id/publisher handles into a mock runtime, but activation should come from resolved profile runtime configuration.

### What was tricky to build
- The desired scenario spans two event channels: Geppetto events for chat/reasoning/backend tools, and app/sessionstream events for frontend tools and widgets. The guide separates these paths and proposes a runtime context bridge instead of overloading prompts.

### What warrants a second pair of eyes
- Review whether `MockInferenceRuntime` belongs directly in `ProfileRuntime` or as a nested extension type with stricter validation.
- Review whether mock frontend tools/widgets should register only for mock profiles or can remain app-owned test fixtures that are harmless for all profiles.

### What should be done in the future
- Implement Phase 6A before deleting legacy Redux/WebSocket chat.

### Code review instructions
- Start with `design-doc/02-deterministic-mock-inference-profile-guide.md`.
- Then review the new Phase 6A tasks in `tasks.md`.
- Confirm no prompt-triggered mock code was left in Pinocchio.

### Technical details
- No code changes were committed for mock inference in this step.
- The guide explicitly forbids prompt matching and route-flag activation.

## Step 15: Simplify mock inference plan to a profile shortcut

This step revised the mock-inference design to match the intended architecture: `mock_parity` is a special profile that short-circuits runtime resolution and returns a small deterministic mock engine. Normal profiles continue through the existing profile runtime resolver and composer unchanged.

The simplified plan removes the unnecessary generalized mock-runtime schema from the guide. It keeps the profile as a user-visible activation switch and reserves any context bridge work only for the optional widget/frontend-tool phase.

### Prompt Context

**User prompt (verbatim):** "so i thought it would be possible to add a special profile that would replace the traditional inference engine with a simple mock one, I don't think we need all this mock runtime composed runtime stuff? it's just a hardcoded check before delegating this to the normal profile runtime system. \n\nRepease in your own words."

**Assistant interpretation:** Restate that the desired solution is a simple selected-profile shortcut, not a broad profile runtime schema extension.

**Inferred user intent:** Confirm shared understanding before rewriting the ticket plan.

**User prompt (verbatim):** "yes, update and simplify the ticket"

**Assistant interpretation:** Rewrite the ticket guide and tasks around the simple `mock_parity` resolver shortcut.

**Inferred user intent:** Keep implementation scope small and avoid overengineering before coding.

### What I did
- Rewrote `design-doc/02-deterministic-mock-inference-profile-guide.md` around the special-profile shortcut.
- Replaced the previous Phase 6A task list with a smaller implementation plan.
- Kept optional widget/frontend-tool context bridge work as a later substep, not the core architecture.

### Why
- The selected profile is enough to make mock mode explicit and testable.
- Normal profile runtime composition should remain untouched for real profiles.
- A broad `MockInferenceRuntime` schema would add complexity before it is needed.

### What worked
- The guide now says `profile=mock_parity` should return a deterministic mock `engine.Engine` before the normal resolver/composer path.
- The tasks now focus on the shortcut, mock engine, deterministic Geppetto events, integration tests, and Playwright scripts.

### What didn't work
- The previous design overgeneralized the problem into profile runtime schema and composed-runtime changes. That has now been simplified.

### What I learned
- The right activation boundary is `canonical_runtime_resolver.go`, because it already receives the selected profile and delegates to runtime composition.

### What was tricky to build
- The only remaining nuance is widget/frontend-tool coverage: those are app/sessionstream events, not pure Geppetto engine events. The simplified guide keeps that as optional follow-up using the existing `PromptRequest.RuntimeContext` hook if needed.

### What warrants a second pair of eyes
- Confirm whether `mock_parity` should be built into the dev profile registry or loaded from a dev/test profile YAML fixture.
- Confirm whether widget/frontend-tool coverage belongs in the first mock pass.

### What should be done in the future
- Implement Phase 6A in the order listed in `tasks.md`.

### Code review instructions
- Review `design-doc/02-deterministic-mock-inference-profile-guide.md` first.
- Then review Phase 6A in `tasks.md`.
- Verify no code changes were made in this planning step.

### Technical details
- No Pinocchio source changes were made.
- The revised design explicitly keeps prompt text irrelevant to mock activation.

## Step 16: Implement the first mock_parity profile shortcut

This step implemented the simplified mock profile path. Selecting `mock_parity` now bypasses normal profile runtime composition and returns a deterministic mock Geppetto engine; normal profiles still delegate to the existing resolver/composer path.

The first mock scenario covers reasoning/thinking streaming, backend tool-call lifecycle events, an agent-mode special event, and assistant text streaming. Widget and frontend-tool browser round-trip coverage remains a follow-up because that requires app/sessionstream publisher context beyond the plain Geppetto engine interface.

### Prompt Context

**User prompt (verbatim):** "go ahead"

**Assistant interpretation:** Implement the simplified `mock_parity` profile shortcut described in the updated ticket.

**Inferred user intent:** Move from planning to a working deterministic mock profile that improves parity testing without a live LLM.

**Commit (code):** aee7029 — "test: add mock parity web-chat profile"

**Commit (code):** 1c66abe — "chore: add mockruntime logcopter package"

### What I did
- Added `cmd/web-chat/mockruntime` with a deterministic Geppetto-compatible `engine.Engine`.
- Added `profiles.MockParityProfile` and `profiles.IsMockParityProfile`.
- Added `canonical_runtime_resolver.go` shortcut: `profile=mock_parity` returns the mock runtime before normal profile resolution/composition.
- Added `mock_parity` to the profile API list and current-profile POST/GET flow.
- Added unit/integration coverage:
  - mock runtime event-order test,
  - resolver shortcut test,
  - app/server snapshot integration test.
- Added ticket Playwright script `scripts/04-phase6-mock-profile-parity-smoke.js`.
- Updated the parity checklist and Phase 6A tasks.

### Why
- Deterministic parity evidence should not depend on prompt hacks, live provider credentials, or probabilistic model output.
- A special profile is the simplest explicit activation mechanism and keeps normal profiles unchanged.

### What worked
- `mock_parity` appears in the profile selector.
- Selecting it and sending a normal prompt renders deterministic reasoning text, `mock.search` backend tool output, agent-mode event text, and final assistant text.
- The new Playwright smoke passed and wrote evidence to `/tmp/pinocchio-phase6-mock-profile-parity-smoke.json`.
- Go tests and frontend checks passed.

### What didn't work
- An ad-hoc Playwright probe initially failed because `getByText('mock.search')` matched both the tool name and a pill, causing a strict-mode violation. The ticket script uses `getByTestId('tool-call-name').filter({ hasText: 'mock.search' }).first()` instead.
- Widget/frontend-tool round-trip coverage is not part of the first implementation. It remains in Phase 6A as a follow-up.

### What I learned
- The selected profile reaches `canonical_runtime_resolver.Resolve`, making it the clean shortcut point.
- The existing Geppetto event sink path is enough to exercise reasoning, backend tool calls, agent-mode, and chat text without touching `chatapp` demo inference.

### What was tricky to build
- The mock engine must emit Geppetto event types, not sessionstream timeline entities, so the same plugins/projectors are exercised as real inference.
- Profile API support had to include list and current-profile handling; otherwise the frontend selector could not reliably choose `mock_parity`.

### What warrants a second pair of eyes
- Confirm `mock_parity` should always be listed by the profile API, rather than being dev-only behind a flag.
- Confirm whether Phase 6A should next add widget/frontend-tool coverage with a minimal context bridge.

### What should be done in the future
- Add hydration smoke for `mock_parity`.
- Add optional widget/frontend-tool mock coverage if reviewers require it before legacy deletion.

### Code review instructions
- Start with `cmd/web-chat/canonical_runtime_resolver.go` to verify the shortcut is isolated.
- Review `cmd/web-chat/mockruntime/engine.go` for deterministic event sequence and stable IDs.
- Review `cmd/web-chat/profiles/api.go` and `cmd/web-chat/profiles/mock.go` for profile selector support.
- Validate with:
  - `go test ./cmd/web-chat/mockruntime ./cmd/web-chat ./cmd/web-chat/app ./cmd/web-chat/profiles ./pkg/chatapp -count=1`
  - `npm run typecheck`
  - `npm run lint`
  - `node ttmp/2026/05/31/CHATOVERLAY-009--clean-up-pinocchio-web-chat-react-and-storybook-architecture/scripts/04-phase6-mock-profile-parity-smoke.js`

### Technical details
- The committed mock runtime currently emits provider call, reasoning, backend tool-call, agent-mode, and text events through Geppetto event sinks.
- `go generate ./...` produced `cmd/web-chat/mockruntime/logcopter.go`, committed separately.
