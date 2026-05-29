# Implementation Diary

## Goal

Step-by-step record of implementing the chat-overlay system (Proposal B) as described in the intern implementation guide.

---

## Step 1: Go module initialization and project skeleton

Create the Go module, wire it into go.work, and create the directory layout for the backend.

### Prompt Context

**User prompt (verbatim):** "Implement, keep a diary as you work, add a detailed list of tasks split in phases to the ticket, and commit at appropriate intervals."

**Assistant interpretation:** Begin implementing Phase 1 of the design guide — Go backend skeleton with mock engine, HTTP routes, and WebSocket transport.

**Inferred user intent:** Build the full chat-overlay system incrementally, committing at each phase boundary, keeping a detailed diary of decisions and failures.

### What I did
- Created Go module `github.com/go-go-golems/chat-overlay`
- Wired into `go.work`
- Created directory layout: `cmd/chat-overlay/`, `internal/mockengine/`, `internal/webchat/`
- Studied pinocchio `chatapp.Runner`, `chatapp.Engine`, and `demo.go` to understand the exact wiring pattern

### Why
The chatapp Engine already provides demo inference with text streaming. The chat-overlay backend wraps it with custom widget-producing demo responses and HTTP handlers.

### What worked
- The `chatapp.Runner` type provides a complete non-web wiring of Hub + Engine + Service
- Using Runner avoids reimplementing schema registration, hydration store setup, and hub configuration

### What didn't work
- (nothing yet)

### What I learned
- The `chatapp.Engine` has a `runDemoInference` fallback when no Runtime is provided
- Widget events need to be published through the same `EventPublisher` interface used by demo inference
- The cleanest approach is to override the demo inference with a custom one that emits widget events

### What was tricky to build
- Understanding the separation between Engine (command handler + run management), Runner (wiring), and Service (app-facing API)

### What warrants a second pair of eyes
- The widget event publishing approach — whether to subclass Engine or use a ChatPlugin

### What should be done in the future
- Replace MockEngine with real Geppetto runtime when available

### Code review instructions
- Check `go.mod` dependencies match workspace modules
- Verify `go.work` includes the new module
- Run `go build ./...` to confirm compilation

### Technical details
- Module path: `github.com/go-go-golems/chat-overlay`
- Key dependency: `github.com/go-go-golems/pinocchio/pkg/chatapp`
- Runner creates: SchemaRegistry, HydrationStore (in-memory SQLite), Hub, Engine, Service

---

## Step 2: Backend review and recovery plan

The backend reached a state where route scaffolding, schema generation, and widget projections existed, but live submit did not produce assistant messages or widgets. I paused implementation and wrote a recovery report before changing more code. This was necessary because the failure was not a missing component; it was a boundary problem between sessionstream command registration, Pinocchio chatapp semantics, and asynchronous run context lifetimes.

The report identifies the useful pieces to keep, the incorrect assumptions that caused the current failure, and the recovery sequence for finishing the backend. It also updates the task list into explicit phases so future work can proceed one task at a time.

### Prompt Context

**User prompt (verbatim):** "Were taking over for your little brother who is getting a bit lost in the implementation here. Assess their backend work so far, and figure out what was good, what was bad, what information they missed, what is confusing and why, what can be done better, what they should know for next time. Store as a detailed analysis / code review / report in the ticket. Use a textbook writing style. Upload to remarkable when done. 

Then add tasks to fix and finish the backend part of it all, and work on it task by task, committing at appropriate intervals, keeping a detailed diary"

**Assistant interpretation:** Stop feature coding, perform a thorough backend code review, document the findings in the ticket, upload the report to reMarkable, rewrite the task list into recovery phases, then continue backend implementation task-by-task.

**Inferred user intent:** Recover from an implementation that mixed concepts incorrectly, create a teaching-quality explanation for the backend engineer, and re-establish an orderly implementation loop.

**Commit (code):** N/A — documentation and planning step before the next code commit.

### What I did
- Reviewed `internal/webchat/server.go`, `internal/webchat/overlay_handler.go`, `internal/widgets/plugin.go`, `internal/webchat/helpers.go`, and the widget protobuf schema.
- Ran `go test ./...` and confirmed that Go currently scans `web/node_modules/flatted/golang/pkg/flatted`, which is a repository hygiene issue.
- Ran a backend smoke test that submits `show me boots`; the snapshot contained only the synchronous user message, not assistant text or widget entities.
- Wrote `analysis/01-backend-implementation-review-and-recovery-plan.md` in the ticket.
- Related the report to the backend files with `docmgr doc relate`.
- Uploaded the report to reMarkable as `CHATOVERLAY-001 Backend Review and Recovery Plan` under `/ai/2026/05/29/CHATOVERLAY-001`.
- Rewrote `tasks.md` into six implementation phases with checked and unchecked items.

### Why
The backend was failing for architectural reasons. Continuing to patch frontend code would not fix the empty chat panel because the backend did not publish durable assistant/widget state after submit. The right next step was to define the failure precisely and reduce the implementation to recoverable tasks.

### What worked
- The report clarified that the widget plugin is a good piece of code to keep.
- The smoke test provided a concrete reproduction: submit succeeds, but only the user message appears in the snapshot.
- The recovery path is now explicit: isolate frontend dependencies, move mock inference into `internal/mockengine`, implement custom start/stop semantics with `context.WithoutCancel`, and add tests.

### What didn't work
- The current backend still fails the functional smoke test: no assistant message or widget appears after prompt submission.
- `go test ./...` is polluted by `web/node_modules`, which should not be part of backend package discovery.
- The existing custom command path is not yet symmetric: submit uses `ChatOverlayStartInference`, while stop still calls Pinocchio's default stop path.

### What I learned
- A sessionstream command must be registered in both the schema registry and the Hub command registry.
- Pinocchio's `chatapp.Engine` intentionally uses `context.WithoutCancel` before starting asynchronous inference publishing.
- The current mock goroutine uses the request context directly, which explains why only the synchronous user message is persisted.

### What was tricky to build
- The difficult part is not publishing a protobuf event. The difficult part is owning the run lifecycle correctly. A run needs an id, cancellation, stop semantics, replacement semantics, and a publish context that survives the HTTP request but still responds to explicit stop.
- The current code mixes Pinocchio's service (`s.service.Stop` / `s.service.Snapshot`) with a custom submit command (`ChatOverlayStartInference`). Snapshot reuse is fine, but stop reuse is not fine unless the custom run is tracked by the same engine.

### What warrants a second pair of eyes
- The decision between extending Pinocchio's existing `chatapp.Engine` versus owning a dedicated mock engine should be reviewed. The report recommends a dedicated mock engine because it is faster and clearer for this frontend-driven prototype.
- Widget patch semantics need review. Durable timeline state must match live frontend state after reconnect.

### What should be done in the future
- Implement the backend tasks in the order listed in `tasks.md`, beginning with Go/frontend hygiene and mock engine extraction.
- Add backend tests before continuing deeper frontend integration.

### Code review instructions
- Start with `analysis/01-backend-implementation-review-and-recovery-plan.md`.
- Then review `internal/webchat/overlay_handler.go`, especially the goroutine launch and context use.
- Validate with:
  - `go test ./...`
  - create session + submit `show me boots` + snapshot should show user message, assistant message, and `ChatWidgetInstance`.

### Technical details
- Report path: `ttmp/2026/05/29/CHATOVERLAY-001--build-chatbot-overlay-with-typed-widget-streaming-proposal-b/analysis/01-backend-implementation-review-and-recovery-plan.md`
- reMarkable path: `/ai/2026/05/29/CHATOVERLAY-001/CHATOVERLAY-001 Backend Review and Recovery Plan`
- Key failure evidence: snapshot after submit contains only `ChatMessage` with status `accepted`.
