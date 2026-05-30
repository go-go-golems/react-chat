---
Title: Pinocchio Typed Widget Plugin Design
Ticket: CHATOVERLAY-005
Status: active
Topics:
    - chat-overlay
    - pinocchio
    - widgets
    - sessionstream
DocType: design-doc
Intent: long-term
Owners: []
RelatedFiles:
    - Path: ../../../../../../../pinocchio/cmd/web-chat/agentmode_chat_feature.go
      Note: Existing app-specific widget/card-like ChatPlugin for comparison
    - Path: ../../../../../../../pinocchio/cmd/web-chat/web/src/webchat/cards.tsx
      Note: Existing cards including AgentMode and generic fallback
    - Path: ../../../../../../../pinocchio/cmd/web-chat/web/src/webchat/rendererRegistry.ts
      Note: Frontend renderer registry that can host widget renderers
    - Path: internal/widgets/plugin.go
      Note: Current widget ChatPlugin implementation
    - Path: proto/chatoverlay/widgets/v1/widget.proto
      Note: Current typed widget protobuf contract to move
ExternalSources: []
Summary: Design for moving typed widget instance plugin support into Pinocchio chatapp.
LastUpdated: 2026-05-30T16:25:00-04:00
WhatFor: Guide implementation of generic typed widget timeline support in Pinocchio.
WhenToUse: Use before moving chat-overlay widget plugin/protobuf into Pinocchio.
---


# Pinocchio Typed Widget Plugin Design

## Executive summary

Chat-overlay has a typed widget sessionstream plugin that lets the backend create durable UI widget instances, patch their props, complete them, and remove them. The feature is separate from frontend tools. Frontend tools execute actions in the browser; widgets render structured UI state in the chat timeline.

Pinocchio web-chat already has custom timeline cards, including agent-mode preview/commit cards. Those cards are implemented as app-specific timeline entities and React renderers. The chat-overlay widget plugin is a more generic mechanism: it defines one durable entity kind for widget instances and dispatches rendering by `widget_name` plus `props`.

This ticket should move the generic widget instance protocol and `ChatPlugin` into Pinocchio, while keeping product-specific widgets outside Pinocchio. Pinocchio should provide the durable widget protocol and frontend renderer extension points. Chat-overlay should provide ecommerce widget definitions such as product carousels.

## Problem statement and scope

### Problem

Chat-overlay's widget plugin is generic but lives in the chat-overlay application. Pinocchio web-chat has a renderer registry and app-specific cards, but no shared backend protocol for backend-driven typed widget instances. Without a shared widget plugin:

1. Every app invents its own timeline entity for structured UI.
2. Chat-overlay widgets cannot be reused by Pinocchio web-chat without copying protocol code.
3. There is no common lifecycle for streaming widget props and durable widget hydration.

### Scope

This ticket moves generic widget support into Pinocchio:

1. Widget protobuf definitions.
2. Widget `ChatPlugin` schema registration.
3. UI projection of widget lifecycle events.
4. Timeline projection of widget instance state.
5. Optional widget action command contract.
6. Web-chat renderer registry integration for widget instances.

This ticket does not move:

1. Ecommerce widgets such as `ProductCarousel`.
2. Frontend tool execution. That is `CHATOVERLAY-004`.
3. Agent-mode plugin itself. Agent mode remains an app-specific plugin unless later promoted to a shared Pinocchio feature.

## What the current widget protobuf/plugin is

The current widget proto is `proto/chatoverlay/widgets/v1/widget.proto`. It defines a generic widget lifecycle:

```text
WidgetInstanceStarted
WidgetInstancePatched
WidgetInstanceCompleted
WidgetInstanceRemoved
WidgetActionCommand
WidgetInstanceEntity
```

The payload stores:

- `instance_id`: durable instance identity,
- `widget_name`: renderer lookup key,
- `parent_message_id`: assistant message/run association,
- `status`: draft, streaming, ready, error,
- `props`: `google.protobuf.Struct` containing widget-specific data.

The plugin in `internal/widgets/plugin.go` does three jobs:

1. Registers backend event, UI event, and timeline entity schemas (`plugin.go:28-49`).
2. Forwards backend widget events as live UI events (`plugin.go:60-72`).
3. Projects lifecycle events into a durable `ChatWidgetInstance` timeline entity (`plugin.go:75-143`).

The patch behavior is intentionally simple: `WidgetInstancePatched` merges fields from a protobuf `Struct` into the existing props. This lets a backend stream partial widget state while keeping one durable timeline entity per widget instance.

## How this relates to Pinocchio web-chat custom widgets/cards

Pinocchio web-chat currently has a renderer registry in `pinocchio/cmd/web-chat/web/src/webchat/rendererRegistry.ts`. It maps timeline entity kinds to React components:

```ts
const builtinRenderers = {
  message: MessageCard,
  tool_call: ToolCallCard,
  tool_result: ToolResultCard,
  log: LogCard,
  agent_mode: AgentModeCard,
  agent_mode_preview: AgentModeCard,
}
```

The agent-mode feature is implemented as a web-chat-local `ChatPlugin` in `pinocchio/cmd/web-chat/agentmode_chat_feature.go`. It registers agent-mode event/UI/entity schemas (`agentmode_chat_feature.go:28-44`), translates runtime events into agent-mode update payloads (`agentmode_chat_feature.go:46-70`), and projects committed events into the `AgentMode` timeline entity (`agentmode_chat_feature.go:109-129`).

The relationship is:

| Aspect | Chat-overlay widget plugin | Pinocchio agent-mode cards |
|---|---|---|
| Backend extension | `chatapp.ChatPlugin` | `chatapp.ChatPlugin` |
| Entity kind | `ChatWidgetInstance` | `AgentMode` |
| Renderer dispatch | `widget_name` inside payload | timeline `kind` |
| Payload type | generic `Struct props` | typed `AgentModeEntity` proto |
| Lifecycle | start / patch / complete / remove | preview / commit / clear |
| Product specificity | generic protocol | agent-mode-specific |

They are not currently the same code path. They are compatible concepts. The widget plugin could become a generic timeline entity kind that web-chat's renderer registry knows how to display by dispatching on `widget_name`.

## Proposed Pinocchio widget architecture

### Package layout

```text
pinocchio/proto/pinocchio/chatapp/widgets/v1/widget.proto
pinocchio/pkg/chatapp/widgets/plugin.go
pinocchio/pkg/chatapp/widgets/actions.go
pinocchio/pkg/chatapp/widgets/projector.go
pinocchio/pkg/chatapp/widgets/plugin_test.go
```

### Proto package

Recommended package:

```proto
syntax = "proto3";
package pinocchio.chatapp.widgets.v1;

option go_package = "github.com/go-go-golems/pinocchio/pkg/chatapp/widgets/pb/widgetv1";
```

Field numbers can remain the same as chat-overlay's proto to simplify migration.

### Event names

Current event names are chat-overlay-prefixed:

```text
ChatWidgetInstanceStarted
ChatWidgetInstancePatched
ChatWidgetInstanceCompleted
ChatWidgetInstanceRemoved
ChatWidgetAction
ChatWidgetInstance
```

Recommended Pinocchio names:

```text
PinocchioWidgetInstanceStarted
PinocchioWidgetInstancePatched
PinocchioWidgetInstanceCompleted
PinocchioWidgetInstanceRemoved
PinocchioWidgetAction
PinocchioWidgetInstance
```

However, renaming event names breaks existing frontend normalization. A safer migration is:

1. Move code to Pinocchio but keep existing event names for v1.
2. Add constants in the Pinocchio widget package.
3. Optionally add aliases later if event names are renamed.

### Go API sketch

```go
package widgets

const (
    EventWidgetInstanceStarted = "ChatWidgetInstanceStarted"
    EventWidgetInstancePatched = "ChatWidgetInstancePatched"
    EventWidgetInstanceCompleted = "ChatWidgetInstanceCompleted"
    EventWidgetInstanceRemoved = "ChatWidgetInstanceRemoved"
    CommandWidgetAction = "ChatWidgetAction"
    TimelineEntityWidgetInstance = "ChatWidgetInstance"
)

func NewPlugin() chatapp.ChatPlugin

func PublishStarted(ctx context.Context, pub sessionstream.EventPublisher, sid sessionstream.SessionId, req StartRequest) error
func PublishPatch(ctx context.Context, pub sessionstream.EventPublisher, sid sessionstream.SessionId, req PatchRequest) error
func PublishCompleted(ctx context.Context, pub sessionstream.EventPublisher, sid sessionstream.SessionId, instanceID string) error
```

The helpers are optional but useful. They reduce repeated protobuf construction in apps.

### Frontend renderer model

Pinocchio web-chat can support widget instances without knowing each product widget. Add a generic card/renderer:

```ts
const builtinRenderers = {
  ...,
  widget_instance: WidgetInstanceCard,
}
```

`WidgetInstanceCard` should:

1. read `widgetName`, `status`, and `props`,
2. look up a widget renderer by `widgetName`,
3. render the custom widget if registered,
4. fall back to JSON if unknown.

Pseudocode:

```ts
const widgetRenderers = new Map<string, React.ComponentType<WidgetProps>>()

export function registerWidgetRenderer(name, component) {
  widgetRenderers.set(name, component)
}

function WidgetInstanceCard({ e }) {
  const widgetName = String(e.props.widgetName ?? '')
  const Renderer = widgetRenderers.get(widgetName)
  if (!Renderer) return <GenericCard e={e} />
  return <Renderer status={e.props.status} props={e.props.props ?? {}} />
}
```

This keeps Pinocchio generic while letting chat-overlay register ecommerce renderers.

## Widget lifecycle flows

### Starting and completing a widget

```text
Backend runtime or app code
  |
  | publish WidgetInstanceStarted(instanceID, widgetName, props)
  v
sessionstream event log
  |
  | Plugin.ProjectUI -> live UI event
  | Plugin.ProjectTimeline -> WidgetInstance entity
  v
WebSocket client receives event / snapshot
  |
  | timeline entity kind: widget_instance
  | renderer dispatch by widgetName
  v
React widget renderer
```

### Streaming patches

```text
Backend publishes WidgetInstancePatched(instanceID, patch)
  |
  v
Plugin loads current WidgetInstance from TimelineView
  |
  | merge patch into existing props
  v
upsert same durable timeline entity id
  |
  v
Frontend rerenders same widget instance with updated props
```

### Widget action command

`WidgetActionCommand` exists in the proto but chat-overlay has not fully used it yet. In Pinocchio, it should be kept as an optional command for user interactions that belong to a widget but are not model-requested frontend tools.

Examples:

- clicking a carousel item,
- expanding a details row,
- selecting a chart range.

This is different from frontend tools. Widget actions are UI interaction events; frontend tools are model-callable capabilities.

## Migration plan

### Phase 1: Move proto and plugin

Move:

```text
chat-overlay/proto/chatoverlay/widgets/v1/widget.proto
chat-overlay/internal/widgets/plugin.go
```

To:

```text
pinocchio/proto/pinocchio/chatapp/widgets/v1/widget.proto
pinocchio/pkg/chatapp/widgets/plugin.go
```

Update imports from chat-overlay generated packages to Pinocchio generated packages.

### Phase 2: Add tests in Pinocchio

Move/adapt plugin tests or create new tests covering:

1. schema registration,
2. started -> timeline entity,
3. patch -> merged props,
4. completed -> ready status,
5. removed -> tombstone,
6. UI projection forwards cloned payloads.

### Phase 3: Update chat-overlay imports

Chat-overlay should import:

```go
"github.com/go-go-golems/pinocchio/pkg/chatapp/widgets"
widgetv1 "github.com/go-go-golems/pinocchio/pkg/chatapp/widgets/pb/widgetv1"
```

Then delete chat-overlay `internal/widgets` and old generated widget package.

### Phase 4: Update frontend decoders

Chat-overlay frontend currently normalizes `ChatWidgetInstance*` events and `ChatWidgetInstance` snapshot entities. If event names remain unchanged, only generated protobuf import paths need updating. If event names change, update `timelineEvents.ts` and `timelineSnapshot.ts`.

### Phase 5: Add web-chat renderer support

Pinocchio web-chat should add a generic widget instance renderer and registration API. It does not need ecommerce renderers in Pinocchio core.

### Phase 6: Decide agent-mode relationship

Keep agent mode as-is initially. Later, decide whether `AgentModeCard` should remain an app-specific entity or become a widget renderer using the generic widget entity.

## Testing strategy

### Backend tests

```bash
cd pinocchio
go test ./pkg/chatapp/widgets ./pkg/chatapp
```

Required test cases:

- `WidgetInstanceStarted` creates entity with correct id/name/status/props.
- `WidgetInstancePatched` merges props without losing existing fields.
- `WidgetInstanceCompleted` updates status.
- `WidgetInstanceRemoved` tombstones entity.
- Unknown event returns `handled=false`.

### Frontend tests

In `pinocchio/cmd/web-chat/web`:

- renderer registry includes `widget_instance`,
- unknown widget renders fallback JSON,
- registered widget renderer receives props/status,
- snapshot entity maps into render entity shape.

In chat-overlay:

- product carousel still renders from widget entity,
- mock `show me boots` still creates widget timeline entity,
- Storybook widget stories still build.

## Risks and mitigations

### Risk: generic widget protocol competes with app-specific typed entities

Mitigation: keep both. Use widget instances for open-ended product/application UI components. Use typed entities when Pinocchio core needs a stable, strongly typed concept such as base messages or backend tool results.

### Risk: `Struct` props lose compile-time safety

Mitigation: the backend protocol is generic, but each frontend widget renderer should validate props with Zod or generated schemas. Product packages can define typed wrappers around `Struct`.

### Risk: event-name migration breaks existing clients

Mitigation: keep existing event constants for v1 or register aliases during migration.

### Risk: widget actions overlap with frontend tools

Mitigation: document the boundary:

- Widget action: user interacts with an already-rendered UI component.
- Frontend tool: model requests browser or human action through the tool loop.

## Open questions

1. Should widget event names keep the `ChatWidget...` prefix or move to `PinocchioWidget...`?
2. Should widget actions be implemented in the first move or left as schema-only?
3. Should Pinocchio provide TypeScript generated types for widget payloads?
4. Should agent mode eventually become a widget renderer?

## References

- `2026-05-29--chatbot-overlay-glm/proto/chatoverlay/widgets/v1/widget.proto`: current widget lifecycle contract.
- `2026-05-29--chatbot-overlay-glm/internal/widgets/plugin.go:28-49`: schema registration.
- `2026-05-29--chatbot-overlay-glm/internal/widgets/plugin.go:60-72`: UI projection.
- `2026-05-29--chatbot-overlay-glm/internal/widgets/plugin.go:75-143`: timeline projection.
- `2026-05-29--chatbot-overlay-glm/internal/widgets/plugin.go:158-186`: patch merge behavior.
- `pinocchio/cmd/web-chat/agentmode_chat_feature.go:28-44`: app-specific agent-mode schema registration.
- `pinocchio/cmd/web-chat/agentmode_chat_feature.go:46-70`: agent-mode runtime event translation.
- `pinocchio/cmd/web-chat/agentmode_chat_feature.go:109-129`: agent-mode timeline projection.
- `pinocchio/cmd/web-chat/web/src/webchat/rendererRegistry.ts:12-31`: web-chat timeline renderer registry.
- `pinocchio/cmd/web-chat/web/src/webchat/cards.tsx`: existing card components, including `AgentModeCard` and generic fallback.
