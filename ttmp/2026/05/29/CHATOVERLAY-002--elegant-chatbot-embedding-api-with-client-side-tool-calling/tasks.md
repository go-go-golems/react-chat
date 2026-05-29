# Tasks

## Delivery milestone: lunch smoke test

Target outcome: by the next handoff, `http://localhost:5173` should show a working browser smoke test where a user prompt causes the backend to request a browser-side tool, the React frontend executes it, the tool call is visible in the timeline, the result is submitted back to the backend, and the assistant continues with a confirmation message.

## Phase 0: Planning, ticket hygiene, and diary

- [x] T0.1: Create CHATOVERLAY-002 ticket workspace.
- [x] T0.2: Write the initial design document and source-based research diary.
- [x] T0.3: Upload the design package to reMarkable.
- [x] T0.4: Expand this task list into implementation phases with browser-smoke-test acceptance criteria.
- [x] T0.5: Keep the diary updated after each implementation slice and commit.

## Phase 1: Protocol and backend event foundation

Goal: add a minimal but real sessionstream-native frontend-tool protocol without changing Geppetto yet. This lets the mock engine exercise the same browser-result round trip that future Geppetto/Pinocchio integration will use.

- [x] T1.1: Add `proto/chatoverlay/tools/v1/frontend_tool.proto` with frontend tool descriptor, manifest command, call-request event, result command, result event, execution mode enum, and timeline entity.
- [x] T1.2: Generate Go protobuf bindings under `internal/pb/proto/chatoverlay/tools/v1`.
- [x] T1.3: Add `internal/frontendtools` plugin constants and schema registration for commands, backend events, UI events, and timeline entity kind.
- [x] T1.4: Add a manifest store and pending-call manager keyed by session id and tool call id.
- [x] T1.5: Register `ChatFrontendToolManifest` and `ChatFrontendToolResult` command handlers on the Hub.
- [x] T1.6: Project frontend tool call/result events into live UI events.
- [x] T1.7: Project frontend tool call/result events into durable timeline entities for reconnect/snapshot hydration.
- [x] T1.8: Wire the frontend tool plugin and manager into `internal/webchat/server.go` alongside the widget plugin.

Acceptance criteria:

- `go test ./...` passes.
- The backend can accept a frontend tool manifest command.
- The backend can publish `ChatFrontendToolCallRequested` and wait for a matching `ChatFrontendToolResult` command.

## Phase 2: Mock engine browser-tool round trip

Goal: make the deterministic mock engine simulate the future LLM tool-call path so the smoke test does not require API keys.

- [x] T2.1: Extend `internal/mockengine.Engine` with an optional frontend-tool manager dependency.
- [x] T2.2: Teach the mock engine to detect prompts such as `add boots to cart`, `client tool`, or `cart.add`.
- [x] T2.3: During those prompts, publish normal chat text, request frontend tool `cart.add`, wait for a browser result, then publish final assistant text summarizing the result.
- [x] T2.4: Ensure run cancellation cancels a pending frontend tool wait.
- [x] T2.5: Add backend tests covering manifest registration, tool request, tool result submission, and resumed assistant output.

Acceptance criteria:

- `go test ./...` passes.
- A script or test can submit a prompt, observe a pending tool call, submit a result, and observe a final assistant response.

## Phase 3: Frontend tool registry and runtime

Goal: expose the first browser-facing client-side tool API while keeping the implementation small enough for the smoke test.

- [x] T3.1: Add `web/src/tools/toolRegistry.ts` with `defineTool`, scoped register/unregister, manifest serialization, and lookup.
- [x] T3.2: Add `web/src/tools/useFrontendTool.ts` that registers tools from React component scope and syncs the manifest when registrations change.
- [x] T3.3: Add `web/src/tools/toolRuntime.ts` to execute `ChatFrontendToolCallRequested` UI events, validate that the tool exists, run its handler with an abort signal, and submit `ChatFrontendToolResult`.
- [x] T3.4: Extend `createChatOverlay()` with `tools.register`, `tools.syncManifest`, and `tools.submitResult` while preserving the old `send/stop/open/close/toggle/reset/getStore` API.
- [x] T3.5: Ensure `send()` creates the session, connects WebSocket, syncs the current tool manifest, then submits the prompt.
- [x] T3.6: Add a `ToolCallOutlet` renderer and include tool calls in `ChatMessages`.
- [x] T3.7: Add snapshot and live-event normalization for `ChatFrontendToolCallRequested` and `ChatFrontendToolResultReceived`.

Acceptance criteria:

- `cd web && npm run build` passes.
- The frontend can register `cart.add`, auto-execute a backend-requested call, show the tool card, and submit the result.

## Phase 4: Demo smoke page and scripts

Goal: make the running local app demonstrate the feature in a way that can be checked quickly in a browser.

- [x] T4.1: Add a demo `cart.add` frontend tool to `web/src/App.tsx` with visible cart state.
- [x] T4.2: Update page instructions to include `add boots to cart` as the smoke prompt.
- [x] T4.3: Add `scripts/02-restart-dev-servers.sh` for CHATOVERLAY-002.
- [x] T4.4: Add `scripts/03-client-tool-browser-smoke.js` to exercise the browser flow with Playwright.
- [x] T4.5: Run backend and frontend in tmux and leave them running.
- [x] T4.6: Run the browser smoke test and record results in the diary.

Acceptance criteria:

- Visiting `http://localhost:5173` shows the demo page and overlay.
- Sending `add boots to cart` renders a user message, assistant message, visible `cart.add` tool card, updated demo cart count, and final assistant confirmation.

## Phase 5: Commit and handoff

- [x] T5.1: Commit protocol/backend/frontend implementation once tests pass.
- [x] T5.2: Commit ticket docs/diary/scripts after validation.
- [x] T5.3: Run `docmgr doctor --ticket CHATOVERLAY-002 --stale-after 30`.
- [x] T5.4: Report running URLs, smoke command, commit hashes, and remaining risks.

## Phase 6: Follow-up production work after lunch smoke

These tasks are intentionally not required for the lunch smoke test.

- [x] T6.1: Add Zod or equivalent schema validation for frontend tool input/output in the public API.
- [x] T6.2: Add `useHumanTool()` with approval-card rendering and `respond()`.
- [x] T6.3: Add `defineToolUI()` for backend-executed tool visualization.
- [x] T6.4: Add toolkit bundling with `defineToolkit()`.
- [ ] T6.5: Add WebSocket client command frames or keep HTTP command submission as the documented v1 choice.
- [ ] T6.6: Move the mock-engine bridge into Pinocchio/Geppetto with a real frontend tool executor.
  - [x] T6.6a: Add Pinocchio runtime hooks for custom Geppetto registries, tool executors, and run-context decoration.
  - [x] T6.6b: Add chat-overlay `frontendtools.BridgeExecutor` that implements Geppetto `tools.ToolExecutor`.
  - [ ] T6.6c: Wire a real provider-backed runtime to use the bridge in an end-to-end non-mock smoke.
    - [x] T6.6c.1: Convert `chat-overlay serve` to a Glazed command with Pinocchio profile settings and logging flags.
    - [x] T6.6c.2: Resolve `gpt-5-mini-low` through Pinocchio profile bootstrap and verify debug/caller logs show profile registry loading.
    - [ ] T6.6c.3: Make a real-model browser smoke reliably produce and complete a frontend `cart.add` tool call.
- [ ] T6.7: Add reconnect tests for pending human/frontend tool calls.
- [ ] T6.8: Add security policies for mutating tools, result size limits, and trusted/untrusted tool outputs.
