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
      Note: |-
        Evidence source for launcher-local devtools rebuilt on chat-provider events.
        Launcher adapter migrated to upstream react-chat devtools in Step 8
    - Path: /home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-app-inventory/apps/inventory/src/launcher/chat/InventoryDebugWindows.tsx
      Note: |-
        Evidence source for inventory-local devtools and remaining os-chat helper imports.
        Inventory adapter migrated to upstream react-chat devtools in Step 8
    - Path: /home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/packages/os-chat/src/chat/index.ts
      Note: Evidence source for legacy os-chat export surface.
    - Path: abs:///home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/apps/os-launcher/src/app/store.ts
      Note: Removed direct os-chat reducers from launcher app store
    - Path: abs:///home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/apps/os-launcher/src/chat/chatDebugStore.ts
      Note: Launcher debug store now uses provider primitive
    - Path: abs:///home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-app-inventory/apps/inventory/src/app/store.ts
      Note: Removed direct os-chat reducers from inventory app store
    - Path: repo://packages/chat-overlay/src/devtools/ChatEventViewer.tsx
      Note: Reusable Event Viewer implemented in Step 3
    - Path: repo://packages/chat-overlay/src/devtools/ChatTimelineDebug.tsx
      Note: Reusable Timeline Debug implemented in Step 3
    - Path: repo://packages/chat-overlay/src/devtools/devtools.test.ts
      Note: Overlay devtools utility tests
    - Path: repo://packages/chat-overlay/src/devtools/timelineMirrorFolding.ts
      Note: Detached timeline mirror seed/fold helpers implemented in Step 3
    - Path: repo://packages/chat-overlay/src/overlay/ChatWindowChrome.tsx
      Note: Reusable slot-based chat chrome primitive implemented in Step 3
    - Path: repo://packages/chat-provider/src/debug/classifyDebugEvent.ts
      Note: Provider debug classification primitive implemented in Step 2
    - Path: repo://packages/chat-provider/src/debug/debugEventStore.test.ts
      Note: Regression coverage for classifier and store behavior
    - Path: repo://packages/chat-provider/src/debug/debugEventStore.ts
      Note: Bounded per-conversation debug event store implemented in Step 2
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


## Step 2: Implement provider debug classifier and external event store

This step implemented Phase 1 from the ticket: the provider now exposes reusable debug classification and a bounded per-conversation event store. These primitives replace the launcher-local `chatDebugStore` logic with package-level APIs that downstream detached windows can reuse.

The implementation deliberately keeps protocol semantics in `chat-provider`. The classifier understands `ChatDebugEvent` variants from `wsManager`, while `chat-overlay/devtools` can later focus on rendering, filtering, and export behavior.

### Prompt Context

**User prompt (verbatim):** "go ahead, implement task by task, keep a detailed diary, commit at appropriate intervals"

**Assistant interpretation:** Work through the ticket phases incrementally, updating the diary and committing coherent chunks as implementation progresses.

**Inferred user intent:** The user wants the design ticket converted into code while preserving a reviewable implementation history and continuation-friendly documentation.

**Commit (code):** pending at diary-write time — "Add chat provider debug event primitives"

### What I did
- Added `packages/chat-provider/src/debug/classifyDebugEvent.ts`.
- Added `packages/chat-provider/src/debug/debugEventStore.ts`.
- Added `packages/chat-provider/src/debug/index.ts`.
- Added `packages/chat-provider/src/debug/debugEventStore.test.ts`.
- Added a `./debug` subpath export to `packages/chat-provider/package.json`.
- Re-exported debug primitives from `packages/chat-provider/src/index.ts`.
- Checked Phase 1 tasks in `tasks.md`.
- Ran:
  - `pnpm --filter @go-go-golems/chat-provider test -- --runInBand`
  - `pnpm --filter @go-go-golems/chat-provider typecheck`

### Why
- Launcher and inventory debug windows need a shared event model instead of local copies.
- Classification belongs near `ChatDebugEvent` because it depends on provider websocket/debug frame semantics.
- A bounded external store supports detached desktop windows that are not children of the active `ChatProvider` React tree.

### What worked
- Existing provider tests continued to pass.
- New tests cover event classification, family aliases, per-conversation isolation, bounded buffers, clear, and subscription notifications.
- TypeScript accepted the new `./debug` package export and root re-exports.

### What didn't work
- The first validation command included an extra `-- --runInBand` argument. Vitest ignored it harmlessly and all tests passed.

### What I learned
- `ChatDebugEvent` is already exported from the provider root, so the new primitives only needed to build a stable derived entry shape around it.
- The downstream local store had the right shape; moving it upstream mostly required making timestamps/classification injectable for tests.

### What was tricky to build
- The classifier has two related but different event rows for UI events: parsed provider frames classify by their original event name and family, while projected `ui-event` debug records classify as `timeline` because they represent timeline mutation application. Preserving that distinction keeps the Event Viewer useful for both raw protocol inspection and projection inspection.

### What warrants a second pair of eyes
- Whether root-level re-exports should stay, or whether consumers should import debug primitives only from `@go-go-golems/chat-provider/debug`.
- Whether the default event family heuristics should include more app-specific names before inventory migration.

### What should be done in the future
- Build `chat-overlay/devtools` on top of these provider primitives.
- Replace downstream local debug stores with `createChatDebugEventStore` after the overlay components exist.

### Code review instructions
- Start with `packages/chat-provider/src/debug/classifyDebugEvent.ts` to verify event family semantics.
- Then inspect `packages/chat-provider/src/debug/debugEventStore.ts` for bounded-buffer and subscription behavior.
- Validate with `pnpm --filter @go-go-golems/chat-provider test` and `pnpm --filter @go-go-golems/chat-provider typecheck`.

### Technical details
- `ChatDebugEntry.seq` is monotonic across conversations inside one store instance. This matches the previous downstream store and supports mutation-fold cursors.
- `maxEntriesPerConversation` is clamped to at least one entry to avoid surprising empty buffers.
- The store does not implement pause; pause remains UI-level behavior so detached windows can decide whether pausing should drop or only hide events.


## Step 3: Implement overlay devtools, timeline debug, and chat chrome primitives

This step implemented the reusable overlay side of the ticket. `chat-overlay` now exports devtools utilities, `ChatEventViewer`, `ChatTimelineDebug`, and a policy-free `ChatWindowChrome` primitive. The components are intentionally source-agnostic: Event Viewer accepts entries or a provider debug store, while Timeline Debug accepts a `TimelineMirrorState` rather than fetching app-specific REST endpoints.

The implementation uses the launcher-local debug windows as the behavioral source but keeps app policy out of the reusable package. Snapshot fetching, desktop window routing, inventory-specific labels, and assistant profile controls remain downstream responsibilities.

### Prompt Context

**User prompt (verbatim):** (same as Step 2)

**Assistant interpretation:** Continue implementing the ticket phase by phase, then validate, document, and commit the completed chunk.

**Inferred user intent:** The user wants reusable devtools/chrome APIs landed upstream before downstream apps are migrated off `os-chat`.

**Commit (code):** pending at diary-write time — "Add chat overlay devtools primitives"

### What I did
- Added shared devtools utilities under `packages/chat-overlay/src/devtools/`:
  - `clipboard.ts`
  - `download.ts`
  - `yamlFormat.ts`
  - `StructuredDataTree.tsx`
  - `SyntaxHighlight.tsx`
  - `timelineDebugModel.ts`
  - `timelineMirrorFolding.ts`
- Added `ChatEventViewer` and `ChatEventViewerFromStore`.
- Added `ChatTimelineDebug` over `TimelineMirrorState`.
- Added slot-based `ChatWindowChrome` under `packages/chat-overlay/src/overlay/ChatWindowChrome.tsx`.
- Added `packages/chat-overlay/src/devtools/index.ts` and a package subpath export `@go-go-golems/chat-overlay/devtools`.
- Added root exports for `ChatWindowChrome`.
- Added utility and model tests in `packages/chat-overlay/src/devtools/devtools.test.ts`.
- Added a devtools Storybook sketch in `packages/chat-overlay/src/stories/ChatDevtools.stories.tsx`.
- Ran:
  - `pnpm --filter @go-go-golems/chat-overlay test -- --runInBand`
  - `pnpm --filter @go-go-golems/chat-overlay typecheck`
  - `pnpm test`
  - `pnpm typecheck`

### Why
- Downstream apps need reusable Event Viewer and Timeline Debug components before local debug windows and `os-chat` helper imports can be removed.
- Keeping devtools in `chat-overlay/devtools` matches the dependency direction: UI depends on provider types and mirror helpers.
- `ChatWindowChrome` gives apps a reusable shell without pulling profile fetching or desktop policy upstream.

### What worked
- The overlay tests pass and cover YAML formatting, sanitization, event filtering/export, timeline snapshot building, and mutation folding.
- Typecheck passes across the repo.
- The devtools subpath export compiles with the existing package setup.

### What didn't work
- I intentionally did not port the CodeMirror/Lezer syntax highlighter dependency from launcher/os-chat. `react-chat` does not currently depend on CodeMirror packages, so the first reusable `SyntaxHighlight` is a lightweight preformatted renderer with truncation support. This avoids expanding dependencies while preserving the debug UX contract.

### What I learned
- The reusable component boundary is clean if Timeline Debug accepts a mirror state and separate helper functions handle snapshot seeding/mutation folding.
- The existing launcher implementation had useful performance details: memoized event rows and lazy YAML payload rendering. Those carried over directly.

### What was tricky to build
- Controlled vs uncontrolled selected entity state in `ChatTimelineDebug` needed care. Detached windows can let the component own selection, while richer apps may want the selected id in app state. The component now supports both with `selectedEntityId` and `onSelectedEntityIdChange`.
- Copy/export helpers need browser APIs, but tests should stay Node-friendly. The tests cover pure export string builders and avoid invoking DOM download or clipboard behavior.

### What warrants a second pair of eyes
- Whether the first `SyntaxHighlight` should remain dependency-free or reintroduce CodeMirror as an optional enhancement.
- Whether `ChatEventViewer` pause semantics should freeze the displayed entries, as implemented, or drop new entries before state updates like the launcher-local store did.
- Whether `ChatWindowChrome` should expose CSS files instead of inline styles in a later pass.

### What should be done in the future
- Migrate launcher `ChatDebugWindows.tsx` to `ChatEventViewerFromStore`/`ChatTimelineDebug`.
- Migrate inventory `InventoryDebugWindows.tsx` and remove `os-chat` helper imports.
- Publish the new subpath exports after downstream migration validates them.

### Code review instructions
- Start with `packages/chat-overlay/src/devtools/ChatEventViewer.tsx` and verify controls/filtering/export behavior.
- Review `packages/chat-overlay/src/devtools/ChatTimelineDebug.tsx` for source-agnostic timeline display.
- Review `packages/chat-overlay/src/devtools/timelineMirrorFolding.ts` to confirm detached-window folding semantics.
- Validate with `pnpm test` and `pnpm typecheck`.

### Technical details
- `@go-go-golems/chat-overlay/devtools` is the intended downstream import path for devtools.
- `ChatTimelineDebug` does not fetch snapshots; downstream adapters should call `seedTimelineMirrorFromSnapshot` and `foldTimelineMutationsFromDebugEntries`.
- `ChatEventViewerFromStore` binds to any `ChatDebugEventStore` created by `chat-provider/debug`.


## Step 4: Prepare react-chat 0.4.0 package release for downstream migration

This step bumped both publishable `react-chat` packages to `0.4.0` so downstream apps can depend on a semver version that includes the new devtools subpath exports. This is a release-preparation step rather than a feature implementation step.

The downstream migration should not be committed against `^0.3.0`, because `@go-go-golems/chat-overlay/devtools` and the provider debug primitives do not exist in the already-published `0.3.0` packages. Version `0.4.0` is the intended published package boundary for these APIs.

### Prompt Context

**User prompt (verbatim):** (same as Step 2)

**Assistant interpretation:** Continue implementation and commit the release-preparation step separately because downstream migration needs a published package version.

**Inferred user intent:** The user wants downstream code to move to real reusable packages rather than local workspace links.

**Commit (code):** pending at diary-write time — "Bump react-chat packages to 0.4.0"

### What I did
- Bumped `packages/chat-provider/package.json` from `0.3.0` to `0.4.0`.
- Bumped `packages/chat-overlay/package.json` from `0.3.0` to `0.4.0`.
- Ran `pnpm install --lockfile-only`.
- Ran:
  - `pnpm test`
  - `pnpm typecheck`
  - `npm run build:publish`
  - `npm run pack:smoke`

### Why
- Downstream apps should import `@go-go-golems/chat-overlay/devtools` from a published version, not from a temporary workspace link.
- A minor version bump is appropriate because the package gains new exported APIs without intentionally breaking existing ones.

### What worked
- Full repo tests passed.
- Full repo typecheck passed.
- Publish artifact build succeeded for both provider and overlay.
- Pack smoke succeeded for `go-go-golems-chat-provider-0.4.0.tgz` and `go-go-golems-chat-overlay-0.4.0.tgz`.

### What didn't work
- `npm version 0.4.0 -w packages/chat-overlay --no-git-tag-version` failed with `EUNSUPPORTEDPROTOCOL` because npm attempted to process the workspace dependency protocol. I updated the overlay version with a small JSON edit instead, then ran `pnpm install --lockfile-only`.

### What I learned
- The dist build script correctly rewrites the new package subpath exports into publishable declaration targets.
- The lockfile did not need a meaningful version diff for workspace packages, but `pnpm install --lockfile-only` completed cleanly.

### What was tricky to build
- The main tricky point is release sequencing: downstream source can be migrated now, but CI against published dependencies will only pass after `0.4.0` is actually published or otherwise made available. The implementation should avoid reintroducing `workspace-links/react-chat` as a committed dependency.

### What warrants a second pair of eyes
- Whether to publish `0.4.0` from this branch or wait until the branch is merged into `main`.
- Whether these API additions should be `0.4.0` or a larger version bump.

### What should be done in the future
- Publish provider and overlay `0.4.0` before merging downstream PRs that import the new devtools subpath.
- Update downstream package manifests from `^0.3.0` to `^0.4.0` during migration.

### Code review instructions
- Review the package version diffs only.
- Validate with `pnpm test`, `pnpm typecheck`, `npm run build:publish`, and `npm run pack:smoke`.

### Technical details
- Package versions prepared: `@go-go-golems/chat-provider@0.4.0`, `@go-go-golems/chat-overlay@0.4.0`.


## Step 5: Publish react-chat 0.4.0 packages

This step published the new `react-chat` APIs to npm so downstream apps can migrate using normal semver dependencies instead of committed workspace links. The published version includes the provider debug primitives and the overlay `devtools` subpath.

The publish ran through the repository's trusted GitHub Actions workflow rather than a local `npm publish`, preserving the existing release path and npm provenance setup.

### Prompt Context

**User prompt (verbatim):** (same as Step 2)

**Assistant interpretation:** Make the just-implemented upstream APIs available so later downstream tasks can use published packages.

**Inferred user intent:** Avoid another temporary workspace-link migration and keep downstream builds reproducible from npm packages.

**Commit (code):** N/A — workflow publish only; version bump was committed in Step 4.

### What I did
- Triggered GitHub Actions workflow `publish-npm` on branch `task/devtools-oschat-retirement`.
- Inputs:
  - `package_set=all`
  - `npm_tag=latest`
  - `dry_run=false`
  - `skip_existing=true`
  - `confirm_latest_publish=CONFIRM_LATEST`
- Watched run `28826410685` to completion.
- Verified npm:
  - `npm view @go-go-golems/chat-provider@0.4.0 version`
  - `npm view @go-go-golems/chat-overlay@0.4.0 version`
  - `npm view @go-go-golems/chat-overlay dist-tags --json`

### Why
- Downstream Phase 6/7 migrations import new package exports that do not exist in `0.3.0`.
- Publishing first lets downstream manifests use `^0.4.0` and keeps CI aligned with installed packages.

### What worked
- Workflow run `28826410685` succeeded.
- Both packages published as `0.4.0`.
- `latest` now points to `0.4.0`.

### What didn't work
- The workflow emitted a Node.js 20 deprecation annotation for GitHub Actions internals, but the job still succeeded.

### What I learned
- The existing trusted publishing workflow works from the feature branch when invoked with `--ref task/devtools-oschat-retirement`.
- The npm registry reflects the new packages immediately enough for downstream dependency updates.

### What was tricky to build
- The release was necessary before downstream migration. Without it, source changes could compile only through local links, which would violate the desired published-package dependency model.

### What warrants a second pair of eyes
- Publishing from a feature branch should be acceptable for this package workflow, but reviewers may still prefer to merge the branch quickly so `main` contains the published source.

### What should be done in the future
- Update downstream manifests to `^0.4.0`.
- Migrate launcher and inventory to `@go-go-golems/chat-overlay/devtools`.

### Code review instructions
- Verify GitHub Actions run `28826410685`.
- Verify npm versions with `npm view @go-go-golems/chat-provider@0.4.0 version` and `npm view @go-go-golems/chat-overlay@0.4.0 version`.

### Technical details
- Published packages:
  - `@go-go-golems/chat-provider@0.4.0`
  - `@go-go-golems/chat-overlay@0.4.0`
- Workflow URL: `https://github.com/go-go-golems/react-chat/actions/runs/28826410685`.


## Step 6: Fix provider root debug export for publish artifacts

This step fixed a publish-artifact issue found during downstream launcher validation. TypeScript accepted the provider root export `./debug`, but the dist rewrite produced `./debug.js` even though the emitted file is `debug/index.js`. Vite then failed to build downstream apps from the published package.

The fix changes the provider root source export to `./debug/index` and bumps both packages to `0.4.1` so overlay and provider versions stay aligned for npm consumers.

### Prompt Context

**User prompt (verbatim):** (same as Step 2)

**Assistant interpretation:** Continue implementation, record failures immediately, and commit the packaging fix as its own reviewable step.

**Inferred user intent:** Keep the migration reproducible from published packages and avoid hidden local-link success.

**Commit (code):** pending at diary-write time — "Fix provider debug export package path"

### What I did
- Changed provider root exports from `./debug` to `./debug/index` in `packages/chat-provider/src/index.ts`.
- Bumped `@go-go-golems/chat-provider` and `@go-go-golems/chat-overlay` to `0.4.1`.
- Ran:
  - `pnpm install --lockfile-only`
  - `pnpm test`
  - `pnpm typecheck`
  - `npm run build:publish`
  - `npm run pack:smoke`
- Confirmed `packages/chat-provider/dist/index.js` now imports `./debug/index.js`.

### Why
- Downstream `vite build` failed with the published `0.4.0` provider because `index.js` referenced a non-existent `./debug.js`.
- Overlay depends on the provider package, so publishing both as `0.4.1` keeps dependency versions aligned.

### What worked
- The publish artifact now contains the correct provider root debug re-export path.
- Full tests, typecheck, publish build, and pack smoke passed.

### What didn't work
- Downstream launcher build exposed the bug with this exact error:
  - `Could not resolve "./debug.js" from "../../node_modules/@go-go-golems/chat-provider/index.js"`

### What I learned
- The build-dist import rewriter handles file paths reliably, but directory barrel exports should be written explicitly as `./debug/index` when the emitted artifact is an index file under a directory.

### What was tricky to build
- This was not visible in source typechecking because TypeScript module resolution accepts directory index exports. It only failed after npm-package dist rewriting and Vite bundling from `node_modules`.

### What warrants a second pair of eyes
- Other directory barrel exports in future package changes should be checked against emitted dist import paths.

### What should be done in the future
- Publish `0.4.1` and update downstream lockfiles to resolve the fixed provider/overlay pair.

### Code review instructions
- Inspect `packages/chat-provider/src/index.ts` and the generated dist path from `npm run build:publish`.
- Validate with `npm run pack:smoke`.

### Technical details
- Bad published path: `./debug.js`.
- Fixed emitted path: `./debug/index.js`.


## Step 7: Publish react-chat 0.4.1 patch packages

This step published the packaging fix from Step 6. Both provider and overlay were published as `0.4.1`; the overlay package contains the devtools files and depends on the fixed provider version.

The npm registry briefly returned a 404 for `chat-overlay@0.4.1` immediately after the workflow completed, but a retry after propagation succeeded and confirmed `latest` points to `0.4.1`.

### Prompt Context

**User prompt (verbatim):** (same as Step 2)

**Assistant interpretation:** Continue release sequencing after the downstream build found a publish-artifact defect.

**Inferred user intent:** Make sure downstream apps can consume a fixed published package set.

**Commit (code):** N/A — workflow publish only; code/version fix was committed in Step 6.

### What I did
- Triggered GitHub Actions workflow `publish-npm` on branch `task/devtools-oschat-retirement`.
- Watched run `28826642631` to completion.
- Verified:
  - `npm view @go-go-golems/chat-provider@0.4.1 version`
  - `npm view @go-go-golems/chat-overlay@0.4.1 version`
  - `npm view @go-go-golems/chat-overlay dist-tags --json`

### Why
- The `0.4.0` provider package had a bad root debug export path.
- Downstream migration needs a published package pair that works in Vite production builds.

### What worked
- Workflow run `28826642631` succeeded.
- Publish summary reported both packages as published.
- npm now reports `@go-go-golems/chat-provider@0.4.1` and `@go-go-golems/chat-overlay@0.4.1`.
- `latest` now points to `0.4.1`.

### What didn't work
- Immediate npm verification returned `E404 No match found for version 0.4.1` for `chat-overlay`; retrying after a short propagation delay succeeded.

### What I learned
- npm registry propagation can lag slightly after workflow success, so verification should allow a short retry window.

### What was tricky to build
- The prior published `0.4.0` remains in the registry and should not be used downstream. Downstream lockfiles should resolve `0.4.1`.

### What warrants a second pair of eyes
- The published package set now includes a superseded `0.4.0`; if desired, npm deprecation can warn users to use `0.4.1`.

### What should be done in the future
- Update downstream manifests to `^0.4.1` or refresh lockfiles so `^0.4.0` resolves to `0.4.1`.

### Code review instructions
- Verify GitHub Actions run `28826642631`.
- Verify npm dist-tags show `latest: 0.4.1`.

### Technical details
- Published packages:
  - `@go-go-golems/chat-provider@0.4.1`
  - `@go-go-golems/chat-overlay@0.4.1`
- Workflow URL: `https://github.com/go-go-golems/react-chat/actions/runs/28826642631`.


## Step 8: Migrate launcher and inventory to published react-chat devtools

This step migrated the active downstream launcher and inventory chat debug windows to the published `react-chat` devtools APIs. The duplicated local Event Viewer / Timeline Debug implementations are now thin adapters that provide the app-specific debug store, REST snapshot fetch, and desktop-window route inputs.

The active downstream apps no longer directly import `@go-go-golems/os-chat` or `@go-go-golems/os-chat/theme`. `os-chat` still appears transitively through older `go-go-os-frontend` packages such as `os-scripting`, `apps-browser`, and `crm`, so complete package retirement is not finished.

### Prompt Context

**User prompt (verbatim):** (same as Step 2)

**Assistant interpretation:** Continue with the downstream migration phases after publishing the fixed upstream packages.

**Inferred user intent:** Replace local/downstream copies with the reusable upstream devtools and remove active `os-chat` usage from launcher and inventory.

**Commit (code):**
- `e256183` — "Use upstream react-chat devtools" in `wesen-os`.
- `d9232a6` — "Use upstream react-chat devtools" in `go-go-app-inventory`.

### What I did
- Updated downstream package manifests to use:
  - `@go-go-golems/chat-provider: ^0.4.1`
  - `@go-go-golems/chat-overlay: ^0.4.1`
- Migrated launcher:
  - `apps/os-launcher/src/chat/ChatDebugWindows.tsx` now uses `ChatEventViewerFromStore`, `ChatTimelineDebug`, `seedTimelineMirrorFromSnapshot`, `latestDebugEntrySeq`, and `foldTimelineMutationsFromDebugEntries`.
  - `chatDebugStore.ts` now wraps `createChatDebugEventStore` from `chat-provider`.
  - `useChatDebugEvents.ts` now uses `useChatDebugEntries` from `chat-provider`.
  - Deleted local copied debug helpers: `StructuredDataTree.tsx`, `SyntaxHighlight.tsx`, `clipboard.ts`, `timelineDebugModel.ts`, and `yamlFormat.ts`.
  - Removed old `os-chat` reducers from launcher store.
  - Removed `@go-go-golems/os-chat/theme` from launcher main entry.
- Migrated inventory:
  - `InventoryDebugWindows.tsx` now uses `@go-go-golems/chat-overlay/devtools`.
  - `inventoryChatDebugStore.ts` now wraps `createChatDebugEventStore`.
  - `useInventoryChatDebugEvents.ts` now uses `useChatDebugEntries`.
  - Removed old `os-chat` reducers from inventory store.
  - Removed `@go-go-golems/os-chat/theme` from inventory main entry.
  - Deleted obsolete `renderInventoryApp.chat.test.tsx`, which tested the retired SEM/os-chat projection path.
- Ran `pnpm install` in `wesen-os` to refresh published package resolution.
- Validated:
  - `pnpm --filter @go-go-golems/os-launcher typecheck:published`
  - `pnpm --filter @go-go-golems/os-launcher build:published`
  - `pnpm --filter @go-go-golems/inventory typecheck:published`
  - `pnpm --filter @go-go-golems/inventory build:federation`
- Checked active app imports:
  - `rg "from '@go-go-golems/os-chat'|@go-go-golems/os-chat/theme" apps/os-launcher/src workspace-links/go-go-app-inventory/apps/inventory/src`

### Why
- Launcher and inventory were maintaining duplicate debug UIs that should now be reusable upstream components.
- Removing direct reducers/theme imports eliminates active app dependence on the old `os-chat` runtime package.
- Published `0.4.1` packages make the migration reproducible without workspace links.

### What worked
- Launcher published typecheck and production build passed.
- Inventory published typecheck and federation build passed.
- Active source no longer imports `@go-go-golems/os-chat` or `@go-go-golems/os-chat/theme`.
- The launcher CSS bundle shrank after removing the old os-chat theme import and local helper copies.

### What didn't work
- The first launcher build against `0.4.0` failed before the `0.4.1` patch with:
  - `Could not resolve "./debug.js" from "../../node_modules/@go-go-golems/chat-provider/index.js"`
- `pnpm --filter @go-go-golems/inventory test` still fails for unrelated/stale test-runner reasons:
  - stale built `dist/launcher/renderInventoryApp.chat.test.js` still runs even after deleting the source test;
  - `dist/domain/pluginBundle.test.js` cannot find `./vm/00-runtimePrelude.vm.js`;
  - `src/domain/pluginBundle.test.ts` fails with `Runtime bundle packageIds mismatch. Declared: kanban, ui; installed: ui`.

### What I learned
- The active app-level `os-chat` removal is separable from full monorepo `os-chat` retirement. `pnpm why @go-go-golems/os-chat --recursive` shows transitive consumers in `go-go-os-frontend` packages, especially `os-scripting`, `os-shell`, `os-kanban`, `os-ui-cards`, `apps-browser`, and old demo apps.
- Removing the old Redux reducers from launcher/inventory app stores did not break published typecheck/build, confirming active chat state is provider-owned now.

### What was tricky to build
- The adapters still need app-specific REST snapshot seeding. The reusable `ChatTimelineDebug` intentionally does not fetch snapshots, so launcher and inventory each keep a small wrapper that calls their `/api/chat/sessions/:convId` endpoint and folds later debug mutations on top.
- Deleting `renderInventoryApp.chat.test.tsx` removes obsolete SEM/os-chat coverage. This is correct for the new runtime path, but reviewers should confirm no current artifact behavior depended on that old test.

### What warrants a second pair of eyes
- Whether deleted SEM projection test coverage should be replaced with a current `chat-provider`/artifact-widget integration test.
- Whether the transitive `os-chat` consumers in `go-go-os-frontend` should be handled in this same ticket or a follow-up package cleanup ticket.
- Whether browser smoke should be rerun manually after the downstream PRs merge.

### What should be done in the future
- Run browser smoke for Assistant Event Viewer/Timeline Debug and Inventory Event Viewer/Timeline Debug.
- Audit and remove transitive `os-chat` dependencies from `go-go-os-frontend` packages.
- Decide whether to delete `packages/os-chat`, keep a deprecated stub, or publish an npm deprecation notice.

### Code review instructions
- In `wesen-os`, start with `apps/os-launcher/src/chat/ChatDebugWindows.tsx`, then inspect the deleted helper files and store/main changes.
- In inventory, start with `apps/inventory/src/launcher/chat/InventoryDebugWindows.tsx`, then inspect `inventoryChatDebugStore.ts`, `useInventoryChatDebugEvents.ts`, and store/main changes.
- Validate with the four typecheck/build commands listed above.
- Do not treat the inventory full test failure as caused by this step without first cleaning stale `dist` tests and fixing the plugin bundle package-id mismatch.

### Technical details
- Published packages consumed downstream: `@go-go-golems/chat-provider@0.4.1`, `@go-go-golems/chat-overlay@0.4.1`.
- Launcher commit: `e256183`.
- Inventory commit: `d9232a6`.
