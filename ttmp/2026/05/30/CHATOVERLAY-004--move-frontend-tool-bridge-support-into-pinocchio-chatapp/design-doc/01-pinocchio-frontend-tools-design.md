---
Title: Pinocchio Frontend Tools Design
Ticket: CHATOVERLAY-004
Status: active
Topics:
    - chat-overlay
    - pinocchio
    - geppetto
    - frontend-tools
DocType: design-doc
Intent: long-term
Owners: []
RelatedFiles:
    - Path: ../../../../../../../pinocchio/pkg/chatapp/runtime_inference.go
      Note: Runtime hooks that receive registry/executor/context
    - Path: internal/frontendtools/bridge.go
      Note: Geppetto ToolExecutor bridge and provider-safe aliasing
    - Path: internal/frontendtools/manager.go
      Note: Session-scoped manifest
    - Path: internal/frontendtools/plugin.go
      Note: ChatPlugin projection for frontend tool calls
    - Path: proto/chatoverlay/tools/v1/frontend_tool.proto
      Note: Current frontend tool protobuf contract to move
ExternalSources: []
Summary: Design for moving browser frontend tool support into Pinocchio chatapp.
LastUpdated: 2026-05-30T16:25:00-04:00
WhatFor: Guide implementation of frontend tool manifest/result/bridge support in Pinocchio.
WhenToUse: Use before moving chat-overlay frontendtools into Pinocchio.
---


# Pinocchio Frontend Tools Design

## Executive summary

## Current naming note

As of the provider-safe naming cleanup, new chat-overlay/frontend tool definitions should use provider-safe names directly (`cart_add`, `checkout_confirm`, `catalog_search`) rather than dotted browser names (`cart.add`). The Pinocchio bridge still documents and supports provider-safe aliasing for legacy manifests, but package examples and validation now prefer names matching `^[a-zA-Z0-9_-]+$` before a model request is built.

Frontend tools should become a first-class Pinocchio chatapp capability. The feature lets a browser advertise tools at runtime, lets a model call those tools through the normal Geppetto tool loop, routes selected calls to the browser through sessionstream, waits for the browser or human result, and returns the result to Geppetto as a normal tool result.

The implementation exists today in chat-overlay under `internal/frontendtools`. It is generic enough to move into Pinocchio because it depends on `chatapp.ChatPlugin`, Geppetto `tools.ToolExecutor`, `sessionstream`, and protobuf payloads. It does not depend on ecommerce widgets except through demo tool names such as `cart.add`.

The migration should create a Pinocchio package such as `pinocchio/pkg/chatapp/frontendtools` and a protobuf package such as `pinocchio.chatapp.frontendtools.v1`. Chat-overlay should then import Pinocchio frontend tools instead of carrying its own copy. Pinocchio `cmd/web-chat` can then optionally enable browser-executed tools in the same way chat-overlay does.

## Problem statement and scope

### Problem

Pinocchio web-chat can render backend tool calls and tool results, but it does not currently let the browser register tools that the model can call. Chat-overlay has that bridge, but it is in an application repo and uses `chatoverlay.tools.v1` protobuf names.

The current split creates three problems:

1. The bridge depends on Pinocchio runtime hooks but is not available to Pinocchio users.
2. Provider-safe name mapping is implemented in chat-overlay even though it applies to provider-facing tools generally.
3. Web-chat and future Pinocchio apps would have to copy the same manifest/result/bridge code to support browser tools.

### Scope

This ticket moves frontend tool support into Pinocchio. It covers:

1. Protobuf definitions for manifest, call request, result, and timeline entity.
2. Sessionstream command/event/schema registration.
3. Manager state for per-session manifests and pending calls.
4. HTTP handler helpers for manifest and result submission.
5. Geppetto `ToolExecutor` bridge.
6. Provider-safe tool aliasing.
7. Integration points for `cmd/web-chat` and chat-overlay.

It does not cover:

1. Typed widget rendering. That is `CHATOVERLAY-005`.
2. Specific frontend React APIs such as `useFrontendTool`. Those can be updated after the backend/proto move.
3. Security policy finalization for mutating browser tools.

## System orientation

### What a frontend tool is

A frontend tool is a named capability implemented by the browser. Examples:

- `cart.add`: update a browser-local cart.
- `checkout.confirm`: ask the user for approval.
- `editor.replaceSelection`: edit a browser document.
- `file.pick`: ask the user to select a file.

The model must not emit JavaScript or HTML. It calls a typed tool by name and input schema. The browser owns local execution and returns a structured result.

### How this differs from backend tools

Backend tools are executed by Go or another server-side runtime. Frontend tools are executed by the browser or by a human in the browser. Both should appear to the model as normal tool definitions. The difference is only in the executor boundary.

### Current backend flow

The chat-overlay implementation has this flow:

```text
Browser registers manifest
  -> Manager stores descriptors per session
  -> RegisterManifestTools adds descriptors to Geppetto registry
  -> Model calls provider-safe tool name
  -> BridgeExecutor maps provider name back to browser tool name
  -> Manager.Request publishes FrontendToolCallRequested
  -> Browser runs tool and POSTs result
  -> Manager.HandleResult wakes BridgeExecutor
  -> BridgeExecutor returns geptools.ToolResult to Geppetto
```

Evidence:

- `internal/frontendtools/plugin.go:13-33` implements `chatapp.ChatPlugin` schema and UI projection integration.
- `internal/frontendtools/plugin.go:35-89` projects requested/result events into durable timeline entities.
- `internal/frontendtools/bridge.go:72-129` implements `ExecuteToolCall` and routes matching calls through the browser bridge.
- `internal/frontendtools/bridge.go:151-184` registers manifest tools into a Geppetto registry with provider-safe aliases.
- `internal/frontendtools/bridge.go:219-244` maps provider aliases back to browser-facing names.
- `internal/webchat/server.go:136-137` registers chat-overlay HTTP endpoints for manifest and result submission.

## Current-state details

### Protobuf contract

The current proto is `proto/chatoverlay/tools/v1/frontend_tool.proto`. It defines:

- `ToolExecutionMode`
- `FrontendToolDescriptor`
- `FrontendToolManifestCommand`
- `FrontendToolManifestUpdated`
- `FrontendToolCallRequested`
- `FrontendToolResultCommand`
- `FrontendToolResultReceived`
- `FrontendToolCallEntity`

The messages are generic. The names should become Pinocchio names, but the fields can remain nearly identical.

### Manager

The manager stores browser manifests by session id, pending calls by call id, and result channels. It also installs sessionstream command handlers for manifest and result commands. This logic should move as-is except for import paths and protobuf package names.

Expected destination:

```text
pinocchio/pkg/chatapp/frontendtools/manager.go
pinocchio/pkg/chatapp/frontendtools/plugin.go
pinocchio/pkg/chatapp/frontendtools/bridge.go
pinocchio/pkg/chatapp/frontendtools/http.go
```

### Plugin

The plugin is a `chatapp.ChatPlugin`. It does not translate Geppetto runtime events. Instead, it projects frontend tool manager events:

- `FrontendToolCallRequested` -> live UI event and timeline entity.
- `FrontendToolResultReceived` -> live UI event and timeline entity update.

This belongs in Pinocchio because it is a generic chat timeline concept.

### Bridge executor

The bridge implements Geppetto `tools.ToolExecutor`. This is the correct abstraction because Geppetto already calls a `ToolExecutor` after a provider emits tool calls.

Key behavior:

1. If a call is not a known frontend tool for the session, delegate to fallback executor.
2. Decode JSON arguments.
3. Publish a browser request via the manager.
4. Wait for result or context cancellation.
5. Return `geptools.ToolResult`.

Provider-safe aliasing is required because OpenAI Responses rejects dots in tool names. The bridge registers `cart.add` as `cart_add` for the provider but preserves `cart.add` in sessionstream/browser events.

## Proposed Pinocchio API

### Proto package

Recommended proto location:

```text
pinocchio/proto/pinocchio/chatapp/frontendtools/v1/frontend_tool.proto
```

Recommended Go package:

```go
github.com/go-go-golems/pinocchio/pkg/chatapp/frontendtools/pb/frontendtoolv1
```

If the repository's proto layout prefers generated code under `pkg/chatapp/pb`, use:

```text
pinocchio/pkg/chatapp/pb/proto/pinocchio/chatapp/frontendtools/v1
```

### Go API sketch

```go
package frontendtools

type Manager struct { ... }

func NewManager(opts ...Option) *Manager
func NewPlugin() chatapp.ChatPlugin
func RegisterSchemas(reg *sessionstream.SchemaRegistry) error

func (m *Manager) Install(hub *sessionstream.Hub) error
func (m *Manager) HandleManifest(ctx context.Context, cmd sessionstream.Command, sess *sessionstream.Session, pub sessionstream.EventPublisher) error
func (m *Manager) HandleResult(ctx context.Context, cmd sessionstream.Command, sess *sessionstream.Session, pub sessionstream.EventPublisher) error

func (m *Manager) RegisterManifestTools(sid sessionstream.SessionId, registry geptools.ToolRegistry) error
func (m *Manager) ResolveProviderToolName(sid sessionstream.SessionId, providerName string) string

func NewBridgeExecutor(manager *Manager, fallback geptools.ToolExecutor) *BridgeExecutor
func WithBridgeContext(ctx context.Context, bridge BridgeContext) context.Context
```

### HTTP helper API

Do not force every app to copy JSON-to-command conversion. Add helper handlers:

```go
type HTTPHandlers struct {
    Manager *Manager
    Hub     *sessionstream.Hub
}

func (h HTTPHandlers) HandleManifest(w http.ResponseWriter, r *http.Request, sid sessionstream.SessionId)
func (h HTTPHandlers) HandleResult(w http.ResponseWriter, r *http.Request, sid sessionstream.SessionId)
func (h HTTPHandlers) RegisterRoutes(mux *http.ServeMux, prefix string)
```

The handler should preserve the current chat-overlay JSON shape:

```json
{
  "revision": 1,
  "tools": [
    {
      "name": "cart.add",
      "description": "Add one product to the local cart.",
      "inputSchema": { "type": "object" },
      "mode": "frontend_auto",
      "available": true
    }
  ]
}
```

### Runtime integration API

Provide a small decorator function that application runtimes can use:

```go
func DecorateRuntimeForFrontendTools(
    ctx context.Context,
    sid sessionstream.SessionId,
    runtime infruntime.ComposedRuntime,
    manager *Manager,
    pub sessionstream.EventPublisher,
) (infruntime.ComposedRuntime, chatapp.RuntimeContextFunc, error)
```

Or simpler, document this wiring:

```go
registry := geptools.NewInMemoryToolRegistry()
_ = manager.RegisterManifestTools(sid, registry)

runtime.Registry = registry.Merge(runtime.Registry)
runtime.ToolExecutor = frontendtools.NewBridgeExecutor(manager, runtime.ToolExecutor)

req.RuntimeContext = func(ctx context.Context, sid sessionstream.SessionId, messageID string, pub sessionstream.EventPublisher) context.Context {
    return frontendtools.WithBridgeContext(ctx, frontendtools.BridgeContext{
        SessionID: sid,
        MessageID: messageID,
        Publisher: pub,
    })
}
```

## Flow diagrams

### Manifest registration

```text
React host page
  |
  | POST /api/chat/sessions/{sid}/tools/manifest
  v
frontendtools.HTTPHandlers.HandleManifest
  |
  | sessionstream command: FrontendToolManifestCommand
  v
frontendtools.Manager.HandleManifest
  |
  | update manifests[sid]
  | publish FrontendToolManifestUpdated
  v
sessionstream event log
```

### Model tool call to browser result

```text
OpenAI / provider
  |
  | function_call: cart_add
  v
Geppetto tool loop
  |
  | ToolExecutor.ExecuteToolCall
  v
frontendtools.BridgeExecutor
  |
  | ResolveProviderToolName(cart_add) -> cart.add
  | Manager.Request(...)
  v
sessionstream UI event: FrontendToolCallRequested
  |
  v
Browser frontend tool runtime
  |
  | execute cart.add or show human approval UI
  | POST /tools/results
  v
Manager.HandleResult
  |
  | unblock pending request
  v
BridgeExecutor returns ToolResult
  |
  v
Geppetto appends tool result and continues inference
```

## Migration plan

### Phase 1: Move proto

1. Create Pinocchio proto file.
2. Rename package from `chatoverlay.tools.v1` to `pinocchio.chatapp.frontendtools.v1`.
3. Generate Go and TypeScript if web-chat needs TS types.
4. Keep field numbers stable.

### Phase 2: Move Go package

Move code from chat-overlay to Pinocchio:

```text
chat-overlay/internal/frontendtools/*
  -> pinocchio/pkg/chatapp/frontendtools/*
```

Replace imports:

```go
toolv1 "github.com/go-go-golems/chat-overlay/internal/pb/proto/chatoverlay/tools/v1"
```

with Pinocchio generated package imports.

### Phase 3: Add Pinocchio tests

Move/expand tests:

- bridge request/result round trip,
- provider alias registration,
- manifest replacement by revision,
- result for unknown pending call,
- context cancellation while waiting,
- human tool mode projection.

### Phase 4: Wire `cmd/web-chat`

Add optional frontend tool manager to web-chat app server:

```go
frontendTools := frontendtools.NewManager()
plugins := []chatapp.ChatPlugin{
    plugins.NewReasoningPlugin(),
    plugins.NewToolCallPlugin(),
    frontendtools.NewPlugin(),
}
```

Install manager command handlers on the hub and register routes. Then augment runtime composition so browser tools are visible in the provider registry.

### Phase 5: Update chat-overlay

Delete chat-overlay `internal/frontendtools` and import Pinocchio package. Keep frontend TypeScript APIs as chat-overlay package APIs, but point their backend protocol to Pinocchio proto names if needed.

## Testing strategy

### Pinocchio unit tests

```bash
cd pinocchio
go test ./pkg/chatapp/frontendtools ./pkg/chatapp ./pkg/inference/runtime
```

Required cases:

1. Manifest command stores descriptors.
2. RegisterManifestTools registers provider-safe names.
3. BridgeExecutor maps provider alias back to raw browser name.
4. Browser result unblocks execution.
5. Failed/denied result becomes `ToolResult.Error`.
6. Unknown tool delegates to fallback executor.
7. Plugin projects call and result timeline entities.

### Web-chat integration test

Create a fake runtime whose engine emits one tool call. Use a fake browser result submission to verify the run resumes.

Pseudocode:

```go
func TestWebChatFrontendToolRoundTrip(t *testing.T) {
    srv := newTestServer(WithFrontendTools())
    sid := createSession()
    postManifest(sid, tool("browser.echo"))
    postMessage(sid, "call browser.echo")
    waitForTimelineEntity(kind="frontend_tool_call", status="requested")
    postToolResult(sid, callID, map[string]any{"ok": true})
    waitForAssistantText("tool returned ok")
}
```

### Chat-overlay regression tests

- Existing mock browser tool smoke.
- Existing real `gpt-5-mini-low` browser smoke.
- Human approval smoke.

## Risks and mitigations

### Risk: protobuf package migration breaks existing browser decoder

Mitigation: update frontend decoder in the same migration and add compatibility tests. If needed, temporarily register both old and new event names while clients migrate.

### Risk: provider alias collisions

`cart.add` and `cart_add` both map to `cart_add`. Current code does not fully solve this.

Mitigation: during `RegisterManifestTools`, detect collisions and return an explicit error that names both raw tools. Add a deterministic suffix policy only if product requirements need it.

### Risk: security policy is incomplete

Browser tools can mutate local state. Pinocchio should expose policy hooks before enabling this by default in general web-chat.

Mitigation: include `mode`, allow host apps to require human confirmation, and add allow/deny policy hooks before public default enablement.

### Risk: web-chat UI has no frontend tool renderer

Pinocchio web-chat currently renders backend `tool_call` and `tool_result` cards. It should add a renderer for frontend tool call entities or map them to existing tool cards.

## Open questions

1. Should the proto live under `pinocchio.chatapp.v1` or `pinocchio.chatapp.frontendtools.v1`?
2. Should frontend tools be enabled by default in `cmd/web-chat`, or only when a flag is passed?
3. Should tool manifests be session-scoped only, or should they support connection-scoped cleanup when a browser disconnects?
4. Should human approval tools become a generic Pinocchio UI contract or stay frontend-library behavior?

## References

- `2026-05-29--chatbot-overlay-glm/proto/chatoverlay/tools/v1/frontend_tool.proto`: current generic frontend tool protobuf contract.
- `2026-05-29--chatbot-overlay-glm/internal/frontendtools/plugin.go:13-89`: ChatPlugin schema, UI, and timeline projection.
- `2026-05-29--chatbot-overlay-glm/internal/frontendtools/bridge.go:72-129`: Geppetto ToolExecutor bridge.
- `2026-05-29--chatbot-overlay-glm/internal/frontendtools/bridge.go:151-184`: manifest-to-registry conversion.
- `2026-05-29--chatbot-overlay-glm/internal/frontendtools/bridge.go:219-244`: provider alias reverse mapping.
- `pinocchio/pkg/chatapp/runtime_inference.go:99-107`: runtime builder uses registry and tool executor hooks.
- `pinocchio/cmd/web-chat/README.md:123-130`: web-chat already documents generic reasoning/tool-call plugins and app-specific entities.
