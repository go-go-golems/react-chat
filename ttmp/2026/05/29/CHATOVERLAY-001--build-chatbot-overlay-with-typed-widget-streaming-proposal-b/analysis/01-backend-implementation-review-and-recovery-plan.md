---
Title: ""
Ticket: ""
Status: ""
Topics: []
DocType: ""
Intent: ""
Owners: []
RelatedFiles:
    - Path: internal/webchat/helpers.go
      Note: Reviewed JSON and snapshot helper behavior
    - Path: internal/webchat/overlay_handler.go
      Note: Reviewed custom overlay command handler
    - Path: internal/webchat/server.go
      Note: Reviewed current server wiring
    - Path: internal/widgets/plugin.go
      Note: Reviewed widget schema registration and UI/timeline projections
    - Path: proto/chatoverlay/widgets/v1/widget.proto
      Note: Reviewed widget lifecycle schema and generic Struct props boundary
ExternalSources: []
Summary: ""
LastUpdated: 0001-01-01T00:00:00Z
WhatFor: ""
WhenToUse: ""
---


# Backend Implementation Review and Recovery Plan

## Purpose

This report reviews the backend work currently present in `2026-05-29--chatbot-overlay-glm`. The goal is not to assign blame. The goal is to turn a partially working implementation into an implementation that a backend engineer can finish with confidence.

The backend is attempting to do three things at once: reuse Pinocchio's `chatapp` runtime, add typed widget events, and expose a mock inference provider for frontend development. Each of those is reasonable. The problems appeared where the implementation crossed the boundaries between those systems without fully respecting their contracts. In `sessionstream`, commands, events, projections, hydration, and WebSocket delivery are separate steps. If one step is skipped or used with the wrong lifetime, the system may appear to accept a request while failing to produce visible timeline state.

## Executive summary

The first implementation created useful scaffolding. It established a Go module, HTTP routes, a WebSocket endpoint, protobuf definitions for widgets, and a `ChatPlugin` that can project widget events into UI events and timeline entities. Those pieces are valuable and should not be discarded.

The implementation became confused when it tried to replace Pinocchio's default inference behavior. The code introduced a custom command named `ChatOverlayStartInference`, but the server initially kept submitting the default `ChatStartInference` command. After changing the submit path to use `ChatOverlayStartInference`, the command schema and handler registration were missing from the active server wiring, which produced the runtime error:

```text
unknown command "ChatOverlayStartInference"
```

After adding registration, the command is accepted, but only the user message appears in the snapshot. The assistant text and widget events do not persist. The likely cause is that `OverlayInferenceHandler` starts a goroutine using the request/dispatch context directly:

```go
go mock.runInference(ctx, sid, messageID, prompt, pub)
```

Pinocchio's own engine does not do that. It deliberately removes cancellation from the request context before starting asynchronous publishing:

```go
runCtx, cancel := context.WithCancel(publishContext(ctx))
```

where `publishContext(ctx)` calls `context.WithoutCancel(ctx)`. This distinction matters. The command handler returns immediately. If the derived request context is canceled after the handler returns, the goroutine observes `ctx.Done()` and stops before publishing the assistant events. That matches the observed behavior: the synchronous user event is present, while later asynchronous events are missing.

The recovery path is straightforward:

1. Keep the existing module, protobuf schema, HTTP route shape, and widget projection plugin.
2. Replace the scattered mock inference code with a dedicated `internal/mockengine` package.
3. Give the mock engine explicit run ownership: `Start`, `Stop`, active run tracking, cancellation, and a `context.WithoutCancel` publish context.
4. Register overlay command schemas before Hub creation or clearly before command submission, and register command handlers exactly once.
5. Add tests that prove the complete command → events → projections → snapshot path.
6. Move or isolate frontend dependencies so `go test ./...` does not scan `web/node_modules`.

## Current backend state

The current backend code lives in these files:

| File | Current role |
| --- | --- |
| `cmd/chat-overlay/main.go` | Cobra root command. |
| `cmd/chat-overlay/cmds/serve.go` | Starts the HTTP server and wires `webchat.NewServer`. |
| `internal/webchat/server.go` | Server wiring, HTTP handlers, mock response catalog, and helper functions. |
| `internal/webchat/overlay_handler.go` | Custom overlay inference command handler and streaming mock run. |
| `internal/webchat/helpers.go` | JSON request/response helpers and snapshot encoding. |
| `internal/widgets/plugin.go` | `chatapp.ChatPlugin` for widget schema registration and projections. |
| `proto/chatoverlay/widgets/v1/widget.proto` | Widget lifecycle, action command, and timeline entity schema. |

The current backend builds:

```text
$ go build ./...
# no output
```

The current repository also has an important local testing problem:

```text
$ go test ./...
?    github.com/go-go-golems/chat-overlay/cmd/chat-overlay [no test files]
?    github.com/go-go-golems/chat-overlay/cmd/chat-overlay/cmds [no test files]
?    github.com/go-go-golems/chat-overlay/internal/pb/proto/chatoverlay/widgets/v1 [no test files]
?    github.com/go-go-golems/chat-overlay/internal/webchat [no test files]
?    github.com/go-go-golems/chat-overlay/internal/widgets [no test files]
?    github.com/go-go-golems/chat-overlay/web/node_modules/flatted/golang/pkg/flatted [no test files]
```

The last line is not expected. The Go module is scanning `web/node_modules` because the frontend is inside the Go module directory. This is not fatal, but it is a sign that backend validation is not isolated from frontend dependencies.

A smoke test against the running server currently produces only the user message:

```text
$ SESSION=$(curl -s -X POST http://localhost:8080/api/chat/sessions \
    -H 'Content-Type: application/json' -d '{}' | jq -r '.sessionId')

$ curl -s -X POST "http://localhost:8080/api/chat/sessions/$SESSION/messages" \
    -H 'Content-Type: application/json' \
    -d '{"prompt":"show me boots"}' | jq .
{
  "sessionId": "8a6bb202-9162-4530-a7fb-10870eab03ab",
  "accepted": true,
  "status": "running"
}

$ sleep 1
$ curl -s "http://localhost:8080/api/chat/sessions/$SESSION" \
    | jq '[.entities[] | {kind,id,status:.payload.status, widget:.payload.widgetName}]'
[
  {
    "kind": "ChatMessage",
    "id": "overlay-msg-d4d45e0f-user",
    "status": "accepted",
    "widget": null
  }
]
```

The server accepts the prompt, but the assistant text and widget timeline entity are not persisted.

## What was good

### The scaffolding matched the intended shape

The initial scaffold created a real Go module, a real HTTP server, and real sessionstream wiring. That matters because the design should not be implemented as an isolated demo that bypasses `sessionstream`. The core server creation in `internal/webchat/server.go` creates a schema registry, hydration store, WebSocket transport, Hub, Pinocchio chat engine, and chat service. Those are the right building blocks.

The useful part of the wiring is visible in `server.go`:

```go
reg := sessionstream.NewSchemaRegistry()
chatapp.RegisterSchemas(reg, widgets.NewWidgetPlugin())
store, err := storesqlite.NewInMemory(reg)
ws, err := wstransport.NewServer(snapshotProvider{store: store})
hub, err := sessionstream.NewHub(
    sessionstream.WithSchemaRegistry(reg),
    sessionstream.WithHydrationStore(store),
    sessionstream.WithUIFanout(ws),
)
chatapp.Install(hub, engine)
```

This is the right direction. A correct backend should use the Hub as the command entry point and use projections for frontend state. The implementation did not invent a parallel state store, which would have been much harder to recover from.

### The widget plugin is the strongest part of the backend work

`internal/widgets/plugin.go` is close to the right design. It uses Pinocchio's `ChatPlugin` extension mechanism and registers widget payload types as backend events, UI events, and timeline entities:

```go
reg.RegisterEvent(EventWidgetInstanceStarted, &widgetv1.WidgetInstanceStarted{})
reg.RegisterUIEvent(EventWidgetInstanceStarted, &widgetv1.WidgetInstanceStarted{})
reg.RegisterTimelineEntity(TimelineEntityWidgetInstance, &widgetv1.WidgetInstanceEntity{})
```

This matches the sessionstream architecture. Backend events describe what happened. UI projections decide which live events the browser sees. Timeline projections decide what durable state is available on hydration. The code keeps that distinction alive.

The plugin also implements the two projection paths:

```go
ProjectUI(...)       // backend event -> live UI event
ProjectTimeline(...) // backend event -> durable timeline entity
```

That separation is essential. A reconnecting client should not need the original live event stream. It should receive a snapshot of `ChatWidgetInstance` entities and render the same widget state.

### Protobuf generation was a good correction

The original design required concrete protobuf messages, not untyped JSON blobs. The implementation added `proto/chatoverlay/widgets/v1/widget.proto` and generated Go code under `internal/pb`. This is the right direction. It keeps the schema compatible with `sessionstream`'s schema registry and with future TypeScript code generation.

The implementation used `google.protobuf.Struct` for widget props. That is acceptable for a first backend iteration because the widget shell needs a generic widget envelope. Later, the frontend can validate `props` with Zod and the backend can introduce concrete widget prop messages if needed.

### The frontend development server got a usable target

Even though the backend is incomplete, it already exposes the route shape the frontend expects:

```text
POST /api/chat/sessions
POST /api/chat/sessions/{id}/messages
GET  /api/chat/sessions/{id}
POST /api/chat/sessions/{id}/stop
GET  /api/chat/ws
```

This route shape allowed the React overlay to be developed against a realistic API. The frontend failure after sending a message is not caused by a missing route; it is caused by incomplete backend event production.

## What was bad

### Mock inference was placed in the wrong package and at the wrong abstraction level

`internal/webchat/server.go` now contains server wiring, route handlers, mock response definitions, helper functions, and unused publishing helpers. This makes the file difficult to reason about. A reader cannot tell where the HTTP layer ends and where the inference engine begins.

The design guide specified a separate package:

```text
internal/mockengine/
  engine.go
  responses.go
```

That separation should be restored. The HTTP layer should submit commands and encode responses. The mock engine should own prompt matching, active run tracking, cancellation, and event publishing.

The current `server.go` has `mockResponse`, `mockWidget`, `defaultMockResponses`, `publishWidgetEvent`, and `structToProto` in the same file as HTTP handlers. That makes future backend work more error-prone because every change to mock behavior risks touching server wiring.

### The implementation introduced a new command without fully owning its lifecycle

The code introduced:

```go
const CommandOverlayInference = "ChatOverlayStartInference"
```

and changed the HTTP submit handler to call:

```go
s.hub.Submit(r.Context(), sid, CommandOverlayInference, &chatappv1.StartInferenceCommand{Prompt: in.Prompt})
```

This can work, but only if three things are true:

1. The command payload type is registered in the schema registry.
2. The command handler is registered in the Hub.
3. The stop handler cancels the same active run created by the command handler.

The implementation initially missed the first two registrations in the active server wiring, which produced `unknown command "ChatOverlayStartInference"`. It still misses the third item: `POST /stop` calls `s.service.Stop`, which submits Pinocchio's default `ChatStopInference` command. That command cancels active runs tracked by `chatapp.Engine`, not the custom mock run started by `OverlayInferenceHandler`.

This is the central design mismatch. Once the backend leaves `chatapp.Engine`'s default command path, it must either fully emulate that path or stop trying to mix command systems.

### The goroutine uses the wrong context lifetime

The most important runtime bug is in `OverlayInferenceHandler`:

```go
go mock.runInference(ctx, sid, messageID, prompt, pub)
```

The synchronous user message is published before the goroutine starts:

```go
pub.Publish(ctx, sessionstream.Event{Name: chatapp.EventUserMessageAccepted, ...})
```

That event appears in the snapshot. The later events are published from `runInference`, which uses the same `ctx`. If that context is canceled after the command handler returns, this line immediately selects the cancellation path:

```go
select {
case <-ctx.Done():
    _ = pub.Publish(ctx, sessionstream.Event{Name: chatapp.EventChatTextSegmentFinished, ...})
    _ = pub.Publish(ctx, sessionstream.Event{Name: chatapp.EventChatRunStopped, ...})
    return
case <-time.After(m.chunkDelay):
}
```

Those cancellation-path publishes also use the canceled context, so they may fail as well. This exactly explains the observed state: only the synchronous user message persists.

Pinocchio solved this problem in its own engine. `handleStartInference` creates a context that intentionally survives request cancellation:

```go
runCtx, cancel := context.WithCancel(publishContext(ctx))
```

and `publishContext` is:

```go
func publishContext(ctx context.Context) context.Context {
    if ctx == nil {
        return context.Background()
    }
    return context.WithoutCancel(ctx)
}
```

The mock engine needs the same pattern. It should keep a cancellable run context, but that context should not be the HTTP request context.

### Errors in asynchronous publishing are swallowed

`runInference` returns no error. Every failed publish simply returns from the goroutine:

```go
if err := pub.Publish(ctx, sessionstream.Event{...}); err != nil {
    return
}
```

There is no log entry and no failed run event. This made the current failure harder to diagnose. When a command accepts a prompt and then silently fails, the frontend sees an empty chat panel and the backend logs nothing. That is the worst debugging state: the system appears idle rather than broken.

The mock engine should log publish errors with `sessionId`, `messageId`, `eventName`, and prompt. It should also try to publish `ChatRunFailed` using a non-canceled publish context when possible.

### Widget patch semantics are not yet correct for arrays

The widget projection currently merges `google.protobuf.Struct` fields by replacement:

```go
for k, v := range patch.Fields {
    existing.Props.Fields[k] = v
}
```

The mock streaming path publishes patches such as:

```go
patch := map[string]any{"products": []any{item}}
```

If `products` already contains one item, replacing the field with `[]any{nextItem}` loses the previous items. The frontend attempted to handle this by appending `propsPatch` arrays in Redux, but the durable backend snapshot would still be wrong. The timeline projection is the source of truth for reconnect. It must merge widget patches correctly.

A first implementation can choose one of two simpler contracts:

| Contract | Backend behavior | Frontend behavior |
| --- | --- | --- |
| Snapshot patch | Every `WidgetInstancePatched` carries the full latest props. | Replace props on each patch. |
| Append patch | Patch message explicitly says which repeated field receives an appended item. | Append for live rendering; backend appends for durable snapshot. |

The current code mixes the two: the patch contains a partial array, but the projection treats it as a field replacement.

### The frontend directory interferes with Go package discovery

Running `go test ./...` from the module root currently includes a package under `web/node_modules`:

```text
? github.com/go-go-golems/chat-overlay/web/node_modules/flatted/golang/pkg/flatted [no test files]
```

This is not a backend correctness bug, but it is a repository hygiene bug. Go treats directories under the module as potential packages. `node_modules` happens to contain Go source, so Go descends into it. This can slow tests, introduce surprise failures, and make CI nondeterministic when frontend dependencies change.

The immediate fix is to add `web/go.mod` so Go treats the frontend as a nested module boundary. An alternative is to move the frontend outside the Go module, but the design guide intentionally places `web/` inside the project so that `go:embed` can package `dist/` later. A nested `web/go.mod` is therefore the simplest local-development fix.

### The server ignores `TimelineDB`

`ServerOptions` exposes `TimelineDB`, and the CLI exposes `--timeline-db`, but `NewServer` always uses an in-memory SQLite hydration store:

```go
store, err := storesqlite.NewInMemory(reg)
```

This is acceptable for early frontend development, but it should be documented as incomplete. If a developer passes `--timeline-db ./var/timeline.db`, they will expect persistence across restarts. The option currently does nothing.

## Information that was missed

### Sessionstream has two registries involved in command submission

A command must be known in two places:

1. The schema registry validates that the command name is allowed and that the payload has the expected protobuf type.
2. The Hub command registry maps the command name to a handler.

`Hub.Submit` first validates the payload type, then dispatches the command:

```go
if err := h.validatePayloadType(h.reg.commands, "command", name, payload); err != nil {
    return err
}
cmd := Command{Name: name, SessionId: sid, Payload: payload}
return h.dispatch(ctx, cmd)
```

`dispatch` then looks up the handler:

```go
handler, ok := h.commands.Lookup(cmd.Name)
if !ok {
    return fmt.Errorf("unknown command %q", cmd.Name)
}
```

Missing either step produces a command-path failure. The implementation initially focused on payload shape and server routes, but it did not consistently check command registration in both places.

### Pinocchio's default engine already owns active run semantics

`chatapp.Engine` does more than stream text. It tracks active runs, swaps out previous runs, cancels old runs, and ensures stopped runs publish stopped events. When the backend introduced `ChatOverlayStartInference`, it bypassed those semantics.

A backend engineer should read `pinocchio/pkg/chatapp/runtime_inference.go` before changing command behavior. The important concepts are:

- `handleStartInference` publishes the user message synchronously, then starts a goroutine for the run.
- The goroutine uses a context derived with `context.WithoutCancel` so request cancellation does not kill event publishing.
- `handleStopInference` cancels the current active run by session id.
- Run state is stored in `Engine.active`, keyed by `sessionstream.SessionId`.

If the overlay backend keeps a custom command, it must implement equivalent semantics in its own mock engine.

### UI projection and timeline projection solve different problems

The widget plugin has the right shape, but the rest of the code still treats live streaming and durable state as if they were the same problem. They are not.

A WebSocket client needs live `UIEvent`s so it can render patches immediately. A reconnecting client needs a snapshot of `TimelineEntity` values so it can rebuild the current state. The patch merge logic belongs in the timeline projection because the hydration store must contain the current widget state.

This distinction is the reason widget patch semantics need to be precise. If the live frontend appends product cards but the timeline projection replaces the `products` array on each patch, refresh and reconnect will show a different widget than the live stream showed.

### The backend and frontend used different status representations

The protobuf enum produces names such as `WIDGET_STATUS_READY` in JSON, while frontend code often checks for `READY` or `STREAMING`. A robust implementation should normalize statuses at one boundary. The backend can send string status fields for frontend-only entities, or the frontend can normalize enum names. What should not happen is a mixture of enum names, shortened names, and lowercase names with no documented conversion.

## Why the current implementation is confusing

The code is confusing because three architectures are partially mixed:

1. Pinocchio's default chatapp command path: `ChatStartInference` and `ChatStopInference` are handled by `chatapp.Engine`.
2. A custom overlay command path: `ChatOverlayStartInference` is handled by `OverlayInferenceHandler`.
3. A widget plugin path: widget events are projected by a `chatapp.ChatPlugin`.

Each path can be valid, but they have different ownership rules. The current backend starts custom runs but stops default runs. It registers the widget plugin correctly, but does not yet guarantee that widget-producing events survive the command handler context. It creates a `chatapp.Service`, but the primary submit path no longer uses the service. That is why the code feels unstable: object names imply one design, while runtime behavior follows another.

A clearer implementation should choose one of two backend designs.

### Option A: Extend Pinocchio's existing `chatapp.Engine`

This option keeps `ChatStartInference` as the command. The backend supplies a mock Geppetto runtime or an engine feature that causes Pinocchio's existing runtime sink to emit widget events. This preserves `ChatStopInference`, active run tracking, and the `chatapp.Service` API.

This is architecturally elegant, but it requires understanding Geppetto runtime integration. It may be slower for a first deliverable.

### Option B: Own a dedicated overlay mock engine

This option keeps `ChatOverlayStartInference` as a separate command. The custom mock engine owns active runs, cancellation, text event publishing, widget event publishing, and failure reporting. The server can still install `chatapp` projections for canonical chat events and the widget plugin for widget events, but the service submit/stop methods are not used for overlay runs.

This is the better recovery path for the current code. It is explicit, testable, and fast to complete.

## Recommended recovery design

The backend should be reorganized into these responsibilities:

```text
internal/mockengine/
  engine.go       # Engine, active run map, Start, Stop
  responses.go    # canned response catalog
  publish.go      # helpers that publish chat and widget events
  engine_test.go  # command -> snapshot tests

internal/widgets/
  plugin.go       # schema registration and projections

internal/webchat/
  server.go       # wiring only
  handlers.go     # HTTP handlers only
  helpers.go      # JSON and snapshot encoding
```

The mock engine should expose this small API:

```go
type Engine struct {
    mu         sync.Mutex
    active     map[sessionstream.SessionId]*Run
    responses  []Response
    chunkDelay time.Duration
}

type Run struct {
    messageID string
    cancel    context.CancelFunc
    done      chan struct{}
}

func (e *Engine) Install(hub *sessionstream.Hub) error
func (e *Engine) Start(ctx context.Context, cmd sessionstream.Command, sess *sessionstream.Session, pub sessionstream.EventPublisher) error
func (e *Engine) Stop(ctx context.Context, cmd sessionstream.Command, sess *sessionstream.Session, pub sessionstream.EventPublisher) error
func (e *Engine) WaitIdle(ctx context.Context, sid sessionstream.SessionId) error
```

The start handler should follow this sequence:

```go
func (e *Engine) Start(ctx context.Context, cmd sessionstream.Command, sess *sessionstream.Session, pub sessionstream.EventPublisher) error {
    prompt := decodePrompt(cmd.Payload)
    messageID := e.nextMessageID()

    publish user message synchronously

    runCtx, cancel := context.WithCancel(context.WithoutCancel(ctx))
    run := &Run{messageID: messageID, cancel: cancel, done: make(chan struct{})}
    previous := e.swapRun(cmd.SessionId, run)
    if previous != nil {
        previous.cancel()
        <-previous.done
    }

    go e.run(runCtx, cmd.SessionId, messageID, prompt, pub, run.done)
    return nil
}
```

The stop handler should cancel the custom active run:

```go
func (e *Engine) Stop(ctx context.Context, cmd sessionstream.Command, sess *sessionstream.Session, pub sessionstream.EventPublisher) error {
    if run := e.currentRun(cmd.SessionId); run != nil {
        run.cancel()
    }
    return nil
}
```

The server should register the overlay start and stop commands and should submit those same commands from HTTP handlers:

```go
reg.RegisterCommand(mockengine.CommandStart, &chatappv1.StartInferenceCommand{})
reg.RegisterCommand(mockengine.CommandStop, &chatappv1.StopInferenceCommand{})
mockEngine.Install(hub)

// POST /messages
hub.Submit(ctx, sid, mockengine.CommandStart, &chatappv1.StartInferenceCommand{Prompt: prompt})

// POST /stop
hub.Submit(ctx, sid, mockengine.CommandStop, &chatappv1.StopInferenceCommand{})
```

This makes start and stop symmetric. It also makes the custom command path explicit.

## What the backend engineer should know next time

### A command is not just a string

A sessionstream command has three required pieces: a schema entry, a handler entry, and a payload type. The route path is not enough. The string name is not enough. A command works only when validation and dispatch both know about it.

### The request context is not the run context

HTTP request contexts are for request handling. Inference runs often outlive the HTTP request. If a goroutine publishes events after the handler returns, it needs a context that preserves values but removes request cancellation. Pinocchio uses `context.WithoutCancel` for this reason. A custom mock engine should do the same.

### A projection is the durable truth for reconnect

Live UI events help the current browser. Timeline projections help every future browser. If a widget streams product cards, the projection must preserve the accumulated product list. Do not rely on the frontend to make the durable state correct.

### Reuse is good, but partial reuse is dangerous

Using `chatapp.Service` for snapshot and stop while using a custom command for submit creates hidden asymmetry. If the code chooses Pinocchio's engine, use its start and stop semantics. If the code chooses a custom mock engine, own start and stop semantics explicitly.

### Silent goroutines are difficult to debug

A goroutine that swallows publish errors makes the system look empty instead of broken. Every asynchronous publish loop should log failures and should have a test that waits for expected state.

## Concrete next tasks

The backend can be recovered in a short sequence:

1. **Isolate frontend dependencies from Go package discovery.** Add `web/go.mod` or otherwise prevent `go test ./...` from scanning `web/node_modules`.
2. **Move mock inference code into `internal/mockengine`.** Keep `server.go` as wiring and HTTP only.
3. **Implement custom start/stop commands in the mock engine.** Use `context.WithoutCancel` for run publishing and explicit active run cancellation for stop.
4. **Add backend tests for plain text, widget response, and stop.** Tests should create a server or Hub, submit commands, wait for idle, and inspect the snapshot.
5. **Fix widget patch semantics.** Either send full snapshot props on each patch or implement append semantics in the timeline projection.
6. **Decide whether `TimelineDB` is in scope now.** If it is in scope, wire the SQLite file store. If not, remove or document the flag as unused.
7. **Add a minimal widget action command.** It can initially accept and publish an acknowledgement event; it does not need CopilotKit-style client tools yet.

## Review verdict

The backend is recoverable. The useful parts are the scaffold, route shape, protobuf schema, and widget plugin. The risky parts are the custom command path, asynchronous context handling, unowned cancellation, mixed service usage, and colocated mock/server responsibilities.

The next implementation should not try to patch around the current structure in place. It should first draw a clear boundary: `webchat` owns HTTP and wiring; `mockengine` owns runs; `widgets` owns schema and projections. Once those boundaries exist, the rest of the work becomes mechanical: register schemas, register handlers, publish events with the right context, project events into durable entities, and test the snapshot.
