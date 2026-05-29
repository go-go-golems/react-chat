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
    - Path: ttmp/2026/05/29/CHATOVERLAY-002--elegant-chatbot-embedding-api-with-client-side-tool-calling/sources/01-copilotkit-use-frontend-tool.md
      Note: Downloaded CopilotKit frontend tool reference
    - Path: ttmp/2026/05/29/CHATOVERLAY-002--elegant-chatbot-embedding-api-with-client-side-tool-calling/sources/05-ai-sdk-chatbot-tool-usage.md
      Note: Downloaded Vercel AI SDK client-side tool round-trip reference
    - Path: ttmp/2026/05/29/CHATOVERLAY-002--elegant-chatbot-embedding-api-with-client-side-tool-calling/sources/08-assistant-ui-tools.md
      Note: Downloaded assistant-ui toolkit/tool typing reference
    - Path: web/src/App.tsx
      Note: Smoke demo cart.add tool registration and visible cart state
    - Path: web/src/core/createChatOverlay.ts
      Note: Overlay API now exposes tools namespace and manifest/result calls
    - Path: web/src/tools/toolRuntime.ts
      Note: Browser-side frontend tool execution and result submission
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
