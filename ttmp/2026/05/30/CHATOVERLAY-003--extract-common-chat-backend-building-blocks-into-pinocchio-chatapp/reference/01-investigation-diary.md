---
Title: Investigation Diary
Ticket: CHATOVERLAY-003
Status: active
Topics:
    - chat-overlay
    - pinocchio
    - sessionstream
    - backend
DocType: reference
Intent: long-term
Owners: []
RelatedFiles:
    - Path: ../../../../../../../2026-03-16--gec-rag/internal/webchat/sessionstream/sessionstream_contracts.go
      Note: CoinVault aliases shared HTTP contracts (commit 3fd0372)
    - Path: ../../../../../../../2026-03-16--gec-rag/internal/webchat/sessionstream/sessionstream_encoding.go
      Note: CoinVault uses shared snapshot/write helpers (commit 0b1ba42)
    - Path: ../../../../../../../2026-03-16--gec-rag/internal/webchat/sessionstream/sessionstream_handlers.go
      Note: CoinVault uses shared path/decode helpers (commit 0b1ba42)
    - Path: ../../../../../../../2026-03-16--gec-rag/internal/webchat/sessionstream/sessionstream_store.go
      Note: CoinVault wrapper migration to serverkit hydration store (commit 2c399ed)
    - Path: ../../../../../../../2026-03-16--gec-rag/internal/webchat/turn_store.go
      Note: CoinVault wrapper migration to serverkit turn store (commit 2c399ed)
    - Path: ../../../../../../../pinocchio/cmd/web-chat/app/contracts.go
      Note: web-chat aliases shared HTTP contracts (commit 7ab73f1)
    - Path: ../../../../../../../pinocchio/cmd/web-chat/app/server.go
      Note: web-chat uses serverkit HTTP helpers while keeping handlers local (commit 67993d1)
    - Path: ../../../../../../../pinocchio/cmd/web-chat/main.go
      Note: web-chat migration to serverkit turn store (commit ee42217)
    - Path: ../../../../../../../pinocchio/pkg/chatapp/serverkit/contracts.go
      Note: Shared HTTP API contract structs (commit 7ab73f1)
    - Path: ../../../../../../../pinocchio/pkg/chatapp/serverkit/http.go
      Note: Shared small HTTP helpers (commit 67993d1)
    - Path: ../../../../../../../pinocchio/pkg/chatapp/serverkit/http_test.go
      Note: Helper tests for path parsing and JSON decoding (commit 67993d1)
    - Path: ../../../../../../../pinocchio/pkg/chatapp/serverkit/stores.go
      Note: New shared store helpers and memory turn store (commit 7235bd8)
    - Path: internal/webchat/helpers.go
      Note: |-
        chat-overlay aliases shared HTTP contracts (commit 993fd6d)
        chat-overlay uses shared JSON helpers (commit 4f7300b)
    - Path: internal/webchat/server.go
      Note: chat-overlay store cleanup and interface migration (commit ea01179)
ExternalSources: []
Summary: Chronological diary for common backend extraction design.
LastUpdated: 2026-05-30T20:20:00-04:00
WhatFor: Record design-package creation and future implementation steps.
WhenToUse: Read before continuing CHATOVERLAY-003 work.
---




# Investigation Diary

## Goal

Capture the initial investigation and design-package creation for CHATOVERLAY-003.

## Step 1: Create the design package

This step created a focused ticket workspace and wrote the implementation guide for the requested refactor. The work is documentation-only: it maps the current chat-overlay and Pinocchio web-chat architecture, identifies the reusable seams, and gives a new intern an implementation path with API sketches, diagrams, file references, and validation steps.

### Prompt Context

**User prompt (verbatim):** "ok, so we have 3 things i want to do :

- move the common go part from web-chat and chatoverlay into pkg/chatapp
- move frontend tools support into pkg/chatapp too
- move widget plugin support into pkg/chatapp too.

Create 3 tickets for these, and then for each ticket:

Create  a detailed analysis / design / implementation guide that is for a new intern, explaining all the parts of the system needed to understand what it is, with prose paragraphs and bullet point sand pseudocode and diagrams and api references and file references. It should be very clear and technical. Store in the ticket and the nupload to remarkable."

**Assistant interpretation:** Create the first of three tickets and design the shared backend/server/store extraction from chat-overlay and web-chat into Pinocchio chatapp.

**Inferred user intent:** Prepare an intern-ready plan for reducing duplicated Go backend plumbing and keeping package ownership correct.

**Commit (code):** N/A — documentation and planning only.

### What I did
- Created the `CHATOVERLAY-003` docmgr ticket workspace.
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

## Step 2: Add shared serverkit store primitives in Pinocchio

This step started the implementation by extracting the lowest-risk common backend seam: timeline hydration store opening, turn store opening, cleanup ordering, and process-local turn history. The new package lives in Pinocchio because both chat-overlay and CoinVault/web-chat can depend on Pinocchio, while Pinocchio must not depend on either application.

The result is a small `pkg/chatapp/serverkit` package that keeps the existing app behaviors explicit. Apps that previously wanted no turn store can keep that default; chat-overlay can opt into an in-memory turn store when no SQLite turn database is configured.

### Prompt Context

**User prompt (verbatim):** "continue"

**Assistant interpretation:** Continue the requested task-by-task implementation of the first migration ticket, starting with reusable Pinocchio backend pieces and then migrating the apps.

**Inferred user intent:** Move from planning to working code, with commits, tests, and diary updates after coherent implementation slices.

**Commit (code):** 7235bd8 — "feat: add chatapp serverkit stores"

### What I did
- Added `/home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/pkg/chatapp/serverkit/stores.go`.
- Added `/home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/pkg/chatapp/serverkit/stores_test.go`.
- `go generate ./...` created `/home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/pkg/chatapp/serverkit/logcopter.go` during the pre-commit hook.
- Implemented `StoreOptions`, `OpenHydrationStore`, `OpenTurnStore`, `OpenStores`, `CloseAll`, and `MemoryTurnStore`.
- Added tests for in-memory latest final turn loading, SQLite turn persistence across reopen, and SQLite hydration store parent-directory creation.

### Why
- The duplicated store helpers were the safest first extraction: they have narrow inputs/outputs, are already used by multiple applications, and do not require changing HTTP route semantics.
- Keeping `EmptyTurnStore` explicit avoids forcing chat-overlay's in-memory history behavior onto web-chat or CoinVault.

### What worked
- `go test ./pkg/chatapp/serverkit` passed.
- Pinocchio pre-commit eventually passed, including `go generate ./...`, frontend build, `go build ./...`, lint, vet, and `go test ./...`.

### What didn't work
- The first commit attempt failed during lint because a local variable shadowed the predeclared `copy` identifier:
  - Command: `git commit -m "feat: add chatapp serverkit stores"`
  - Error: `pkg/chatapp/serverkit/stores.go:221:4: variable copy has same name as predeclared identifier (predeclared)`
- I fixed this by renaming the local variable to `snapCopy` and rerunning the focused test and commit.

### What I learned
- The Pinocchio pre-commit hook runs a broad validation set, including generated logcopter package files. New packages should be expected to receive a generated `logcopter.go` file even when the initial code does not call the logger directly.
- Chat-overlay and CoinVault need two different empty-turn-store behaviors, so the shared helper needs a policy knob rather than a single implicit default.

### What was tricky to build
- The tricky part was preserving existing behavior while still eliminating duplicate code. A shared `OpenTurnStore` that always returned an in-memory store would have changed web-chat/CoinVault semantics; one that always returned `nil` would have broken chat-overlay's no-DB real-runtime history. The `EmptyTurnStoreMode` option makes that decision local to each app.
- Cleanup ordering also mattered: store opening can partially succeed. `OpenStores` and `CloseAll` close resources in reverse order and preserve the first error so callers can use one cleanup path.

### What warrants a second pair of eyes
- Review whether `serverkit` is the right package name before more HTTP/server abstractions move into it.
- Review whether `MemoryTurnStore` belongs in `serverkit` long term or should move closer to `pkg/persistence/chatstore`.

### What should be done in the future
- Add shared HTTP route contracts only after all store migrations are complete and the remaining duplication is clearer.

### Code review instructions
- Start with `/home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/pkg/chatapp/serverkit/stores.go`.
- Check `OpenTurnStore` empty-store behavior and SQLite DSN generation.
- Validate with `cd /home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio && go test ./pkg/chatapp/serverkit`.

### Technical details
- `OpenHydrationStore("", "", reg)` returns an in-memory sessionstream SQLite hydration store.
- `OpenTurnStore(StoreOptions{})` returns no turn store and a no-op close function.
- `OpenTurnStore(StoreOptions{EmptyTurnStore: EmptyTurnStoreMemory})` returns `MemoryTurnStore`.

## Step 3: Migrate web-chat, chat-overlay, and CoinVault store helpers

This step wired the new Pinocchio store primitives into the three requested consumers. Pinocchio `web-chat` now opens turn stores through `serverkit`, chat-overlay delegates both hydration and turn-store opening to `serverkit`, and CoinVault's local web-chat wrappers delegate to the same helpers.

The migrations intentionally kept each application's route structure and CLI flags unchanged. This slice is about sharing durable-store construction and cleanup semantics, not yet extracting HTTP handlers or route contracts.

### Prompt Context

**User prompt (verbatim):** (same as Step 2)

**Assistant interpretation:** Continue by updating the requested applications to consume the new Pinocchio functionality.

**Inferred user intent:** Prove the shared package is useful by removing duplicated store code from `web-chat`, `2026-03-16--gec-rag/`, and `chatoverlay`.

**Commit (code):** ee42217 — "refactor: use serverkit turn store in web chat"

**Commit (code):** ea01179 — "refactor: use pinocchio serverkit stores"

**Commit (code):** 2c399ed — "refactor: use pinocchio serverkit webchat stores"

### What I did
- Updated `/home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/main.go` to replace `openWebChatTurnStore(...)` with `serverkit.OpenTurnStore(...)`.
- Updated `/home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/internal/webchat/hydration_store_options.go` to call `serverkit.OpenHydrationStore(...)`.
- Updated `/home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/internal/webchat/turn_store_options.go` to call `serverkit.OpenTurnStore(...)` with `EmptyTurnStoreMemory`.
- Removed duplicated chat-overlay memory turn store code from `/home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/internal/webchat/turn_store.go`.
- Updated `/home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/internal/webchat/turn_store_test.go` to use `serverkit.NewMemoryTurnStore()`.
- Updated `/home/manuel/workspaces/2026-05-29/chatbot-react/2026-03-16--gec-rag/internal/webchat/sessionstream/sessionstream_store.go` to wrap `serverkit.OpenHydrationStore(...)`.
- Updated `/home/manuel/workspaces/2026-05-29/chatbot-react/2026-03-16--gec-rag/internal/webchat/turn_store.go` to wrap `serverkit.OpenTurnStore(...)`.
- Added a temporary local module replacement in CoinVault's `/home/manuel/workspaces/2026-05-29/chatbot-react/2026-03-16--gec-rag/go.mod` so `GOWORK=off` hooks can resolve the newly-created local Pinocchio package before it is released upstream.

### Why
- The first ticket specifically asks for shared Go backend pieces to move into `pkg/chatapp` and for `web-chat`, `2026-03-16--gec-rag/`, and `chatoverlay` to leverage the new functionality.
- Store construction was duplicated in all three places and had already accumulated subtle behavior differences.

### What worked
- Pinocchio focused tests passed: `go test ./cmd/web-chat ./cmd/web-chat/app`.
- Pinocchio pre-commit passed for commit `ee42217`.
- Chat-overlay tests passed: `go test ./internal/webchat` and `go test ./...`.
- CoinVault focused tests passed: `go test ./internal/webchat/...`.
- CoinVault pre-commit passed after adding the local `replace github.com/go-go-golems/pinocchio => ../pinocchio` line.

### What didn't work
- A full CoinVault `go test ./...` failed because unrelated historical ticket scripts under `ttmp/` contain multiple `main` functions in the same package:
  - Command: `cd /home/manuel/workspaces/2026-05-29/chatbot-react/2026-03-16--gec-rag && go test ./...`
  - Error excerpts:
    - `ttmp/2026/05/05/CV-PROFILES-K3S-WAFER--update-coinvault-k3s-deployment-profiles-with-wafer-ai-models-in-new-pinocchio-config-layout/scripts/02-list-profile-models.go:11:6: main redeclared in this block`
    - `ttmp/2026/03/16/COINVAULT-007--coinvault-safe-postgresql-tooling-with-pg-query-go-v6/scripts/02-limit-node-shape-probe.go:9:6: main redeclared in this block`
- The first CoinVault commit attempt failed because its pre-commit lint runs with `GOWORK=off`, so it could not resolve the unreleased local `serverkit` package from `pinocchio v0.11.0`:
  - Error: `could not import github.com/go-go-golems/pinocchio/pkg/chatapp/serverkit ... no required module provides package github.com/go-go-golems/pinocchio/pkg/chatapp/serverkit`
- I fixed that local-hook failure by adding the explicit `replace github.com/go-go-golems/pinocchio => ../pinocchio` line and rerunning the commit.

### What I learned
- Workspace builds can hide module-resolution problems that pre-commit hooks expose with `GOWORK=off`.
- CoinVault's existing repository-wide `go test ./...` is not a reliable validation command while historical `ttmp/.../scripts` packages are included; focused `./cmd/... ./internal/...` tests match the pre-commit hook and passed.

### What was tricky to build
- The biggest sharp edge was module resolution across multiple local repositories. The local `go.work` makes the new Pinocchio package visible, but CoinVault's lint intentionally disables workspace mode. Until Pinocchio is released with `serverkit`, CoinVault needs a local replace or the hook cannot typecheck the import.
- Chat-overlay's timeline helper previously returned the concrete SQLite store, while the shared helper returns the `sessionstream.HydrationStore` interface plus a close function. I updated `server.go` cleanup to use the returned close function instead of calling `store.Close()` directly.

### What warrants a second pair of eyes
- Review the temporary CoinVault `replace` directive. It is correct for this local multi-repo branch but should be removed when a Pinocchio version containing `serverkit` is tagged and consumed.
- Review that chat-overlay still gets in-memory turn history by default, while web-chat and CoinVault still get no turn store when no turn DB/DSN is configured.

### What should be done in the future
- Release or pseudo-version Pinocchio with `pkg/chatapp/serverkit`, then update CoinVault's `go.mod` to depend on that version and remove the local replace.
- Continue with route-contract extraction only after deciding which handler duplication remains worth centralizing.

### Code review instructions
- For web-chat, start at `/home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/main.go` near turn-store startup.
- For chat-overlay, start at `/home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/internal/webchat/server.go` and the two `*_store_options.go` files.
- For CoinVault, start at `/home/manuel/workspaces/2026-05-29/chatbot-react/2026-03-16--gec-rag/internal/webchat/turn_store.go` and `/home/manuel/workspaces/2026-05-29/chatbot-react/2026-03-16--gec-rag/internal/webchat/sessionstream/sessionstream_store.go`.
- Validate with:
  - `cd /home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio && go test ./cmd/web-chat ./cmd/web-chat/app ./pkg/chatapp/serverkit`
  - `cd /home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm && go test ./...`
  - `cd /home/manuel/workspaces/2026-05-29/chatbot-react/2026-03-16--gec-rag && go test ./cmd/... ./internal/...`

### Technical details
- Chat-overlay uses `serverkit.StoreOptions{TurnsDSN: opts.TurnsDSN, TurnsDB: opts.TurnsDB, EmptyTurnStore: serverkit.EmptyTurnStoreMemory}`.
- Pinocchio web-chat uses `serverkit.StoreOptions{TurnsDSN: s.TurnsDSN, TurnsDB: s.TurnsDB}`.
- CoinVault keeps app-local wrapper functions so call sites do not change, but the implementation now delegates to Pinocchio.

## Step 4: Share common HTTP contract structs

This step extracted the next low-risk shared seam: the JSON request/response structs used by the chat HTTP API. Instead of moving handlers yet, each app now aliases the common contracts where the wire shape is already shared.

The extraction intentionally supports the superset required by Pinocchio web-chat, CoinVault, and chat-overlay. Fields such as `application_profile`, `registry`, and `profile` remain optional, so simpler apps can ignore them without changing their public API.

### Prompt Context

**User prompt (verbatim):** (same as Step 2)

**Assistant interpretation:** Continue the first ticket by centralizing common HTTP API surface without prematurely moving app-specific handlers.

**Inferred user intent:** Reduce duplicate backend API structs while keeping app-specific runtime resolution, export, and frontend-tool routes separate.

**Commit (code):** 7ab73f1 — "feat: share chatapp HTTP contracts"

**Commit (code):** 993fd6d — "refactor: use shared chatapp HTTP contracts"

**Commit (code):** 3fd0372 — "refactor: use shared chatapp HTTP contracts"

### What I did
- Added `/home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/pkg/chatapp/serverkit/contracts.go`.
- Replaced Pinocchio web-chat's local contract definitions in `/home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/app/contracts.go` with type aliases to `serverkit` contracts.
- Replaced common chat-overlay request/response definitions in `/home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/internal/webchat/helpers.go` with aliases to `serverkit` contracts.
- Replaced CoinVault sessionstream contract definitions in `/home/manuel/workspaces/2026-05-29/chatbot-react/2026-03-16--gec-rag/internal/webchat/sessionstream/sessionstream_contracts.go` with aliases to `serverkit` contracts.

### Why
- The create/submit/stop/snapshot JSON contracts are shared enough to centralize now.
- Handler extraction is riskier because web-chat, chat-overlay, and CoinVault still differ in runtime resolution, frontend-tool endpoints, export routes, and app-specific request fields.

### What worked
- Pinocchio focused tests passed: `go test ./pkg/chatapp/serverkit ./cmd/web-chat ./cmd/web-chat/app`.
- Pinocchio pre-commit passed for commit `7ab73f1`.
- Chat-overlay tests passed: `go test ./...`.
- CoinVault focused tests passed: `go test ./internal/webchat/...`.
- CoinVault pre-commit passed for commit `3fd0372`.

### What didn't work
- N/A for this step. The contract migration compiled and tested cleanly once the common struct included the CoinVault-specific optional `application_profile` field.

### What I learned
- The API surface is close but not identical. CoinVault needs `application_profile`; web-chat needs `registry` and `profile`; chat-overlay currently only needs `prompt` and `sessionId` for the common routes.
- Type aliases let each app keep its local exported/unexported names while moving the actual wire-shape definition into Pinocchio.

### What was tricky to build
- The tricky part was choosing a contract shape that avoids accidental API breakage. I used a superset with `omitempty` on optional fields so adding shared fields does not force extra JSON output in simpler apps.
- I did not alias chat-overlay's snapshot response yet because it has a smaller historical shape than web-chat/CoinVault; changing it would add fields such as `snapshotOrdinal` and `tombstone` to that endpoint. That should be reviewed separately if snapshot unification becomes necessary.

### What warrants a second pair of eyes
- Review whether `application_profile` should be in the generic contract or whether CoinVault should keep an app-specific wrapper that embeds the generic request.
- Review whether snapshot response unification should happen in this ticket or remain a follow-up.

### What should be done in the future
- Decide route-handler extraction boundaries after comparing remaining duplicate logic in create/submit/snapshot/stop handlers.
- If the full handler extraction proceeds, prefer small helper functions over a large generic server type.

### Code review instructions
- Start with `/home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/pkg/chatapp/serverkit/contracts.go`.
- Check each app's contract alias file/helper to verify local names still map to the intended JSON shape.
- Validate with:
  - `cd /home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio && go test ./pkg/chatapp/serverkit ./cmd/web-chat ./cmd/web-chat/app`
  - `cd /home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm && go test ./...`
  - `cd /home/manuel/workspaces/2026-05-29/chatbot-react/2026-03-16--gec-rag && go test ./cmd/... ./internal/...`

### Technical details
- `serverkit.CreateSessionRequest` and `serverkit.SubmitMessageRequest` include optional `ApplicationProfile`, `Profile`, and `Registry` fields.
- `serverkit.SessionSnapshotResponse` includes the web-chat/CoinVault snapshot shape; chat-overlay has not switched to it yet.

## Step 5: Add small HTTP helpers instead of a full route registrar

This step followed the decision to avoid a full route-handler extraction for now. The shared package now owns small, low-risk helpers for JSON request decoding, JSON response writing, session path parsing, protobuf-to-JSON payload encoding, and canonical snapshot response construction.

The apps still own their route handlers. That keeps runtime resolution, authorization, mock-engine branching, export routes, frontend-tool routes, and app-specific snapshot shapes in the application packages while removing more duplicated mechanics.

### Prompt Context

**User prompt (verbatim):** "add small helpers, continue"

**Assistant interpretation:** Do not extract the full HTTP route registrar yet; centralize the safe helper pieces and keep continuing the first ticket task-by-task.

**Inferred user intent:** Reduce duplication without over-abstracting route behavior that still differs between web-chat, chat-overlay, and CoinVault.

**Commit (code):** 67993d1 — "feat: add serverkit HTTP helpers"

**Commit (code):** 4f7300b — "refactor: use serverkit HTTP helpers"

**Commit (code):** 0b1ba42 — "refactor: use serverkit HTTP helpers"

### What I did
- Added `/home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/pkg/chatapp/serverkit/http.go` with:
  - `DecodeJSON(...)`
  - `WriteJSON(...)`
  - `WriteError(...)`
  - `ParseSessionPath(...)`
  - `ParseSessionPathWithPrefix(...)`
  - `EncodeSnapshotResponse(...)`
  - `EncodeProtoJSON(...)`
- Added `/home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/pkg/chatapp/serverkit/http_test.go` with tests for session path parsing and empty/malformed JSON decoding.
- Updated `/home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/app/server.go` to use the shared helpers while keeping local handler functions and the local snapshot status heuristic.
- Updated `/home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/internal/webchat/helpers.go` to use shared JSON decode/write helpers.
- Updated `/home/manuel/workspaces/2026-05-29/chatbot-react/2026-03-16--gec-rag/internal/webchat/sessionstream/sessionstream_encoding.go` and `sessionstream_handlers.go` to use shared JSON, path parsing, and snapshot encoding helpers while keeping the CoinVault status heuristic.

### Why
- A full route registrar would need configuration hooks for runtime resolution, authorization, mock-vs-real runtime dispatch, stop behavior, exports, debug routes, and frontend tools.
- Small helpers remove duplication now and keep the next extraction reversible.

### What worked
- Pinocchio focused tests passed: `go test ./pkg/chatapp/serverkit ./cmd/web-chat/app ./cmd/web-chat`.
- Pinocchio pre-commit passed for commit `67993d1` after a lint fix.
- Chat-overlay tests passed: `go test ./...`.
- CoinVault focused tests passed: `go test ./internal/webchat/...`.
- CoinVault pre-commit passed for commit `0b1ba42` after removing an unused wrapper.

### What didn't work
- The first Pinocchio commit attempt failed because the new parse helpers used named return values, which violate the repository's `nonamedreturns` lint rule:
  - Error: `pkg/chatapp/serverkit/http.go:42:1: named return "sessionID" with type "string" found (nonamedreturns)`
  - Error: `pkg/chatapp/serverkit/http.go:46:1: named return "sessionID" with type "string" found (nonamedreturns)`
- I fixed this by changing both helpers to unnamed return values.
- The first CoinVault helper commit attempt failed because `encodeProtoJSON` became unused after snapshot encoding moved fully to `serverkit.EncodeSnapshotResponse(...)`:
  - Error: `internal/webchat/sessionstream/sessionstream_encoding.go:30:6: func encodeProtoJSON is unused (unused)`
- I removed the unused wrapper and reran the focused tests and commit.

### What I learned
- The shared helper layer is the right granularity for this step: it reduces duplicated mechanics without forcing handler lifecycle choices.
- `DecodeJSON` now treats only an empty body as acceptable. Chat-overlay previously ignored `json.SyntaxError` in its local helper; the shared helper reports malformed JSON as an error, which is safer and aligns with the other handlers.

### What was tricky to build
- Snapshot encoding needed to preserve different status heuristics. Pinocchio web-chat has a richer status heuristic that accounts for user and assistant message roles; CoinVault keeps a simpler last-status heuristic. The shared helper therefore accepts a `statusFn` rather than hard-coding one policy.
- Handler packages also had debug/export files that called the old unexported `encodeProtoJSON`/`writeJSON` helpers. I kept a thin `encodeProtoJSON` wrapper in Pinocchio web-chat so those files continue to compile while centralizing the actual implementation.

### What warrants a second pair of eyes
- Review the stricter `DecodeJSON` behavior for chat-overlay malformed JSON requests. It should be an improvement, but it is a behavior change.
- Review whether `CreatedAt` should stay in the generic `SnapshotEntity` as a compatibility field or whether older chat-overlay snapshot shape should remain separate.

### What should be done in the future
- Add a short route-handler extraction plan that explicitly lists which parts are safe to extract and which should stay app-local.
- Defer a generic route registrar unless the remaining duplication stays high after frontendtools/widgets migrate into Pinocchio.

### Code review instructions
- Start with `/home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/pkg/chatapp/serverkit/http.go` and `http_test.go`.
- Review how `/home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/app/server.go` keeps handler ownership while delegating mechanics.
- Validate with:
  - `cd /home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio && go test ./pkg/chatapp/serverkit ./cmd/web-chat/app ./cmd/web-chat`
  - `cd /home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm && go test ./...`
  - `cd /home/manuel/workspaces/2026-05-29/chatbot-react/2026-03-16--gec-rag && go test ./cmd/... ./internal/...`

### Technical details
- `serverkit.DecodeJSON` accepts empty bodies but returns malformed JSON errors.
- `serverkit.EncodeSnapshotResponse` accepts a status callback so apps can keep local status semantics.
- `serverkit.ParseSessionPath` is strict: it accepts `/api/chat/sessions/{id}` and `/api/chat/sessions/{id}/{action}` only.

## Step 6: Close CHATOVERLAY-003 and defer full route-handler extraction

This step closed the common-backend extraction ticket at the intended safe boundary. The shared code now covers store construction, cleanup, HTTP contracts, JSON helpers, path parsing, protobuf JSON encoding, and snapshot response encoding. The remaining possible route-handler extraction is explicitly deferred.

The decision is to revisit a full route registrar only after frontend tools and widgets move into Pinocchio. Those migrations change the route set and plugin package boundaries, so extracting route handlers before them would likely create unstable configuration hooks.

### Prompt Context

**User prompt (verbatim):** "ok, close 003,  do CHATOVERLAY-004 start to finish, similarly keep diary and commit at appropriate intervals"

**Assistant interpretation:** Finalize CHATOVERLAY-003 documentation/bookkeeping and then move on to the frontend-tools migration ticket with the same commit-and-diary discipline.

**Inferred user intent:** Stop the first ticket at the helper extraction boundary and avoid spending time on a premature generic route registrar.

**Commit (code):** N/A — documentation closure only.

### What I did
- Marked the remaining route-handler extraction tasks as completed-by-decision/deferred.
- Recorded that full route registration is a follow-up after CHATOVERLAY-004 and CHATOVERLAY-005 stabilize the final route/plugin surface.
- Kept all code commits from the ticket intact and did not add another code slice.

### Why
- The helper layer delivered useful reuse without forcing a generic server API over app-specific behavior.
- Frontend tools and widgets are the next package-boundary migrations and will clarify what a future route registrar must support.

### What worked
- The ticket now has a clean boundary: shared stores, contracts, and helper functions are done; full route handlers are intentionally not part of this ticket.

### What didn't work
- N/A. This was a closure/decision step.

### What I learned
- The safest shared backend surface is mostly mechanical so far. Handler ownership should remain app-local while higher-level features are still moving.

### What was tricky to build
- The tricky part was avoiding over-completion. A full route registrar is possible, but it would couple together runtime selection, auth, export/debug routes, mock engine behavior, frontend tool routes, and snapshot differences too early.

### What warrants a second pair of eyes
- Review whether the deferred route registrar should become a new ticket after CHATOVERLAY-004/005 or remain a long-term cleanup note.

### What should be done in the future
- Revisit route-handler extraction after frontendtools and widgets are both Pinocchio-owned.

### Code review instructions
- Review the final CHATOVERLAY-003 commits in order:
  - `7235bd8`, `ee42217`, `ea01179`, `2c399ed`
  - `7ab73f1`, `993fd6d`, `3fd0372`
  - `67993d1`, `4f7300b`, `0b1ba42`
- Validate with the commands listed in Steps 2–5.

### Technical details
- The route registrar is deferred because `CHATOVERLAY-004` will affect frontend tool routes and `CHATOVERLAY-005` will affect widget plugin route/projection assumptions.
