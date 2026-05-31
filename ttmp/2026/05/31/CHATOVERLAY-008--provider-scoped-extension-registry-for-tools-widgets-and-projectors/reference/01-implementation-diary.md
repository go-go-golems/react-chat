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
    - Path: ../../../../../../../pinocchio/cmd/web-chat/web/src/chat/provider/projectors/pinocchioProjectors.ts
      Note: Pinocchio-owned provider projectors (commit 5f9e80d)
    - Path: packages/chat-overlay/src/overlay/ChatBubble.tsx
      Note: Launcher semantic class (commit 9f06509)
    - Path: packages/chat-overlay/src/overlay/ChatPanel.tsx
      Note: Dialog semantic classes (commit 9f06509)
    - Path: packages/chat-overlay/src/theme/retro-mac.css
      Note: Overlay chrome CSS regression fix (commit 9f06509)
    - Path: packages/chat-provider/src/react/ChatProvider.tsx
      Note: Provider-scoped registry construction and extension installation (commit d614a71)
    - Path: packages/chat-provider/src/widgets/widgetRegistry.ts
      Note: Provider-scoped widget registry and pure defineWidget descriptor (commit d614a71)
    - Path: packages/chat-provider/src/ws/projectorRegistry.ts
      Note: Provider-scoped projector registry (commit d614a71)
    - Path: ttmp/2026/05/31/CHATOVERLAY-008--provider-scoped-extension-registry-for-tools-widgets-and-projectors/design-doc/01-provider-scoped-extension-registry-design-and-implementation-guide.md
      Note: Primary design deliverable for this ticket
    - Path: web/src/ecommerce/extensions.ts
      Note: Ecommerce explicit widget extension (commit b0ecb03)
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

## Step 2: Provider-scoped extension primitives

This step implemented the core `chat-provider` cutover from global widget lookup and incomplete toolkit installation to provider-scoped extension registries. The provider now constructs a widget registry and a timeline projector registry alongside the existing tool registry, then installs configured extensions before any child component connects the WebSocket.

The implementation intentionally removes the public toolkit vocabulary from exports in favor of `ChatExtension`, `defineChatExtensions`, and `useChatExtensions`. `defineWidget(...)` is now a pure descriptor factory; widget registration is performed through provider config or `useWidget(...)`, not through module import side effects.

### Prompt Context

**User prompt (verbatim):** (same as Step 1)

**Assistant interpretation:** Implement the clean provider-scoped extension API planned in the ticket.

**Inferred user intent:** Make tools, widgets, and projectors explicit, provider-local, and deterministic without compatibility shims.

**Commit (code):** d614a71 — "feat: add provider scoped extension registries"

### What I did
- Replaced the module-level widget registry with `createWidgetRegistry()` and `ChatWidgetRegistry`.
- Changed `defineWidget(...)` into a pure descriptor factory.
- Added `useWidget(...)` for React lifecycle-scoped widget registration.
- Added `TimelineProjector`, `defineTimelineProjector(...)`, and `createTimelineProjectorRegistry()`.
- Converted the provider's built-in timeline mapper into `coreChatProjector`.
- Added `ChatExtension`, `defineChatExtensions(...)`, `installChatExtension(...)`, `installChatExtensions(...)`, and `useChatExtensions(...)`.
- Extended `ChatProviderConfig` with `extensions`, `tools`, `widgets`, and `projectors`.
- Updated `ChatProvider` to create tool/widget/projector registries per runtime instance and install configured extensions.
- Removed public `defineToolkit`/`useToolkit` exports from the package entrypoints.

### Why
- Global widget registration made provider behavior depend on import order and broke provider isolation.
- Projectors need to be installed before WebSocket frames arrive, so provider config is the safest default path.
- The existing `ChatToolkit` shape already hinted at grouped extensions, but it only installed tools.

### What worked
- `pnpm --filter @go-go-golems/chat-provider typecheck` passed after fixing context naming and debug-event typing.
- The new registries fit naturally into the existing provider runtime construction flow.

### What didn't work
- Initial provider typecheck failed because `useChatExtensions(...)` passed `ChatRuntimeContextValue` directly to `installChatExtension(...)`, but the latter expects the shorter runtime API shape:
  - `src/core/useChatExtensions.ts(9,33): error TS2345: Argument of type 'ChatRuntimeContextValue' is not assignable to parameter of type 'ChatRuntimeApi'.`
- Initial provider typecheck also failed because debug events did not include the new projector name field:
  - `src/ws/wsManager.ts(188,9): error TS2353: Object literal may only specify known properties, and 'projectorName' does not exist in type ...`
- I fixed both by adapting context fields into `{ client, tools, widgets, projectors }` and adding `projectorName?: string` to the UI debug event type.

### What I learned
- The provider runtime context should expose the concrete registries, but the public extension installer should receive a smaller semantic runtime API.
- Returning the projector name in debug events is useful and cheap once projection is registry-based.

### What was tricky to build
- The main subtlety was avoiding circular lifecycle problems. `ChatProvider` has to create registries first, create the client, then install configured extensions. That order lets extensions refer to the client while still guaranteeing projectors are installed before children call `client.connect()`.
- Another sharp edge was preserving manifest sync. Extension installation now syncs the tool manifest just like individual tool hooks do.

### What warrants a second pair of eyes
- Review the runtime recreation semantics when `config` object identity changes. This was already true before the refactor, but configured extensions make memoized config more important.
- Review whether `priority` sorting for projectors should be stable by insertion order or name. The current implementation breaks priority ties by name.

### What should be done in the future
- Add provider-level unit tests for widget registry isolation and projector ordering.

### Code review instructions
- Start with `packages/chat-provider/src/react/ChatProvider.tsx`.
- Then review `packages/chat-provider/src/core/extensions.ts`, `widgets/widgetRegistry.ts`, and `ws/projectorRegistry.ts`.
- Validate with `pnpm --filter @go-go-golems/chat-provider typecheck`.

### Technical details
- The default projector is registered as `chat-provider.core`.
- Static extension arrays can be passed through `ChatProviderConfig` as `extensions`, `tools`, `widgets`, or `projectors`.

## Step 3: Migrate consumers away from import-side-effect widgets

This step migrated the known frontend consumers to the new extension vocabulary. The ecommerce app now explicitly passes its widget set to the provider via `ecommerceExtensions`, and the Storybook widget stories wrap `WidgetOutlet` in a `ChatProvider` configured with those extensions.

Pinocchio's provider demo was updated from `defineToolkit`/`useToolkit` to `defineChatExtensions`/`useChatExtensions`. Stateful browser tools still use React lifecycle registration, matching the intended API split.

### Prompt Context

**User prompt (verbatim):** (same as Step 1)

**Assistant interpretation:** Update real consumers to the new provider-scoped registration APIs.

**Inferred user intent:** Prove the API is usable by apps and remove the old side-effect registration pattern from active code.

**Commit (code):** b0ecb03 — "refactor: register ecommerce widgets via provider extensions"; 6cceee4 — "refactor: use chat extensions in provider demo"

### What I did
- Added `web/src/ecommerce/extensions.ts` with `ecommerceExtensions`.
- Removed the side-effect-only ecommerce index imports.
- Changed ecommerce `App.tsx` to pass `extensions: [ecommerceExtensions]` through `ChatOverlayProvider` config.
- Changed `WidgetOutlet.stories.tsx` to wrap stories in `ChatProvider config={{ extensions: [ecommerceExtensions] }}`.
- Updated Pinocchio `ProviderDemoPage.tsx` to use `defineChatExtensions` and `useChatExtensions`.

### Why
- `import './ecommerce'; // register ecommerce widgets` was exactly the pattern this ticket removes.
- `WidgetOutlet` now depends on provider runtime context, so stories need an explicit provider wrapper.
- The Pinocchio demo should use the final extension vocabulary before app code starts copying old toolkit examples.

### What worked
- `pnpm -r typecheck` passed for provider and overlay packages.
- `pnpm --filter @go-go-golems/chat-overlay-ecommerce-demo build` passed.
- Pinocchio `npm run typecheck`, `npm run lint`, and `npm run build` passed after organizing imports.

### What didn't work
- Pinocchio lint initially failed because the modified `ProviderDemoPage.tsx` import order did not satisfy Biome:
  - `src/webchat/ProviderDemoPage.tsx:1:1 assist/source/organizeImports FIXABLE The imports and exports are not sorted.`
- I fixed it with:
  - `npx --yes @biomejs/biome@2.3.8 check --write src/webchat/ProviderDemoPage.tsx`

### What I learned
- Storybook stories are an important consumer of provider context too. A provider-scoped registry means even isolated visual examples must be explicit about installed widgets.
- The ecommerce app's stateful tools remain cleaner as component hooks, while static widgets fit well in provider config.

### What was tricky to build
- The story package imports ecommerce code across workspace/package boundaries. The migration kept that pattern but made the registration explicit by importing `ecommerceExtensions` rather than relying on import side effects.

### What warrants a second pair of eyes
- Review whether `ChatOverlayProvider` should expose a top-level `extensions` prop instead of only accepting them through `config`.
- Review whether Storybook should define local fake widgets instead of importing ecommerce widgets from the demo app.

### What should be done in the future
- Add a story/smoke that deliberately renders the same widget name with different provider-local registries.

### Code review instructions
- Start with `web/src/App.tsx` and `web/src/ecommerce/extensions.ts`.
- Then review `packages/chat-overlay/src/stories/WidgetOutlet.stories.tsx`.
- Validate ecommerce with `pnpm --filter @go-go-golems/chat-overlay-ecommerce-demo build`.

### Technical details
- `defineWidget(...)` calls in ecommerce files now only create descriptors; they do not register globally.

## Step 4: Move Pinocchio projectors into provider config

This step moved Pinocchio-specific projection out of generic provider core and into Pinocchio web-chat configuration. `chat-provider` keeps a generic core projector for protocol-generic text, widget, and frontend-tool events. Pinocchio owns reasoning, agent-mode, and backend-tool projection through a `pinocchio.web-chat.projectors` extension.

The important architectural outcome is that custom live UI event support no longer requires editing `@go-go-golems/chat-provider`. Apps can define projector descriptors and install them through provider config before the WebSocket connects.

### Prompt Context

**User prompt (verbatim):** (same as Step 1)

**Assistant interpretation:** Finish the projector portion of the clean extension cutover and validate that Pinocchio still renders its specialized events.

**Inferred user intent:** Ensure custom assistant messages, thinking, widgets, and tool events have an explicit extension path rather than hard-coded provider patches.

**Commit (code):** 3dd56fd — "refactor: move reasoning projection out of provider core"; 5f9e80d — "feat: install pinocchio chat provider projectors"

### What I did
- Removed the Pinocchio reasoning cases from the generic provider core projector.
- Added `pinocchio/cmd/web-chat/web/src/chat/provider/projectors/pinocchioProjectors.ts`.
- Defined projectors for:
  - `ChatReasoningSegmentStarted`, `ChatReasoningPatch`, `ChatReasoningSegmentFinished`,
  - `ChatAgentModePreviewUpdated`, `ChatAgentModeCommitted`, `ChatAgentModePreviewCleared`,
  - `ChatToolCallStarted`, `ChatToolArgumentsPatch`, `ChatToolExecutionStarted`, `ChatToolCallFinished`, `ChatToolResultReady`.
- Installed `pinocchioWebChatProjectors` through `ChatProvider` config in:
  - main provider-backed web-chat,
  - `?providerDemo=1` page.
- Ran validation:
  - `pnpm -r typecheck`
  - `pnpm --filter @go-go-golems/chat-overlay-ecommerce-demo build`
  - `npm run typecheck`
  - `npm run lint`
  - `npm run build`
  - `devctl widget-smoke`
  - `03-pinocchio-webchat-devctl-playwright.js`
  - `01-webchat-capabilities-showcase-smoke.js`
  - `02-webchat-chatprovider-demo-smoke.js`
  - `03-webchat-provider-multi-instance-smoke.js`

### Why
- Reasoning is Pinocchio-specific enough to be owned by Pinocchio web-chat rather than generic provider core.
- Agent-mode and backend-tool timeline events were still legacy-projector capabilities; this gives them a provider-backed path.
- Projectors must be configured before connect, so provider config is the right installation point.

### What worked
- All validation commands listed above passed.
- Existing browser smokes still pass after moving reasoning out of generic provider core.
- Ecommerce widgets still render after moving widget registration into config.

### What didn't work
- No new code blocker in this step. The only lint fix needed was import organization, handled before committing.

### What I learned
- Provider projector priority works as intended: Pinocchio projectors use priority `-10`, so they get first chance to map app-specific frames before the generic core projector.
- The same extension descriptor model can carry static projectors while hook components carry dynamic tools/widgets.

### What was tricky to build
- Backend tool events can be partial patches. The projector preserves streaming argument patches with `inputRawPatch` and `patchMode` so the existing timeline slice can merge them.
- App-owned projectors cannot rely on provider-internal entity helpers, so the Pinocchio projector file defines small local entity constructors. This keeps package boundaries clean.

### What warrants a second pair of eyes
- Review whether any additional Pinocchio event types from legacy `src/ws/timelineEvents.ts` still need provider-backed projectors.
- Review whether generic provider core should keep widget/frontend-tool projection or whether those should also become default bundled extensions.
- Review backend tool projection UI: backend tools currently render through the provider `ToolCallOutlet` fallback unless a backend tool UI is registered.

### What should be done in the future
- Add unit tests for `pinocchioProjectors.ts` with representative raw sessionstream frames.
- Add a dedicated browser smoke for reasoning output if a deterministic reasoning demo prompt/profile is available.

### Code review instructions
- Start with `packages/chat-provider/src/ws/timelineEvents.ts` to confirm provider core is generic.
- Then review `pinocchio/cmd/web-chat/web/src/chat/provider/projectors/pinocchioProjectors.ts` for Pinocchio-owned cases.
- Validate with the smoke commands listed above.

### Technical details
- `pinocchioWebChatProjectors` is installed through `extensions: [pinocchioWebChatProjectors]` in provider config.
- The projector extension is static and therefore available before child components call `client.connect()`.

## Step 5: Stabilize chat-overlay launcher and dialog CSS

This step fixed a visual regression in the ecommerce chat-overlay demo. The launcher and panel were relying on Tailwind utility classes declared inside the workspace package source; after the recent package split/refactor, the app build did not reliably emit critical utilities such as fixed positioning, right/bottom offsets, flex column layout, overflow, and arbitrary height classes.

The fix moves the critical overlay chrome layout into explicit component CSS classes in `retro-mac.css`. The bubble and panel now have stable fixed positioning, z-index, sizing, border, shadow, header, scroll area, and composer layout independent of Tailwind utility extraction.

### Prompt Context

**User prompt (verbatim):** "the CSS for the chat overlay bubble seems broken now, it's a weird bar at the bottom of the screen and when I open it it's also not really a chatbot dialog."

**Assistant interpretation:** The chat-overlay demo's floating launcher and opened dialog layout regressed and need to be inspected and repaired.

**Inferred user intent:** Restore the demo to a recognizable floating chatbot bubble and anchored dialog.

**Commit (code):** 9f06509 — "fix: stabilize chat overlay chrome styles"

### What I did
- Reproduced the issue at `http://127.0.0.1:15173` after starting the demo with `devctl up --force`.
- Captured closed/open browser state and confirmed the launcher/panel had collapsed into normal page-flow/footer-like bars.
- Replaced Tailwind utility-only overlay chrome on `ChatBubble`, `ChatPanel`, and `ChatComposer` with semantic classes.
- Added explicit CSS rules in `packages/chat-overlay/src/theme/retro-mac.css` for:
  - `.chat-overlay-bubble`,
  - `.chat-overlay-panel`,
  - panel header/actions/close button,
  - message scroll region,
  - composer/input/buttons,
  - mobile viewport adjustment.
- Validated with:
  - `pnpm --filter @go-go-golems/chat-overlay typecheck`
  - `pnpm --filter @go-go-golems/chat-overlay-ecommerce-demo build`
  - `devctl up --force`
  - browser inspection via Playwright snapshot
  - `devctl widget-smoke`

### Why
- The overlay chrome must not depend on Tailwind discovering class strings inside a consumed workspace package.
- Fixed positioning and panel flex layout are correctness-critical; if those utilities are missing, the UI stops being an overlay entirely.

### What worked
- The closed launcher now appears as a 48x48 fixed bubble at bottom-right.
- The opened panel now appears as a 384x512 fixed chatbot dialog above the launcher.
- `devctl widget-smoke` passed after the fix.

### What didn't work
- The initial screenshot analysis showed the symptom correctly, but the underlying root cause required inspecting generated CSS. The built CSS was missing several critical utilities (`fixed`, `bottom-*`, `right-*`, `flex-col`, `overflow-y-auto`, `h-[32rem]`).

### What I learned
- Tailwind utilities inside source-exported workspace packages can be brittle unless the app's Tailwind source scanning is configured perfectly.
- Package-owned UI primitives should put must-have chrome rules in package CSS, not only in utility class strings.

### What was tricky to build
- The panel did not just need positioning; it also needed a flex column container and a scrollable middle region. Without both, the composer/header behave like a shallow footer strip rather than a dialog.
- Keeping the retro Mac visual style while restoring overlay behavior required explicit monochrome borders and offset shadows rather than modern rounded-card styling.

### What warrants a second pair of eyes
- Review whether the rest of `chat-overlay` package components still rely on utility classes that may be absent from consumer builds.
- Review whether `@import "tailwindcss"` should remain in the package theme or be replaced by fully explicit package CSS.

### What should be done in the future
- Add a visual smoke assertion for the launcher bounding box and panel bounding box so a bottom-bar regression fails automatically.

### Code review instructions
- Start with `packages/chat-overlay/src/theme/retro-mac.css`.
- Then review `ChatBubble.tsx`, `ChatPanel.tsx`, and `ChatComposer.tsx` to confirm semantic class usage.
- Validate with `devctl up --force && devctl widget-smoke`.

### Technical details
- Closed-state launcher observed after fix: bottom-right fixed button with bounding box roughly `48x48`.
- Open-state panel observed after fix: bottom-right fixed dialog with bounding box roughly `384x512`.
