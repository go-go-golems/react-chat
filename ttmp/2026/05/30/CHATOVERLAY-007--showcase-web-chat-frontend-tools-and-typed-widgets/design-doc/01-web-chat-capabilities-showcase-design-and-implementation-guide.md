---
Title: Web-chat capabilities showcase design and implementation guide
Ticket: CHATOVERLAY-007
Status: active
Topics:
    - chat-overlay
    - pinocchio
    - web-chat
    - frontend-tools
    - widgets
DocType: design-doc
Intent: long-term
Owners: []
RelatedFiles:
    - Path: ../../../../../../../../pinocchio/cmd/web-chat/app/server.go
      Note: Web-chat HTTP/session routing and prompt submission entrypoint
    - Path: ../../../../../../../../pinocchio/cmd/web-chat/web/src/webchat/cards.tsx
      Note: Built-in React timeline renderers and natural home for showcase cards
    - Path: ../../../../../../../../pinocchio/cmd/web-chat/web/src/ws/timelineEvents.ts
      Note: Frontend UI-event projection into renderable timeline entities
    - Path: ../../../../../../../../pinocchio/pkg/chatapp/frontendtools/manager.go
      Note: Defines frontend tool command/event names and result payload contracts
    - Path: ../../../../../../../../pinocchio/pkg/chatapp/service.go
      Note: App-facing service surface that can expose safe event publication
    - Path: ../../../../../../../../pinocchio/pkg/chatapp/widgets/plugin.go
      Note: Defines typed widget event names and timeline projection behavior
    - Path: ../../../../../../../pinocchio/cmd/web-chat/app/server.go
      Note: Web-chat HTTP/session routing and prompt submission entrypoint
    - Path: ../../../../../../../pinocchio/cmd/web-chat/web/src/webchat/cards.tsx
      Note: React timeline renderer extension point
    - Path: ../../../../../../../pinocchio/cmd/web-chat/web/src/ws/timelineEvents.ts
      Note: Frontend UI-event projection into timeline entities
    - Path: ../../../../../../../pinocchio/pkg/chatapp/frontendtools/manager.go
      Note: Frontend tool event and result payload contracts
    - Path: ../../../../../../../pinocchio/pkg/chatapp/service.go
      Note: App-facing service surface for safe event publication
    - Path: ../../../../../../../pinocchio/pkg/chatapp/widgets/plugin.go
      Note: Typed widget event names and timeline projection behavior
ExternalSources: []
Summary: Design and implementation guide for a Pinocchio web-chat capabilities showcase demonstrating frontend tools and typed custom widgets.
LastUpdated: 2026-05-31T03:55:00-04:00
WhatFor: Use when adding or reviewing the web-chat showcase prompt, browser tool calls, and typed widget renderers.
WhenToUse: Before changing Pinocchio web-chat tool/widget demonstration behavior.
---


# Web-chat capabilities showcase design and implementation guide

## Executive summary

Pinocchio `cmd/web-chat` should include a small capabilities showcase that demonstrates the reusable chatbot package capabilities in one visible flow. A user can type `run the capabilities demo`; the backend publishes ordinary chat lifecycle events, a typed custom widget named `demo.capability_card`, and a frontend tool request named `browser.confirm_action`. The browser renders the widget with a custom React renderer, presents the human approval tool, submits the result back to the backend, and the backend completes the widget based on the result.

The showcase is intentionally implemented inside `cmd/web-chat` rather than as an ecommerce overlay. The goal is to prove that Pinocchio web-chat can display the generic chatbot primitives directly: sessionstream chat events, frontend tool calls, and typed widgets. It should not replace the normal profile/runtime path for ordinary prompts.

## Problem statement and scope

The generic chatbot framework now has backend primitives for typed widgets and frontend tools, but Pinocchio web-chat does not yet have a single, easy-to-run demonstration that exercises them together. Existing web-chat behavior can stream assistant text and display backend Geppetto tool events, but it lacks a browser-owned tool-call round trip and a custom widget renderer that make these capabilities obvious to developers evaluating the package.

This ticket adds a minimal but complete demonstration path:

1. A trigger prompt: `run the capabilities demo`.
2. A custom typed widget: `demo.capability_card`.
3. A browser-owned frontend tool: `browser.confirm_action`.
4. A result endpoint: `/api/chat/sessions/{id}/tools/results`.
5. A Playwright smoke test that verifies the full flow.

Out of scope:

- No migration of Pinocchio web-chat to `ChatProvider` React components.
- No LLM-generated UI or JSX.
- No persistent approval queue; pending demo approvals can be in-memory because this is a showcase flow.
- No generalized frontend tool manager UI beyond the two demo tools.

## Current-state analysis

### Backend routing

`cmd/web-chat/app/server.go` owns session creation, session route parsing, WebSocket serving, and prompt submission. `HandleSessionRoutes` currently recognizes one path segment after the session id: empty snapshot, `messages`, `timeline`, `turns`, and `export`. A nested endpoint like `/tools/results` therefore needs explicit route handling rather than relying on `serverkit.ParseSessionPath` alone.

### Chat service publication

`pkg/chatapp/service.go` wraps command submission and snapshot access, but it does not expose a public app-owned event publication method. The internal hub can publish events through its publisher path, and command handlers already use that path. A minimal `PublishEvent(ctx, sid, name, payload)` method is the smallest reusable addition needed for app-owned demo events.

### Frontend tools

`pkg/chatapp/frontendtools/manager.go` defines the stable names and payloads:

- `ChatFrontendToolCallRequested`
- `ChatFrontendToolResultReceived`
- `ChatFrontendToolCall`

The package already projects tool call/result events into durable timeline entities. The showcase can reuse these event names and protobuf payloads without introducing another protocol.

### Typed widgets

`pkg/chatapp/widgets/plugin.go` defines widget event names and timeline projection:

- `ChatWidgetInstanceStarted`
- `ChatWidgetInstancePatched`
- `ChatWidgetInstanceCompleted`
- `ChatWidgetInstanceRemoved`
- timeline kind `ChatWidgetInstance`

The frontend already has a generic `WidgetInstanceCard`, but live widget UI events are not yet projected in `cmd/web-chat/web/src/ws/timelineEvents.ts`. The showcase should add those projections and then register a custom renderer for `demo.capability_card`.

## Proposed architecture

### Flow overview

```text
User prompt: "run the capabilities demo"
        |
        v
web-chat HandleSessionRoutes -> handleSubmitMessage
        |
        +-- showcase prompt? yes -> runCapabilitiesShowcase goroutine
        |                         |
        |                         +-- publish ChatUserMessageAccepted
        |                         +-- publish ChatRunStarted
        |                         +-- publish ChatTextSegmentStarted/Patch/Finished
        |                         +-- publish ChatWidgetInstanceStarted
        |                         +-- publish ChatWidgetInstancePatched
        |                         +-- publish ChatFrontendToolCallRequested
        |                         +-- wait for result or timeout
        |                         +-- publish ChatFrontendToolResultReceived from endpoint
        |                         +-- publish final widget patch/completed
        |                         +-- publish ChatRunFinished
        |
        +-- showcase prompt? no -> existing runtime resolver and SubmitPromptRequest
```

### Custom widget contract

Widget name: `demo.capability_card`

Props shape:

```ts
type CapabilityCardProps = {
  title: string;
  status: 'starting' | 'streaming_text' | 'waiting_for_user' | 'approved' | 'denied' | 'complete' | 'timeout';
  summary: string;
  steps: Array<{
    id: string;
    label: string;
    state: 'pending' | 'running' | 'done' | 'failed';
  }>;
  toolCallId?: string;
  result?: string;
};
```

The backend owns the props and patches them over time. The browser owns rendering.

### Demo frontend tools

#### `browser.get_page_context`

Automatic tool, optional in the first UI version. Returns URL, viewport dimensions, user agent, and selected theme/runtime hints.

#### `browser.confirm_action`

Human-in-the-loop tool. Input:

```ts
type ConfirmActionInput = {
  title: string;
  body: string;
  confirmLabel?: string;
  cancelLabel?: string;
};
```

Result:

```ts
type ConfirmActionResult = {
  approved: boolean;
  decision: 'approved' | 'denied';
  decidedAt: string;
};
```

The browser renders an approval card with buttons and posts the result to `/api/chat/sessions/{sessionId}/tools/results`.

## Implementation phases

### Phase 1: Ticket and design setup

Create this ticket, detailed task list, design guide, and diary. Commit this before implementation so follow-up commits can reference a stable plan.

### Phase 2: Backend result endpoint

Add:

- `chatapp.Service.PublishEvent(...)`
- `FrontendToolResultRequest` DTO in `cmd/web-chat/app`
- `/api/chat/sessions/{id}/tools/results` route
- an in-memory pending showcase result registry keyed by session id + tool call id

The endpoint should:

1. validate POST,
2. decode `toolCallId`, `toolName`, `status`, `result`, and `error`,
3. publish `ChatFrontendToolResultReceived`,
4. notify any pending showcase waiter,
5. return `{ accepted: true }`.

### Phase 3: Backend showcase run

Add showcase detection to `handleSubmitMessage`. It should detect prompts containing `capabilities demo`, `showcase`, or `frontend tool demo`. Matching prompts bypass the normal runtime resolver and start a goroutine.

The goroutine should publish:

1. user accepted,
2. run started,
3. assistant intro text,
4. widget started,
5. widget patched to waiting for user,
6. frontend tool requested,
7. final widget state after approval/denial/timeout,
8. assistant closing text,
9. run finished.

### Phase 4: Frontend projections and tool runtime

Update `timelineEvents.ts` so live frontend tool and widget events become timeline entities. Add a small runtime that observes `ChatFrontendToolCallRequested` frames in `wsManager` and either executes an automatic tool or leaves a human tool pending for card buttons.

### Phase 5: Custom renderer

Add `CapabilityCard` in `cards.tsx` and register it for `demo.capability_card` widget entities. The generic widget renderer should remain available as a fallback.

### Phase 6: Validation and closeout

Add a Playwright smoke that starts web-chat through devctl, submits the showcase prompt, clicks approve, and asserts:

- custom capability widget is visible,
- frontend tool approval card is visible,
- final result indicates approval,
- run reaches finished state.

## Testing strategy

Backend:

```bash
cd pinocchio
go test ./pkg/chatapp ./cmd/web-chat/app -count=1
```

Frontend:

```bash
cd pinocchio/cmd/web-chat/web
npm run typecheck
npm run build
```

Browser smoke:

```bash
cd 2026-05-29--chatbot-overlay-glm
node ttmp/2026/05/30/CHATOVERLAY-007--showcase-web-chat-frontend-tools-and-typed-widgets/scripts/01-webchat-capabilities-showcase-smoke.js
```

## Risks and mitigations

- **Risk: route parsing for nested session routes breaks existing actions.** Mitigation: add nested route handling without changing existing `messages`, `timeline`, `turns`, and `export` behavior.
- **Risk: pending in-memory approvals leak.** Mitigation: delete pending entries on result, timeout, and run completion.
- **Risk: live widget patches overwrite full props instead of merging.** Mitigation: merge patch props into existing timeline entity state in the frontend reducer/projection.
- **Risk: normal LLM prompts accidentally trigger showcase.** Mitigation: require explicit demo phrases.

## References

- `pinocchio/cmd/web-chat/app/server.go`
- `pinocchio/pkg/chatapp/service.go`
- `pinocchio/pkg/chatapp/frontendtools/manager.go`
- `pinocchio/pkg/chatapp/widgets/plugin.go`
- `pinocchio/cmd/web-chat/web/src/ws/timelineEvents.ts`
- `pinocchio/cmd/web-chat/web/src/webchat/cards.tsx`
