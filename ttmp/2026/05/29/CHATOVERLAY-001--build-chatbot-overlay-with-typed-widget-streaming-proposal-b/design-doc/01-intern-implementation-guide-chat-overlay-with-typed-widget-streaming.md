---
Title: 'Intern Implementation Guide: Chat Overlay with Typed Widget Streaming'
Ticket: CHATOVERLAY-001
Status: active
Topics:
    - chat-overlay
    - sessionstream
    - geppetto
    - pinocchio
    - react
    - widgets
    - protobuf
    - ecommerce
DocType: design-doc
Intent: long-term
Owners: []
RelatedFiles: []
ExternalSources: []
Summary: "Complete implementation guide for building a headless chat overlay with typed widget streaming, using sessionstream as the backend substrate, a mock LLM provider for testing, and a React frontend that renders validated widget instances from a registry."
LastUpdated: 2026-05-29T11:18:43.998672015-04:00
WhatFor: "Building the chatbot overlay end-to-end: Go backend with sessionstream, mock inference, protobuf schemas, and a React frontend with widget registry"
WhenToUse: "When implementing, debugging, or extending the chat overlay system"
---

# Intern Implementation Guide: Chat Overlay with Typed Widget Streaming (v2)

This guide explains how to build a chat overlay system from scratch. You will implement three pieces: a Go backend that uses the sessionstream framework to manage sessions and stream typed widget events, a mock LLM provider that simulates inference without calling any real model, and a React frontend that mounts a chat overlay, registers widgets, and renders them from a validated stream.

By the end of this guide, you should understand why each layer exists, what it is responsible for, and how data flows from a user typing a message to a widget appearing in the browser.

## What you are building

You are building a package called `@go-go-golems/chat-overlay` that provides a generic headless chat overlay. The package name is deliberately generic — it is not ecommerce-specific. Ecommerce widgets and domain logic are added through an optional preset, not baked into the core.

The central design decision is this: **the LLM never emits UI code.** It emits a typed widget request with validated props. The frontend receives that request, looks up the registered renderer, and instantiates it. This means the frontend controls what renders. The backend controls what data flows. Neither side leaks into the other.

The system has three runtime layers:

```text
Browser (React / plain JS)
  └─ createChatOverlay()
       ├─ overlay UI (launcher, panel, composer, message list)
       ├─ message state (Redux store consuming sessionstream events)
       ├─ widget registry (defineWidget, validation, instantiation)
       ├─ context provider (page, cart, customer data)
       └─ sessionstream transport (WebSocket + HTTP commands)

Backend (Go)
  └─ sessionstream hub
       ├─ command routing (chat.submit, widget.action, context.patch)
       ├─ event publication (message events, widget events, status events)
       ├─ UI projections (backend events → live client events)
       ├─ timeline projections (backend events → durable entities)
       └─ hydration store (SQLite persistence for reconnect)

LLM Runtime (mock provider)
  └─ MockEngine
       ├─ receives prompts
       ├─ produces token deltas (simulated streaming)
       ├─ calls tools (widget.render, catalog.search)
       └─ publishes events through sessionstream pipeline
```

Each layer has a single responsibility. The browser owns rendering and user interaction. The sessionstream hub owns event routing, projection, and persistence. The LLM runtime owns inference and tool execution. No layer reaches across these boundaries.

## The packages you depend on

Before writing any code, you need to understand the four existing packages that your system builds on. Each one solves a specific problem, and you will not be reimplementing any of them.

### sessionstream

**Repository:** `/home/manuel/workspaces/2026-05-29/chatbot-react/sessionstream/`
**Go import:** `github.com/go-go-golems/sessionstream`
**Key package:** `pkg/sessionstream`

Sessionstream is a Go framework for session-scoped, event-driven applications. The word "session" here means a conversation — one user talking to one assistant over time. Every command, event, and piece of state in sessionstream is scoped to a session ID.

The core model has five concepts you must internalize:

**Commands** are external requests. A client sends a command like "start inference" or "stop the current run." Commands are validated against a schema registry and routed to a handler.

**Backend events** are the canonical record of what happened. A handler does not return a result. It publishes events. The handler says "a user message was accepted" or "inference produced a token delta." These events are the source of truth for everything that follows.

**UI projections** turn backend events into live client-facing events. When the handler publishes `ChatUserMessageAccepted`, the UI projection produces a live `ChatMessageAccepted` event that gets sent to connected WebSocket clients. UI events are ephemeral. They are not the source of truth. They are a derived view for live consumption.

**Timeline projections** turn backend events into durable state. When the handler publishes `ChatUserMessageAccepted`, the timeline projection produces a `ChatMessage` entity that gets persisted to a hydration store (SQLite). These entities survive reconnects, page reloads, and server restarts.

**Ordinals** define event order. Every event gets a monotonically increasing ordinal within its session. Ordinals are `uint64` values. In JavaScript, they must be treated as strings because JavaScript's `number` type cannot represent all `uint64` values without precision loss.

The transport contract is defined in `proto/sessionstream/v1/transport.proto`. The wire format is protobuf JSON over WebSocket. The reconnect contract is snapshot-before-live: a client first receives the full timeline snapshot, then receives future live events.

The most important method in the sessionstream API is `EventPublisher.Publish()`. Handlers receive an `EventPublisher` and call it to emit events:

```go
// pseudocode — the handler publishes events, not results
func handleStartInference(ctx context.Context, cmd Command, sess *Session, pub EventPublisher) error {
    return pub.Publish(ctx, Event{
        Name:      "ChatUserMessageAccepted",
        SessionId: cmd.SessionId,
        Payload:   &UserMessageAcceptedEvent{Role: "user", Content: prompt},
    })
}
```

Why does the handler publish events instead of returning a value? Because one command often produces multiple outcomes. A "start inference" command might produce a user message acceptance, an inference start event, several token deltas, and an inference completion. If the handler returned a single value, the framework would have to know what to do with it. By publishing events, the handler describes what happened, and the framework decides what to project, persist, and deliver.

The schema registry requires concrete protobuf messages at the top level. You cannot register `*structpb.Struct` as a command, event, UI event, or timeline entity. Every top-level message must be a named protobuf type. This is enforced by the `sessionstream-lint` analyzer. Inside a concrete message, you may use `google.protobuf.Any` or `google.protobuf.Struct` at a deliberate boundary — for example, wrapping widget-specific props inside a concrete `WidgetInstanceUpsertedEvent`.

**Files to read:**
- `sessionstream/README.md` — full conceptual guide
- `sessionstream/pkg/sessionstream/hub.go` — the Hub struct and its options
- `sessionstream/pkg/sessionstream/handler.go` — the CommandHandler interface
- `sessionstream/pkg/sessionstream/projection.go` — projection interfaces
- `sessionstream/pkg/sessionstream/schema.go` — the SchemaRegistry
- `sessionstream/examples/chatdemo/chat.go` — a minimal working example
- `sessionstream/proto/sessionstream/v1/transport.proto` — the WebSocket frame schema

### Geppetto

**Repository:** `/home/manuel/workspaces/2026-05-29/chatbot-react/geppetto/`
**Go import:** `github.com/go-go-golems/geppetto`
**Key packages:** `pkg/inference/engine`, `pkg/inference/toolloop`, `pkg/profiles`

Geppetto is the LLM runtime. It provides provider-agnostic inference engines, tool calling, middleware composition, and profile management. In your project, Geppetto provides the inference interfaces that your mock engine will implement.

The key interfaces are:

- `engine.Engine` — the inference engine interface. Takes a conversation (list of turns), runs inference, and produces streaming output.
- `toolloop.ToolLoop` — orchestrates multi-turn tool calling. The LLM generates a response, which may include tool calls. The tool loop executes those tools and feeds results back to the LLM until it produces a final response without tool calls.
- `profiles.Registry` — manages engine profiles (model, provider, settings). Your mock engine will bypass this since it does not need a real provider.

For this project, you will not use Geppetto's real inference engines. You will implement a `MockEngine` that satisfies the same interface but produces canned responses. This lets you test the entire pipeline — command routing, event publication, projection, WebSocket delivery, frontend rendering — without an API key or network dependency.

Geppetto also exposes a JavaScript API through Goja (`require("geppetto")`). Your backend will use this in the future to run Pinocchio scripts, but for this implementation phase you only need the Go interfaces.

**Files to read:**
- `geppetto/README.md` — overview and JS API
- `geppetto/pkg/inference/engine/` — engine interfaces
- `geppetto/pkg/inference/toolloop/` — tool loop orchestration

### Pinocchio

**Repository:** `/home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/`
**Go import:** `github.com/go-go-golems/pinocchio`
**Key packages:** `pkg/chatapp`, `cmd/web-chat/`

Pinocchio is the webchat runtime. It owns the chat-specific layer on top of Geppetto and sessionstream. The `pkg/chatapp` package provides:

- `Engine` — manages active inference runs, handles start/stop commands, publishes chat-specific events (user message accepted, text deltas, tool calls, run completion).
- `Service` — wraps the sessionstream Hub and chatapp Engine into a convenient API (`SubmitPrompt`, `Stop`, `Snapshot`).
- `RegisterSchemas` — registers all chat protobuf types with the sessionstream SchemaRegistry.
- `Install` — installs chat command handlers and projections into a sessionstream Hub.
- `ChatPlugin` interface — extensible feature hooks (tool call tracking, reasoning segments, etc.)

The `cmd/web-chat/` directory contains a working web chat application that uses these packages. It demonstrates how to wire up a sessionstream Hub, install the chatapp handlers, configure WebSocket transport, serve HTTP routes, and embed a frontend.

**The CoinVault reference:** The `2026-03-16--gec-rag/` directory contains a production application (CoinVault) that builds on Pinocchio's chatapp. Its `internal/webchat/sessionstream/` package shows how to create a `CanonicalServer` that wires together the sessionstream Hub, chatapp Engine, WebSocket transport, and HTTP handlers. This is the closest reference to what you are building. Study these files:

- `2026-03-16--gec-rag/internal/webchat/sessionstream/sessionstream_server.go` — server initialization
- `2026-03-16--gec-rag/internal/webchat/server/server.go` — dependency injection
- `2026-03-16--gec-rag/internal/webchat/server/server_mux.go` — HTTP route mounting

### Pinocchio web-chat frontend

**Repository:** `/home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/web/`

The `pinocchio/cmd/web-chat/web/` frontend is the current-generation React chat UI that speaks the canonical sessionstream WebSocket protocol. It is the correct basis for the new chat overlay. (The older `@go-go-golems/os-chat` package in `go-go-os-frontend/` uses a legacy SEM envelope protocol and should not be used as a basis.)

The pinocchio web-chat frontend provides:

- **`ws/protocol.ts`** — sessionstream-native frame parsing. Normalizes `ServerFrame` protobuf JSON oneofs (`snapshot`, `uiEvent`, `hello`, `subscribed`, `error`, `ping`, `pong`) into a flat `CanonicalFrame` with a `type` field. Also provides `unwrapAnyPayload` which correctly handles `google.protobuf.Any` — Struct payloads arrive as `{ "@type": "...Struct", "value": {...} }` while concrete Any payloads have fields alongside `@type`.
- **`ws/wsManager.ts`** — WebSocket lifecycle with in-band snapshot hydration. The snapshot arrives as a `snapshot` frame on the WebSocket itself (matching sessionstream's `SnapshotFrame`), not via a separate HTTP fetch. Frames arriving before hydration completes are buffered and replayed after the snapshot is applied.
- **`ws/chatappPayloads.ts`** — typed protobuf decoding of all 23 chatapp UI events into a `KnownUIEvent` discriminated union. Each event is decoded against its generated `@bufbuild/protobuf` schema (`ChatTextPatchSchema`, `ChatToolCallStartedSchema`, etc.), giving full type safety.
- **`ws/timelineEvents.ts`** — pure function `timelineMutationFromUIEvent(frame) -> TimelineMutation | null`. Maps decoded UI events to `{ upsert?, upsertIfExists?, deleteId?, status? }` mutations. Separating the mapping from dispatching makes it testable without Redux.
- **`ws/timelineSnapshot.ts`** — snapshot entity deserialization. Converts `SnapshotEntityFrame` values (kinded protobuf JSON) into `TimelineEntity` objects for the Redux store.
- **`store/timelineSlice.ts`** — flat `{ byId, order }` entity store with explicit stream patch mode support (`ChatStreamPatchMode`: SNAPSHOT, REPLACE, APPEND). Text patches use `contentPatch` + `patchMode` fields that are peeled off during merge, so streaming text concatenation works correctly.
- **`webchat/rendererRegistry.ts`** — kind-keyed renderer registry with built-in + extension renderers, same pattern as `os-chat` but simpler (no change notification).

**Why not os-chat?** The `os-chat` package uses a custom `{ sem: true, event: { type, id, data, seq } }` envelope protocol instead of speaking raw sessionstream frames. It hydrates via a separate HTTP GET to `/api/timeline` rather than receiving the snapshot in-band on the WebSocket. Its `semRegistry` mixes decoding, stream tracking, and dispatching into a single handler registry rather than separating them into pure functions. Its timeline slice does simple prop spreading without patch mode support. The pinocchio web-chat frontend fixes all of these design issues.

Your new frontend will copy the pinocchio web-chat's `ws/` layer as its transport and event foundation, then add three things on top: widget action dispatching (the ability for a widget to send commands back to the backend), per-widget schema validation (Zod validation of widget props), and the overlay shell (the floating launcher, panel, and composer UI).

## How data flows through the system

Understanding data flow is the most important prerequisite for writing code. This section traces two complete paths: a user sending a message, and the backend producing a widget. Every step names the component responsible and what it emits.

### Path 1: User sends a message

```text
1. Browser: user types "Show me hiking boots" and presses Enter
2. Browser: overlay.send("Show me hiking boots") is called
3. Transport: HTTP POST to /api/chat/sessions/{id}/messages
   Body: { "prompt": "Show me hiking boots" }
4. Server: handler receives ChatStartInference command
5. Handler: publishes ChatUserMessageAccepted event
6. Hub: routes event to UI projection + timeline projection
7. UI projection: emits ChatMessageAccepted live event
8. Timeline projection: persists ChatMessage entity to SQLite
9. WebSocket: delivers ChatMessageAccepted to connected clients
10. Browser: semRegistry handler updates Redux timelineSlice
11. React: ChatConversationWindow re-renders with new user message
```

Steps 1-3 are the frontend. Steps 4-8 are the backend. Steps 9-11 are the frontend again. The important insight is that the backend never sends a "render this component" instruction. It sends a typed event. The frontend decides what to render.

### Path 2: Backend produces a widget

```text
1. MockEngine: receives the prompt, decides to show a product carousel
2. MockEngine: calls the widget.render tool with typed props
3. Tool: publishes ChatWidgetUpserted backend event
   Payload: { instance_id: "w_01", widget_name: "product.carousel",
              status: STREAMING, props: { title: "Hiking boots", products: [] } }
4. Hub: routes event to UI projection + timeline projection
5. UI projection: emits ChatWidgetInstanceStarted live event
6. Timeline projection: persists ChatWidgetInstance entity
7. WebSocket: delivers live event to connected clients
8. Browser: widget handler in semRegistry receives the event
9. Widget registry: looks up renderer for "product.carousel"
10. Widget registry: validates props against Zod schema
11. React: renderer component mounts with validated props, status="streaming"
12. MockEngine: publishes ChatWidgetPatched event (adds products one by one)
13. Browser: widget handler updates instance props, React re-renders
14. MockEngine: publishes ChatWidgetCompleted event
15. Browser: widget handler sets status="ready"
16. Timeline: ChatWidgetInstance entity now has final props, persisted in SQLite
```

This second path is where the typed widget model becomes visible. The mock engine does not emit JSX. It emits a JSON payload with a widget name and typed props. The frontend validates those props and looks up a registered renderer. If no renderer is registered for that widget name, nothing renders. The backend cannot force the frontend to render unknown UI.

### What happens on reconnect

When the user refreshes the page or the WebSocket drops:

```text
1. Browser: WebSocket reconnects
2. Browser: WsManager subscribes to session with sinceSnapshotOrdinal
3. Server: sends SnapshotFrame with all persisted timeline entities
   (including ChatMessage entities and ChatWidgetInstance entities)
4. Browser: WsManager receives snapshot, applies to Redux timelineSlice
5. Browser: live UI events resume from the next ordinal
6. React: re-renders all messages and widgets from hydrated state
```

Snapshot-before-live means the frontend never loses state. It receives the full durable state first, then continues with live events. This works because widget instances are timeline entities, not transient DOM elements.

## Protobuf schema design

All commands, events, UI events, and timeline entities must be concrete protobuf messages. This is enforced by the sessionstream schema-vet analyzer. The top-level message must be named and typed. Inside a concrete message, you may use `google.protobuf.Any` at a deliberate boundary.

### Widget instance events

These are the backend events that describe widget lifecycle:

```protobuf
syntax = "proto3";
package chatoverlay.widgets.v1;

enum WidgetStatus {
  WIDGET_STATUS_UNSPECIFIED = 0;
  WIDGET_STATUS_DRAFT = 1;
  WIDGET_STATUS_STREAMING = 2;
  WIDGET_STATUS_READY = 3;
  WIDGET_STATUS_ERROR = 4;
}

// Backend event: a widget instance was created or updated
message WidgetInstanceUpsertedEvent {
  string instance_id = 1;
  string widget_name = 2;
  string parent_message_id = 3;
  WidgetStatus status = 4;
  google.protobuf.Any props = 5;
}

// Backend event: a widget instance received a partial props update
message WidgetInstancePatchedEvent {
  string instance_id = 1;
  string widget_name = 2;
  WidgetStatus status = 3;
  google.protobuf.Any patch = 4;
}

// Backend event: a widget instance reached its final state
message WidgetInstanceCompletedEvent {
  string instance_id = 1;
  WidgetStatus status = 2;
}

// Backend event: a widget instance was removed
message WidgetInstanceRemovedEvent {
  string instance_id = 1;
}
```

### Widget instance timeline entity

This is the durable projected state that gets persisted in the hydration store:

```protobuf
// Timeline entity: the durable state of a widget instance
message WidgetInstanceEntity {
  string instance_id = 1;
  string widget_name = 2;
  string parent_message_id = 3;
  WidgetStatus status = 4;
  google.protobuf.Any props = 5;
}
```

### Widget action command

When a user interacts with a widget (clicks a product, adds to cart), the frontend sends a widget action command:

```protobuf
// Client command: dispatch a widget action
message WidgetActionCommand {
  string instance_id = 1;
  string widget_name = 2;
  string action_name = 3;
  google.protobuf.Any input = 4;
}
```

### Concrete widget props

Each widget type gets its own concrete protobuf message. These are wrapped inside the `google.protobuf.Any` field of the generic events above:

```protobuf
message ProductCarouselProps {
  string title = 1;
  repeated ProductCardProps products = 2;
  string reason = 3;
}

message ProductCardProps {
  string id = 1;
  string handle = 2;
  string title = 3;
  string image_url = 4;
  Money price = 5;
  repeated string badges = 6;
}

message Money {
  double amount = 1;
  string currency = 2;
}

message CartReviewProps {
  repeated CartItemProps items = 1;
  string subtotal = 2;
  string recommendation = 3;
}

message CartItemProps {
  string id = 1;
  string title = 2;
  string variant = 3;
  int32 quantity = 4;
  string price = 5;
}

message CheckoutNudgeProps {
  string label = 1;
  string checkout_url = 2;
  string reason = 3;
}
```

### File layout for protobuf schemas

Place all protobuf files under `proto/chatoverlay/widgets/v1/`:

```text
proto/
  chatoverlay/
    widgets/
      v1/
        widget_events.proto     # generic widget lifecycle events
        widget_entity.proto      # timeline entity
        widget_command.proto     # widget action command
        product_carousel.proto   # product carousel props
        cart_review.proto        # cart review props
        checkout_nudge.proto     # checkout nudge props
```

Use `buf` for code generation. The `buf.gen.yaml` configuration should produce both Go and TypeScript output:

```yaml
# buf.gen.yaml
version: v2
managed:
  enabled: true
  override:
    - file_option: go_package_prefix
      value: github.com/go-go-golems/chat-overlay/internal/pb
plugins:
  - remote: buf.build/protocolbuffers/go
    out: internal/pb
  - remote: buf.build/bufbuild/es
    out: web/src/pb
```

## Go backend implementation

The backend is a Go application that creates a sessionstream Hub, registers command handlers and projections, and serves HTTP and WebSocket endpoints. It uses a mock LLM provider instead of a real inference engine.

### Directory layout

```text
cmd/
  chat-overlay/
    main.go              # CLI entry point
    cmds/
      serve.go           # serve command (Glazed CLI)

internal/
  mockengine/
    engine.go            # mock LLM engine
    engine_test.go
    responses.go         # canned response catalog
  webchat/
    server.go            # server initialization
    server_mux.go        # HTTP route mounting
    handlers.go          # HTTP handler functions
    mock_runtime.go      # runtime resolver using MockEngine
    widget_tools.go      # widget.render tool implementation
    projections.go       # UI + timeline projections for widgets
  pb/
    proto/
      chatoverlay/
        widgets/
          v1/
            *.pb.go      # generated Go protobuf types

proto/
  chatoverlay/
    widgets/
      v1/
        *.proto          # protobuf source schemas

web/                        # React frontend (see next section)
```

### The mock LLM engine

The MockEngine simulates an LLM inference engine. It does not call any external API. Instead, it matches incoming prompts against a catalog of canned response patterns and produces token deltas on a timer.

The engine must satisfy this contract:

```go
// MockEngine simulates LLM inference with canned responses.
type MockEngine struct {
    responses  []MockResponse    // catalog of pattern-matched responses
    chunkDelay time.Duration     // delay between token deltas
}

// MockResponse defines a pattern and its canned output.
type MockResponse struct {
    Pattern    string            // substring to match in user prompt
    Message    string            // assistant text response
    Widgets    []WidgetSpec      // widgets to emit during the response
}

// WidgetSpec describes a widget the mock should produce.
type WidgetSpec struct {
    Name       string
    Props      proto.Message     // typed protobuf props
    StreamParts int              // how many delta patches to emit
}
```

The mock catalog should include these test scenarios:

- **Plain text response:** user asks a general question, engine streams text tokens, no widgets.
- **Single widget response:** user asks for product recommendations, engine streams text and emits one product carousel widget.
- **Multi-widget response:** user asks to compare products, engine streams text and emits a compare table plus a cart review widget.
- **Streaming widget:** widget starts with empty products, engine patches in products one by one, then marks complete.
- **Tool call simulation:** engine produces a tool call event, then produces tool result, then continues with text.
- **Error scenario:** engine publishes a run failed event.
- **Cancellation:** engine starts a long response, client sends stop, engine publishes a run stopped event.

Each scenario should be selectable by including a keyword in the prompt. For example, "show me boots" triggers the product carousel response. "compare X and Y" triggers the compare table response. "error test" triggers a failure. This makes it easy to test every frontend code path by sending specific prompts.

### Server initialization

The server setup follows the same pattern as CoinVault's `sessionstream_server.go`. Here is the initialization sequence:

```go
func NewServer(opts ServerOptions) (*Server, error) {
    // 1. Create schema registry and register all protobuf types
    reg := sessionstream.NewSchemaRegistry()
    chatapp.RegisterSchemas(reg)                              // chat schemas
    widget.RegisterWidgetSchemas(reg)                         // widget schemas

    // 2. Create hydration store (SQLite)
    store, cleanup, err := hydration.NewSqliteStore(
        opts.TimelineDSN, opts.TimelineDB, reg,
    )

    // 3. Create WebSocket transport server
    ws, err := wstransport.NewServer(snapshotProvider{store: store})

    // 4. Create chatapp Engine with mock provider
    engine := chatapp.NewEngine(
        chatapp.WithPlugins(/* widget feature plugin */),
    )

    // 5. Create Hub with all options
    hub, err := sessionstream.NewHub(
        sessionstream.WithSchemaRegistry(reg),
        sessionstream.WithHydrationStore(store),
        sessionstream.WithUIFanout(ws),
    )

    // 6. Install handlers and projections
    chatapp.Install(hub, engine)
    widget.InstallProjections(hub)   // widget-specific projections

    // 7. Create service
    service, err := chatapp.NewService(hub, engine)

    return &Server{service: service, ws: ws, hub: hub, cleanup: cleanup}, nil
}
```

Each step is a separate concern. The schema registry owns type validation. The hydration store owns persistence. The WebSocket server owns fanout. The engine owns command handling. The hub owns routing. None of these cross boundaries.

### HTTP routes

Mount these routes using Go's `http.ServeMux` (Go 1.22+ pattern syntax):

```go
mux.HandleFunc("POST /api/chat/sessions", server.HandleCreateSession)
mux.HandleFunc("POST /api/chat/sessions/{id}/messages", server.HandleSubmitMessage)
mux.HandleFunc("GET  /api/chat/sessions/{id}", server.HandleSessionSnapshot)
mux.HandleFunc("POST /api/chat/sessions/{id}/stop", server.HandleStopSession)
mux.HandleFunc("GET  /api/chat/ws", server.HandleWS)
mux.HandleFunc("GET  /", frontendHandler)   // serve embedded SPA
```

The create session endpoint generates a new session ID (UUID) and returns it. The submit message endpoint takes a prompt string, resolves the runtime (which in this case is always the MockEngine), and calls `service.SubmitPrompt()`. The snapshot endpoint calls `service.Snapshot()` and returns the encoded timeline. The stop endpoint calls `service.Stop()`. The WS endpoint delegates to the sessionstream WebSocket server.

### Widget projections

Widget events need both UI projections (for live delivery) and timeline projections (for persistence). These are installed as additional projections on the Hub:

```go
// UI projection: backend event -> live client event
func widgetUIProjection(ctx context.Context, ev Event, sess *Session, view TimelineView) ([]UIEvent, error) {
    switch ev.Name {
    case "ChatWidgetUpserted":
        return []UIEvent{{Name: "ChatWidgetInstanceStarted", Payload: ev.Payload}}, nil
    case "ChatWidgetPatched":
        return []UIEvent{{Name: "ChatWidgetInstanceDelta", Payload: ev.Payload}}, nil
    case "ChatWidgetCompleted":
        return []UIEvent{{Name: "ChatWidgetInstanceCompleted", Payload: ev.Payload}}, nil
    case "ChatWidgetRemoved":
        return []UIEvent{{Name: "ChatWidgetInstanceRemoved", Payload: ev.Payload}}, nil
    default:
        return nil, nil
    }
}

// Timeline projection: backend event -> durable entity
func widgetTimelineProjection(ctx context.Context, ev Event, sess *Session, view TimelineView) ([]TimelineEntity, error) {
    switch ev.Name {
    case "ChatWidgetUpserted":
        payload := ev.Payload.(*widgetv1.WidgetInstanceUpsertedEvent)
        return []TimelineEntity{{
            Kind: "ChatWidgetInstance",
            ID:   payload.InstanceId,
            Payload: &widgetv1.WidgetInstanceEntity{
                InstanceId:      payload.InstanceId,
                WidgetName:      payload.WidgetName,
                ParentMessageId: payload.ParentMessageId,
                Status:          payload.Status,
                Props:           payload.Props,
            },
        }}, nil
    case "ChatWidgetPatched":
        // merge patch into existing entity, upsert
    case "ChatWidgetCompleted":
        // update status to READY, upsert
    case "ChatWidgetRemoved":
        // tombstone the entity
    default:
        return nil, nil
    }
}
```

The UI projection is a straightforward name mapping. The timeline projection is where the real work happens: it upserts entity state, merges patches, and sets tombstones for removals. The `TimelineView` parameter gives the projection read access to current entity state so it can merge correctly.

## React frontend implementation

The frontend builds on the pinocchio web-chat architecture. You will create a new standalone React app that copies and extends the `ws/` transport layer from `pinocchio/cmd/web-chat/web/src/ws/` and the `store/timelineSlice.ts` entity store, then adds the overlay shell, widget registry, and widget renderers.

### Directory layout

```text
web/
  package.json
  vite.config.ts
  src/
    index.ts                  # public API exports
    react.ts                  # React-specific exports
    ecommerce.ts              # ecommerce preset exports
    
    core/
      createChatOverlay.ts    # createChatOverlay() factory
      types.ts                # ChatOverlay, ChatOverlayConfig, etc.
      transport.ts            # sessionstreamTransport() adapter
      eventMapper.ts          # backend event name normalization
      overlayStore.ts         # Redux store configuration
    
    widgets/
      defineWidget.ts         # defineWidget() API
      widgetRegistry.ts       # registry, validation, instantiation
      types.ts                # WidgetDefinition, WidgetInstance, WidgetRenderer
      WidgetOutlet.tsx        # renders all active widget instances
      UnknownWidget.tsx       # fallback for unregistered widgets
      LoadingWidget.tsx       # placeholder during streaming
    
    overlay/
      ChatOverlayProvider.tsx  # React context provider
      ChatBubble.tsx           # floating launcher button
      ChatPanel.tsx            # slide-out panel with messages + widgets
      ChatComposer.tsx         # text input + send button
      ChatMessages.tsx         # message list from timeline entities
      useChatOverlay.ts        # hook for imperative overlay control
      useOverlayWidget.ts      # hook for registering widgets from React
    
    ecommerce/
      preset.ts                # ecommercePreset() factory
      widgets/
        ProductCarousel.tsx    # product carousel widget renderer
        CartReview.tsx         # cart review widget renderer
        CheckoutNudge.tsx      # checkout CTA widget renderer
        CouponOffer.tsx        # discount offer widget renderer
      definitions.ts          # defineWidget calls for all ecommerce widgets
    
    pb/                        # generated TypeScript protobuf types
      chatoverlay/
        widgets/
          v1/
            *.ts
```

### The `createChatOverlay()` factory

This is the primary entry point for non-React usage:

```ts
export function createChatOverlay(config: ChatOverlayConfig): ChatOverlay {
  // 1. Create the Redux store (based on pinocchio web-chat slices)
  const store = configureOverlayStore(config);
  
  // 2. Create the sessionstream transport
  const transport = config.transport;
  
  // 3. Create the widget registry
  const registry = new WidgetRegistry();
  config.widgets?.forEach(w => registry.register(w));
  
  // 4. Create the overlay controller
  const overlay: ChatOverlay = {
    mount(target) { /* mount React root or DOM element */ },
    unmount() { /* cleanup */ },
    open() { store.dispatch(openOverlay()) },
    close() { store.dispatch(closeOverlay()) },
    toggle() { store.dispatch(toggleOverlay()) },
    async send(text, options) { /* POST to /api/chat/sessions/{id}/messages */ },
    async command(name, payload) { /* POST to /api/chat/sessions/{id}/commands */ },
    setContext(patch) { /* dispatch context update */ },
    registerWidget(widget) { return registry.register(widget) },
    async hydrate() { /* trigger snapshot fetch */ },
    destroy() { transport.disconnect(); cleanup(); },
  };
  
  return overlay;
}
```

The config type:

```ts
export type ChatOverlayConfig = {
  app: string;
  session?: { id?: string; userId?: string; traits?: Record<string, unknown> };
  transport: ChatTransport;
  theme?: OverlayTheme;
  context?: {
    page?: Record<string, unknown>;
    cart?: Record<string, unknown> | (() => unknown | Promise<unknown>);
    customer?: Record<string, unknown> | (() => unknown | Promise<unknown>);
    get?: () => unknown | Promise<unknown>;
  };
  widgets?: WidgetDefinition[];
  suggestions?: Suggestion[] | (() => Suggestion[] | Promise<Suggestion[]>);
  behavior?: {
    openOn?: "never" | "intent" | "delay" | "exit-intent" | "cart-risk";
    delayMs?: number;
    persistOpenState?: boolean;
    allowAttachments?: boolean;
  };
  analytics?: { track?: (event: OverlayAnalyticsEvent) => void };
  onError?: (error: Error, context: unknown) => void;
};
```

### The `defineWidget()` API

Each widget has a name, a schema, a render function, and optional loading/error renderers:

```ts
export type WidgetDefinition<TProps = any> = {
  name: string;                                       // e.g. "product.carousel"
  description?: string;
  schema?: ZodSchema<TProps> | JsonSchema;
  render: WidgetRenderer<TProps>;
  loading?: WidgetRenderer<Partial<TProps>>;
  error?: WidgetRenderer<{ error: string; raw?: unknown }>;
  actions?: Record<string, WidgetAction>;
};

export type WidgetRenderer<TProps> = (ctx: {
  props: TProps;
  instance: WidgetInstance;
  overlay: ChatOverlayHandle;
  status: "draft" | "streaming" | "ready" | "error";
}) => React.ReactNode;

export type WidgetInstance = {
  id: string;
  widget: string;
  status: "draft" | "streaming" | "ready" | "error";
  props: unknown;
  ordinal: string;
  parentMessageId?: string;
};

export function defineWidget<TProps>(
  name: string,
  config: Omit<WidgetDefinition<TProps>, "name">
): WidgetDefinition<TProps> {
  return { name, ...config };
}
```

The widget registry stores definitions by name. When a `ChatWidgetInstanceStarted` event arrives, the registry:

1. Looks up the renderer by widget name.
2. If no renderer is registered, renders `UnknownWidget` (shows the widget name and raw props in a card).
3. If a schema is provided, validates the props. If validation fails, uses the `error` renderer or `UnknownWidget`.
4. If props are valid, calls `render` with the validated props, the instance metadata, the overlay handle, and the current status.

### Event normalization

The frontend maps sessionstream backend event names into a stable client-side vocabulary. This decouples the frontend from backend naming conventions:

```ts
const eventMap: Record<string, string> = {
  ChatMessageAccepted:       "message",
  ChatMessageStarted:        "message",
  ChatMessageAppended:       "message.delta",
  ChatMessageFinished:       "message",
  ChatWidgetInstanceStarted: "widget",
  ChatWidgetInstanceDelta:   "widget",
  ChatWidgetInstanceCompleted: "widget",
  ChatWidgetInstanceRemoved: "widget",
  ChatRunStarted:            "status",
  ChatRunFinished:           "status",
  ChatRunFailed:             "status",
  SuggestionsUpdated:        "suggestions",
};
```

This mapping layer sits between the `WsManager` (which receives raw sessionstream frames) and the Redux store (which consumes normalized events). It makes the frontend resilient to backend event name changes.

### The transport adapter

The `sessionstreamTransport()` factory wraps the `WsManager` from `pinocchio/cmd/web-chat/web/src/ws/wsManager.ts` and adapts it to the `ChatTransport` interface. This WsManager already speaks raw sessionstream frames, handles in-band snapshot hydration, and buffers frames during hydration:

```ts
export type ChatTransport = {
  connect(input: {
    sessionId: string;
    onSnapshot: (snapshot: SessionSnapshot) => void;
    onEvent: (event: UIEventFrame) => void;
    onError: (error: Error) => void;
  }): Promise<ChatConnection>;
  send(command: ChatCommand): Promise<void>;
};

export type SessionSnapshot = {
  sessionId: string;
  snapshotOrdinal: string;
  entities: TimelineEntity[];
};

export type UIEventFrame = {
  sessionId: string;
  eventOrdinal: string;    // string, not number
  name: string;
  payload: unknown;
};

export type TimelineEntity = {
  id: string;
  type: string;
  createdOrdinal: string;   // string, not number
  lastEventOrdinal: string; // string, not number
  payload: unknown;
};
```

The adapter reuses the `WsManager` from the pinocchio web-chat frontend. This WsManager already implements the sessionstream-native protocol: it parses `ServerFrame` protobuf JSON, handles snapshot-before-live hydration via in-band `snapshot` frames, buffers `ui-event` frames during hydration, and replays them in order after the snapshot is applied. The `protocol.ts` module normalizes all frame types and correctly unwraps `google.protobuf.Any` payloads (including the Struct-inside-Any edge case).

### React components

The React layer is thin. It provides a context provider, UI primitives, and hooks:

```tsx
// ChatOverlayProvider wraps the overlay controller in React context
<ChatOverlayProvider config={config}>
  <Storefront />
  <ChatBubble />    {/* floating launcher button */}
  <ChatPanel>       {/* slide-out panel */}
    <ChatMessages /> {/* renders timeline messages */}
    <WidgetOutlet /> {/* renders active widget instances */}
    <ChatComposer /> {/* text input + send */}
  </ChatPanel>
</ChatOverlayProvider>
```

The `useChatOverlay()` hook provides imperative access:

```ts
const { open, close, send, command, setContext } = useChatOverlay();
```

The `useOverlayWidget()` hook registers a widget from a React component:

```tsx
function EcommerceWidgets() {
  useOverlayWidget(productCarouselWidget);
  useOverlayWidget(cartReviewWidget);
  useOverlayWidget(checkoutNudgeWidget);
  return null;
}
```

## Current command model

The pinocchio chatapp protocol currently supports only two client commands:

- **`ChatStartInference`** — submit a prompt. Payload: `{ prompt, profile }`. The handler creates a new inference run.
- **`ChatStopInference`** — cancel the active run. Payload: `{}`. The handler cancels the running inference.

These are the only commands registered in `pinocchio/pkg/chatapp/chat.go` (`RegisterSchemas` and `Install`). The frontend sends them via HTTP POST to `/api/chat/sessions/{id}/messages` (which internally submits a `ChatStartInference` command to the sessionstream Hub) and `/api/chat/sessions/{id}/stop` (which submits `ChatStopInference`).

The frontend does **not** send commands over the WebSocket. The WebSocket is receive-only: the client sends a `subscribe` frame, then receives `snapshot`, `ui-event`, `hello`, `subscribed`, `error` frames. All mutation requests go through HTTP.

### What this means for the chat overlay

For the first implementation, widget actions will use **backend-side tool execution**:

1. The backend defines tools (e.g. `catalog.search`, `cart.add`, `widget.render`) that the mock engine can call.
2. When a widget renders in the frontend, user interactions (click a product, add to cart) send an HTTP POST to a new `/api/chat/sessions/{id}/widget-action` endpoint.
3. The endpoint submits a `WidgetAction` command to the sessionstream Hub.
4. The handler processes the action and publishes appropriate backend events (e.g. `CartUpdated`, `WidgetInstanceCompleted`).

This is a server-authoritative model. The frontend never executes business logic — it sends an intent and the backend decides what happens.

## Client-side actions: future design

CopilotKit supports **frontend-registered tool actions**: the LLM requests a tool call by name, and the browser runs a local JavaScript function instead of sending it to the backend. This enables human-in-the-loop patterns where the user confirms an action in the UI before it executes.

For the chat overlay, this would look like:

```text
1. Widget registers an action with the overlay:
   overlay.registerAction("cart.add", { schema, run: async ({ variantId, qty }) => { ... } })

2. Backend publishes a tool call event referencing a frontend-registered action:
   ChatFrontendToolRequested { actionName: "cart.add", input: { variantId: "sku_123", qty: 1 } }

3. Frontend shows a confirmation UI inside the widget
4. User confirms → frontend runs the local JS function
5. Frontend posts the result back:
   POST /api/chat/sessions/{id}/tool-result { toolCallId, result }

6. Backend receives result, continues the tool loop
```

This requires:

- A new sessionstream command type (`ChatSubmitToolResult` or similar)
- A new backend event (`ChatFrontendToolRequested`)
- A new UI event for the frontend to render the confirmation
- A tool loop modification in Geppetto/Pinocchio to pause and wait for frontend results

These changes are significant and touch the sessionstream protocol, the Geppetto tool loop, and the Pinocchio chatapp engine. They are **out of scope for the first implementation** but should be kept in mind as the architecture evolves. The protobuf schemas and event naming conventions in this guide are designed to accommodate this extension without breaking changes.

## Public API surface

The exported names should be this small:

**Core package (`@go-go-golems/chat-overlay`):**

```ts
export {
  createChatOverlay,
  sessionstreamTransport,
  defineWidget,
  defineAction,
  defineSuggestionProvider,
};

export type {
  ChatOverlay,
  ChatOverlayConfig,
  ChatTransport,
  ChatConnection,
  WidgetDefinition,
  WidgetInstance,
  WidgetRenderer,
  OverlayEvent,
  SessionSnapshot,
  UIEventFrame,
  TimelineEntity,
};
```

**React entrypoint (`@go-go-golems/chat-overlay/react`):**

```ts
export {
  ChatOverlayProvider,
  ChatBubble,
  ChatPanel,
  ChatMessages,
  ChatComposer,
  WidgetOutlet,
  useChatOverlay,
  useOverlayWidget,
};
```

**Ecommerce preset (`@go-go-golems/chat-overlay/ecommerce`):**

```ts
export {
  ecommercePreset,
  productCarouselWidget,
  cartReviewWidget,
  checkoutNudgeWidget,
  couponOfferWidget,
};
```

## Implementation plan

This is the recommended implementation sequence. Each phase builds on the previous one and is testable independently.

### Phase 1: Backend skeleton with mock engine

**Goal:** A Go server that accepts chat commands and streams mock responses through sessionstream.

**Tasks:**
- Create the Go module and wire it into `go.work`
- Create protobuf schemas for widget events, entities, and commands
- Run `buf generate` to produce Go types
- Implement the MockEngine with three canned responses: plain text, single widget, multi-widget
- Create the server initialization (Hub, Engine, Service, WS transport)
- Mount HTTP routes (create session, submit message, snapshot, stop, WS)
- Test manually with `wscat` or `curl`

**Test criteria:**
- `POST /api/chat/sessions` returns a session ID
- `POST /api/chat/sessions/{id}/messages` with `{"prompt": "hello"}` starts a mock run
- WebSocket connection receives `ChatMessageAccepted`, `ChatMessageStarted`, text deltas, and `ChatMessageFinished` events
- `GET /api/chat/sessions/{id}` returns a snapshot with the persisted message entity

**Key files:**
- `cmd/chat-overlay/cmds/serve.go`
- `internal/mockengine/engine.go`
- `internal/webchat/server.go`
- `internal/webchat/handlers.go`

### Phase 2: Widget event pipeline

**Goal:** The mock engine can emit widget events that flow through sessionstream projections and arrive at WebSocket clients.

**Tasks:**
- Register widget protobuf schemas with the sessionstream SchemaRegistry
- Implement widget UI projection (backend event name to live event name mapping)
- Implement widget timeline projection (backend event to durable entity upsert)
- Add widget-producing responses to the MockEngine (product carousel with streaming)
- Add a `widget.action` command handler that receives widget actions from the frontend

**Test criteria:**
- MockEngine response with keyword "show me boots" produces a `ChatWidgetInstanceStarted` live event followed by delta patches and completion
- Snapshot includes `ChatWidgetInstance` entities with final props
- `POST /api/chat/sessions/{id}/commands` with a widget action payload is accepted

**Key files:**
- `internal/webchat/projections.go`
- `internal/webchat/widget_tools.go`
- `internal/mockengine/responses.go`

### Phase 3: Frontend transport and state

**Goal:** A React app that connects to the backend, receives events, and displays messages.

**Tasks:**
- Create the React/Vite project under `web/`
- Copy `ws/` directory from `pinocchio/cmd/web-chat/web/src/ws/` (protocol, wsManager, timelineEvents, timelineSnapshot, chatappPayloads)
- Implement event normalization (`eventMapper.ts`)
- Configure the Redux store using the flat timelineSlice from pinocchio web-chat
- Implement `ChatMessages` component that renders timeline message entities
- Implement `ChatComposer` component that calls `overlay.send()`
- Implement `useChatOverlay()` hook

**Test criteria:**
- Open the app, type a message, see it appear in the message list
- Mock text response streams in with visible tokens
- Refresh the page, see hydrated messages from snapshot

**Key files:**
- `web/src/core/transport.ts`
- `web/src/core/eventMapper.ts`
- `web/src/core/createChatOverlay.ts`
- `web/src/overlay/ChatMessages.tsx`
- `web/src/overlay/ChatComposer.tsx`

### Phase 4: Widget registry and renderers

**Goal:** The frontend can register widget renderers and display widget instances from the event stream.

**Tasks:**
- Implement `defineWidget()` and `WidgetRegistry`
- Implement `WidgetOutlet` that renders all active widget instances
- Implement `UnknownWidget` fallback renderer
- Implement `LoadingWidget` placeholder for streaming state
- Create ecommerce widget definitions (product carousel, cart review, checkout nudge)
- Create ecommerce widget renderers (React components)
- Implement `ecommercePreset()` factory

**Test criteria:**
- MockEngine response with "show me boots" renders a ProductCarousel component in the chat
- Products stream in one by one (visible during streaming state)
- Widget shows "ready" state when streaming completes
- Unregistered widget names render as UnknownWidget cards

**Key files:**
- `web/src/widgets/defineWidget.ts`
- `web/src/widgets/widgetRegistry.ts`
- `web/src/widgets/WidgetOutlet.tsx`
- `web/src/ecommerce/definitions.ts`
- `web/src/ecommerce/widgets/ProductCarousel.tsx`

### Phase 5: Overlay shell and polish

**Goal:** The overlay is a polished floating panel that can be mounted on any page.

**Tasks:**
- Implement `ChatBubble` floating launcher button
- Implement `ChatPanel` slide-out panel with header, message list, widget outlet, and composer
- Implement `ChatOverlayProvider` React context
- Implement `useOverlayWidget()` hook
- Add theme support (position, brand, accent color, border radius)
- Add behavior configuration (openOn delay, persist open state)
- Embed the frontend in the Go binary using `go:embed`

**Test criteria:**
- Overlay appears in bottom-right corner with a launcher button
- Clicking the launcher opens the panel
- Sending messages and receiving widgets works inside the panel
- Panel can be closed and reopened without losing state
- Go binary serves the frontend at `/`

**Key files:**
- `web/src/overlay/ChatBubble.tsx`
- `web/src/overlay/ChatPanel.tsx`
- `web/src/overlay/ChatOverlayProvider.tsx`
- `internal/webui/embed/` (go:embed assets)

### Phase 6: Edge cases and reconnection

**Goal:** The system handles disconnects, errors, and cancellation correctly.

**Tasks:**
- Test WebSocket disconnect and reconnect with state recovery
- Test "error test" mock response (run failed event)
- Test "stop" command mid-stream (run stopped event)
- Add error display in the overlay (error boundary, error messages in chat)
- Test concurrent widget instances (two widgets in one response)
- Test widget removal (if implemented)

**Test criteria:**
- Kill the WebSocket, see reconnect and state recovery
- Send "error test", see error message in chat
- Send a message, immediately send stop, see "stopped" status
- Multiple widgets render in correct order within the message stream

## How to run and test

### Starting the backend

```bash
# From the workspace root
cd 2026-05-29--chatbot-overlay-glm

go run ./cmd/chat-overlay serve --serve-port 8080 --timeline-db ./var/timeline.db
```

### Starting the frontend dev server

```bash
cd 2026-05-29--chatbot-overlay-glm/web
pnpm install
pnpm dev
```

### Testing with curl

```bash
# Create a session
curl -X POST http://localhost:8080/api/chat/sessions
# Returns: {"session_id": "..."}

# Send a message
curl -X POST http://localhost:8080/api/chat/sessions/{id}/messages \
  -H 'Content-Type: application/json' \
  -d '{"prompt": "show me hiking boots"}'

# Get snapshot
curl http://localhost:8080/api/chat/sessions/{id}
```

### Testing with wscat

```bash
# Connect to WebSocket
wscat -c 'ws://localhost:8080/api/chat/ws'

# Subscribe to a session (protobuf JSON)
{"subscribe": {"session_id": "...", "since_snapshot_ordinal": "0"}}
```

## Reference: existing code to study

These are the files you should read before starting implementation. They are ordered by priority.

**Must read (architecture):**
- `sessionstream/README.md` — the framework conceptual guide
- `pinocchio/pkg/chatapp/chat.go` — the chat engine that manages runs and publishes events
- `pinocchio/pkg/chatapp/projections.go` — how chat events are projected to UI and timeline
- `sessionstream/examples/chatdemo/chat.go` — minimal working example of handlers + projections

**Must read (server wiring):**
- `2026-03-16--gec-rag/internal/webchat/sessionstream/sessionstream_server.go` — how CoinVault creates the sessionstream server
- `2026-03-16--gec-rag/internal/webchat/server/server.go` — dependency injection pattern
- `2026-03-16--gec-rag/internal/webchat/sessionstream/sessionstream_handlers.go` — HTTP handler patterns

**Must read (frontend):**
- `pinocchio/cmd/web-chat/web/src/ws/protocol.ts` — sessionstream-native frame parsing, Any unwrapping, subscribe frame encoding
- `pinocchio/cmd/web-chat/web/src/ws/wsManager.ts` — WebSocket lifecycle with in-band snapshot hydration and frame buffering
- `pinocchio/cmd/web-chat/web/src/ws/chatappPayloads.ts` — typed protobuf decoding of all 23 UI events into KnownUIEvent union
- `pinocchio/cmd/web-chat/web/src/ws/timelineEvents.ts` — pure event-to-timeline-mutation mapping function
- `pinocchio/cmd/web-chat/web/src/ws/timelineSnapshot.ts` — snapshot entity deserialization into TimelineEntity objects
- `pinocchio/cmd/web-chat/web/src/store/timelineSlice.ts` — flat entity store with stream patch modes (SNAPSHOT, REPLACE, APPEND)
- `pinocchio/cmd/web-chat/web/src/webchat/ChatWidget.tsx` — complete working chat widget: session creation, WS connect, send, profile selection
- `pinocchio/cmd/web-chat/web/src/webchat/rendererRegistry.ts` — pluggable renderer registry keyed by entity kind

**Should read (protobuf):**
- `sessionstream/proto/sessionstream/v1/transport.proto` — WebSocket frame schema
- `pinocchio/pkg/chatapp/pb/proto/pinocchio/chatapp/v1/chat.pb.go` — generated chat protobuf types
- `2026-03-16--gec-rag/internal/pb/proto/coinvault/widgets/v1/` — CoinVault widget protobuf schemas

**Should read (tools):**
- `geppetto/pkg/inference/engine/` — engine interfaces your mock must satisfy
- `pinocchio/pkg/chatapp/plugins/toolcall.go` — how tool calls are tracked as events
