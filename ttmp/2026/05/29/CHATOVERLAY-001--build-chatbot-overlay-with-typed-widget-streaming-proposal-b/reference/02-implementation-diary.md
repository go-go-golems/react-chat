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
