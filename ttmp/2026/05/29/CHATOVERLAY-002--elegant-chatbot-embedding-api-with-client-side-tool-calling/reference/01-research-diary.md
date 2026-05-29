---
Title: Research diary
Ticket: CHATOVERLAY-002
Status: active
Topics:
    - chat-overlay
    - react
    - sessionstream
    - pinocchio
    - geppetto
    - widgets
    - protobuf
    - ecommerce
DocType: reference
Intent: long-term
Owners: []
RelatedFiles:
    - Path: internal/frontendtools/manager.go
      Note: Manifest/result command handling and pending frontend tool waits
    - Path: internal/frontendtools/plugin.go
      Note: Sessionstream UI and timeline projections for frontend tools
    - Path: internal/mockengine/engine.go
      Note: Mock engine requests cart.add and resumes after browser result
    - Path: proto/chatoverlay/tools/v1/frontend_tool.proto
      Note: Frontend tool protocol implemented in smoke slice
    - Path: ttmp/2026/05/29/CHATOVERLAY-002--elegant-chatbot-embedding-api-with-client-side-tool-calling/scripts/01-fetch-research-sources.sh
      Note: Defuddle source download script for prior-art docs
    - Path: ttmp/2026/05/29/CHATOVERLAY-002--elegant-chatbot-embedding-api-with-client-side-tool-calling/scripts/04-human-tool-browser-smoke.js
      Note: Browser smoke test for human-in-the-loop tools
    - Path: ttmp/2026/05/29/CHATOVERLAY-002--elegant-chatbot-embedding-api-with-client-side-tool-calling/sources/01-copilotkit-use-frontend-tool.md
      Note: Downloaded CopilotKit frontend tool reference
    - Path: ttmp/2026/05/29/CHATOVERLAY-002--elegant-chatbot-embedding-api-with-client-side-tool-calling/sources/05-ai-sdk-chatbot-tool-usage.md
      Note: Downloaded Vercel AI SDK client-side tool round-trip reference
    - Path: ttmp/2026/05/29/CHATOVERLAY-002--elegant-chatbot-embedding-api-with-client-side-tool-calling/sources/08-assistant-ui-tools.md
      Note: Downloaded assistant-ui toolkit/tool typing reference
    - Path: web/src/App.tsx
      Note: |-
        Smoke demo cart.add tool registration and visible cart state
        Demo tools now use Zod schemas
    - Path: web/src/core/createChatOverlay.ts
      Note: Overlay API now exposes tools namespace and manifest/result calls
    - Path: web/src/core/toolkit.ts
      Note: Toolkit definition and install/cleanup helper
    - Path: web/src/core/useToolkit.ts
      Note: React-scoped toolkit install hook
    - Path: web/src/stories/ToolCallOutlet.stories.tsx
      Note: Storybook examples for frontend/backend/failed tool cards
    - Path: web/src/tools/ToolCallOutlet.tsx
      Note: |-
        Timeline renderer now hosts human approval UI
        Validated human tool responses
    - Path: web/src/tools/toolRegistry.ts
      Note: Zod schema validation and JSON Schema manifest export
    - Path: web/src/tools/toolRuntime.ts
      Note: |-
        Browser-side frontend tool execution and result submission
        Validated automatic frontend tool execution
    - Path: web/src/tools/useHumanTool.ts
      Note: Scoped registration hook for human approval tools
    - Path: web/src/tools/useToolUI.ts
      Note: Scoped registration hook for backend tool visualization
ExternalSources: []
Summary: Chronological research diary for CHATOVERLAY-002.
LastUpdated: 2026-05-29T14:40:31.095706533-04:00
WhatFor: Record research commands, source downloads, design decisions, and validation steps for client-side tool calling design.
WhenToUse: Read before implementing the client-side tool calling API or updating the CHATOVERLAY-002 design.
---







# Research Diary

## Goal

Record the research and design work for an elegant chatbot embedding API with typed widgets and client-side tool calling.

## Step 1: Create ticket and collect prior art

This step created the design workspace and downloaded source material for CopilotKit, Vercel AI SDK, assistant-ui, and AG-UI. The goal was to avoid designing from memory. Client-side tool calling already has strong patterns in the React ecosystem, and the design should keep the best developer-experience ideas while preserving the Go/sessionstream architecture.

### Prompt Context

**User prompt (verbatim):** "alright, this works. Analyze the API we provide now for adding chatbots to existing pages, and the original designs / the obsidian vault articles, and copilot kit / ai sdk by vercel and assistant-ui / generative ui ideas (use kagi_search, defuddle, and look at my last chatgpt session with `surf chatgpt --help`, do properly take this to the next step.

Create a new ticket for that, and Create  a detailed analysis / design / implementation guide that is for a new intern, explaining all the parts of the system needed to understand what it is, with prose paragraphs and bullet point sand pseudocode and diagrams and api references and file references. It should be very clear and technical. Store in the ticket and the nupload to remarkable.


Use defuddle to download interesting resources so that we can refer to them and use the best of all these APIs.

I'm particularly interested in adding client-side tool calling, where a tool call is passed through from geppetto/pinocchio backend all the way to the frontend, something that might even need some sessionstream/ or geppetto/pinocchio updates as well. Think hard, dig deep, do the best you can, we want to be elegant, opinionated, "powerful""

**Assistant interpretation:** Create a new research/design ticket that studies the current overlay API, prior proposal/design material, and external client-side tool/generative UI APIs, then produce an intern-ready design guide for client-side tool calling across React, sessionstream, Pinocchio, and Geppetto.

**Inferred user intent:** Move from a working prototype to a principled API design that can support production embedding and browser-executed tools.

**Commit (code):** N/A — research/documentation step.

### What I did
- Created ticket `CHATOVERLAY-002`.
- Created design doc `design-doc/01-elegant-chatbot-embedding-api-and-client-side-tool-calling-design.md`.
- Created this research diary.
- Used Kagi search for CopilotKit, Vercel AI SDK, assistant-ui, and generative UI references.
- Wrote and ran `scripts/01-fetch-research-sources.sh` to save Defuddle Markdown extracts under `sources/`.
- Ran `surf chatgpt --help` and `surf chatgpt transcript --help`.
- Attempted `surf chatgpt transcript --export-file sources/10-last-chatgpt-session.md`; the active browser page was the local overlay, not ChatGPT, so the export is not useful as a ChatGPT design source.

### Why
Client-side tool calling touches API design, transport design, backend run control, frontend registration lifecycle, and human approval UI. It needs a dedicated design ticket instead of being appended to the implementation ticket.

### What worked
- Defuddle successfully saved clean Markdown sources for the major external APIs.
- The current overlay implementation provided concrete file references and a working baseline.
- The research clarified a strong API direction: `useFrontendTool`, `useHumanTool`, `defineToolUI`, and `defineToolkit` layered on top of sessionstream.

### What didn't work
- The ChatGPT transcript export did not capture a ChatGPT session because the active page was `http://localhost:5173/`.

### What I learned
- CopilotKit has the strongest component-scoped frontend tool registration API.
- Vercel AI SDK has the clearest client result round-trip model: tool call forwarded to client, client calls `addToolOutput`, model continues.
- assistant-ui has the cleanest split between frontend, human, and backend tools plus custom tool UI.
- AG-UI reinforces that tool calls, state, and UI should travel through one protocol; for this project, that protocol should be sessionstream.

### What was tricky to build
- The main design tension is where to put the browser-tool pause/resume mechanism. Geppetto owns the tool loop, Pinocchio owns session/message/run context, and sessionstream owns command/event ordering. The design recommends implementing the first bridge at the Pinocchio integration layer rather than changing Geppetto first.

### What warrants a second pair of eyes
- Review whether blocking a Geppetto tool executor while waiting for frontend result is acceptable for the first implementation, or whether a larger pause/resume API is needed immediately.
- Review whether frontend tool manifests should be in-memory only or persisted in session metadata.

### What should be done in the future
- Add schema files for frontend tool manifests and results.
- Prototype `useFrontendTool` with a synthetic backend event before changing Geppetto.
- Add backend integration tests for pending frontend tool calls.

### Code review instructions
- Read the design doc first.
- Then inspect `sources/01-copilotkit-use-frontend-tool.md`, `sources/05-ai-sdk-chatbot-tool-usage.md`, and `sources/08-assistant-ui-tools.md`.
- Compare proposed API sketches with current files: `web/src/core/createChatOverlay.ts`, `web/src/widgets/widgetRegistry.ts`, and `web/src/ws/timelineEvents.ts`.

### Technical details
- Script: `scripts/01-fetch-research-sources.sh`
- Sources directory: `sources/`
- Main design doc: `design-doc/01-elegant-chatbot-embedding-api-and-client-side-tool-calling-design.md`

## Step 2: Expand implementation phases for the browser smoke test

This step converted the broad design into an implementation checklist aimed at a visible local smoke test. The key decision was to implement a minimal real frontend-tool round trip through sessionstream and the mock engine first, before attempting the larger Geppetto/Pinocchio production integration.

The lunch-smoke milestone is intentionally concrete: prompt the demo with `add boots to cart`, have the backend request browser tool `cart.add`, let the frontend execute it, show the tool card in the timeline, submit a result, and let the backend publish a final assistant confirmation.

### Prompt Context

**User prompt (verbatim):** "alright, add detailed phases and for each phase deatiled task list for implementing these features, and then work on them step by step, committing at appropriate intervals, and keeping a detailed diary. I'm going out for lunch and i want to be able to see a proper running smoke test  in the browser when i come back."

**Assistant interpretation:** Break the client-side tool-calling design into detailed implementation phases, then start implementing toward a working browser smoke test with commits and diary updates.

**Inferred user intent:** Return from lunch to a live local app demonstrating browser-executed tool calling rather than only a design document.

**Commit (code):** pending — planning/docs step before implementation.

### What I did
- Rewrote `tasks.md` with phased implementation tasks and acceptance criteria.
- Scoped the first implementation to a mock-engine-backed frontend tool request/result flow.
- Chose `cart.add` and prompt `add boots to cart` as the browser smoke scenario.

### Why
- The full production design requires Geppetto/Pinocchio changes, but a browser smoke test needs a deterministic no-API-key path today.
- The mock engine can exercise the future protocol shape while keeping the implementation small and testable.

### What worked
- The phase breakdown now separates protocol/backend foundation, mock-engine round trip, frontend registry/runtime, demo smoke scripts, and production follow-ups.

### What didn't work
- N/A in this planning step.

### What I learned
- The lowest-risk first slice is not the React hook alone; it is the backend/frontend round trip with durable sessionstream events.

### What was tricky to build
- The planning had to avoid overcommitting to the full Geppetto pause/resume architecture before the smoke test. The chosen compromise is a real sessionstream protocol exercised by the mock engine, with a later task to move the bridge into Pinocchio/Geppetto.

### What warrants a second pair of eyes
- Confirm that using HTTP command endpoints for frontend tool manifests/results is acceptable for v1 while WebSocket client frames remain subscribe-only.

### What should be done in the future
- Replace the mock-engine-specific bridge with a Pinocchio/Geppetto frontend tool executor.

### Code review instructions
- Start with `tasks.md` to understand the implementation sequence.
- Validate that the first slice remains smoke-test focused and does not prematurely introduce the full production tool-loop abstraction.

### Technical details
- Ticket task file: `ttmp/2026/05/29/CHATOVERLAY-002--elegant-chatbot-embedding-api-with-client-side-tool-calling/tasks.md`

## Step 3: Implement sessionstream-native frontend tool smoke path

This step built the first working end-to-end slice of browser-side tool calling. The implementation does not yet change Geppetto's production tool loop; instead, it adds the same protocol shape to chat-overlay and has the deterministic mock engine request `cart.add`, wait for the browser result, and then continue the assistant response.

The visible browser smoke now demonstrates the important invariant: tool calls are not a Redux-only side channel. The backend publishes a typed sessionstream UI event, the frontend renders a durable timeline card, the browser executes a registered tool, the result goes back through a backend command endpoint, and the mock run resumes.

### Prompt Context

**User prompt (verbatim):** (same as Step 2)

**Assistant interpretation:** Implement the planned frontend-tool slices, validate them in Go tests, TypeScript build, automated Playwright smoke, and a live browser session.

**Inferred user intent:** Have a real local browser demo running after lunch, not only implementation notes.

**Commit (code):** `80af9646e36a7dcd8c1e5b6216a19ae2242899b6` — "feat: add frontend tool sessionstream backend"

**Commit (code):** `8803c2d694b2d3730aaf1f1aeb3d76a6f9749649` — "feat: add frontend tool registry smoke runtime"

### What I did
- Added `proto/chatoverlay/tools/v1/frontend_tool.proto` and generated Go bindings.
- Added `internal/frontendtools.Manager` and `internal/frontendtools.Plugin`.
- Registered frontend tool manifest/result commands and frontend tool call/result events with sessionstream.
- Wired the frontend tool plugin into `internal/webchat/server.go`.
- Added HTTP endpoints:
  - `POST /api/chat/sessions/{id}/tools/manifest`
  - `POST /api/chat/sessions/{id}/tools/results`
- Extended the mock engine to request `cart.add` for prompts like `add boots to cart`, wait for the browser result, and publish a final assistant confirmation.
- Added backend test `TestFrontendToolRoundTripResumesMockRun`.
- Added frontend registry/runtime files:
  - `web/src/tools/toolRegistry.ts`
  - `web/src/tools/useFrontendTool.ts`
  - `web/src/tools/toolRuntime.ts`
  - `web/src/tools/ToolCallOutlet.tsx`
- Extended `createChatOverlay()` with `tools.register`, `tools.syncManifest`, and `tools.submitResult`.
- Extended timeline event/snapshot normalization for `ChatFrontendToolCallRequested` and `ChatFrontendToolResultReceived`.
- Added a demo `cart.add` browser tool and visible demo cart to `web/src/App.tsx`.
- Added scripts:
  - `scripts/02-restart-dev-servers.sh`
  - `scripts/03-client-tool-browser-smoke.js`
- Started backend/frontend in tmux session `chat-overlay`.
- Ran an automated Playwright smoke test and manually left the browser showing the successful smoke scenario.

### Why
- A mock-engine-backed tool round trip provides a deterministic smoke test without API keys.
- Using sessionstream commands/events now preserves the architecture needed for the later Geppetto/Pinocchio bridge.
- The frontend API begins to look like the researched designs: component-scoped registration plus explicit result submission.

### What worked
- `go test ./...` passed.
- `cd web && npm run build` passed.
- `node ../ttmp/2026/05/29/CHATOVERLAY-002--elegant-chatbot-embedding-api-with-client-side-tool-calling/scripts/03-client-tool-browser-smoke.js` passed with:
  - `OK: client-side tool browser smoke passed`
- The live browser at `http://127.0.0.1:5173` shows:
  - demo cart count updated to `1 item`,
  - chat prompt `add boots to cart`,
  - ProductCarousel widget,
  - `browser tool` card for `cart.add` with `success`,
  - final assistant text: `The browser ran cart.add and the demo cart now contains 1 item(s).`

### What didn't work
- First smoke-script run failed because the script lives under `ttmp/.../scripts`, outside `web/`, so Node's ESM package resolution could not find `playwright`:
  - Command: `cd web && node ../ttmp/2026/05/29/CHATOVERLAY-002--elegant-chatbot-embedding-api-with-client-side-tool-calling/scripts/03-client-tool-browser-smoke.js`
  - Error: `Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'playwright' imported from .../scripts/03-client-tool-browser-smoke.js`
- Fixed by using `createRequire('/home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/web/package.json')` inside the smoke script so it resolves Playwright from the web package.

### What I learned
- The sessionstream plugin pattern used for widgets maps cleanly to frontend tool calls.
- The first browser smoke does not need WebSocket client command frames; HTTP commands can submit manifests/results while WebSocket remains the live event stream.
- The visible timeline card is important because it proves the tool call is part of the conversation state, not hidden application plumbing.

### What was tricky to build
- The backend result command needs to both publish `ChatFrontendToolResultReceived` and unblock the waiting mock run. Publishing before unblocking preserves visible event order so the tool result appears before the final assistant continuation.
- The frontend runtime must be configured by the overlay because it needs the active session id and API base to submit results. The current implementation uses a singleton runtime, which is acceptable for this smoke but should be revisited for multiple overlays.
- The smoke prompt also matches the existing `boots` response, so the demo shows both the ProductCarousel widget and the `cart.add` tool card. This is useful visually, but production flows may want separate intent routing.

### What warrants a second pair of eyes
- Review `internal/frontendtools.Manager.Request` and `HandleResult` for concurrency and cancellation edge cases.
- Review whether failed/missing frontend tools should produce a model-visible tool error result or fail the run.
- Review the singleton frontend tool registry/runtime before supporting multiple independent overlay instances.

### What should be done in the future
- Move the bridge from mock engine into Pinocchio/Geppetto's real tool execution path.
- Add first-class `useHumanTool()` with pending approval UI.
- Add schema validation for frontend tool input/output.
- Add reconnect tests for pending frontend tool calls.

### Code review instructions
- Backend review order:
  1. `proto/chatoverlay/tools/v1/frontend_tool.proto`
  2. `internal/frontendtools/manager.go`
  3. `internal/frontendtools/plugin.go`
  4. `internal/mockengine/engine.go`
  5. `internal/webchat/handlers.go`
  6. `internal/webchat/server_test.go`
- Frontend review order:
  1. `web/src/tools/toolRegistry.ts`
  2. `web/src/tools/toolRuntime.ts`
  3. `web/src/core/createChatOverlay.ts`
  4. `web/src/ws/timelineEvents.ts`
  5. `web/src/tools/ToolCallOutlet.tsx`
  6. `web/src/App.tsx`
- Validation commands:
  - `go test ./...`
  - `cd web && npm run build`
  - `./ttmp/2026/05/29/CHATOVERLAY-002--elegant-chatbot-embedding-api-with-client-side-tool-calling/scripts/02-restart-dev-servers.sh`
  - `cd web && node ../ttmp/2026/05/29/CHATOVERLAY-002--elegant-chatbot-embedding-api-with-client-side-tool-calling/scripts/03-client-tool-browser-smoke.js`

### Technical details
- Running backend: tmux session `chat-overlay`, pane `0.0`, `go run ./cmd/chat-overlay serve --serve-port 8080`.
- Running frontend: tmux session `chat-overlay`, pane `0.1`, `npx vite --host 127.0.0.1 --port 5173`.
- Browser URL: `http://127.0.0.1:5173`.
- Smoke prompt: `add boots to cart`.

## Step 4: Add human-in-the-loop frontend tools

This step extended the automatic frontend tool runtime with a human approval mode. Automatic frontend tools execute a browser handler as soon as the backend requests them. Human tools are different: the backend publishes the same typed tool request, but the browser renders a decision UI and only submits a result after the user clicks an approval or denial action.

The checkout smoke path now exercises that mode. A prompt of `approve checkout` causes the mock engine to request `checkout.confirm` with mode `FRONTEND_HUMAN`. The frontend shows an approval card in the timeline, the user clicks `APPROVE`, and the backend resumes with an assistant confirmation.

### Prompt Context

**User prompt (verbatim):** "Alright, do it, continue. good job"

**Assistant interpretation:** Continue implementing the follow-up production slice after the automatic frontend-tool smoke, starting with human-in-the-loop tools.

**Inferred user intent:** Move the framework toward the researched CopilotKit/assistant-ui style approval workflow, not just automatic browser handlers.

**Commit (code):** `e7c1dba00e568b97c7f7fb7f7b74c52e01067ee8` — "feat: add human-in-the-loop frontend tools"

### What I did
- Added `HumanTool`, `HumanToolRenderProps`, and human/backend tool variants to `web/src/tools/toolRegistry.ts`.
- Added `useHumanTool()` for scoped React registration.
- Extended `toolRuntime.ts` so `mode === 'human'` stays pending instead of auto-executing.
- Extended `ToolCallOutlet.tsx` to render a registered human tool UI and provide `respond()` / `reject()` callbacks.
- Added a demo `checkout.confirm` human tool to `web/src/App.tsx`.
- Extended the mock engine with an `approve checkout` prompt path that waits for `checkout.confirm` and resumes after approval.
- Added `TestHumanToolRoundTripResumesMockRun`.
- Added `scripts/04-human-tool-browser-smoke.js`.

### Why
- Approval tools are required for mutating or sensitive browser actions. A framework that can only auto-execute tools pushes too much policy into individual handlers.
- The human tool path proves that frontend tool calls can pause a run for user interaction, not just for asynchronous browser code.

### What worked
- `go test ./...` passed.
- `cd web && npm run build` passed.
- `scripts/03-client-tool-browser-smoke.js` passed.
- `scripts/04-human-tool-browser-smoke.js` passed with `OK: human-in-the-loop browser smoke passed`.

### What didn't work
- The first TypeScript build after widening tool definitions failed because the generic `FrontendTool<TInput, TResult>` and `HumanTool<TInput, TResult>` types were too narrow for storage in a common registry. The fix was to define the stored union as `ToolDefinition = FrontendTool<any, any> | HumanTool<any, any> | BackendToolUI<any, any>` while preserving typed hooks at the API boundary.

### What I learned
- Human tools need a separate pending state in the frontend runtime. Treating them like failed auto-execution would make the backend resume too early.
- The timeline outlet is the right place to render approval UI because the pending decision is part of the conversation state.

### What was tricky to build
- The registered render function needs a typed input/result shape for application ergonomics, but the registry must store heterogeneous tools by name. The registry therefore uses a broad stored union while the hook preserves generic authoring types.
- The result callback has to remove the pending human marker before submitting the result, otherwise refresh/re-render paths can keep showing active approval controls after the result arrives.

### What warrants a second pair of eyes
- Review the singleton pending-human set in `toolRuntime.ts`; this should become overlay-instance scoped before supporting multiple overlays on one page.
- Review whether `reject()` should submit `status: denied` with `{ approved: false }` by convention or a richer denial envelope.

### What should be done in the future
- Persist pending human tool calls across refreshes with snapshot hydration plus registry reattachment.
- Add Storybook stories for pending, approved, denied, failed, and cancelled human tools.
- Add real UI polish for approval cards.

### Code review instructions
- Start with `web/src/tools/toolRegistry.ts`, then read `web/src/tools/toolRuntime.ts` and `web/src/tools/ToolCallOutlet.tsx`.
- Validate with:
  - `go test ./...`
  - `cd web && npm run build`
  - `cd web && node ../ttmp/2026/05/29/CHATOVERLAY-002--elegant-chatbot-embedding-api-with-client-side-tool-calling/scripts/04-human-tool-browser-smoke.js`

### Technical details
- Human tool name: `checkout.confirm`.
- Smoke prompt: `approve checkout`.
- Backend final text: `Checkout approval returned approved=true; approval count is now 1.`

## Step 5: Add Zod validation to frontend tool definitions

This step hardened the TypeScript tool API by making tool schemas executable in the browser. The earlier manifest used JSON-schema-shaped objects, which was enough to describe tools to the backend but not enough to validate model-provided input before executing browser code. The new API accepts Zod schemas through `parameters` and optional `resultSchema`, exports JSON Schema for the backend manifest, and validates both automatic and human tool paths before submitting results.

The important architectural point is that the browser should validate the same contract it advertises. If the backend or model requests `cart.add` with malformed input, the browser runtime should reject the call and submit a failed tool result instead of letting arbitrary handler code coerce unknown shapes.

### Prompt Context

**User prompt (verbatim):** "alright continue, keep a detailed diary as you go."

**Assistant interpretation:** Continue implementing follow-up production tasks and keep chronological diary entries for each slice.

**Inferred user intent:** Keep improving the frontend tool-calling framework beyond the smoke demo while preserving reviewable documentation.

**Commit (code):** `f00368cd387564017a700e37bf5c1fa60bb09546` — "feat: validate frontend tool schemas with zod"

### What I did
- Added `zod` to `web/package.json` and `web/package-lock.json`.
- Extended `web/src/tools/toolRegistry.ts` with:
  - `parameters?: ZodType<TInput>` for input validation,
  - `resultSchema?: ZodType<TResult>` for output validation,
  - `parseToolInput()` and `parseToolResult()`,
  - `formatToolValidationError()`,
  - JSON Schema manifest export via `z.toJSONSchema()`.
- Updated `web/src/tools/toolRuntime.ts` to validate tool input before auto-execution or human pending state.
- Updated automatic tool result submission to validate output before sending `ChatFrontendToolResult`.
- Updated `web/src/tools/ToolCallOutlet.tsx` to validate human tool inputs/results around the `respond()` path.
- Updated `web/src/App.tsx` demo tools to use Zod schemas for `cart.add` and `checkout.confirm`.

### Why
- Tool calls originate from model/tool-loop decisions and should be treated as untrusted input at the browser boundary.
- The manifest should not drift from browser validation. Defining a Zod schema once and exporting JSON Schema from it reduces that drift.
- Human tools need validation too because approval UIs should render typed inputs and submit typed results.

### What worked
- `cd web && npm run build` passed.
- `go test ./...` passed.
- Automatic browser smoke passed with `OK: client-side tool browser smoke passed`.
- Human approval browser smoke passed with `OK: human-in-the-loop browser smoke passed`.

### What didn't work
- N/A. The Zod v4 `z.toJSONSchema()` path worked with the installed `zod@4.4.3`.

### What I learned
- The public API can keep TypeScript generics at the hook boundary while the registry stores heterogeneous tools as a broad union.
- Validation belongs in the runtime before dispatching to `execute()` and before submitting `respond()` results, not only in demo tool handlers.

### What was tricky to build
- The registry has to support three heterogeneous definitions: automatic frontend tools, human tools, and backend tool UIs. The implementation keeps stored definitions broad but preserves typed authoring through `FrontendTool<TInput, TResult>` and `HumanTool<TInput, TResult>`.
- Human tool validation has two phases: initial input validation in `toolRuntime.ts` and result validation in `ToolCallOutlet.tsx` when the user responds.

### What warrants a second pair of eyes
- Review the exact JSON Schema generated by `z.toJSONSchema()` and confirm it is acceptable for future backend/model tool descriptors.
- Review whether failed validation should always submit a failed tool result or sometimes publish a local-only error.

### What should be done in the future
- Add tests for invalid tool input and invalid tool output.
- Add schema examples to Storybook and the design docs.
- Consider a small schema adapter interface if we want to support non-Zod validators later.

### Code review instructions
- Start with `web/src/tools/toolRegistry.ts` to review the schema API.
- Then read `web/src/tools/toolRuntime.ts` to see where validation gates execution.
- Then read `web/src/tools/ToolCallOutlet.tsx` for human tool result validation.
- Validate with:
  - `go test ./...`
  - `cd web && npm run build`
  - `cd web && node ../ttmp/2026/05/29/CHATOVERLAY-002--elegant-chatbot-embedding-api-with-client-side-tool-calling/scripts/03-client-tool-browser-smoke.js`
  - `cd web && node ../ttmp/2026/05/29/CHATOVERLAY-002--elegant-chatbot-embedding-api-with-client-side-tool-calling/scripts/04-human-tool-browser-smoke.js`

### Technical details
- Zod package: `zod@4.4.3`.
- Demo automatic input schema: `CartAddInputSchema`.
- Demo automatic result schema: `CartAddResultSchema`.
- Demo human input schema: `CheckoutConfirmInputSchema`.
- Demo human result schema: `CheckoutConfirmResultSchema`.

## Step 6: Add backend tool UI registration

This step added the missing visualization half of the tool API. Frontend tools execute in the browser. Human tools render approval UI and then submit a result. Backend tools are different: execution happens in Go or inside the future Geppetto tool loop, but the browser may still need a custom renderer for the call and result. The new `defineToolUI()` and `useToolUI()` APIs cover that case.

The implementation is intentionally small. A backend tool UI is registered in the same registry as other tool definitions, advertises `mode: "backend"`, and may provide a `render({ input, result, status })` function. `ToolCallOutlet` now detects backend tool UI definitions and renders them above the raw JSON fallback.

### Prompt Context

**User prompt (verbatim):** (same as Step 5)

**Assistant interpretation:** Continue production hardening after schema validation by filling in the backend tool visualization API from the design.

**Inferred user intent:** Keep converting the design doc into usable frontend framework primitives.

**Commit (code):** `f57e6ed3119387043d5d01647b017a42b478b3a8` — "feat: add backend tool UI registration"

### What I did
- Added `defineToolUI()` to `web/src/tools/toolRegistry.ts`.
- Added `useToolUI()` for scoped React registration of backend tool renderers.
- Exported `defineToolUI` and `useToolUI` from `web/src/core/index.ts`.
- Extended `ToolCallOutlet` to render registered backend tool UIs.
- Added Storybook examples in `web/src/stories/ToolCallOutlet.stories.tsx` for automatic frontend tools, backend tool UI, and failed tools.

### Why
- Some tools should execute on the backend but still have a rich, domain-specific frontend representation.
- Tool execution and tool visualization are separate concerns. `defineToolUI()` makes that distinction explicit.
- This mirrors the assistant-ui pattern researched earlier: frontend tools, human tools, and backend tool UIs are related but not identical.

### What worked
- `cd web && npm run build` passed.
- `go test ./...` passed.

### What didn't work
- The first Storybook story build failed because the generic backend UI render props inferred `input` as `unknown` and `result` as `{}`. I fixed the story by narrowing with runtime object/property checks before reading `query` and `products`.

### What I learned
- The common tool registry is a reasonable home for visualization definitions, but stories need careful typing because backend tool results can be absent or unknown.

### What was tricky to build
- `ToolCallOutlet` must keep the raw JSON fallback even when custom UI exists. The custom UI teaches the domain meaning; the JSON fallback remains useful for debugging and for verifying exact payloads.

### What warrants a second pair of eyes
- Review whether backend tool UIs should be registered through the same manifest sent to the backend, or whether visualization-only definitions should remain frontend-local.
- Review the naming: `defineToolUI()` may be clearer than overloading `defineTool({ mode: "backend" })`, but both currently use the same registry.

### What should be done in the future
- Add real backend tool-call events from Pinocchio/Geppetto and render them through `defineToolUI()`.
- Add stories for backend tool streaming/partial result states.

### Code review instructions
- Start with `web/src/tools/toolRegistry.ts` for `defineToolUI()`.
- Read `web/src/tools/useToolUI.ts` for scoped registration.
- Read `web/src/tools/ToolCallOutlet.tsx` for rendering behavior.
- Run `cd web && npm run build`.

### Technical details
- Story file: `web/src/stories/ToolCallOutlet.stories.tsx`.
- Example backend tool UI name: `catalog.search`.

## Step 7: Add toolkit bundling

This step added the first toolkit abstraction. Individual hooks are appropriate for component-scoped tools, but larger applications need a way to bundle related tools, widget definitions, and setup code under one named unit. The new `defineToolkit()`, `installToolkit()`, and `useToolkit()` functions provide that shape.

The implementation is intentionally lightweight. A toolkit can contain tool definitions and an optional custom `install(overlay)` function. Installing a toolkit registers all tools, runs custom setup, syncs the tool manifest, and returns a cleanup function that unregisters tools in reverse order.

### Prompt Context

**User prompt (verbatim):** (same as Step 5)

**Assistant interpretation:** Continue turning the design's API primitives into implementation, after schema validation and backend tool UI support.

**Inferred user intent:** Make the framework easier to package into reusable presets such as ecommerce tools/widgets.

**Commit (code):** `cb3470a20ce809c3fc55916443ff2624cc0414e6` — "feat: add chat overlay toolkit registration"

### What I did
- Added `web/src/core/toolkit.ts` with `ChatOverlayToolkit`, `defineToolkit()`, and `installToolkit()`.
- Added `web/src/core/useToolkit.ts` for React-scoped toolkit installation.
- Added `overlay.use(toolkit)` to `createChatOverlay()`.
- Exported toolkit APIs from `web/src/core/index.ts`.

### Why
- Ecommerce, documentation assistants, and editor assistants should be able to ship capability bundles instead of requiring host pages to register every tool manually.
- Toolkits provide a future home for optional presets without making the core runtime product-specific.

### What worked
- `cd web && npm run build` passed.
- `go test ./...` passed.

### What didn't work
- N/A.

### What I learned
- The toolkit abstraction can stay small if it delegates actual tool registration to the existing `overlay.tools` namespace.
- Cleanup is as important as install because scoped React usage needs unmount behavior to update the manifest.

### What was tricky to build
- The first implementation intentionally does not re-register widgets because current widget definitions are global and registered by `defineWidget()`. Toolkits include a `widgets` field for API shape, but richer widget scoping should wait until the widget registry is also overlay-instance scoped.

### What warrants a second pair of eyes
- Review whether `widgets` should be active now or documented as reserved until widget registries are instance-scoped.
- Review whether `installToolkit()` should await `syncManifest()` or keep the current fire-and-forget behavior used by hooks.

### What should be done in the future
- Add an ecommerce toolkit that bundles `cart.add`, `checkout.confirm`, product widgets, and default styling.
- Move widget registration into overlay-scoped registries so toolkit cleanup can unregister widgets too.

### Code review instructions
- Read `web/src/core/toolkit.ts` first.
- Then review `web/src/core/createChatOverlay.ts` for `overlay.use(toolkit)`.
- Validate with `cd web && npm run build`.

### Technical details
- Toolkit install returns `() => void` cleanup.
- Toolkit custom `install(overlay)` may also return cleanup.
