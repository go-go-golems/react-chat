---
Title: Pinocchio web-chat Go internal package refactor analysis and implementation guide
Ticket: CHATOVERLAY-011
Status: active
Topics:
    - chat-overlay
    - pinocchio
    - web-chat
    - go
    - architecture
DocType: design-doc
Intent: long-term
Owners: []
RelatedFiles:
    - Path: ../../../../../../../pinocchio/cmd/web-chat/app/server.go
      Note: Current chat HTTP/sessionstream server adapter to move under internal/appserver
    - Path: ../../../../../../../pinocchio/cmd/web-chat/app/showcase_tools.go
      Note: Production frontend-tool endpoints with misleading showcase filename
    - Path: ../../../../../../../pinocchio/cmd/web-chat/main.go
      Note: Overloaded command entrypoint that should shrink to CLI/Glazed wiring
    - Path: ../../../../../../../pinocchio/cmd/web-chat/profiles/api.go
      Note: Large profile HTTP API file to split by route group
    - Path: ../../../../../../../pinocchio/cmd/web-chat/profiles/resolver.go
      Note: Profile/request/runtime resolution core
    - Path: ../../../../../../../pinocchio/cmd/web-chat/runtime_composer.go
      Note: Runtime composer to move into internal/runtime
    - Path: ../../../../../../../pinocchio/pkg/chatapp/runner.go
      Note: Reusable runner to consider after behavior-preserving package moves
ExternalSources: []
Summary: Design and implementation guide for moving Pinocchio cmd/web-chat Go code into focused internal packages and shrinking main.go to command wiring.
LastUpdated: 2026-06-01T14:45:00-04:00
WhatFor: Guide an intern through the next Go-side cleanup of Pinocchio cmd/web-chat.
WhenToUse: Use before implementing CHATOVERLAY-011 Go phases 5-7 or reviewing a cmd/web-chat internal package refactor.
---


# Pinocchio web-chat Go internal package refactor analysis and implementation guide

## Executive summary

Pinocchio `cmd/web-chat` is now much cleaner on the React side, but the Go command still mixes several jobs in one command package. The current `main.go` is not just a Glazed/Cobra command file. It also owns browser runtime config, embedded static asset routing, API mux composition, custom root mounting, HTTP server lifecycle, profile/runtime composition, middleware dependency setup, frontend-tool manager creation, chat plugin registration, and server construction. That makes it hard for a new engineer to answer a simple question such as: "where does the web server live?" or "where do runtime profiles become inference engines?"

The next refactor should create a proper `cmd/web-chat/internal/...` package tree. The command package should become a thin CLI boundary. Internal packages should own the web app assembly, static UI serving, runtime composition, app-specific plugins, profile API, and test mock runtime. This is not a reusable Pinocchio library extraction; it is a command-owned internal decomposition that makes the example app readable while preventing other packages from depending on accidental `cmd/web-chat/app` or `cmd/web-chat/profiles` APIs.

The recommended direction is:

```text
cmd/web-chat/
  main.go                         # Cobra/Glazed command entry only
  command.go                      # optional: NewCommand if kept in package main
  static_assets.go                # optional: //go:embed static, not business logic
  internal/
    webchatcmd/                   # settings decode + command RunIntoWriter orchestration
    webapp/                       # HTTP mux, static UI, app-config.js, root mount, server lifecycle
    appserver/                    # current cmd/web-chat/app: chat/session/ws/export/frontend-tool HTTP server
    profiles/                     # current cmd/web-chat/profiles: profile HTTP API + request resolver
    runtime/                      # runtime composer, canonical resolver, turn persistence
    middlewaredefs/               # web-chat middleware definition registry
    plugins/agentmode/            # app-owned agent-mode chat plugin and runtime sink wrapper
    mockruntime/                  # current mockruntime profile shortcut runtime
```

This guide intentionally proposes behavior-preserving moves first. Do not redesign runtime semantics while moving packages. The first acceptance target is that the focused Go tests, full `go test ./cmd/web-chat/...`, frontend smokes, and existing Playwright parity scripts still pass after imports and package names change.

## Problem statement

### What is wrong with the current shape?

The current Go code works, but ownership boundaries are not obvious.

1. `cmd/web-chat/main.go` has too many responsibilities.
   - Lines 46-53 define command/runtime-config types.
   - Lines 56-75 build browser runtime config JavaScript.
   - Lines 77-132 mount `app-config.js`, static assets, and SPA fallbacks.
   - Lines 134-172 build the application mux, profile APIs, chat session APIs, WebSocket API, and static UI.
   - Lines 174-226 handle custom root mounting and HTTP server lifecycle.
   - Lines 228-257 define the Glazed command description and flags.
   - Lines 260-356 decode settings, resolve profiles, build middleware registries, open stores, compose runtime builders, register plugins, construct the server, and start HTTP.
   - Lines 358-383 build the Cobra root and execute it.

2. `cmd/web-chat` has public-looking subpackages that are really command internals.
   - `cmd/web-chat/app` exposes a `Server` API, but it is the web-chat command's HTTP adapter, not a stable package.
   - `cmd/web-chat/profiles` exposes profile API helpers and request-resolution mechanics for this app.
   - `cmd/web-chat/mockruntime` is a deterministic test/profile shortcut.
   - Because these packages are outside `internal`, any package in the module can import them. A few current command tests do import `cmd/web-chat/app`, `cmd/web-chat/profiles`, and `cmd/web-chat/mockruntime` directly. That is acceptable during development, but it is not the shape of a polished example app.

3. Several files still have misleading names or mixed domains.
   - `cmd/web-chat/app/showcase_tools.go` contains production frontend-tool manifest/result endpoints, not a showcase-only surface.
   - `cmd/web-chat/profiles/api.go` is 576 lines and contains route registration, schema endpoints, profile list/detail endpoints, current-profile cookie endpoints, DTO conversion, cookie parsing, extension schemas, and JSON helpers.
   - `cmd/web-chat/main.go` is 385 lines and its central `RunIntoWriter` function is the de facto composition root.

4. There is already reusable infrastructure elsewhere.
   - `pkg/chatapp/runner.go` provides a non-web chatapp/sessionstream runner. It mirrors the core setup used by `cmd/web-chat/app.Server` without HTTP/WebSocket assumptions.
   - `pkg/chatapp/serverkit` owns common HTTP DTO helpers.
   - `pkg/chatapp/frontendtools` and `pkg/chatapp/widgets` own reusable plugin mechanics.
   - The web-chat command should consume these reusable packages, not re-export its own command internals as if they were reusable.

### Why an `internal/` package tree?

Go's `internal` convention enforces ownership at compile time. Code under `cmd/web-chat/internal/...` can be imported by `cmd/web-chat` and its descendants, but not by unrelated packages elsewhere in the module. This is exactly what we want: the web-chat command can be a rich example application, while other packages cannot accidentally depend on its private app assembly or mock runtime.

The goal is not to hide code for its own sake. The goal is to make dependencies say what they mean:

- Reusable chat framework code belongs in `pkg/chatapp/...`.
- Web-chat application glue belongs in `cmd/web-chat/internal/...`.
- The executable entrypoint belongs in `cmd/web-chat/main.go`.

## Current-state architecture

### The current package graph

```text
cmd/web-chat (package main)
  imports cmd/web-chat/app
  imports cmd/web-chat/profiles
  imports cmd/web-chat/mockruntime
  imports pkg/chatapp/frontendtools
  imports pkg/chatapp/plugins
  imports pkg/chatapp/serverkit
  imports pkg/chatapp/widgets
  imports pkg/cmds/profilebootstrap
  imports pkg/middlewares/agentmode
  imports pkg/redisstream

cmd/web-chat/app
  owns HTTP handlers for sessions, websocket, exports, frontend tool endpoints
  owns sessionstream + chatapp server construction

cmd/web-chat/profiles
  owns profile registry HTTP API and profile/request resolution helpers

cmd/web-chat/mockruntime
  owns deterministic mock_parity runtime
```

### Request flow today

A browser chat turn follows this path:

```text
React WebChatProviderShell
  POST /api/chat/sessions/{sessionId}/messages
      |
cmd/web-chat/main.go buildAppMux routes to app.Server.HandleSessionRoutes
      |
cmd/web-chat/app.Server.handleSubmitMessage
      |
profiles.RequestResolver selects registry/profile and builds ConversationPlan
      |
canonicalRuntimeResolver builds infruntime.ConversationRuntimeRequest
      |
ProfileRuntimeComposer creates Geppetto engine + middlewares + persister
      |
chatapp.Service.SubmitPrompt emits commands/events through sessionstream
      |
sessionstream hub projects UI/timeline events
      |
WebSocket /api/chat/ws fans out frames to the browser
```

That flow is sound. The problem is that the implementation is spread across the root command package and public-looking command subpackages in a way that obscures which code is app-specific versus reusable.

### Main.go responsibility map

| Current code | Responsibility | Proposed owner |
|---|---|---|
| `normalizeBasePrefix`, `runtimeConfigScript`, `buildAppConfigHandler` | Browser runtime config | `internal/webapp/config.go` |
| `fsSub`, `registerStaticUIHandlers` | Static SPA serving | `internal/webapp/static.go` |
| `buildAppMux`, `buildRootHandler` | HTTP mux/root composition | `internal/webapp/routes.go` |
| `runHTTPServer` | HTTP lifecycle/shutdown | `internal/webapp/server.go` |
| `NewCommand` flags/sections | Glazed command shape | `main.go` or `internal/webchatcmd/command.go` |
| `RunIntoWriter` | Decode settings + assemble app + run server | `internal/webchatcmd/run.go` with small helpers |
| agent-mode service setup | App-specific dependency setup | `internal/runtime` or `internal/plugins/agentmode` |
| runtime composer setup | Inference runtime builder | `internal/runtime` |
| plugin list setup | App feature registration | `internal/webchatcmd/assembly.go` |

### App server responsibilities today

`cmd/web-chat/app/server.go` is a relatively coherent HTTP adapter after debug-app removal:

- Lines 25-41 define `Option` and `Server` state.
- Lines 43-123 define options for default profile, chunk delay, SQLite hydration store, runtime resolver, turn store, chat plugins, and frontend-tool manager.
- Lines 125-174 construct schemas, hydration store, WebSocket transport, chatapp engine, sessionstream hub, frontend-tool manager integration, chat service, and export service.
- Lines 232-291 route create-session, session subroutes, and WebSocket upgrades.
- Lines 299-347 submit messages and return snapshots.
- Lines 350-392 encode snapshot status.

This package should probably move as a unit to `cmd/web-chat/internal/appserver` first. After that, split files by route group.

### Profile package responsibilities today

`cmd/web-chat/profiles` has two real domains:

1. Request/runtime profile resolution.
   - `resolver.go` lines 22-38 define `RequestResolver`.
   - `resolver.go` lines 57-117 resolve profile and registry selections.
   - `resolver.go` lines 135-170 build `ConversationPlan`.
   - `resolver.go` lines 172-205 resolve runtime plans and profile runtime extensions.

2. HTTP profile API.
   - `api.go` lines 17-40 register schema endpoints.
   - `api.go` lines 42-98 register `/api/chat/profiles` list behavior.
   - `api.go` lines 100-194 register `/api/chat/profiles/{slug}` detail/default behavior.
   - `api.go` lines 200+ register `/api/chat/profile` current-profile cookie behavior.

Those can remain in one package at first, but the files should be split so new engineers can find route groups without scrolling through 576 lines.

## Proposed solution

### Target package tree

Use `cmd/web-chat/internal` as the boundary. This keeps the command cohesive while preventing accidental imports from reusable packages.

```text
cmd/web-chat/
  main.go
  static_assets.go
  internal/
    webchatcmd/
      command.go
      settings.go
      run.go
      assembly.go
    webapp/
      config.go
      static.go
      routes.go
      root.go
      server.go
    appserver/
      server.go
      options.go
      routes_sessions.go
      routes_exports.go
      routes_frontend_tools.go
      snapshot.go
      runtime.go
      contracts.go
    profiles/
      api.go
      api_profiles.go
      api_current_profile.go
      api_schemas.go
      api_models.go
      api_errors.go
      resolver.go
      runtime_transport.go
      mock.go
      types.go
    runtime/
      composer.go
      composer_middlewares.go
      composer_profile.go
      canonical_resolver.go
      turn_persistence.go
    middlewaredefs/
      registry.go
      agentmode.go
      config.go
    plugins/
      agentmode/
        plugin.go
        projection.go
        sink.go
    mockruntime/
      engine.go
```

This tree is deliberately explicit. It should feel slightly boring. Each directory name tells a new engineer what layer they are entering.

### Target dependency graph

```text
cmd/web-chat/main.go
  -> internal/webchatcmd
       -> internal/webapp
       -> internal/appserver
       -> internal/profiles
       -> internal/runtime
       -> internal/middlewaredefs
       -> internal/plugins/agentmode
       -> internal/mockruntime
       -> pkg/chatapp/frontendtools
       -> pkg/chatapp/plugins
       -> pkg/chatapp/widgets
       -> pkg/cmds/profilebootstrap
       -> pkg/redisstream

internal/appserver
  -> pkg/chatapp
  -> pkg/chatapp/export
  -> pkg/chatapp/frontendtools
  -> pkg/chatapp/serverkit
  -> pkg/persistence/chatstore
  -> sessionstream transport/ws

internal/runtime
  -> internal/profiles
  -> internal/mockruntime
  -> pkg/inference/runtime
  -> pkg/persistence/chatstore
  -> geppetto engine/middleware/toolloop
```

The important rule is: dependency arrows point inward from command assembly to implementation layers, not sideways from reusable packages into command packages.

### `main.go` after refactor

The final `main.go` should be easy to read in one screen. It should not contain HTTP routing, middleware definitions, runtime construction, or profile API implementation.

One acceptable shape is:

```go
package main

import (
    "embed"

    "github.com/go-go-golems/pinocchio/cmd/web-chat/internal/webchatcmd"
)

//go:embed static
var staticFS embed.FS

func main() {
    root, err := webchatcmd.NewRootCommand(staticFS)
    cobra.CheckErr(err)
    cobra.CheckErr(root.Execute())
}
```

If the team wants `main.go` to contain the Glazed command construction itself, keep `NewCommand` there but move all runtime work behind an internal runner:

```go
func (c *Command) RunIntoWriter(ctx context.Context, parsed *values.Values, _ io.Writer) error {
    return webchatcmd.Run(ctx, parsed, staticFS)
}
```

Either shape satisfies the main rule: `main.go` should explain how the CLI starts, not how the web-chat application is assembled.

### `internal/webchatcmd`: command assembly

This package should be the composition root. It knows about CLI settings, profilebootstrap, Redis parameter layers, the static filesystem, and which plugins are enabled.

Suggested API:

```go
type Settings struct {
    Addr        string
    Root        string
    TimelineDSN string
    TimelineDB  string
    TurnsDSN    string
    TurnsDB     string
}

func NewRootCommand(staticFS fs.FS) (*cobra.Command, error)
func NewCommand(staticFS fs.FS) (*Command, error)
func Run(ctx context.Context, parsed *values.Values, staticFS fs.FS) error
```

Suggested `Run` pseudocode:

```go
func Run(ctx context.Context, parsed *values.Values, staticFS fs.FS) error {
    settings := DecodeSettings(parsed)
    profileRuntime := profilebootstrap.ResolveCLIProfileRuntime(ctx, parsed)
    defer profileRuntime.Close()

    baseSettings := resolveBaseInferenceSettings(parsed)
    turnStore := serverkit.OpenTurnStore(settings.TurnStoreOptions())
    defer turnStore.Close()

    deps := runtime.Dependencies{
        AgentModeService: agentmode.NewStaticService(defaultModes()),
        TurnStore: turnStore,
        BaseInferenceSettings: baseSettings,
    }

    profileResolver := profiles.NewRequestResolver(...)
    runtimeResolver := runtime.NewCanonicalResolver(profileResolver, runtime.NewComposer(deps))
    server := appserver.NewServer(appserver.Options{...})
    mux := webapp.NewMux(webapp.Options{...})
    httpServer := webapp.NewHTTPServer(settings.Addr, webapp.MountRoot(settings.Root, mux))
    return webapp.RunHTTPServer(ctx, httpServer, server.Close)
}
```

This package should have the integration tests that currently exercise root route behavior and mock profile routing, because those tests validate app assembly rather than reusable server mechanics.

### `internal/webapp`: HTTP shell and static UI

This package should own only HTTP shell mechanics:

- `app-config.js` generation.
- Static asset serving from the embedded frontend filesystem.
- `/assets/`, `/static/`, SPA fallback, and `/app-config.js`.
- Root mount behavior for `--root /chat`.
- HTTP server shutdown with signal handling.

Suggested API:

```go
type RuntimeConfig struct {
    BasePrefix string `json:"basePrefix"`
}

func RuntimeConfigScript(root string) (string, error)
func NewMux(opts MuxOptions) *http.ServeMux
func MountRoot(root string, appMux http.Handler, appConfigJS string) http.Handler
func RunHTTPServer(ctx context.Context, srv *http.Server, closeFn func() error) error
```

`NewMux` should accept already-built dependencies:

```go
type MuxOptions struct {
    StaticFS        fs.FS
    AppConfigJS     string
    ProfileRegistry gepprofiles.Registry
    ProfileResolver *profiles.RequestResolver
    ChatServer      *appserver.Server
    MiddlewareDefinitions middlewarecfg.DefinitionRegistry
    ExtensionSchemas []profiles.ExtensionSchemaDocument
}
```

Keep this package dumb. It should not create engines, middleware services, stores, or plugins.

### `internal/appserver`: chat HTTP adapter

Move `cmd/web-chat/app` to `cmd/web-chat/internal/appserver` first. Then split file names by route group:

```text
internal/appserver/
  server.go                 # Server struct, NewServer, core construction
  options.go                # With... options or Options struct
  routes_sessions.go        # create session, session subrouter, submit message, snapshot
  routes_ws.go              # websocket handler if it grows
  routes_exports.go         # timeline/turn/full export endpoints
  routes_frontend_tools.go  # manifest/result endpoints, renamed from showcase_tools.go
  snapshot.go               # snapshot response encoding/status
  hydration.go              # sqlite/in-memory hydration store setup
  contracts.go              # serverkit aliases if still needed
  runtime.go                # RuntimeResolver interface
```

Consider replacing the functional-option sprawl with an explicit `Options` struct while moving:

```go
type Options struct {
    DefaultProfile      string
    ChunkDelay          time.Duration
    TimelineDSN         string
    TimelineDBPath      string
    RuntimeResolver     RuntimeResolver
    TurnStore           chatstore.TurnStore
    TurnsDBPath         string
    ChatPlugins         []chatapp.ChatPlugin
    FrontendToolManager *frontendtools.Manager
}

func NewServer(opts Options) (*Server, error)
```

This is easier for interns to read than ten `With...` functions. If the team wants to minimize behavior-change risk, move the package first and convert options in a second commit.

Also consider using `pkg/chatapp.Runner` inside `NewServer` so server construction does not duplicate chatapp/sessionstream setup. Current `pkg/chatapp/runner.go` already says it mirrors `cmd/web-chat/app.Server`; after this refactor, web-chat can call it directly with `UIFanout: ws` and `Plugins: opts.ChatPlugins`.

### `internal/runtime`: profile runtime composition

Move these current root files together:

- `runtime_composer.go`
- `canonical_runtime_resolver.go`
- `turn_persistence.go`
- `agentmode_sink.go` if kept coupled to profile runtime sink wrapping

Responsibilities:

- Convert resolved profile runtime into a Geppetto engine and middleware chain.
- Resolve mock parity shortcut into deterministic mock runtime.
- Attach turn-store persister and snapshot hook.
- Produce `infruntime.ComposedRuntime` with runtime key and fingerprint.

Suggested public API:

```go
type Composer struct { ... }
func NewComposer(defs middlewarecfg.DefinitionRegistry, deps middlewarecfg.BuildDeps, base *settings.InferenceSettings) *Composer
func (c *Composer) WithTurnStore(store chatstore.TurnStore) *Composer
func (c *Composer) Compose(ctx context.Context, req infruntime.ConversationRuntimeRequest) (infruntime.ComposedRuntime, error)

func NewCanonicalResolver(requestResolver *profiles.RequestResolver, composer infruntime.RuntimeBuilder) appserver.RuntimeResolver
```

Keep the mock runtime shortcut here, not in `appserver`. The HTTP adapter should not know that `mock_parity` is special; it should only call a `RuntimeResolver`.

### `internal/middlewaredefs`: web-chat middleware catalog

Move `middleware_definitions.go` into `internal/middlewaredefs` and rename functions for package clarity:

```go
const DependencyAgentModeServiceKey = "agentmode.service"
const DefaultAgentMode = "financial_analyst"

func NewRegistry() (*middlewarecfg.InMemoryDefinitionRegistry, error)
func NewAgentModeDefinition() middlewarecfg.Definition
```

This package should not import HTTP, appserver, or command settings. It should be pure runtime catalog configuration.

### `internal/plugins/agentmode`: app-owned projection plugin

Move `agentmode_chat_feature.go` into `internal/plugins/agentmode`. This plugin is application-specific glue between Geppetto agent-mode events, chatapp event publishing, protobuf payloads, UI events, and timeline entities.

Suggested API:

```go
func NewPlugin() chatapp.ChatPlugin
func RuntimeSinkWrapperFromProfile(runtime *infruntime.ProfileRuntime) infruntime.EventSinkWrapper
```

Be explicit that this is not the same thing as `pkg/middlewares/agentmode`. The middleware parses model output and emits runtime events. The web-chat plugin translates those runtime events into browser-visible sessionstream events and timeline entities.

### `internal/profiles`: profile HTTP API and resolver

Move `cmd/web-chat/profiles` to `cmd/web-chat/internal/profiles`. Then split `api.go` without changing exported API names initially.

Suggested split:

```text
api.go                  # RegisterAPIHandlers only
api_profiles.go         # /api/chat/profiles and /api/chat/profiles/{slug}
api_current_profile.go  # /api/chat/profile GET/POST + cookie helpers
api_schemas.go          # middleware/extension schema endpoints
api_models.go           # DTO conversion from Geppetto models
api_errors.go           # writeProfileRegistryError, RequestResolutionError helpers
resolver.go             # RequestResolver and runtime plan methods
runtime_transport.go    # ToRuntimeTransport, CloneResolvedInferenceSettings, metadata helpers
mock.go                 # mock_parity profile document/list item
```

Do not let profile HTTP handlers import command assembly. Profile handlers should depend on registries and option structs only.

### `internal/mockruntime`: deterministic test/runtime shortcut

Move `cmd/web-chat/mockruntime` to `cmd/web-chat/internal/mockruntime`. This prevents other packages from treating `mock_parity` runtime as a reusable Pinocchio runtime package. It is an app/test profile used for browser parity smoke tests.

## Implementation plan

### Phase A: prepare guardrails

1. Start from a clean tree.
2. Run and record:

```bash
cd /home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio
go test ./cmd/web-chat/... -count=1
cd cmd/web-chat/web
npm run typecheck && npm test && npm run lint
```

3. Re-run the ticket inventory script:

```bash
cd /home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/ttmp/2026/05/31/CHATOVERLAY-011--make-pinocchio-web-chat-a-stellar-go-and-typescript-example-application
scripts/01-web-chat-inventory.py
```

4. Add a temporary TODO checklist in the ticket tasks if the work will span multiple commits.

### Phase B: move public-looking command subpackages into internal

Commit 1 should be mostly `git mv` plus import updates:

```bash
mkdir -p cmd/web-chat/internal
git mv cmd/web-chat/app cmd/web-chat/internal/appserver
git mv cmd/web-chat/profiles cmd/web-chat/internal/profiles
git mv cmd/web-chat/mockruntime cmd/web-chat/internal/mockruntime
```

Then update imports:

```text
github.com/go-go-golems/pinocchio/cmd/web-chat/app
  -> github.com/go-go-golems/pinocchio/cmd/web-chat/internal/appserver

github.com/go-go-golems/pinocchio/cmd/web-chat/profiles
  -> github.com/go-go-golems/pinocchio/cmd/web-chat/internal/profiles

github.com/go-go-golems/pinocchio/cmd/web-chat/mockruntime
  -> github.com/go-go-golems/pinocchio/cmd/web-chat/internal/mockruntime
```

Also rename package declarations:

```text
package app       -> package appserver
package profiles  -> package profiles
package mockruntime -> package mockruntime
```

Validate:

```bash
gofmt -w cmd/web-chat
go test ./cmd/web-chat/... -count=1
```

Do not split functions in this commit. Let reviewers verify that internalization was behavior-preserving.

### Phase C: extract webapp HTTP shell from main.go

Create `cmd/web-chat/internal/webapp` and move these functions:

- `normalizeBasePrefix`
- `runtimeConfigScript` -> `RuntimeConfigScript`
- `buildAppConfigHandler` -> private `buildAppConfigHandler`
- `fsSub`
- `registerStaticUIHandlers`
- `buildAppMux` -> `NewMux`
- `buildRootHandler` -> `MountRoot`
- `runHTTPServer` -> `RunHTTPServer`

Suggested files:

```text
internal/webapp/config.go
internal/webapp/static.go
internal/webapp/routes.go
internal/webapp/root.go
internal/webapp/server.go
```

Update main/runtime tests to import or use `webapp.RuntimeConfigScript`, `webapp.NewMux`, and `webapp.MountRoot`.

Acceptance: `main.go` should no longer import `net/http`, `io/fs`, `encoding/json`, `strings`, `syscall`, `os/signal`, or `errgroup` for web serving. It may still import `embed` if static assets are embedded there.

### Phase D: extract runtime and middleware packages

Move:

```text
runtime_composer.go          -> internal/runtime/composer.go
canonical_runtime_resolver.go -> internal/runtime/canonical_resolver.go
turn_persistence.go          -> internal/runtime/turn_persistence.go
agentmode_sink.go            -> internal/plugins/agentmode/sink.go or internal/runtime/agentmode_sink.go
middleware_definitions.go    -> internal/middlewaredefs/registry.go + agentmode.go
agentmode_chat_feature.go    -> internal/plugins/agentmode/plugin.go
```

Update constructor names so call sites read clearly:

```go
middlewareRegistry, err := middlewaredefs.NewRegistry()
runtimeComposer := runtime.NewComposer(middlewareRegistry, buildDeps, baseSettings).WithTurnStore(turnStore)
runtimeResolver := runtime.NewCanonicalResolver(requestResolver, runtimeComposer)
agentModePlugin := agentmodeplugin.NewPlugin()
```

Validate after this move before changing logic.

### Phase E: create `internal/webchatcmd` composition root

Move settings decode and app assembly from `Command.RunIntoWriter` into `internal/webchatcmd`.

A clean target is:

```go
package webchatcmd

func NewCommand(staticFS fs.FS) (*Command, error)
func Run(ctx context.Context, parsed *values.Values, staticFS fs.FS) error
```

Then `cmd/web-chat/main.go` becomes either:

```go
func main() {
    root, err := webchatcmd.NewRootCommand(staticFS)
    cobra.CheckErr(err)
    cobra.CheckErr(root.Execute())
}
```

or, if keeping Cobra root setup in main:

```go
c, err := webchatcmd.NewCommand(staticFS)
command, err := cli.BuildCobraCommand(c, ...)
root.AddCommand(command)
```

The command package should be the only package that imports Glazed `cmds`, `fields`, `values`, and `profilebootstrap`.

### Phase F: split appserver and profiles files

After the package move is stable, split large files without changing behavior.

For `internal/appserver`:

- Rename `showcase_tools.go` to `routes_frontend_tools.go`.
- Move option functions to `options.go` or convert to `Options` struct.
- Move snapshot helpers to `snapshot.go`.
- Move route subrouter and submit/snapshot handlers to `routes_sessions.go`.
- Keep export handlers in `routes_exports.go`.

For `internal/profiles`:

- Split schema endpoints, profile endpoints, current-profile cookie endpoints, models, and errors.
- Keep `RegisterAPIHandlers` as the main public function for the package.
- Add focused tests around cookie parsing and route helpers if any split reveals missing coverage.

### Phase G: optionally reduce appserver duplication with `pkg/chatapp.Runner`

This is intentionally optional and should be a separate commit. First move packages and split files. Then decide whether `internal/appserver.NewServer` should call `chatapp.NewRunner`.

Current `pkg/chatapp/runner.go` already provides schema registration, hydration store, hub, engine, projections, and service construction. If appserver uses it, `NewServer` becomes easier to read:

```go
ws := wstransport.NewServer(provider)
runner := chatapp.NewRunner(chatapp.RunnerOptions{
    HydrationStore: store,
    UIFanout:       ws,
    TurnStore:      opts.TurnStore,
    Plugins:        opts.ChatPlugins,
    ChunkDelay:     opts.ChunkDelay,
})
frontendToolManager.Install(runner.Hub)
server.service = runner.Service
```

The tricky part is ordering: frontend-tool manager installation currently happens after `chatapp.Install(hub, engine)` and before `chatapp.NewService`. If `Runner` does not expose the right installation hook, either extend `RunnerOptions` with extra hub installers or leave `appserver` explicit for now.

## Testing and validation strategy

### Unit and package tests

Run after every behavior-preserving move:

```bash
cd /home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio
go test ./cmd/web-chat/... -count=1
```

Run broader focused tests before each commit:

```bash
go test ./cmd/web-chat ./cmd/web-chat/internal/... ./pkg/chatapp ./pkg/chatapp/serverkit ./pkg/chatapp/frontendtools ./pkg/chatapp/widgets -count=1
```

If `internal/...` does not exist yet, use `./cmd/web-chat/...`.

### Frontend contract checks

The Go refactor should not change the browser API. Run:

```bash
cd /home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/web
npm run typecheck
npm test
npm run lint
npm run build
npm run check:storybook
```

### Browser/parity checks

After package moves and before declaring Phase 5 complete, run the existing parity scripts from the overlay ticket workspace:

```bash
cd /home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm
node ttmp/2026/05/31/CHATOVERLAY-009--clean-up-pinocchio-web-chat-react-and-storybook-architecture/scripts/04-phase6-mock-profile-parity-smoke.js
node ttmp/2026/05/31/CHATOVERLAY-010--create-unified-timeline-adapter-api/scripts/01-mock-profile-hydration-smoke.js
```

Adjust service startup commands as needed through `devctl` and restore default ports afterward.

### Compile-time import guard

After moving to `internal`, search for old imports:

```bash
rg -n "cmd/web-chat/(app|profiles|mockruntime)" . -g '*.go' -S
```

Expected active Go code should not import the old paths. Historical `ttmp/` docs may still mention them.

### API invariants to preserve

- `GET /api/chat/profiles`
- `GET /api/chat/profile`
- `POST /api/chat/profile`
- `POST /api/chat/sessions`
- `POST /api/chat/sessions/{id}/messages`
- `GET /api/chat/sessions/{id}/snapshot`
- `GET /api/chat/sessions/{id}/timeline?...`
- `GET /api/chat/sessions/{id}/turns?...`
- `GET /api/chat/sessions/{id}/export?...`
- `POST /api/chat/sessions/{id}/frontend-tools/manifest`
- `POST /api/chat/sessions/{id}/frontend-tools/result`
- `GET /api/chat/ws`
- `/app-config.js` under both root and prefixed mount.

## Migration notes for tests

The package move will break imports in tests first. Update these patterns:

```go
appserver "github.com/go-go-golems/pinocchio/cmd/web-chat/app"
```

to:

```go
appserver "github.com/go-go-golems/pinocchio/cmd/web-chat/internal/appserver"
```

and similarly for `profiles` and `mockruntime`.

Tests that live in `cmd/web-chat` can import `cmd/web-chat/internal/...` because they are within the parent tree. Tests outside `cmd/web-chat` cannot. That is a feature: if an external test currently imports command internals, move that test into `cmd/web-chat` or test through a public API instead.

## Design decisions

### Decision 1: use `cmd/web-chat/internal`, not `pkg/webchat`

This refactor should not create a new public package. The reusable parts have already been moved into `pkg/chatapp/serverkit`, `pkg/chatapp/frontendtools`, `pkg/chatapp/widgets`, and the generic provider packages. The remaining Go code is app assembly and example-specific policy.

### Decision 2: move packages before splitting files

A package move plus file split plus option rewrite in one commit would be hard to review. First prove that `internal` imports compile. Then split file responsibilities. Then consider API cleanup.

### Decision 3: keep generated static assets under command ownership

`//go:embed static` cannot embed `../static`, so asset placement matters. The simplest low-risk approach is to keep `cmd/web-chat/static` as the generated asset directory and keep the embed declaration in a tiny `static_assets.go` file in package main, then pass the resulting `fs.FS` into internal command/webapp code.

### Decision 4: profile APIs remain app-owned

The profile HTTP API is not a generic package. It is the web-chat app's profile-selection surface. Moving it into `internal/profiles` makes this explicit while still keeping the code testable.

### Decision 5: the app-specific agent-mode plugin stays internal

`pkg/middlewares/agentmode` is reusable middleware. The web-chat plugin that turns agent-mode events into browser UI/timeline entities is app-specific and should live under `internal/plugins/agentmode`.

## Alternatives considered

### Alternative A: leave packages where they are and only split files

This would reduce file size but would not fix the accidental public API problem. Other module packages could still import `cmd/web-chat/app` and `cmd/web-chat/profiles`.

### Alternative B: move everything into `pkg/webchat`

This would make the code look reusable, but much of it is intentionally app-specific: profile cookie names, mock parity behavior, web-chat middleware catalog, frontend-tool HTTP endpoints, and agent-mode projection policy. A `pkg` move would make future cleanup harder by creating compatibility expectations.

### Alternative C: rewrite the server around `pkg/chatapp.Runner` immediately

This may be a good later cleanup, but it changes construction internals and potentially installer ordering. It should not be bundled with package movement. Preserve behavior first, then reduce duplication.

## Risks and mitigations

| Risk | Why it matters | Mitigation |
|---|---|---|
| Import churn hides behavior changes | Large package moves produce noisy diffs. | Use `git mv`, one move commit, no logic changes. |
| `internal` breaks tests outside `cmd/web-chat` | Internal packages are intentionally restricted. | Move tests under `cmd/web-chat` or test public behavior. |
| Static assets break after moving embed | `go:embed` paths are package-relative and cannot use `..`. | Keep embed next to `static/` in package main or move static generation deliberately. |
| Frontend tool endpoint naming remains misleading | `showcase_tools.go` no longer describes production routes. | Rename to `routes_frontend_tools.go` during appserver split. |
| Runner extraction changes plugin/manager installation order | Frontend tool manager currently installs directly on hub. | Treat `pkg/chatapp.Runner` adoption as separate optional commit. |
| Profile API split changes cookie behavior | Current profile cookie behavior has subtle fallback logic. | Keep route tests green; add focused cookie tests before rewriting. |

## Intern implementation checklist

1. Read this guide fully.
2. Read current files:
   - `cmd/web-chat/main.go`
   - `cmd/web-chat/app/server.go`
   - `cmd/web-chat/app/showcase_tools.go`
   - `cmd/web-chat/profiles/api.go`
   - `cmd/web-chat/profiles/resolver.go`
   - `cmd/web-chat/runtime_composer.go`
   - `cmd/web-chat/middleware_definitions.go`
   - `cmd/web-chat/agentmode_chat_feature.go`
3. Run baseline tests.
4. Commit 1: move `app`, `profiles`, and `mockruntime` under `internal` with import updates only.
5. Commit 2: move webapp/static/root/server helpers out of `main.go`.
6. Commit 3: move runtime composer/resolver/middlewaredefs/agentmode plugin into internal packages.
7. Commit 4: move command assembly into `internal/webchatcmd` or shrink `main.go` to call internal runner.
8. Commit 5: split appserver files and rename frontend-tool routes file.
9. Commit 6: split profile API files by responsibility.
10. Re-run tests and browser smokes.
11. Update the ticket diary/changelog after each commit.

## Acceptance criteria

The refactor is complete when:

- `cmd/web-chat/main.go` is a thin CLI/Glazed/Cobra entrypoint.
- Active command internals live under `cmd/web-chat/internal/...`.
- No active Go code imports `github.com/go-go-golems/pinocchio/cmd/web-chat/app`, `.../profiles`, or `.../mockruntime` old paths.
- `showcase_tools.go` has been renamed/split into production frontend-tool route files.
- `profiles/api.go` is split into route groups and helper files.
- `go test ./cmd/web-chat/... -count=1` passes.
- Frontend validation still passes.
- Mock profile parity and hydration smoke scripts pass.
- The ticket diary and changelog describe each behavior-preserving move and any test failures encountered.

## References

- `/home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/main.go` — current overloaded command entrypoint and app assembly.
- `/home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/app/server.go` — current HTTP/sessionstream/chatapp server adapter.
- `/home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/app/showcase_tools.go` — frontend-tool HTTP endpoints that should be renamed as production routes.
- `/home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/profiles/api.go` — profile HTTP API to split by route group.
- `/home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/profiles/resolver.go` — profile/request/runtime resolution.
- `/home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/runtime_composer.go` — Geppetto engine/middleware composition.
- `/home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/canonical_runtime_resolver.go` — bridge from profile requests to runtime composer.
- `/home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/middleware_definitions.go` — web-chat middleware catalog.
- `/home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/agentmode_chat_feature.go` — app-owned agent-mode chat plugin.
- `/home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/pkg/chatapp/runner.go` — reusable chatapp/sessionstream runner worth considering after package movement.
