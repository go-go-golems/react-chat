---
Title: Common Chat Backend Extraction Design
Ticket: CHATOVERLAY-003
Status: active
Topics:
    - chat-overlay
    - pinocchio
    - sessionstream
    - backend
DocType: design-doc
Intent: long-term
Owners: []
RelatedFiles:
    - Path: ../../../../../../../pinocchio/cmd/web-chat/app/server.go
      Note: Existing mature Pinocchio web-chat server and overlapping routes
    - Path: ../../../../../../../pinocchio/cmd/web-chat/main.go
      Note: Web-chat store/runtime composition and server setup
    - Path: ../../../../../../../pinocchio/pkg/chatapp/runtime_inference.go
      Note: Generic turn-history loading and runtime execution behavior
    - Path: internal/webchat/handlers.go
      Note: Chat-overlay session handlers and real-runtime dispatch
    - Path: internal/webchat/server.go
      Note: Chat-overlay server assembly and route surface to compare/extract
ExternalSources: []
Summary: Design for extracting common chat backend server/store/runtime scaffolding into Pinocchio chatapp.
LastUpdated: 2026-05-30T16:25:00-04:00
WhatFor: Guide implementation of shared chat backend building blocks.
WhenToUse: Use before refactoring chat-overlay and pinocchio web-chat server plumbing.
---


# Common Chat Backend Extraction Design

## Executive summary

`pinocchio/cmd/web-chat` and `chat-overlay/internal/webchat` now implement the same backend shape in two places. Both construct a `sessionstream.SchemaRegistry`, a hydration store, a WebSocket fanout, a `sessionstream.Hub`, a `chatapp.Engine`, a `chatapp.Service`, HTTP routes for session lifecycle, and cleanup logic. The two applications differ in their product-specific extensions: Pinocchio web-chat owns profile APIs, debug/export endpoints, static UI serving, middleware composition, and agent-mode cards; chat-overlay owns frontend-tool routes, typed widget routes, ecommerce demo behavior, and a smaller Glazed command wrapper.

This ticket should extract the shared Go backend construction into reusable Pinocchio packages without making Pinocchio depend on chat-overlay. The common package should live under `pinocchio/pkg/chatapp` because Pinocchio already owns the generic `chatapp.Engine`, `chatapp.Service`, `ChatPlugin`, runtime hooks, and protobuf contracts used by both applications. Chat-overlay should become a consumer of that common package plus its own optional modules.

The proposed design introduces a `chatapp/serverkit` package that owns store opening, hub/service construction, core HTTP routes, WebSocket routing, lifecycle cleanup, and extension points. `cmd/web-chat/app.Server` and chat-overlay's current `internal/webchat.Server` should both become thin wrappers around `serverkit.Server`. The first extraction should not move frontend tools or widgets; those are separate tickets (`CHATOVERLAY-004` and `CHATOVERLAY-005`). This ticket moves only the shared server/store/runtime scaffolding.

## Problem statement and scope

### Problem

The current codebase has duplicate server assembly logic. Duplication makes behavior drift likely whenever one application fixes session continuity, durable store setup, shutdown behavior, route contracts, or runtime submission semantics.

Concrete examples:

- Chat-overlay constructs registry, stores, WebSocket transport, engine, hub, projections, service, and routes in `2026-05-29--chatbot-overlay-glm/internal/webchat/server.go:42-119` and `server.go:129-138`.
- Pinocchio web-chat constructs similar pieces in `pinocchio/cmd/web-chat/app/server.go`, with options for chunk delay, turn store, plugins, runtime resolver, and debug/export dependencies. The route dispatcher handles session routes at `pinocchio/cmd/web-chat/app/server.go:253-286` and prompt submission at `server.go:288-330`.
- Chat-overlay has recently grown durable turn and timeline store setup. Pinocchio web-chat already opens a turn store in `pinocchio/cmd/web-chat/main.go:206-225` and wires it into runtime composition around `main.go:360-414`.
- Pinocchio `chatapp.Engine` already contains the generic history-loading mechanism. `pinocchio/pkg/chatapp/runtime_inference.go:108-135` loads the latest final turn from `TurnStore`, clones it, and appends the new user prompt.

When the same responsibilities live in multiple app directories, each fix must be repeated. The recent chat-overlay history, store, and Glazed logging work illustrates this risk: some of that logic already existed in web-chat, but chat-overlay had to rediscover and reimplement it.

### Scope

This ticket covers common Go backend scaffolding:

1. Core session HTTP routes.
2. Sessionstream store and hub setup.
3. WebSocket transport setup.
4. `chatapp.Engine` and `chatapp.Service` wiring.
5. Durable timeline and turn store helpers.
6. Cleanup and shutdown helpers.
7. Runtime resolver integration points.
8. Extension-route hooks for app-specific modules.

This ticket does **not** move:

1. Frontend tool bridge support. That is `CHATOVERLAY-004`.
2. Typed widget plugin support. That is `CHATOVERLAY-005`.
3. Pinocchio web-chat profile HTTP APIs.
4. Debug reconcile/export routes.
5. Static frontend serving.
6. Agent-mode plugin implementation.
7. Ecommerce demo mock behavior.

## Terms and system orientation

### `sessionstream`

`sessionstream` is the event and projection runtime. It stores backend events, projects durable timeline entities, fans out UI events over WebSocket, and provides snapshots for hydration. The common package should continue to treat `sessionstream.Hub` as the source of truth for commands, events, projections, and snapshots.

### `chatapp.Engine`

`chatapp.Engine` translates chat commands into runtime work. It owns chat message projections and delegates runtime output to plugins. The engine can run a demo inference path or a real `infruntime.ComposedRuntime`.

### `chatapp.Service`

`chatapp.Service` is the app-facing API around the hub and engine. It exposes `SubmitPrompt`, `SubmitPromptRequest`, `Stop`, and `Snapshot`. Existing HTTP routes should call the service instead of talking to runtime internals directly.

### `ChatPlugin`

`ChatPlugin` is the extension surface for runtime events, UI projections, and timeline projections. Existing plugins include reasoning, backend tool-call visualization, frontend tools, typed widgets, and web-chat agent mode.

### Runtime resolver

A runtime resolver maps an HTTP prompt submission to a `ComposedRuntime`. Pinocchio web-chat has a more advanced resolver because it supports profiles, middleware, debug observers, and turn stores. Chat-overlay currently has a smaller `realRuntimeFactory` that resolves one profile and adds browser bridge hooks.

## Current-state architecture

### Chat-overlay server setup

Chat-overlay currently owns a compact server assembly function. It creates plugins and a schema registry, registers schemas, opens the hydration and turn stores, wires WebSocket fanout, constructs a chat engine and mock engine, creates the hub, installs managers, installs chat projections, and builds a service. Evidence: `internal/webchat/server.go:42-119`.

The route surface is a direct `http.ServeMux` with these paths (`server.go:129-138`):

```text
POST /api/chat/sessions
POST /api/chat/sessions/{id}/messages
GET  /api/chat/sessions/{id}
POST /api/chat/sessions/{id}/stop
POST /api/chat/sessions/{id}/tools/manifest
POST /api/chat/sessions/{id}/tools/results
GET  /api/chat/ws
```

The first five routes are generic chat/session routes except for the two frontend-tool routes. The generic subset should move into Pinocchio `serverkit`.

### Pinocchio web-chat server setup

Pinocchio web-chat already has a richer server in `pinocchio/cmd/web-chat/app/server.go`. It handles session route dispatch in `server.go:253-286`, prompt submission in `server.go:288-330`, snapshots, timeline export, turn export, debug routes, and static UI composition.

The route contract overlaps with chat-overlay:

```text
POST /api/chat/sessions
POST /api/chat/sessions/:sessionId/messages
GET  /api/chat/sessions/:sessionId
GET  /api/chat/ws
```

Pinocchio web-chat also has runtime resolver infrastructure. `handleSubmitMessage` resolves a runtime when configured and then calls `s.service.SubmitPromptRequest(...)` with `Prompt`, `IdempotencyKey`, and `Runtime` (`server.go:307-321`). Chat-overlay now does the same pattern with its `realRuntimeFactory`.

### Pinocchio chatapp runtime history

The generic place where conversation history belongs is already in `pinocchio/pkg/chatapp/runtime_inference.go`. The engine:

1. creates a Geppetto session with the session id,
2. attaches an engine builder,
3. loads `TurnStore.LoadLatestTurn(ctx, string(sid), "final")` when no explicit `InitialTurn` is provided,
4. deserializes the turn from YAML,
5. appends the new user prompt,
6. starts inference.

Evidence: `runtime_inference.go:99-135`. This means any common server package should make it easy to provide a `TurnStore`, but should not duplicate history logic.

### Pinocchio web-chat store setup

Pinocchio web-chat opens durable turn storage from DSN/path in `pinocchio/cmd/web-chat/main.go:206-225`. The runtime composer receives the store around `main.go:360-372`, and the canonical app server receives it around `main.go:413`. Chat-overlay now has equivalent helpers, so store setup should be centralized.

### Chat-overlay durable store setup

Chat-overlay now has helper functions for:

- sessionstream hydration store selection (`internal/webchat/hydration_store_options.go`),
- final-turn store selection (`internal/webchat/turn_store_options.go`).

These are generic enough to move into Pinocchio because they refer to Pinocchio `chatstore` and sessionstream SQLite helpers, not ecommerce or overlay UI behavior.

## Gap analysis

### Gap 1: duplicated route contracts

Both apps expose the same session creation, prompt submission, snapshot, and WebSocket paths. Without a shared route implementation, small differences can accumulate in request shapes, status codes, error messages, and lifecycle behavior.

### Gap 2: duplicated store opening

Pinocchio and chat-overlay both need in-memory and SQLite store modes. Store opening should be reusable because it has directory creation, DSN derivation, WAL options, busy timeouts, cleanup, and logging concerns.

### Gap 3: app-specific code is mixed with reusable code

Chat-overlay `NewServer` mixes generic chatapp scaffolding with frontend tool manager installation and widget plugin installation. Pinocchio web-chat mixes generic session routes with profile routes, export routes, debug APIs, and static UI serving. Extraction should separate the base server from optional route/plugin registration.

### Gap 4: runtime resolver abstraction is not shared

Pinocchio web-chat resolves runtime from request/profile. Chat-overlay resolves runtime from a fixed profile and frontend tool registry. Both should implement one interface accepted by `serverkit`.

## Proposed architecture

Create a new package:

```text
pinocchio/pkg/chatapp/serverkit
```

The package should own generic chat HTTP/server construction. It should not import chat-overlay. It may import:

- `pinocchio/pkg/chatapp`,
- `pinocchio/pkg/inference/runtime`,
- `pinocchio/pkg/persistence/chatstore`,
- `sessionstream`,
- sessionstream SQLite hydration store,
- WebSocket transport.

### Package responsibilities

`serverkit` should provide:

1. `Options`: declarative server construction inputs.
2. `Server`: hub, service, WebSocket server, core handlers, cleanup.
3. `RuntimeResolver`: optional interface used by prompt submission.
4. `StoreOptions`: timeline and turn store settings.
5. `OpenStores`: open timeline/turn stores and return cleanup.
6. `RegisterCoreRoutes`: mount core routes on a mux.
7. `RouteHooks`: let apps add extra per-session subroutes.
8. Contract structs for create/submit/snapshot/stop responses.

### API sketch

```go
package serverkit

type StoreOptions struct {
    TimelineDSN string // optional future support
    TimelineDB  string
    TurnsDSN    string
    TurnsDB     string
}

type RuntimeResolver interface {
    Resolve(ctx context.Context, r *http.Request, sid sessionstream.SessionId, req SubmitMessageRequest) (*infruntime.ComposedRuntime, error)
}

type PromptRequestDecorator interface {
    Decorate(ctx context.Context, sid sessionstream.SessionId, req SubmitMessageRequest, prompt chatapp.PromptRequest) (chatapp.PromptRequest, error)
}

type Options struct {
    Stores          StoreOptions
    ChunkDelay      time.Duration
    Plugins         []chatapp.ChatPlugin
    SchemaPlugins   []chatapp.ChatPlugin
    RuntimeResolver RuntimeResolver
    PromptDecorator PromptRequestDecorator
    ExtraInstallers []Installer
    Logger          zerolog.Logger // optional
}

type Server struct {
    Hub     *sessionstream.Hub
    Service *chatapp.Service
    Mux     *http.ServeMux
    Close   func() error
}
```

### Core routes

The core route set should be:

```text
POST /api/chat/sessions
POST /api/chat/sessions/{id}/messages
GET  /api/chat/sessions/{id}
POST /api/chat/sessions/{id}/stop
GET  /api/chat/ws
```

Optional modules may add:

```text
POST /api/chat/sessions/{id}/tools/manifest
POST /api/chat/sessions/{id}/tools/results
GET  /api/chat/sessions/{id}/timeline
GET  /api/chat/sessions/{id}/turns
GET  /api/debug/sessions/{id}/...
```

### Runtime flow diagram

```text
Browser
  |
  | POST /api/chat/sessions/{sid}/messages
  v
serverkit.HandleSubmitMessage
  |
  | decode prompt/profile/idempotency
  v
RuntimeResolver.Resolve(...)        optional
  |
  v
PromptDecorator.Decorate(...)       optional frontend tools, final-turn persistence, app hooks
  |
  v
chatapp.Service.SubmitPromptRequest
  |
  v
sessionstream.Hub command
  |
  v
chatapp.Engine.runRuntimeInference
  |
  | load latest final turn from TurnStore
  | append user prompt
  | run Geppetto runtime
  v
sessionstream events + timeline projections
  |
  v
WebSocket UI events and snapshots
```

### Store setup pseudocode

```go
func OpenStores(ctx context.Context, opts StoreOptions, reg *sessionstream.SchemaRegistry) (*Stores, error) {
    timeline, err := openTimelineStore(opts.TimelineDB, opts.TimelineDSN, reg)
    if err != nil { return nil, err }

    turns, err := openTurnStore(opts.TurnsDB, opts.TurnsDSN)
    if err != nil {
        timeline.Close()
        return nil, err
    }

    return &Stores{
        Timeline: timeline,
        Turns: turns,
        Close: func() error { return closeAll(turns.Close, timeline.Close) },
    }, nil
}
```

### Route extension pseudocode

```go
type SessionRouteRegistrar interface {
    RegisterSessionRoutes(mux *http.ServeMux, base string, server *Server)
}

func (s *Server) Mux() *http.ServeMux {
    mux := http.NewServeMux()
    s.RegisterCoreRoutes(mux)
    for _, extension := range s.extensions {
        extension.RegisterSessionRoutes(mux, "/api/chat/sessions", s)
    }
    return mux
}
```

## Migration plan

### Phase 1: Extract store helpers

Move these chat-overlay helpers into Pinocchio:

```text
internal/webchat/hydration_store_options.go -> pinocchio/pkg/chatapp/serverkit/stores.go
internal/webchat/turn_store_options.go      -> pinocchio/pkg/chatapp/serverkit/stores.go
```

Also move or rewrite tests:

```text
internal/webchat/turn_store_test.go -> pinocchio/pkg/chatapp/serverkit/stores_test.go
```

Validation:

```bash
cd pinocchio && go test ./pkg/chatapp/serverkit ./pkg/persistence/chatstore
cd chat-overlay && go test ./...
```

### Phase 2: Extract core request/response contracts

Move or duplicate first, then delete originals:

```text
CreateSessionRequest
CreateSessionResponse
SubmitMessageRequest
SubmitMessageResponse
StopSessionResponse
SessionSnapshotResponse
SnapshotEntity
errorResponse
```

The package should preserve existing JSON keys (`sessionId`, `prompt`, `accepted`, `status`). Avoid changing public HTTP contracts during extraction.

### Phase 3: Extract server constructor

Create `serverkit.NewServer(opts Options)`. Initially, make it match chat-overlay's smaller constructor because it is compact. Then adapt web-chat to use it.

### Phase 4: Adapt chat-overlay

Chat-overlay should call `serverkit.NewServer(...)` and then register frontend tool routes and widget plugins through options. The chat-overlay app-specific files should shrink to:

1. CLI command options,
2. runtime resolver/decorator for fixed profile plus frontend tools,
3. optional ecommerce/mock engine paths,
4. static/demo frontend serving if needed.

### Phase 5: Adapt `cmd/web-chat/app.Server`

Pinocchio web-chat should embed or wrap `serverkit.Server`. Keep its profile APIs, debug APIs, export APIs, and static UI serving in `cmd/web-chat/app`.

### Phase 6: Remove duplicated helpers

Delete or deprecate duplicated store/route setup in both app directories once both compile and tests pass.

## Testing strategy

### Unit tests

- Store helper tests:
  - in-memory timeline store opens,
  - SQLite timeline store creates parent directory,
  - SQLite turn store persists across reopen,
  - cleanup closes both stores even after partial failure.
- Route handler tests:
  - create session returns `sessionId`,
  - submit prompt calls `SubmitPromptRequest`,
  - snapshot returns timeline entities,
  - stop calls service stop.
- Runtime resolver tests:
  - resolver error returns HTTP 400,
  - resolver nil means demo/default runtime,
  - decorator adds `OnFinalTurn` without replacing prompt.

### Integration tests

- Chat-overlay smoke still passes:
  - mock `show me boots`,
  - real `cart.add`,
  - human approval.
- Web-chat tests still pass:
  - `pinocchio/cmd/web-chat/app/server_test.go`, especially history and export tests.
- Restart persistence test:
  - start server with temp `TimelineDB` and `TurnsDB`,
  - submit first prompt,
  - close server,
  - reopen server,
  - submit follow-up to same session,
  - assert loaded history and visible timeline snapshot.

## Risks and mitigations

### Risk: route behavior drift during migration

Mitigation: keep JSON contracts unchanged and add tests around response fields and status codes before extraction.

### Risk: `cmd/web-chat` debug/export routes depend on concrete server internals

Mitigation: expose `Hub`, `Service`, and store references from `serverkit.Server`, but keep debug/export registration in web-chat.

### Risk: generic package becomes too configurable

Mitigation: keep the base route set small. Put frontend tools and widgets into separate packages. Use option structs rather than many positional arguments.

### Risk: Pinocchio imports application code

Mitigation: package direction must be one-way. Pinocchio packages must not import chat-overlay. Chat-overlay imports Pinocchio.

## Open questions

1. Should durable timeline and turn stores default to `var/` paths or remain opt-in?
2. Should `serverkit` include timeline/turn export routes, or should those remain `cmd/web-chat` features?
3. Should runtime resolution be request-based (`Resolve(ctx, r, sid, req)`) or value-based (`Resolve(ctx, RuntimeRequest)`) to decouple from `net/http`?
4. Should `serverkit` own static UI serving? Initial answer: no.

## References

- `2026-05-29--chatbot-overlay-glm/internal/webchat/server.go:42-119`: chat-overlay server assembly.
- `2026-05-29--chatbot-overlay-glm/internal/webchat/server.go:129-138`: chat-overlay route registration.
- `pinocchio/cmd/web-chat/app/server.go:253-286`: web-chat session route dispatch.
- `pinocchio/cmd/web-chat/app/server.go:288-330`: web-chat prompt submission flow.
- `pinocchio/pkg/chatapp/runtime_inference.go:99-135`: generic turn history loading.
- `pinocchio/cmd/web-chat/main.go:206-225`: web-chat turn store opening.
- `pinocchio/cmd/web-chat/runtime_composer.go:113-124`: runtime builder and turn-store persister wiring.
