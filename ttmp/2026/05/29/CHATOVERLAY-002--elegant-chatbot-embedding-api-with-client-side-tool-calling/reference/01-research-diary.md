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
    - Path: ../../../../../../../pinocchio/pkg/chatapp/runtime_inference.go
      Note: Runtime inference now wires registry/executor/context into enginebuilder
    - Path: ../../../../../../../pinocchio/pkg/chatapp/service.go
      Note: PromptRequest RuntimeContext hook for per-run bridge context
    - Path: ../../../../../../../pinocchio/pkg/inference/runtime/composer.go
      Note: ComposedRuntime now carries Registry and ToolExecutor
    - Path: cmd/chat-overlay/cmds/serve.go
      Note: Glazed serve command with Pinocchio profile settings
    - Path: cmd/chat-overlay/main.go
      Note: Glazed root command and logging setup
    - Path: internal/frontendtools/bridge.go
      Note: |-
        Geppetto ToolExecutor bridge for browser frontend tools
        Frontend tool bridge logging instrumentation
        Provider-safe frontend tool aliasing for OpenAI Responses
    - Path: internal/frontendtools/bridge_test.go
      Note: |-
        Unit test for bridge request/result round trip
        Regression coverage for provider-safe frontend tool aliases
    - Path: internal/frontendtools/manager.go
      Note: Manifest/result command handling and pending frontend tool waits
    - Path: internal/frontendtools/plugin.go
      Note: Sessionstream UI and timeline projections for frontend tools
    - Path: internal/mockengine/engine.go
      Note: Mock engine requests cart.add and resumes after browser result
    - Path: internal/webchat/real_runtime.go
      Note: Parsed-value Pinocchio profile resolution for real runtime
    - Path: proto/chatoverlay/tools/v1/frontend_tool.proto
      Note: Frontend tool protocol implemented in smoke slice
    - Path: ttmp/2026/05/29/CHATOVERLAY-002--elegant-chatbot-embedding-api-with-client-side-tool-calling/scripts/01-fetch-research-sources.sh
      Note: Defuddle source download script for prior-art docs
    - Path: ttmp/2026/05/29/CHATOVERLAY-002--elegant-chatbot-embedding-api-with-client-side-tool-calling/scripts/04-human-tool-browser-smoke.js
      Note: Browser smoke test for human-in-the-loop tools
    - Path: ttmp/2026/05/29/CHATOVERLAY-002--elegant-chatbot-embedding-api-with-client-side-tool-calling/scripts/05-real-runtime-client-tool-smoke.js
      Note: Passing real-provider frontend tool smoke
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

## Step 8: Build the first Geppetto/Pinocchio frontend-tool bridge hooks

This step moved the bridge from a concept into reusable code. The mock engine still powers the browser smoke test, but we now have the two pieces needed for a real Geppetto tool-loop integration: Pinocchio can carry a custom tool registry/executor into the runtime builder, and chat-overlay has a `frontendtools.BridgeExecutor` that implements Geppetto's `tools.ToolExecutor` interface.

The bridge executor is the production-shaped adapter. If a model calls a tool that is present in the browser manifest, the executor does not run a Go function. It publishes a frontend tool request through `frontendtools.Manager`, waits for the browser's `ChatFrontendToolResult`, and returns that result to Geppetto as a normal `tools.ToolResult`. Calls for non-frontend tools fall back to Geppetto's normal executor.

### Prompt Context

**User prompt (verbatim):** "ok, go ahead. continue committing at appropriate intervals, keeping a diary."

**Assistant interpretation:** Start implementing the bridge described in the previous answer, commit in coherent slices, and record the work in the ticket diary.

**Inferred user intent:** Move beyond the mock-engine frontend tool demo toward the real Pinocchio/Geppetto tool-loop path.

**Commit (code):** `6865784122e8ad62128e2af143b9d229d4d79783` in `pinocchio` — "feat: expose runtime tool executor bridge hooks"

**Commit (code):** `afda13e66761e3142288376300311355d0b6d4ab` in `chat-overlay` — "feat: add geppetto frontend tool bridge executor"

### What I did
- In `pinocchio`, extended `infruntime.ComposedRuntime` with:
  - `Registry geptools.ToolRegistry`,
  - `ToolExecutor geptools.ToolExecutor`.
- In `pinocchio`, extended `chatapp.PromptRequest` with `RuntimeContext`, a callback that can decorate the Geppetto run context once `sessionID`, `messageID`, and `sessionstream.EventPublisher` are known.
- In `pinocchio`, wired `runtime.Registry` and `runtime.ToolExecutor` into `enginebuilder.Builder` inside `runRuntimeInference()`.
- In `pinocchio`, applied `pending.RuntimeContext(...)` before `sess.StartInference(...)` so a frontend bridge can inject per-run sessionstream handles into the tool-execution context.
- In `chat-overlay`, added `internal/frontendtools/bridge.go` with:
  - `BridgeContext`,
  - `WithBridgeContext()` / `BridgeContextFromContext()`,
  - `BridgeExecutor`,
  - `Manager.RegisterManifestTools()` for adding browser manifest entries to a Geppetto tool registry.
- Added `internal/frontendtools/bridge_test.go` to prove a Geppetto-style `ToolCall` can be routed to `Manager.Request`, resolved by `HandleResult`, and returned as a `tools.ToolResult`.

### Why
- Geppetto's tool loop already supports pluggable `tools.ToolExecutor`. The right production bridge is therefore an executor, not a second model loop.
- Pinocchio previously did not expose enough runtime hooks for an app to install a custom registry/executor pair or inject sessionstream handles into the run context. Without those hooks, a frontend tool executor could not publish browser requests.
- Keeping the browser bridge in `chat-overlay` avoids making Pinocchio depend on chat-overlay-specific protobufs.

### What worked
- `cd pinocchio && go test ./pkg/chatapp ./pkg/inference/runtime` passed before commit.
- Pinocchio pre-commit hooks ran `go generate`, frontend build, `go build ./...`, lint, vet, and `go test ./...` successfully during commit.
- `cd chat-overlay && go test ./...` passed.
- `internal/frontendtools` bridge unit test passed.

### What didn't work
- N/A at the code level. The remaining gap is integration: the bridge exists and Pinocchio can carry it, but no provider-backed chat-overlay smoke has been wired to use it yet.

### What I learned
- The cleanest low-level extension point is Geppetto's `tools.ToolExecutor`, because it receives `ToolCall` values after the provider has requested tools and before tool results are appended back into the turn.
- The executor still needs sessionstream context. That context is only known inside `chatapp.runRuntimeInference`, so Pinocchio needs a run-context decorator hook rather than trying to bake browser semantics into `infruntime.ComposedRuntime`.

### What was tricky to build
- Package boundaries matter. Pinocchio should not import chat-overlay frontend-tool protobufs. The bridge therefore lives in chat-overlay and uses generic Pinocchio/Geppetto hooks.
- The executor must know when to intercept and when to delegate. It uses `Manager.HasAvailableTool(sessionID, call.Name)` so backend tools continue through the fallback executor.
- The provider-facing tool definitions need to come from the browser manifest. `RegisterManifestTools()` converts the manifest's `google.protobuf.Struct` JSON Schema into Geppetto `tools.ToolDefinition` values so providers can see the tools.

### What warrants a second pair of eyes
- Review the `RuntimeContext` callback shape in `pinocchio/pkg/chatapp/service.go`. It is flexible, but it exposes `sessionstream.EventPublisher` in a request callback and should be checked against Pinocchio API boundaries.
- Review `BridgeExecutor.ExecuteToolCalls()`. It currently executes sequentially to keep browser interactions ordered; this is safer for human tools but may be slower for independent automatic tools.
- Review `Manager.RegisterManifestTools()` schema conversion from protobuf `Struct` to `jsonschema.Schema`.

### What should be done in the future
- Wire a provider-backed runtime path that constructs a registry from the browser manifest and uses `frontendtools.BridgeExecutor` as `ComposedRuntime.ToolExecutor`.
- Add an integration test with a fake Geppetto engine that emits a pending tool call and verifies the browser-result turn continuation without using the mock engine.
- Decide whether browser frontend tools should be merged with backend tools by union or override policy.

### Code review instructions
- Pinocchio review order:
  1. `/home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/pkg/inference/runtime/composer.go`
  2. `/home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/pkg/chatapp/service.go`
  3. `/home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/pkg/chatapp/runtime_inference.go`
- Chat-overlay review order:
  1. `internal/frontendtools/bridge.go`
  2. `internal/frontendtools/manager.go`
  3. `internal/frontendtools/bridge_test.go`
- Validation commands:
  - `cd /home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio && go test ./pkg/chatapp ./pkg/inference/runtime`
  - `cd /home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm && go test ./...`

### Technical details
- Bridge context carries `SessionID`, `MessageID`, and `Publisher`.
- `BridgeExecutor` intercepts calls only when the current session has an available frontend descriptor for `call.Name`.
- Non-frontend calls delegate to `Fallback`, defaulting to Geppetto's `NewDefaultToolExecutor`.

## Step 9: Convert chat-overlay serve to Glazed profile-aware command wiring

This step replaced the plain Cobra-only `chat-overlay serve` command with a Glazed command so the binary participates in the same command parsing, profile-bootstrap, and logging conventions as the existing Pinocchio web-chat entrypoint. The real-runtime path now receives the parsed Glazed values directly, which lets `profilebootstrap.ResolveCLIEngineSettings(...)` see `--profile`, `--profile-registries`, `--config-file`, environment/config layers, and the standard Pinocchio profile registry fallback instead of reconstructing only a few flags by hand.

The main behavioral change is observability. Running `chat-overlay serve --real-runtime --profile gpt-5-mini-low --log-level debug --with-caller` now initializes Glazed logging, emits caller-aware startup lines, and logs profile resolution details when the first real-runtime prompt is submitted. The backend also logs frontend-tool bridge routing/fallback decisions so a real model tool-loop can be debugged without guessing whether Geppetto, Pinocchio, sessionstream, or the browser bridge owns the current state.

### Prompt Context

**User prompt (verbatim):** "convert binary to glazed commands, so that you can properly load profile registries like @2026-03-16--gec-rag/ or @pinocchio/cmd/web-chat/ do it, and properly set up logging as well. Then test it with --log-level debug --with-caller"

**Assistant interpretation:** Refactor the chat-overlay CLI from plain Cobra flags to Glazed command wiring, reuse Pinocchio profile settings for real runtime profile registry loading, initialize Glazed logging at the root, and verify debug/caller logging with the requested flags.

**Inferred user intent:** Make real-model profile resolution and runtime debugging reliable before continuing frontend-tool bridge smoke work.

**Commit (code):** `bf88adc` — "feat: wire glazed profile-aware serve command"

### What I did
- Rewrote `cmd/chat-overlay/main.go` so the root command initializes Glazed logging with `logging.AddLoggingSectionToRootCommand(...)` and `logging.InitLoggerFromCobra(...)`.
- Rebuilt `serve` as a Glazed `cmds.BareCommand` using `cli.BuildCobraCommandFromCommand(...)`.
- Added the Pinocchio `profilebootstrap.NewProfileSettingsSection()` to `serve`, exposing `--profile`, `--profile-registries`, and `--config-file` through the Glazed parser.
- Configured the parser with `AppName: "pinocchio"` so profile loading follows Pinocchio web-chat conventions and can find `/home/manuel/.config/pinocchio/profiles.yaml`.
- Passed parsed Glazed values into `webchat.ServerOptions` and then into the real-runtime factory so `ResolveCLIEngineSettings(...)` operates on the complete parsed value stack.
- Added debug/info logs around profile resolution, engine creation, frontend manifest registration, bridge fallback, frontend bridge routing, and frontend bridge results.
- Updated the CHATOVERLAY-002 task list with the new Glazed/profile-resolution subtasks.

### Why
- The plain Cobra command only carried local flags and did not initialize Glazed logging, so `--log-level debug --with-caller` did not exist and profile-bootstrap diagnostics were missing.
- Reusing Pinocchio profile settings avoids a second, partial implementation of profile registry loading.
- Debugging provider-backed frontend tools requires logs at three boundaries: CLI/profile resolution, Geppetto engine creation, and frontend-tool bridge execution.

### What worked
- `go test ./...` passed after the CLI conversion and logging instrumentation.
- `go run ./cmd/chat-overlay --help` now shows Glazed root logging flags including `--log-level` and `--with-caller`.
- `go run ./cmd/chat-overlay serve --help --long-help` now shows `--profile`, `--profile-registries`, `--config-file`, and `--print-parsed-fields`.
- `timeout 5s go run ./cmd/chat-overlay serve --real-runtime --profile gpt-5-mini-low --log-level debug --with-caller --serve-port 18080` emitted caller-aware debug/info logs.
- A real-runtime prompt submission resolved the profile and showed the registry fallback:
  - command: `go run ./cmd/chat-overlay serve --real-runtime --profile gpt-5-mini-low --log-level debug --with-caller --serve-port 18083`
  - request: `POST /api/chat/sessions/{id}/messages` with `{"prompt":"Say hello in five words."}`
  - log: `resolved pinocchio profile for chat overlay runtime profile=gpt-5-mini-low profile_registries=["/home/manuel/.config/pinocchio/profiles.yaml"]`
  - log: `Responses: built request ... model=gpt-5-mini`

### What didn't work
- The first direct API smoke used `{"message":"Say hello in five words."}` and returned HTTP 400 because the endpoint expects `{"prompt":"..."}`.
- The earlier browser smoke with a real model did not reliably produce a visible `cart.add` frontend tool call; the model/runtime path is now wired, but the non-mock browser tool-call smoke still needs a stronger prompt/tool schema or a fake provider/tool-call engine to make it deterministic.
- `timeout 5s ...` exits with status 124 even though the server handles SIGTERM and logs shutdown; this is expected behavior from GNU `timeout`, not a server failure.

### What I learned
- Pinocchio's profile bootstrap can be reused cleanly from chat-overlay as long as the Glazed parser includes the profile settings section and uses Pinocchio's app/config prefix.
- The profile registry fallback is only visible once a real-runtime prompt resolves the profile, not merely at server startup.
- `--print-parsed-fields` is useful for confirming CLI value sources, but the registry fallback itself appears in the resolved runtime logs after `ResolveCLIEngineSettings(...)`.

### What was tricky to build
- The command needed to stay a long-running HTTP server while adopting Glazed's command interface. I implemented `Run(ctx, vals)` and kept signal-aware shutdown with `signal.NotifyContext(...)`, `http.Server.Shutdown(...)`, and caller-aware zerolog output.
- The existing `chunk-delay` flag was a `time.Duration` Cobra flag, but the local Glazed field set does not expose `fields.TypeDuration`; I changed the Glazed field to a string defaulting to `20ms` and parse it with `time.ParseDuration(...)` before constructing `webchat.ServerOptions`.
- Passing only decoded profile strings would have recreated the old partial path. The important fix was passing the original `*values.Values` into the real-runtime factory so Pinocchio's resolver can consume all command/config/profile layers.

### What warrants a second pair of eyes
- Review `cmd/chat-overlay/main.go` and confirm `AppName: "pinocchio"` is the desired parser app name for profile/config loading even though the binary itself is `chat-overlay`.
- Review whether `serve` should expose additional Geppetto observability sections like Pinocchio web-chat does, beyond the root logging flags added in this step.
- Review whether `profile` should have an explicit default at the Glazed profile-settings layer or remain an explicit flag for real-runtime mode.

### What should be done in the future
- Make the real-model browser smoke deterministic by either tightening the prompt/tool descriptors or adding a fake provider engine that emits a known `cart.add` tool call through the real Geppetto tool-loop path.
- Consider documenting the CLI diagnostics in a README once the real-runtime bridge smoke is stable.
- Add a small command-level test or golden help check if this binary grows more subcommands.

### Code review instructions
- Start with `cmd/chat-overlay/main.go` to review root logging/help setup and Glazed command construction.
- Then review `cmd/chat-overlay/cmds/serve.go` for Glazed sections, decoding, signal handling, and `ServerOptions` construction.
- Then review `internal/webchat/real_runtime.go` for parsed-value profile resolution and real-runtime logs.
- Finally review `internal/frontendtools/bridge.go` for bridge debug/info logs.
- Validation commands:
  - `cd /home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm && go test ./...`
  - `go run ./cmd/chat-overlay serve --help --long-help | rg -n "log-level|with-caller|profile|profile-registries|config-file|print-parsed" -C 1`
  - `timeout 5s go run ./cmd/chat-overlay serve --real-runtime --profile gpt-5-mini-low --log-level debug --with-caller --serve-port 18080`

### Technical details
- Root logging now comes from Glazed's logging section.
- `serve` uses `profilebootstrap.NewProfileSettingsSection()` for Pinocchio profile flags.
- Real runtime profile resolution calls `profilebootstrap.ResolveCLIEngineSettings(ctx, parsed)` with the Glazed parsed values.
- Verified profile registry fallback: `/home/manuel/.config/pinocchio/profiles.yaml`.

## Step 10: Complete the real-runtime browser frontend-tool smoke

This step restarted the tmux backend with full Glazed debug/caller logging and reran the real-provider browser smoke. The additional logs exposed the actual provider failure: OpenAI Responses rejected frontend tool names containing dots, so `cart.add` and `checkout.confirm` could not be sent as raw provider tool names.

The fix keeps browser-facing tool names stable while registering provider-safe aliases in Geppetto. Browser manifests still advertise `cart.add`, sessionstream events still carry `cart.add`, and the frontend runtime still executes `cart.add`; only the provider-visible tool definition name becomes `cart_add`. The bridge maps `cart_add` back to `cart.add` when executing the tool call.

### Prompt Context

**User prompt (verbatim):** "restart backend in the tmux to have full logging, then try again"

**Assistant interpretation:** Restart the long-running backend in the `chat-overlay` tmux session with `--log-level debug --with-caller`, rerun the real-runtime browser smoke, inspect the logs, and fix any issue that blocks the smoke.

**Inferred user intent:** Use full runtime logs to diagnose why the real-model frontend-tool bridge smoke did not show a `cart.add` tool call.

**Commit (code):** `4744f73` — "fix: alias frontend tool names for providers"

### What I did
- Restarted tmux pane `chat-overlay:0.0` with:
  - `go run ./cmd/chat-overlay serve --serve-port 8080 --real-runtime --profile gpt-5-mini-low --log-level debug --with-caller`
- Restarted the Vite frontend in tmux pane `chat-overlay:0.1`.
- Reran `scripts/05-real-runtime-client-tool-smoke.js`.
- Read the backend tmux logs and found OpenAI's validation error for raw dotted tool names.
- Added `ProviderToolName(...)` to map frontend names like `cart.add` to provider names like `cart_add`.
- Updated `Manager.RegisterManifestTools(...)` to register sanitized provider names with Geppetto while preserving the browser-facing name in the description and bridge mapping.
- Added `Manager.ResolveProviderToolName(...)` so `BridgeExecutor` can translate a provider call like `cart_add` back to the browser manifest tool `cart.add`.
- Reran the real-runtime browser smoke successfully.
- Updated `internal/frontendtools/bridge_test.go` so the bridge unit test proves `cart.add` is registered as provider-safe `cart_add` and then routed back to browser-facing `cart.add`.
- Marked T6.6/T6.6c complete in `tasks.md`.

### Why
- OpenAI Responses requires tool names to match `^[a-zA-Z0-9_-]+$`; our frontend tool names use dotted namespace style (`cart.add`, `checkout.confirm`) for browser/API ergonomics.
- Renaming browser tools would leak provider constraints into the public frontend API. A bridge-level alias preserves the framework API and satisfies provider validation.

### What worked
- The first full-log rerun showed the precise provider error:
  - `Invalid 'tools[0].name': string does not match pattern. Expected a string that matches the pattern '^[a-zA-Z0-9_-]+$'.`
- After aliasing, `go test ./...` passed.
- The backend registered provider-safe names:
  - `tool=cart.add provider_tool=cart_add`
  - `tool=checkout.confirm provider_tool=checkout_confirm`
- The real model called `cart_add`, and the bridge routed it back to `cart.add`:
  - `routing tool call to browser frontend tool bridge ... provider_tool=cart_add ... tool=cart.add`
  - `frontend tool bridge returned result ... status=success ... provider_tool=cart_add ... tool=cart.add`
- `node ttmp/.../scripts/05-real-runtime-client-tool-smoke.js` passed with:
  - `OK: real-runtime frontend tool smoke passed`

### What didn't work
- The first rerun still timed out waiting for `cart.add` because the provider request failed before a tool call could be streamed.
- The smoke script still prints Node's `MODULE_TYPELESS_PACKAGE_JSON` warning because the ticket script is ESM-shaped but the nearest package metadata does not declare `type: module`. This warning did not affect the smoke result.

### What I learned
- Provider-facing tool names need a compatibility layer even if the framework's own tool namespace supports richer names.
- The bridge should log both names: browser/API tool name and provider alias. Without both, debugging sessionstream/frontend behavior against provider payloads is unnecessarily confusing.

### What was tricky to build
- The alias had to preserve existing tests and non-OpenAI providers. `ResolveProviderToolName(...)` therefore accepts either the raw frontend name or the sanitized provider name.
- The manifest registration path and execution path must agree on the aliasing function. `ProviderToolName(...)` is shared by both `RegisterManifestTools(...)` and `ResolveProviderToolName(...)`.
- Tool descriptions now include the original browser-facing name when aliasing occurs so model instructions and logs remain understandable.

### What warrants a second pair of eyes
- Review `ProviderToolName(...)` for collision handling. Today `cart.add` and `cart_add` would map to the same provider name; production should detect or disambiguate collisions during manifest registration.
- Review whether the original frontend tool name should be carried in Geppetto tool metadata instead of only in the description/log mapping.

### What should be done in the future
- Add collision detection for provider aliases.
- Suppress or fix the Node module-type warning in ticket smoke scripts.

### Code review instructions
- Start with `internal/frontendtools/bridge.go` and review:
  - `ProviderToolName(...)`,
  - `Manager.RegisterManifestTools(...)`,
  - `Manager.ResolveProviderToolName(...)`,
  - `BridgeExecutor.ExecuteToolCall(...)`.
- Validate with:
  - `go test ./...`
  - `node ttmp/2026/05/29/CHATOVERLAY-002--elegant-chatbot-embedding-api-with-client-side-tool-calling/scripts/05-real-runtime-client-tool-smoke.js`

### Technical details
- Provider alias rule: replace every run of non-`[a-zA-Z0-9_-]` characters with `_`, trim surrounding underscores, and fall back to `frontend_tool` for empty names.
- OpenAI accepted `cart_add` and `checkout_confirm` as tool names.
- Sessionstream/browser-facing names remain `cart.add` and `checkout.confirm`.
