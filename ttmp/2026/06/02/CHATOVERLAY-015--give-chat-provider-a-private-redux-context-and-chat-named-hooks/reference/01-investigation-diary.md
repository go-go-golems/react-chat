---
Title: Investigation Diary
Ticket: CHATOVERLAY-015
Status: active
Topics:
    - chat-provider
    - react
    - typescript
    - pinocchio
    - architecture
DocType: reference
Intent: long-term
Owners: []
RelatedFiles:
    - Path: 2026-05-29--chatbot-overlay-glm/ttmp/2026/06/02/CHATOVERLAY-015--give-chat-provider-a-private-redux-context-and-chat-named-hooks/design-doc/01-private-redux-context-and-chat-hook-rename-implementation-guide.md
      Note: Design and implementation guide
    - Path: 2026-05-29--chatbot-overlay-glm/ttmp/2026/06/02/CHATOVERLAY-015--give-chat-provider-a-private-redux-context-and-chat-named-hooks/tasks.md
      Note: Task checklist and validation status
ExternalSources: []
Summary: Diary for implementing chat-provider private Redux context and chat-scoped hook names across provider, overlay, Pinocchio, and TTC consumers.
LastUpdated: 2026-06-02T21:58:00-04:00
WhatFor: Use this to review what changed, why, what validations passed, and what follow-ups remain.
WhenToUse: Read before publishing the next chat-provider package or updating additional downstream consumers.
---


# Diary

## Goal

Capture the implementation of CHATOVERLAY-015: moving `@go-go-golems/chat-provider` onto a private React-Redux context, replacing app-named provider hooks with chat-named hooks, and updating Pinocchio/TTC consumers without backwards-compatibility aliases.

## Step 1: Private Redux context, hook rename, downstream updates, and browser smokes

This step implemented the breaking provider API cleanup. The provider no longer exports ambiguous `useAppSelector` or `useAppDispatch` hooks. It exports `useChatSelector`, `useChatDispatch`, and `useChatStore`, and its internal React-Redux provider now uses a private context so host app Redux stores remain visible to host app hooks below `ChatProvider`.

The same step updated the known consumers: the overlay package, Pinocchio web-chat, and TTC Garden Assistant. Pinocchio currently points at the local built provider dist because the new breaking API is not published to npm yet; publishing and switching back to semver remains a follow-up.

### Prompt Context

**User prompt (verbatim):** "ok, Create a separate ticket to fix chat-provider, and add its own analysis and implementation guide and tickets. and introduce the new names and update the two other repos accordingly. No need to do backwards compatibility wrapers. No aliases.

Then add tasks to the new ticket and implement."

**Assistant interpretation:** Create a new docmgr ticket for the chat-provider Redux context/hook cleanup, write design docs/tasks, implement the breaking API change with no compatibility aliases, and update Pinocchio plus TTC consumers.

**Inferred user intent:** The user wants the provider API to be clean before CoinVault ports to it, avoiding awkward Redux context interplay and misleading hook names.

**Commit (code):** Pending — implementation changed provider, overlay, Pinocchio, TTC, and ticket docs.

### What I did
- Created `CHATOVERLAY-015 — Give chat-provider a private Redux context and chat-named hooks`.
- Replaced provider store hooks in `packages/chat-provider/src/store/store.ts`:
  - removed `useAppSelector` and `useAppDispatch`,
  - added `ChatReduxContext`, `useChatSelector`, `useChatDispatch`, and `useChatStore`,
  - memoized `selectTimelineEntities` with `createSelector`.
- Updated `packages/chat-provider/src/react/ChatProvider.tsx` to render:
  - `<Provider store={runtime.store} context={ChatReduxContext}>`.
- Updated `packages/chat-provider/src/index.ts` exports.
- Updated `packages/chat-provider/README.md` wording.
- Updated chat-overlay imports in:
  - `ChatBubble.tsx`
  - `ChatComposer.tsx`
  - `ChatPanel.tsx`
  - `ChatMessages.tsx`
- Updated Pinocchio provider-store imports in:
  - `pinocchio/cmd/web-chat/web/src/features/web-chat/WebChatApp/WebChatApp.tsx`
  - `pinocchio/cmd/web-chat/web/src/features/web-chat/WebChatApp/ProviderStatusbar.tsx`
- Updated TTC provider-store imports in:
  - `2026-05-27--ttc-design-system/web/packages/ttc-garden-assistant/src/features/chat/TtcGardenChatOverlay.tsx`
- Rebuilt provider dist for linked/local consumers.
- Changed Pinocchio `cmd/web-chat/web/package.json` from published `^0.1.1` to local provider dist because the new API is not published yet, then ran `npm install`.
- Wrote the design guide and updated the task list.

### Why
- The old `useAppSelector`/`useAppDispatch` names were misleading for a library.
- The old default React-Redux provider context could shadow host app stores under `<ChatProvider>`.
- No aliases were added because the user explicitly requested no backwards-compatibility wrappers.
- Memoizing `selectTimelineEntities` removed the selector stability warning observed in TTC tests.

### What worked
- Provider validation passed:
  - `pnpm --filter @go-go-golems/chat-provider typecheck`
  - `pnpm --filter @go-go-golems/chat-provider test`
- Overlay validation passed:
  - `pnpm --filter @go-go-golems/chat-overlay typecheck`
- Provider dist build passed:
  - `npm run build:dist -w packages/chat-provider`
- Pinocchio validation passed:
  - `npm run typecheck`
  - `npm test -- --run src/features/web-chat/extensions/pinocchio-timeline-adapters/pinocchioTimelineAdapters.test.ts src/features/web-chat/renderers.test.ts`
  - `node 2026-05-29--chatbot-overlay-glm/ttmp/2026/05/31/CHATOVERLAY-010--create-unified-timeline-adapter-api/scripts/01-mock-profile-hydration-smoke.js`
  - `node 2026-05-29--chatbot-overlay-glm/ttmp/2026/05/30/CHATOVERLAY-005--move-typed-widget-plugin-support-into-pinocchio-chatapp/scripts/03-pinocchio-webchat-devctl-playwright.js`
- TTC validation passed:
  - `pnpm run typecheck`
  - `pnpm vitest run src/features/chat/TtcChatProviderShell.test.tsx src/features/chat/TtcChatTools.test.tsx`
  - simple Playwright browser smoke: opened Garden Assistant, sent a prompt, verified prompt rendering, verified session id persistence, and saw no console errors.

### What didn't work
- Pinocchio initially failed typecheck because it was still consuming published `@go-go-golems/chat-provider@0.1.1`, which does not export `useChatSelector`:
  - `src/features/web-chat/WebChatApp/ProviderStatusbar.tsx(1,25): error TS2724: '"@go-go-golems/chat-provider"' has no exported member named 'useChatSelector'. Did you mean 'useAppSelector'?`
  - `src/features/web-chat/WebChatApp/WebChatApp.tsx(5,3): error TS2724: '"@go-go-golems/chat-provider"' has no exported member named 'useChatSelector'. Did you mean 'useAppSelector'?`
  - Resolution: rebuilt provider dist and pointed Pinocchio at `file:../../../../2026-05-29--chatbot-overlay-glm/packages/chat-provider/dist` until the new package version is published.
- The first TTC browser smoke attempt used `getByText('Garden Assistant')` and failed strict-mode matching because several elements contained that text.
  - Resolution: changed the smoke to `getByRole('heading', { name: 'Garden Assistant', exact: true })`.
- The TTC deterministic failure-path browser smoke was attempted:
  - `node scripts/ttc_mock_failure_playwright_smoke.mjs`
  - It failed because the running backend produced a normal streaming/provider-style answer and snapshot status stayed `streaming` instead of `failed`.
  - The failure did not indicate a Redux hook regression; the simple TTC browser smoke passed after that.

### What I learned
- React-Redux custom context support is exactly the right tool for embeddable Redux-backed packages.
- Hook names matter: `useAppSelector` is acceptable in an application, but not in a reusable provider package that may be nested inside many applications.
- Consumers that use published npm packages need either a published provider version or a temporary local dist dependency when the API is hard-cut without aliases.
- `selectTimelineEntities` returning a new empty array on every selector call triggers React-Redux development warnings; memoizing it is a low-risk quality improvement.

### What was tricky to build
- The main sharp edge was validation order. TTC already linked provider dist, but Pinocchio consumed npm `^0.1.1`. After the source changes, Pinocchio could not see the new API until its dependency was pointed at rebuilt dist. This is a packaging boundary issue, not a TypeScript issue.
- Another tricky point was distinguishing provider hooks from host hooks in Pinocchio. `WebChatProviderShell` and `ExportMenu` still import Pinocchio's own `useAppSelector` from `../../../store/hooks`; those should remain app hooks. Only imports from `@go-go-golems/chat-provider` changed to `useChatSelector`.

### What warrants a second pair of eyes
- Review whether Pinocchio should remain on local `file:` dist until publish, or whether the next step should immediately publish a new `@go-go-golems/chat-provider` version and switch Pinocchio back.
- Review `ChatReduxContext` typing in `store.ts`; it uses `ReactReduxContextValue | null` and typed hooks via `.withTypes`, which passed typecheck.
- Review the TTC failure-path smoke separately if deterministic mock failure behavior is still required.

### What should be done in the future
- Publish a new provider version containing the breaking hook rename.
- Update Pinocchio from local provider dist back to the published semver range after publication.
- Decide whether TTC should keep linking local dist or consume the published package.
- Consider adding a provider unit test that mounts a host Redux provider outside `ChatProvider` and verifies both host and chat selectors read their own stores.

### Code review instructions
- Start with `packages/chat-provider/src/store/store.ts` and `packages/chat-provider/src/react/ChatProvider.tsx`.
- Then review all consumer import diffs for `useChatSelector`.
- Confirm no import from `@go-go-golems/chat-provider` still references `useAppSelector` or `useAppDispatch`.
- Validate with the commands listed in `What worked`.

### Technical details
- New provider exports:
  - `ChatReduxContext`
  - `useChatSelector`
  - `useChatDispatch`
  - `useChatStore`
- Removed provider exports:
  - `useAppSelector`
  - `useAppDispatch`
- Successful browser smoke evidence:
  - Pinocchio hydration smoke wrote `/tmp/pinocchio-chatprovider-timeline-adapter-hydration.json`.
  - TTC simple browser smoke printed a session id and status `subscribed`.

## Step 2: Prepare publish PR for 0.2.0 packages

This step prepared the package-publishing PR. Because the provider hook rename is a breaking API change, both public packages were bumped from `0.1.1` to `0.2.0`: provider because its exports changed, and overlay because its source now consumes the new provider hook names.

The publish flow was validated with the repository's dry-run script. No package was actually published from the workstation; the PR is intended to let the repository review/merge/publish process release the versions.

### Prompt Context

**User prompt (verbatim):** "publish it by making a PR"

**Assistant interpretation:** Prepare a pull request that contains the package version bump and validated publish artifacts/dry run, rather than publishing directly from the local machine.

**Inferred user intent:** The user wants a reviewable release PR that can trigger or document publication of the breaking provider cleanup.

**Commit (code):** Pending — PR branch prepared locally.

### What I did
- Bumped `packages/chat-provider/package.json` from `0.1.1` to `0.2.0`.
- Bumped `packages/chat-overlay/package.json` from `0.1.1` to `0.2.0`.
- Ran `pnpm install --lockfile-only`; no lockfile content change was needed.
- Ran the repository publish dry-run script:
  - `npm run publish:dry-run`

### Why
- `0.2.0` communicates a breaking pre-1.0 package change.
- The overlay package should be released alongside provider because it imports the new `useChatSelector` symbol.
- A dry run confirms dist generation, package packing, and npm publish metadata before opening the PR.

### What worked
- `npm run publish:dry-run` passed.
- Dry-run output showed both packages ready to publish:
  - `@go-go-golems/chat-provider@0.2.0`
  - `@go-go-golems/chat-overlay@0.2.0`

### What didn't work
- N/A

### What I learned
- The publish script builds dist from workspace sources and rewrites workspace dependencies for publish artifacts.
- Version changes in these package manifests did not require a pnpm lockfile change in this repository state.

### What was tricky to build
- The PR should not include unrelated local modifications in `packages/chat-provider/src/ws/*` or `ttmp/vocabulary.yaml`; those were present in the working tree but are unrelated to this release PR.

### What warrants a second pair of eyes
- Confirm the release version choice: `0.2.0` for both provider and overlay.
- Confirm the repo's merge/publish workflow expects package version bumps only, not checked-in `dist/` artifacts.

### What should be done in the future
- After the PR is merged and packages are published, update Pinocchio's dependency from the temporary local dist path to `@go-go-golems/chat-provider@^0.2.0`.

### Code review instructions
- Start with the package version diffs in `packages/chat-provider/package.json` and `packages/chat-overlay/package.json`.
- Then review the implementation files from Step 1.
- Re-run `npm run publish:dry-run` from the repository root.

### Technical details
- Dry-run command:
  - `cd 2026-05-29--chatbot-overlay-glm && npm run publish:dry-run`
- Publish dry-run reported:
  - `@go-go-golems/chat-provider@0.2.0: dry-run`
  - `@go-go-golems/chat-overlay@0.2.0: dry-run`
