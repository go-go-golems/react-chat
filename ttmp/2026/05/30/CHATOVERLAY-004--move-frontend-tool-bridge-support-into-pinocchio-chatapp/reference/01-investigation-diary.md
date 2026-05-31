---
Title: Investigation Diary
Ticket: CHATOVERLAY-004
Status: active
Topics:
    - chat-overlay
    - pinocchio
    - geppetto
    - frontend-tools
DocType: reference
Intent: long-term
Owners: []
RelatedFiles:
    - Path: ../../../../../../../pinocchio/pkg/chatapp/frontendtools/bridge.go
      Note: Geppetto bridge executor and provider alias handling moved to Pinocchio (commit 04db8e2)
    - Path: ../../../../../../../pinocchio/pkg/chatapp/frontendtools/manager.go
      Note: Frontend tool manifest/result manager moved to Pinocchio (commit 04db8e2)
    - Path: ../../../../../../../pinocchio/pkg/chatapp/frontendtools/manager_test.go
      Note: Pinocchio frontendtools manager coverage (commit 347e757)
    - Path: ../../../../../../../pinocchio/pkg/chatapp/frontendtools/plugin.go
      Note: Sessionstream plugin and timeline projection moved to Pinocchio (commit 04db8e2)
    - Path: ../../../../../../../pinocchio/pkg/chatapp/frontendtools/plugin_test.go
      Note: Pinocchio frontendtools plugin coverage (commit 347e757)
    - Path: ../../../../../../../pinocchio/proto/pinocchio/chatapp/frontendtools/v1/frontend_tool.proto
      Note: Pinocchio-owned frontend tool proto contract (commit 04db8e2)
    - Path: internal/mockengine/engine.go
      Note: mock engine requests browser tools through Pinocchio frontendtools (commit 2c62b12)
    - Path: internal/webchat/server.go
      Note: chat-overlay consumes Pinocchio frontendtools plugin/manager (commit 2c62b12)
ExternalSources: []
Summary: Chronological diary for frontend tools migration design.
LastUpdated: 2026-05-30T20:45:00-04:00
WhatFor: Record design-package creation and future implementation steps.
WhenToUse: Read before continuing CHATOVERLAY-004 work.
---


# Investigation Diary

## Goal

Capture the initial investigation and design-package creation for CHATOVERLAY-004.

## Step 1: Create the design package

This step created a focused ticket workspace and wrote the implementation guide for the requested refactor. The work is documentation-only: it maps the current chat-overlay and Pinocchio web-chat architecture, identifies the reusable seams, and gives a new intern an implementation path with API sketches, diagrams, file references, and validation steps.

### Prompt Context

**User prompt (verbatim):** "ok, so we have 3 things i want to do :

- move the common go part from web-chat and chatoverlay into pkg/chatapp
- move frontend tools support into pkg/chatapp too
- move widget plugin support into pkg/chatapp too.

Create 3 tickets for these, and then for each ticket:

Create  a detailed analysis / design / implementation guide that is for a new intern, explaining all the parts of the system needed to understand what it is, with prose paragraphs and bullet point sand pseudocode and diagrams and api references and file references. It should be very clear and technical. Store in the ticket and the nupload to remarkable."

**Assistant interpretation:** Create the second ticket and design the move of frontend tool manifest/result/bridge support into Pinocchio chatapp.

**Inferred user intent:** Make browser-executed tools a reusable Pinocchio capability rather than chat-overlay-local code.

**Commit (code):** N/A — documentation and planning only.

### What I did
- Created the `CHATOVERLAY-004` docmgr ticket workspace.
- Added a design document and this investigation diary.
- Read the relevant chat-overlay and Pinocchio files.
- Wrote an intern-oriented implementation guide with current-state evidence, proposed APIs, pseudocode, migration phases, tests, risks, and references.

### Why
- The refactor affects package boundaries between chat-overlay and Pinocchio. A design-first handoff reduces the risk of moving app-specific code into core packages or creating circular dependencies.

### What worked
- The existing code already exposes clear seams: `chatapp.ChatPlugin`, `chatapp.Service`, `infruntime.ComposedRuntime`, sessionstream projections, and route-level handlers.

### What didn't work
- N/A. This step did not modify code.

### What I learned
- Pinocchio web-chat and chat-overlay overlap heavily at the server/sessionstream layer, but each also has product-specific extensions that must remain separate until their contracts are generalized.

### What was tricky to build
- The main challenge was choosing package boundaries that do not invert dependencies. Pinocchio packages must not import chat-overlay; chat-overlay should consume Pinocchio's reusable chatapp packages.

### What warrants a second pair of eyes
- Review whether the proposed package names are stable enough before implementation begins.
- Review whether any app-specific behavior was accidentally proposed for Pinocchio core.

### What should be done in the future
- Implement the design in small migrations with tests after each package extraction.

### Code review instructions
- Start with the design document in this ticket.
- Compare each proposed move against the referenced source files.
- Validate implementation with the commands listed in the design document.

### Technical details
- No code changed in this step.

## Step 2: Move frontend tool protocol and runtime package into Pinocchio

This step moved the frontend-tool protocol and reusable backend runtime from chat-overlay into Pinocchio. The new owner is `pinocchio/pkg/chatapp/frontendtools`, backed by a Pinocchio proto package under `proto/pinocchio/chatapp/frontendtools/v1`.

The package keeps the same sessionstream command/event names so existing browser code continues to understand `ChatFrontendToolManifest`, `ChatFrontendToolCallRequested`, and `ChatFrontendToolResultReceived`. Only the Go protobuf package moved.

### Prompt Context

**User prompt (verbatim):** "ok, close 003,  do CHATOVERLAY-004 start to finish, similarly keep diary and commit at appropriate intervals"

**Assistant interpretation:** Finish the frontend-tools migration ticket by moving protocol, manager/plugin/bridge code into Pinocchio, migrating chat-overlay, validating, and documenting each slice.

**Inferred user intent:** Make browser-executed tools a reusable Pinocchio chatapp capability and remove chat-overlay's private implementation.

**Commit (code):** 04db8e2 — "feat: add chatapp frontend tools package"

### What I did
- Added `/home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/proto/pinocchio/chatapp/frontendtools/v1/frontend_tool.proto`.
- Generated `/home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/pkg/chatapp/pb/proto/pinocchio/chatapp/frontendtools/v1/frontend_tool.pb.go`.
- Created `/home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/pkg/chatapp/frontendtools` with manager, plugin, bridge, and bridge tests.
- Added provider-safe alias collision detection in `Manager.RegisterManifestTools(...)`.

### Why
- Frontend tools are generic browser-advertised capabilities, not chat-overlay-specific UI code.
- Moving the manager/plugin/bridge together keeps the contract, sessionstream projection, and Geppetto executor adapter in one reusable package.

### What worked
- `go test ./pkg/chatapp/frontendtools` passed.
- Pinocchio pre-commit passed after resolving lint/generated-code issues.

### What didn't work
- First Pinocchio commit attempt failed after `go generate ./...` generated `logcopter.go`, because `bridge.go` imported zerolog as `log` and the generated package-level `log` variable used the same identifier:
  - Error: `pkg/chatapp/frontendtools/logcopter.go:7:5: log already declared through import of package log ("github.com/rs/zerolog/log")`
  - Fix: alias zerolog import to `zlog`.
- Second commit attempt failed because `structFromMap(...)` was unused after moving the package:
  - Error: `pkg/chatapp/frontendtools/bridge.go:251:6: func structFromMap is unused`
  - Fix: remove the unused helper and `structpb` import.

### What I learned
- New Pinocchio packages need to avoid package-level names that conflict with generated `logcopter.go` variables.
- The provider-safe alias map needed explicit collision detection because names like `cart.add` and `cart_add` both sanitize to `cart_add`.

### What was tricky to build
- The package move had to keep browser-facing names stable while changing Go import paths. The sessionstream event names were deliberately left unchanged so the TypeScript runtime did not need a protocol rewrite.
- Alias collision detection had to happen before registering provider tools because Geppetto's registry overwrites existing names by key.

### What warrants a second pair of eyes
- Review whether the proto package name `pinocchio.chatapp.frontendtools.v1` should remain separate from the main chatapp proto namespace.
- Review whether `RegisterManifestTools(...)` should also check collisions against pre-existing registry tools, not just collisions within the browser manifest.

### What should be done in the future
- Add optional web-chat browser frontend-tool UI support only when web-chat has a frontend runtime that can execute/respond to tool calls.

### Code review instructions
- Start with `/home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/pkg/chatapp/frontendtools/manager.go` and `bridge.go`.
- Validate with `cd /home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio && go test ./pkg/chatapp/frontendtools`.

### Technical details
- The proto message shapes match the prior chat-overlay messages.
- Command/event constants remain `ChatFrontendToolManifest`, `ChatFrontendToolResult`, `ChatFrontendToolCallRequested`, and `ChatFrontendToolResultReceived`.

## Step 3: Migrate chat-overlay to consume Pinocchio frontendtools

This step removed chat-overlay's private frontendtools implementation and pointed the app at the new Pinocchio package. The mock engine, HTTP handlers, real-runtime bridge, and tests now import `pinocchio/pkg/chatapp/frontendtools` and the Pinocchio frontendtools protobuf package.

The browser-facing TypeScript protocol stayed unchanged because the event names and protojson payload field names stayed stable. That kept the frontend migration small and allowed the existing tool browser smokes to validate compatibility.

### Prompt Context

**User prompt (verbatim):** (same as Step 2)

**Assistant interpretation:** Replace chat-overlay-local frontend tool code with the new Pinocchio package and validate the app still works.

**Inferred user intent:** Ensure chat-overlay becomes a consumer of Pinocchio frontendtools rather than retaining duplicated implementation code.

**Commit (code):** 2c62b12 — "refactor: consume pinocchio frontendtools"

**Commit (code):** e7f017b — "chore: use local pinocchio frontendtools module"

### What I did
- Replaced chat-overlay imports of `internal/frontendtools` with `github.com/go-go-golems/pinocchio/pkg/chatapp/frontendtools`.
- Replaced chat-overlay imports of `internal/pb/proto/chatoverlay/tools/v1` with `github.com/go-go-golems/pinocchio/pkg/chatapp/pb/proto/pinocchio/chatapp/frontendtools/v1`.
- Removed `/home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/internal/frontendtools`.
- Removed the old chat-overlay frontend tool proto and generated Go files.
- Added `replace github.com/go-go-golems/pinocchio => ../pinocchio` to chat-overlay so non-workspace module resolution can find unreleased Pinocchio packages.

### Why
- This is the ownership inversion the ticket was created to achieve: Pinocchio owns frontendtools; chat-overlay consumes them.
- The local replace mirrors the earlier CoinVault pattern until Pinocchio is released with the new package.

### What worked
- `go test ./...` passed in chat-overlay after the migration.
- `cd web && npm run build` passed.
- Browser smoke passed after restarting dev servers:
  - `OK: client-side tool browser smoke passed`
  - `OK: human-in-the-loop browser smoke passed`

### What didn't work
- `GOWORK=off go test ./...` initially failed because `pinocchio v0.11.0` does not contain the new `pkg/chatapp/frontendtools` or `serverkit` packages:
  - Error: `no required module provides package github.com/go-go-golems/pinocchio/pkg/chatapp/frontendtools`
  - Fix: add `replace github.com/go-go-golems/pinocchio => ../pinocchio` and run `go mod tidy`.
- The first browser smoke attempt failed because Vite restarted on port `5174` while the smoke script expected `5173`:
  - Error: `locator.click: Timeout 30000ms exceeded ... waiting for getByTitle('Open chat')`
  - Cause: stale process on `5173`; the restart script fell through to `5174`.
  - Fix: `lsof -ti:5173 | xargs -r kill`, restart dev servers, rerun smoke.

### What I learned
- The existing frontend runtime depends on event names and JSON fields, not Go protobuf package names, so no TypeScript changes were necessary.
- Local replaces are necessary for multi-repo migrations when hooks or validation commands use module mode outside `go.work`.

### What was tricky to build
- The tricky part was preserving provider aliases and browser names across the package move. The backend still registers provider-safe names like `cart_add`, but sessionstream/browser events still carry names like `cart.add`.
- Another sharp edge was local development state: stale Vite on `5173` caused a false smoke failure after the code migration had already compiled.

### What warrants a second pair of eyes
- Review the expanded chat-overlay `go.mod`/`go.sum` after `go mod tidy`; it added the local Pinocchio replace and explicit indirect dependencies.
- Review whether the old chat-overlay proto deletion affects any external consumer outside this repository.

### What should be done in the future
- Remove chat-overlay's local Pinocchio replace after releasing a Pinocchio version containing `frontendtools` and `serverkit`.
- Consider generating TypeScript frontendtools protos from Pinocchio if the frontend moves away from generic protojson handling.

### Code review instructions
- Start with chat-overlay `internal/webchat/server.go`, `handlers.go`, `real_runtime.go`, and `internal/mockengine/engine.go`.
- Confirm there are no remaining imports of `chat-overlay/internal/frontendtools`.
- Validate with:
  - `cd /home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm && go test ./...`
  - `cd /home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/web && npm run build`
  - `node ttmp/2026/05/29/CHATOVERLAY-002--elegant-chatbot-embedding-api-with-client-side-tool-calling/scripts/03-client-tool-browser-smoke.js`
  - `node ttmp/2026/05/29/CHATOVERLAY-002--elegant-chatbot-embedding-api-with-client-side-tool-calling/scripts/04-human-tool-browser-smoke.js`

### Technical details
- The old chat-overlay generated Go package `internal/pb/proto/chatoverlay/tools/v1` is gone.
- The new Go protobuf package is `frontendtoolsv1` under Pinocchio `pkg/chatapp/pb/proto/pinocchio/chatapp/frontendtools/v1`.

## Step 4: Add focused frontendtools manager and plugin tests

This step completed the Pinocchio package test coverage that was missing after the package move. The existing bridge test covered browser round trips and provider aliasing; the new tests cover manager manifest lookup, denied human-tool results, and timeline projection.

### Prompt Context

**User prompt (verbatim):** (same as Step 2)

**Assistant interpretation:** Finish the frontendtools migration with direct package tests for the non-bridge behavior.

**Inferred user intent:** Ensure the moved Pinocchio package is independently testable and not only validated through chat-overlay.

**Commit (code):** 347e757 — "test: cover frontendtools manager and plugin"

### What I did
- Added `/home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/pkg/chatapp/frontendtools/manager_test.go`.
- Added `/home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/pkg/chatapp/frontendtools/plugin_test.go`.
- Covered manifest descriptor lookup, availability checks, denied result propagation, and timeline projection for request/result events.

### Why
- The package should stand on its own in Pinocchio and should not rely solely on chat-overlay integration tests.

### What worked
- `go test ./pkg/chatapp/frontendtools` passed.
- Pinocchio pre-commit passed for commit `347e757`.

### What didn't work
- The first plugin test write accidentally included shell heredoc/control text at the end of the Go file, causing a parse error:
  - Error: `pkg/chatapp/frontendtools/plugin_test.go:55:1: expected declaration, found EOF`
  - Fix: remove the stray heredoc/script text from the file.
- The next test run failed because the fake timeline view did not implement the full `sessionstream.TimelineView` interface:
  - Error: `fakeTimelineView does not implement sessionstream.TimelineView (missing method List)`
  - Fix: add `List(kind string)` and `Ordinal() uint64` methods.

### What I learned
- `sessionstream.TimelineView` requires `Get`, `List`, and `Ordinal`, even when the code under test only calls `Get`.

### What was tricky to build
- The plugin test needed to simulate existing timeline state so the result projection could merge into the prior request entity. A tiny fake view was enough, but it had to satisfy the full interface.

### What warrants a second pair of eyes
- Review whether denied result handling should set a distinct Geppetto `ToolResult.Error` in all bridge paths; the current bridge already turns non-success statuses into errors.

### What should be done in the future
- Add HTTP route helper tests if/when frontend tool manifest/result routes become shared Pinocchio serverkit routes.

### Code review instructions
- Start with the new tests in `manager_test.go` and `plugin_test.go`.
- Validate with `cd /home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio && go test ./pkg/chatapp/frontendtools`.

### Technical details
- `TestManagerRequestReceivesDeniedResult` validates that a human-tool denial unblocks the waiting request with status `denied` and the browser-provided error text.
