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
RelatedFiles:
    - Path: ../../../../../../../pinocchio/cmd/web-chat/app/showcase_tools.go
      Note: Showcase prompt detection and result endpoint (commits 004ebc5
    - Path: ../../../../../../../pinocchio/cmd/web-chat/web/src/webchat/cards.tsx
      Note: Confirm tool card and capability widget renderer (commit c9640f3)
    - Path: ../../../../../../../pinocchio/cmd/web-chat/web/src/ws/timelineEvents.ts
      Note: Frontend widget/tool UI event projection (commit c9640f3)
    - Path: ../../../../../../../pinocchio/pkg/chatapp/demo.go
      Note: Capabilities showcase event stream (commit 8fe197a)
    - Path: ../../../../../../../pinocchio/pkg/chatapp/frontendtools/manager.go
      Note: Allows demo-published frontend tool results (commit 004ebc5)
    - Path: ../../../../../../../pinocchio/pkg/chatapp/service.go
      Note: Added SubmitCommand helper (commit 004ebc5)
    - Path: ttmp/2026/05/30/CHATOVERLAY-007--showcase-web-chat-frontend-tools-and-typed-widgets/scripts/01-webchat-capabilities-showcase-smoke.js
      Note: Repeatable browser smoke
ExternalSources: []
Summary: Chronological diary for the web-chat capabilities showcase implementation.
LastUpdated: 2026-05-31T03:55:00-04:00
WhatFor: ""
WhenToUse: ""
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

## Step 2: Backend endpoint support for frontend tool results

This step added the web-chat backend plumbing that lets the browser report a frontend tool result back into the sessionstream pipeline. The key implementation choice changed from the initial design: instead of adding `PublishEvent` on `chatapp.Service`, I added a safer `SubmitCommand` helper and used the existing frontend-tool manager command path.

The result endpoint is now mounted at `/api/chat/sessions/{id}/tools/results`. It decodes a browser result, submits `ChatFrontendToolResult`, and the frontend-tool manager publishes `ChatFrontendToolResultReceived`, which becomes a durable `ChatFrontendToolCall` timeline entity.

### Prompt Context

**User prompt (verbatim):** (same as Step 1)

**Assistant interpretation:** Continue implementing the planned showcase incrementally, starting with backend tool-result transport.

**Inferred user intent:** Make browser-owned tool interactions visible and durable in web-chat.

**Commit (code):** `004ebc5` — "feat: add web-chat frontend tool result endpoint"

### What I did
- Added `chatapp.Service.SubmitCommand(...)` in `pinocchio/pkg/chatapp/service.go`.
- Installed `frontendtools.Manager` in web-chat server setup.
- Added `cmd/web-chat/app/showcase_tools.go` with nested route parsing and frontend tool result DTOs.
- Added `/api/chat/sessions/{id}/tools/results` handling.
- Relaxed `frontendtools.Manager.HandleResult` so demo-published calls can still receive browser result events.
- Added `TestFrontendToolResultEndpointPublishesTimelineEntity`.

### Why
- The frontend needs a stable HTTP path to post human tool decisions.
- Reusing the existing frontend-tool command/event contract avoids inventing a second protocol.

### What worked
- Focused validation passed:
  - `go test ./pkg/chatapp ./pkg/chatapp/frontendtools ./cmd/web-chat/app -count=1`
- The pre-commit hook also ran full Pinocchio lint/test successfully during commit.

### What didn't work
- The first attempt added `Service.PublishEvent(...)`, but `sessionstream.Hub.publisher()` is unexported from another package, so `chatapp.Service` could not call it directly. Exact failure:
  - `pkg/chatapp/service.go:99:15: s.hub.publisher undefined (cannot refer to unexported method publisher)`
- I replaced that with public `hub.Submit(...)` via `Service.SubmitCommand(...)`.

### What I learned
- App-owned event publication should either be a public sessionstream API or should go through explicit commands. For this feature, command submission is safer and more consistent.

### What was tricky to build
- The frontend-tool manager originally rejected result commands without an in-memory pending request. That is correct for blocking backend requests, but the showcase publishes its tool request as a stream event. I adjusted the manager so it still publishes a durable result event when no pending waiter exists.

### What warrants a second pair of eyes
- Review the semantics of accepting frontend tool results without a pending waiter. This enables the showcase but broadens manager behavior.

### What should be done in the future
- Add a generalized backend request/wait API if production web-chat wants blocking browser-tool calls.

### Code review instructions
- Start with `pkg/chatapp/frontendtools/manager.go`, then `cmd/web-chat/app/showcase_tools.go`.
- Re-run `go test ./pkg/chatapp ./pkg/chatapp/frontendtools ./cmd/web-chat/app -count=1`.

### Technical details
- The endpoint returns `{ "accepted": true, "status": "..." }` after successful command submission.

## Step 3: Backend capabilities showcase stream

This step added the explicit showcase prompt branch. When the prompt contains phrases such as `capabilities demo`, web-chat bypasses the normal runtime resolver and uses the built-in demo stream to publish a custom widget and frontend tool call.

The backend now emits `demo.capability_card` through the Pinocchio widget event contract and emits `browser.confirm_action` through the frontend-tools event contract. Normal prompts still use the existing runtime/profile path.

### Prompt Context

**User prompt (verbatim):** (same as Step 1)

**Assistant interpretation:** Add the actual backend demo event sequence after creating the result endpoint.

**Inferred user intent:** Make web-chat visibly showcase the generic chatbot package capabilities without relying on a live model.

**Commit (code):** `8fe197a` — "feat: stream web-chat capabilities showcase"

### What I did
- Added explicit showcase prompt detection in `cmd/web-chat/app/showcase_tools.go` and `server.go`.
- Added `runCapabilitiesShowcase(...)` to `pkg/chatapp/demo.go`.
- Published chat lifecycle, assistant text, typed widget start/patch/complete, frontend tool request, and run finished events.
- Added `TestCapabilitiesShowcasePromptPublishesWidgetAndFrontendTool`.

### Why
- The showcase should be deterministic and should work without LLM credentials.
- Bypassing runtime resolution avoids sending demo prompts to a real model.

### What worked
- Focused validation passed:
  - `go test ./pkg/chatapp ./pkg/chatapp/frontendtools ./pkg/chatapp/widgets ./cmd/web-chat/app -count=1`
- The pre-commit hook also ran full Pinocchio lint/test successfully during commit.

### What didn't work
- The original design wanted the backend to wait for a human result before completing the widget. That required a broader pending approval queue. I kept this slice simpler: the backend completes the run after delivering the request, and the browser result updates the tool card asynchronously.

### What I learned
- The deterministic demo path is best implemented in the existing no-runtime demo stream, but web-chat must explicitly bypass runtime resolution so the showcase trigger works even when profiles are configured.

### What was tricky to build
- `pkg/chatapp` cannot import `pkg/chatapp/widgets` or `pkg/chatapp/frontendtools` without risking package cycles, so the showcase uses generated protobuf packages plus stable event names.

### What warrants a second pair of eyes
- Review whether string event names in `demo.go` should become shared exported constants in a lower-level package.

### What should be done in the future
- Add blocking frontend tool waits once the app has a production-ready approval queue.

### Code review instructions
- Start with `pkg/chatapp/demo.go` and `cmd/web-chat/app/server.go`.
- Confirm normal prompt behavior still goes through the runtime resolver.

### Technical details
- Widget name: `demo.capability_card`.
- Frontend tool name: `browser.confirm_action`.

## Step 4: Frontend projections, browser tool submission, and custom widget renderer

This step made the browser understand the new live events. Web-chat now projects frontend-tool and widget UI events into timeline entities, renders the human confirmation tool with buttons, posts the result back to the backend, and renders the custom capability card instead of raw JSON.

It also adds an automatic browser tool path for `browser.get_page_context`, even though the first showcase run focuses on `browser.confirm_action`.

### Prompt Context

**User prompt (verbatim):** (same as Step 1)

**Assistant interpretation:** Implement the visible web-chat UI behavior for the backend showcase events.

**Inferred user intent:** Demonstrate the complete browser-owned rendering/tool-result loop, not just backend event emission.

**Commit (code):** `c9640f3` — "feat: render web-chat showcase tools and widgets"

### What I did
- Added `web/src/ws/frontendTools.ts`.
- Updated `wsManager.ts` to run automatic frontend tool handling for live and buffered UI events.
- Updated `timelineEvents.ts` to project `ChatFrontendTool*` and `ChatWidgetInstance*` events.
- Extended `ToolCallCard` with approval/deny buttons for `browser.confirm_action`.
- Added `CapabilityCard` and delegated `demo.capability_card` rendering from `WidgetInstanceCard`.
- Registered `ChatFrontendToolCall` in `rendererRegistry.ts`.

### Why
- Without frontend projection, the backend showcase events would arrive but not render as meaningful UI.
- The result submission path proves that the browser owns interactive tool UI and reports structured results back to the backend.

### What worked
- `npm run typecheck` passed.
- `npm run build` passed.
- Pre-commit web-check passed after import organization.

### What didn't work
- The first commit attempt failed because Biome required organized imports:
  - `src/webchat/cards.tsx:1:1 assist/source/organizeImports FIXABLE The imports and exports are not sorted.`
  - `src/ws/wsManager.ts:1:1 assist/source/organizeImports FIXABLE The imports and exports are not sorted.`
- I ran `npx --yes @biomejs/biome@2.3.8 check --write src/webchat/cards.tsx src/ws/wsManager.ts` and re-ran typecheck/lint.

### What I learned
- Web-chat's existing timeline reducer can merge widget patch props if the projection sends `props` consistently, so no reducer change was needed.

### What was tricky to build
- The renderer registry maps by timeline entity kind, while custom widgets are identified by `widgetName`. I kept the timeline kind as `ChatWidgetInstance` and delegated to `CapabilityCard` inside `WidgetInstanceCard` when `widgetName === 'demo.capability_card'`.

### What warrants a second pair of eyes
- Review whether future custom widgets should use a registry keyed by `widgetName` rather than conditionals inside the generic widget card.

### What should be done in the future
- Add a dedicated widget renderer registry if multiple custom widgets are expected.

### Code review instructions
- Start with `web/src/ws/timelineEvents.ts`, then `web/src/webchat/cards.tsx`.
- Validate with `npm run typecheck && npm run build` in `cmd/web-chat/web`.

### Technical details
- The approval button posts to `/api/chat/sessions/{sessionId}/tools/results`.

## Step 5: Browser smoke validation

This step added and ran a repeatable Playwright smoke for the showcase. The script starts Pinocchio web-chat through devctl, submits `run the capabilities demo`, waits for the custom widget and frontend tool card, clicks `Approve demo`, and verifies that the approved result appears.

### Prompt Context

**User prompt (verbatim):** (same as Step 1)

**Assistant interpretation:** Finish the implementation with repeatable browser validation.

**Inferred user intent:** Leave the feature with a reviewer-friendly smoke script instead of only unit/type checks.

**Commit (code):** Pending docs/smoke commit at diary-writing time.

### What I did
- Added `scripts/01-webchat-capabilities-showcase-smoke.js` under the ticket workspace.
- Ran the script from the chat-overlay repo.

### Why
- The critical behavior is cross-process and browser-visible: devctl launch, Vite UI, WebSocket stream, React rendering, button click, HTTP result submission, and result rendering.

### What worked
- The smoke passed:
  - `node ttmp/2026/05/30/CHATOVERLAY-007--showcase-web-chat-frontend-tools-and-typed-widgets/scripts/01-webchat-capabilities-showcase-smoke.js`
  - Output: `OK: web-chat capabilities showcase smoke passed`

### What didn't work
- N/A.

### What I learned
- The existing devctl web-chat launcher is sufficient for validating this feature end-to-end.

### What was tricky to build
- The smoke needs to load Playwright from the chat-overlay frontend package while operating against the Pinocchio repo, matching the pattern used by earlier ticket scripts.

### What warrants a second pair of eyes
- Review whether the smoke should also assert the backend debug/timeline export once the UI assertion passes.

### What should be done in the future
- Consider adding this smoke to a devctl command if the showcase becomes part of regular CI.

### Code review instructions
- Run the script exactly as listed above.
- It should end with `OK: web-chat capabilities showcase smoke passed`.

### Technical details
- Default URL: `http://127.0.0.1:5174`, with devctl state detection for the actual Vite health URL.

## Step 6: Design pivot to a headless ChatProvider showcase

After completing the manual web-chat showcase, I updated the plan to make web-chat demonstrate the elegant `ChatProvider` API directly. The new target is an opt-in `?providerDemo=1` page where `ChatProvider` owns session creation, WebSocket transport, timeline projection, frontend tool execution, and widget dispatch, while web-chat owns only the page shell.

This does not remove the existing manual showcase. It adds a clearer provider-native demonstration so reviewers can see the intended developer API: request adapters in config, `useFrontendTool`, `useHumanTool`, `defineWidget`, `ToolCallOutlet`, and `WidgetOutlet`.

### Prompt Context

**User prompt (verbatim):** "alright, update the implementation guide to reflect these changes, add detailed tasks to the ticket, and commit at appropriate intervals and keep diaries. work on it"

**Assistant interpretation:** Revise the existing ticket plan so the feature showcases the elegant ChatProvider API directly, then implement that plan incrementally with commits and diary updates.

**Inferred user intent:** Move from a manually wired web-chat demo toward a provider-native web-chat demo that proves reusable API ergonomics.

**Commit (code):** Pending at this diary step.

### What I did
- Added a design-doc addendum describing web-chat as a headless ChatProvider showcase.
- Added new task phases for:
  - ChatProvider request adapters,
  - web-chat tool manifest endpoint,
  - provider-demo page,
  - provider-demo Playwright smoke and final closeout.

### Why
- The previous implementation proved the backend/frontend protocol but not the intended provider developer experience.
- A separate `?providerDemo=1` page avoids destabilizing the existing web-chat shell while making the API showcase explicit.

### What worked
- The ticket can continue without creating a new workspace; the new phases extend the existing capabilities showcase ticket.

### What didn't work
- N/A in this planning step.

### What I learned
- The provider already has much of the target API (`useFrontendTool`, `useHumanTool`, `defineWidget`, `ToolCallOutlet`, `WidgetOutlet`), but it needs request body adapters and web-chat needs a manifest endpoint before the provider can drive web-chat prompts cleanly.

### What was tricky to build
- The provider demo must not wrap the legacy web-chat Redux app, because `ChatProvider` includes its own React Redux provider. The design uses a separate query-param page to keep provider state isolated.

### What warrants a second pair of eyes
- Review whether `?providerDemo=1` should eventually become a route instead of a query parameter.
- Review whether widget definitions should remain global or become provider-scoped.

### What should be done in the future
- After the provider demo works, evaluate migrating the main web-chat page incrementally to the same provider runtime.

### Code review instructions
- Start with the addendum in the design doc and the new Phase 7–11 tasks.

### Technical details
- Target page selector: `/?providerDemo=1`.

## Step 7: ChatProvider request adapters and ES2022 compatibility

This step added the small provider API needed for web-chat to pass profile-aware request bodies while still using the generic ChatProvider client. `ChatProviderConfig` now accepts `createSessionBody` and `sendMessageBody` callbacks, with defaults preserving the existing ecommerce demo behavior.

While validating the provider inside Pinocchio web-chat, I also found that `chat-provider` used `Array.prototype.toReversed()`. The provider package itself targets a newer TypeScript environment, but Pinocchio web-chat compiles with `ES2022`, so I replaced that call with a reverse index loop.

### Prompt Context

**User prompt (verbatim):** (same as Step 6)

**Assistant interpretation:** Implement the provider-side API changes required by the updated headless web-chat showcase plan.

**Inferred user intent:** Let web-chat consume ChatProvider elegantly without losing app-specific request bodies.

**Commit (code):** `11263c0` — "feat: add chat provider request adapters"; `ed0cf02` — "fix: keep chat toolkit compatible with es2022"

### What I did
- Added `createSessionBody` and `sendMessageBody` to `ChatProviderConfig`.
- Used those callbacks in `createChatClient.ensureSession()` and `send()`.
- Replaced `cleanupFns.toReversed()` with an ES2022-safe reverse loop.

### Why
- Web-chat and CoinVault need request body adapters for profile/registry fields.
- The provider package must compile cleanly when consumed by web-chat's TypeScript target.

### What worked
- `pnpm --filter @go-go-golems/chat-provider typecheck` passed.
- `pnpm --filter @go-go-golems/chat-overlay-ecommerce-demo build` passed.
- Pinocchio web-chat typecheck later passed with the provider dependency.

### What didn't work
- Pinocchio web-chat initially failed to typecheck the provider source:
  - `../../../../2026-05-29--chatbot-overlay-glm/packages/chat-provider/src/core/toolkit.ts(31,38): error TS2550: Property 'toReversed' does not exist on type '(() => void)[]'. Do you need to change your target library? Try changing the 'lib' compiler option to 'es2023' or later.`

### What I learned
- Source-based local package dependencies inherit the consumer's TS target expectations, so reusable packages should avoid unnecessary newer JS helpers unless they are compiled first.

### What was tricky to build
- The adapter API needed to remain small. I kept it to body builders only, rather than introducing a broader fetch adapter before web-chat needed it.

### What warrants a second pair of eyes
- Review whether the body-builder callbacks should receive session/profile context in the future.

### What should be done in the future
- Add request adapter arguments for app state if/when CoinVault migrates to ChatProvider.

### Code review instructions
- Review `packages/chat-provider/src/core/createChatClient.ts` and `packages/chat-provider/src/core/toolkit.ts`.
- Validate with the two pnpm commands listed above.

### Technical details
- Defaults remain `{}` for session creation and `{ prompt }` for message submission.

## Step 8: Web-chat manifest endpoint for ChatProvider tool sync

This step added the backend endpoint ChatProvider expects before sending a message: `/api/chat/sessions/{id}/tools/manifest`. The handler converts the provider manifest into Pinocchio `FrontendToolDescriptor` protobufs and submits `ChatFrontendToolManifest` through the frontend tool manager.

This is the bridge that lets `defineToolkit`/`defineTool` registrations in the browser become durable backend-visible frontend tool manifests.

### Prompt Context

**User prompt (verbatim):** (same as Step 6)

**Assistant interpretation:** Add the server endpoint needed by ChatProvider tool manifest synchronization.

**Inferred user intent:** Make the provider-native web-chat page use the same tool sync path as other ChatProvider consumers.

**Commit (code):** `4d84971` — "feat: accept web-chat frontend tool manifests"

### What I did
- Added `tools/manifest` handling to `cmd/web-chat/app/server.go`.
- Added manifest DTOs and mode conversion in `showcase_tools.go`.
- Submitted `frontendtools.CommandManifest` through `chatapp.Service.SubmitCommand(...)`.
- Added `TestFrontendToolManifestEndpointPublishesTimelineEntity`.

### Why
- `ChatProvider` calls `client.tools.syncManifest()` before sending.
- Without this endpoint, the provider-native page would fail before it could submit the demo prompt.

### What worked
- Focused validation passed:
  - `go test ./cmd/web-chat/app ./pkg/chatapp/frontendtools -count=1`
- The Pinocchio pre-commit hook ran full lint/test successfully.

### What didn't work
- N/A.

### What I learned
- Provider manifest `mode` values are string-based (`frontend`, `human`, `backend`), while Pinocchio protobufs use enum values, so the web-chat edge needs explicit normalization.

### What was tricky to build
- Route parsing had already been extended for `tools/results`; the manifest endpoint reused the nested session route shape.

### What warrants a second pair of eyes
- Review the mode mapping names before standardizing public API docs.

### What should be done in the future
- Add schema validation for manifest entries if this endpoint becomes production-facing.

### Code review instructions
- Review `cmd/web-chat/app/showcase_tools.go` and `cmd/web-chat/app/server_test.go`.

### Technical details
- `human` maps to `TOOL_EXECUTION_MODE_FRONTEND_HUMAN`.

## Step 9: Provider-native web-chat demo page

This step added an opt-in `?providerDemo=1` page that uses `ChatProvider` as the runtime and web-chat as only the page shell. It registers a toolkit with `browser.get_page_context`, `browser.confirm_action`, and `demo.capability_card`, then renders provider timeline entities with `ToolCallOutlet` and `WidgetOutlet`.

This is the first page in Pinocchio web-chat that demonstrates the intended provider API directly instead of manually reproducing provider behavior.

### Prompt Context

**User prompt (verbatim):** (same as Step 6)

**Assistant interpretation:** Build the new provider-native demo page and validate it through typecheck/lint/build and browser smoke.

**Inferred user intent:** Showcase how an app can use ChatProvider headlessly while keeping its own UI shell.

**Commit (code):** `3b080c0` — "feat: add web-chat chat provider demo page"

### What I did
- Added `cmd/web-chat/web/src/webchat/ProviderDemoPage.tsx`.
- Updated `App.tsx` to render it when `providerDemo=1` is present.
- Used `ChatProvider` with request adapters.
- Registered tools/widgets with `defineToolkit`, `defineTool`, and `defineWidget`.
- Rendered provider timeline entities with message cards, `ToolCallOutlet`, and `WidgetOutlet`.
- Added a visible `browser.confirm_action` label to the human tool card for smoke-test discoverability.

### Why
- The main web-chat page still has its own Redux store and projection pipeline. A separate route avoids nested Redux-provider conflicts and lets the provider demo stay focused.

### What worked
- `npm run typecheck` passed.
- `npm run lint` passed after import organization.
- `npm run build` passed.
- The provider demo browser smoke passed after adding the visible tool-name label.

### What didn't work
- The first provider-demo smoke failed because the human tool renderer showed the approval text but not the literal `browser.confirm_action` tool name. Exact failure:
  - `locator.waitFor: Timeout 20000ms exceeded. Call log: - waiting for getByText('browser.confirm_action') to be visible`
- I added a visible pill with `browser.confirm_action` to the human tool renderer and reran the smoke successfully.

### What I learned
- `ToolCallOutlet` correctly handles the provider pending-human-tool state, but custom human renderers should include enough tool identity for debugging and tests.

### What was tricky to build
- The provider demo cannot sit under the legacy web-chat Redux `<Provider>` because `ChatProvider` also provides a Redux store. The query-param page keeps those stores isolated.

### What warrants a second pair of eyes
- Review whether the provider demo should be promoted from query param to a documented route.
- Review whether `defineWidget` should be provider-scoped instead of global for long-lived apps.

### What should be done in the future
- Consider migrating the normal web-chat page's transport/timeline to ChatProvider after the demo stabilizes.

### Code review instructions
- Start with `ProviderDemoPage.tsx`.
- Open `/?providerDemo=1`, send `run the capabilities demo`, and approve the browser tool.

### Technical details
- Browser smoke script: `scripts/02-webchat-chatprovider-demo-smoke.js`.
