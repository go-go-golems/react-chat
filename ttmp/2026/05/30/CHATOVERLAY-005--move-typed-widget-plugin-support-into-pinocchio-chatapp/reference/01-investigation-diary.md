---
Title: Investigation Diary
Ticket: CHATOVERLAY-005
Status: active
Topics:
    - chat-overlay
    - pinocchio
    - widgets
    - sessionstream
DocType: reference
Intent: long-term
Owners: []
RelatedFiles:
    - Path: ../../../../../../../pinocchio/cmd/web-chat/main.go
      Note: Registers the shared widget plugin in Pinocchio web-chat
    - Path: ../../../../../../../pinocchio/cmd/web-chat/web/src/webchat/cards.tsx
      Note: Generic widget instance fallback renderer
    - Path: ../../../../../../../pinocchio/pkg/chatapp/widgets/plugin.go
      Note: Shared widget plugin
    - Path: ../../../../../../../pinocchio/pkg/chatapp/widgets/plugin_test.go
      Note: Widget lifecycle projection tests
    - Path: ../../../../../../../pinocchio/proto/pinocchio/chatapp/widgets/v1/widget.proto
      Note: Shared Pinocchio widget lifecycle protobuf contract
    - Path: internal/mockengine/engine.go
      Note: Chat-overlay mock engine now emits Pinocchio widget events/helpers
    - Path: internal/webchat/server.go
      Note: Chat-overlay now installs the Pinocchio widget plugin
ExternalSources: []
Summary: Chronological diary for typed widget plugin migration design.
LastUpdated: 2026-05-30T21:05:00-04:00
WhatFor: Record design-package creation and future implementation steps.
WhenToUse: Read before continuing CHATOVERLAY-005 work.
---


# Investigation Diary

## Goal

Capture the investigation, implementation, validation, and closeout for CHATOVERLAY-005.

## Step 1: Create the design package

This step created a focused ticket workspace and wrote the implementation guide for the requested refactor. The work is documentation-only: it maps the current chat-overlay and Pinocchio web-chat architecture, identifies the reusable seams, and gives a new intern an implementation path with API sketches, diagrams, file references, and validation steps.

### Prompt Context

**User prompt (verbatim):** "ok, so we have 3 things i want to do :

- move the common go part from web-chat and chatoverlay into pkg/chatapp
- move frontend tools support into pkg/chatapp too
- move widget plugin support into pkg/chatapp too.

Create 3 tickets for these, and then for each ticket:

Create  a detailed analysis / design / implementation guide that is for a new intern, explaining all the parts of the system needed to understand what it is, with prose paragraphs and bullet point sand pseudocode and diagrams and api references and file references. It should be very clear and technical. Store in the ticket and the nupload to remarkable."

**Assistant interpretation:** Create the third ticket and design the move of generic typed widget instance support into Pinocchio chatapp.

**Inferred user intent:** Separate generic widget-instance infrastructure from product-specific chat-overlay widgets and clarify its relationship to web-chat cards.

**Commit (code):** N/A — documentation and planning only.

### What I did
- Created the `CHATOVERLAY-005` docmgr ticket workspace.
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

## Step 2: Move typed widget support into Pinocchio

This step implemented the CHATOVERLAY-005 migration. The generic widget lifecycle contract, sessionstream schema registration, live UI projection, durable timeline projection, patch merge logic, and publishing helpers now live in `pinocchio/pkg/chatapp/widgets`, while chat-overlay keeps only its ecommerce widget definitions and React renderers.

The migration also made Pinocchio web-chat aware of generic widget timeline entities. It registers the shared widget plugin on the Go side and renders unknown widget instances as JSON cards in the frontend, without importing chat-overlay or ecommerce-specific code.

### Prompt Context

**User prompt (verbatim):** "Do all of `CHATOVERLAY-005`."

**Assistant interpretation:** Implement the full typed widget plugin extraction, migrate chat-overlay to consume Pinocchio widgets, add web-chat generic rendering, validate, and close ticket bookkeeping.

**Inferred user intent:** Finish the last planned Pinocchio chatapp extraction so common widget streaming infrastructure is owned by Pinocchio and application-specific widgets remain app-local.

**Commit (code):** 7b34858 — "feat: add chatapp widgets package"; c0b6fa7 — "feat: render chatapp widgets in web chat"; 7607dca — "chore: add generated widget loggers"; eb202bb — "feat: add chatapp widget publish helpers"; d8c2eb7 — "refactor: consume pinocchio widgets"; 4d973c2 — "test: add widget browser smoke"; 9341029 — "refactor: use widget publish helpers"

### What I did
- Added `pinocchio/proto/pinocchio/chatapp/widgets/v1/widget.proto` and generated Go protobuf code under `pinocchio/pkg/chatapp/pb/proto/pinocchio/chatapp/widgets/v1`.
- Added `pinocchio/pkg/chatapp/widgets` with `WidgetPlugin`, schema registration, UI projection, timeline projection, patch merging, lifecycle constants, and publish helpers.
- Added widget plugin tests covering started, patched, completed, removed, and unknown-event behavior.
- Registered the shared widget plugin in Pinocchio web-chat and added a generic `WidgetInstanceCard` renderer for `ChatWidgetInstance` entities.
- Migrated chat-overlay from `internal/widgets` and `internal/pb/proto/chatoverlay/widgets/v1` to `github.com/go-go-golems/pinocchio/pkg/chatapp/widgets` and `github.com/go-go-golems/pinocchio/pkg/chatapp/pb/proto/pinocchio/chatapp/widgets/v1`.
- Removed the duplicated chat-overlay widget proto, generated widget pb package, and internal widget plugin.
- Added `scripts/01-widget-browser-smoke.js` to the ticket workspace and validated the `show me boots` widget flow in the browser.

### Why
- Widget lifecycle projection is generic chat application infrastructure, not ecommerce-specific behavior.
- Moving it into Pinocchio removes duplicated plugin/proto ownership and lets chat-overlay depend on reusable core packages instead of preserving a private protocol fork.
- Keeping ecommerce-specific widget rendering in chat-overlay preserves the package boundary: Pinocchio owns widget instances; applications own widget catalogs and visual renderers.

### What worked
- `go test ./pkg/chatapp/widgets` passed after adding the new Pinocchio package.
- Pinocchio pre-commit passed multiple times, including `go generate ./...`, `go build ./...`, `golangci-lint`, `go vet`, `go test ./...`, web typecheck, and web lint.
- `go test ./...` passed in chat-overlay after removing the duplicated widget package.
- `cd web && npm run build` passed in chat-overlay.
- The browser smoke passed with `OK: widget browser smoke passed` after restarting the mock backend/frontend.

### What didn't work
- The first widget browser smoke expected older/different assertion text (`Here are three retro boot options:`, `Retro Hiking Boot`, and `ProductCarousel`) and failed with:
  - `locator.waitFor: Timeout 15000ms exceeded.`
  - `waiting for getByText('Here are three retro boot options:') to be visible`
- Inspecting the page body showed the current mock response renders `Here are some great boots I found for you:`, `RECOMMENDED BOOTS`, and `TrailBlazer Pro`, so I updated the smoke assertions and reran it successfully.
- Node printed a module-type warning for the ESM smoke script because the repository root does not declare `type: module`; this warning did not affect the test outcome.

### What I learned
- The sessionstream entity kind can remain `ChatWidgetInstance` for compatibility while the proto package moves to `pinocchio.chatapp.widgets.v1`.
- Pinocchio web-chat can support generic widget entities without needing to know application-specific widget schemas.
- The generated `logcopter.go` files are produced by Pinocchio pre-commit/go-generate and must be tracked with the new package.

### What was tricky to build
- The key boundary was avoiding an app-core dependency inversion. The solution was to move only lifecycle protocol and projection mechanics into Pinocchio, while leaving ecommerce widget specs, product cards, and chat-overlay's custom React `WidgetOutlet` in chat-overlay.
- The browser smoke initially looked like a functional failure, but the underlying issue was stale test expectations rather than broken widget projection. I verified the rendered body text, updated the assertions to match the current mock data, and reran the smoke successfully.
- Commit ordering also mattered because Pinocchio's pre-commit generated logger files after the first package commit; I committed those generated files separately so the tree stayed clean.

### What warrants a second pair of eyes
- Review `pinocchio/pkg/chatapp/widgets/plugin.go` for event-name compatibility and whether future `PinocchioWidget...` aliases should be added before external release.
- Review the generic Pinocchio web-chat widget renderer to decide whether JSON fallback is sufficient or whether renderers should be registered by widget name.
- Review whether widget publish helper signatures should be considered stable public API before releasing Pinocchio.

### What should be done in the future
- Decide whether to add compatibility aliases if the event names move from `ChatWidget...` to `PinocchioWidget...`.
- Remove local `replace github.com/go-go-golems/pinocchio => ../pinocchio` entries after releasing Pinocchio with `serverkit`, `frontendtools`, and `widgets`.
- Add durable restart tests for widget timeline hydration alongside the pending frontend tool restart tests.

### Code review instructions
- Start in `pinocchio/pkg/chatapp/widgets/plugin.go` and `pinocchio/proto/pinocchio/chatapp/widgets/v1/widget.proto` to review the shared protocol and projection mechanics.
- Review `pinocchio/pkg/chatapp/widgets/plugin_test.go` for lifecycle projection coverage.
- Review `pinocchio/cmd/web-chat/main.go`, `pinocchio/cmd/web-chat/web/src/webchat/cards.tsx`, and `pinocchio/cmd/web-chat/web/src/webchat/rendererRegistry.ts` for generic web-chat integration.
- Review `2026-05-29--chatbot-overlay-glm/internal/mockengine/engine.go`, `internal/webchat/server.go`, and `internal/webchat/server_test.go` for chat-overlay migration.
- Validate with: `cd pinocchio && go test ./pkg/chatapp/widgets ./cmd/web-chat ./cmd/web-chat/app && cd cmd/web-chat/web && npm run build`.
- Validate chat-overlay with: `cd 2026-05-29--chatbot-overlay-glm && go test ./... && cd web && npm run build`.
- Validate browser behavior with: `node ttmp/2026/05/30/CHATOVERLAY-005--move-typed-widget-plugin-support-into-pinocchio-chatapp/scripts/01-widget-browser-smoke.js` after restarting dev servers.

### Technical details
- Widget event names remain `ChatWidgetInstanceStarted`, `ChatWidgetInstancePatched`, `ChatWidgetInstanceCompleted`, and `ChatWidgetInstanceRemoved`.
- The timeline entity kind remains `ChatWidgetInstance`.
- The moved protobuf package is `pinocchio.chatapp.widgets.v1` with Go package `github.com/go-go-golems/pinocchio/pkg/chatapp/pb/proto/pinocchio/chatapp/widgets/v1`.
- `WidgetInstancePatched` keeps `patch_paths` semantics: empty paths merge all patch fields; non-empty paths update only matching top-level fields.
