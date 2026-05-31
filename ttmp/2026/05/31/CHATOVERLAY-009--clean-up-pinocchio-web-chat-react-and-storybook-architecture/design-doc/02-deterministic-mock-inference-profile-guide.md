---
Title: "Deterministic mock inference profile implementation guide"
Ticket: "CHATOVERLAY-009"
Status: "draft"
Topics: [web-chat, chat-provider, parity, testing, profiles]
DocType: "design-doc"
Intent: "Specify a simple profile-selected mock inference engine for deterministic web-chat parity testing without live LLM dependencies."
Owners: []
RelatedFiles:
  - Path: ../../../../../../../pinocchio/cmd/web-chat/canonical_runtime_resolver.go
    Note: Best shortcut point: detect the selected mock profile before delegating to normal profile runtime composition.
  - Path: ../../../../../../../pinocchio/cmd/web-chat/runtime_composer.go
    Note: Normal profile runtime composition should remain unchanged for non-mock profiles.
  - Path: ../../../../../../../pinocchio/cmd/web-chat/app/server.go
    Note: Receives selected profile on message submission and invokes the runtime resolver.
  - Path: ../../../../../../../pinocchio/pkg/chatapp/runtime_inference.go
    Note: Runs whichever engine the resolver returns and applies existing runtime context hooks.
  - Path: ../../../../../../../pinocchio/pkg/chatapp/frontendtools/bridge.go
    Note: Existing frontend-tool bridge pattern can be reused if the mock engine needs browser tool result round-trips.
  - Path: ../../../../../../../pinocchio/pkg/chatapp/widgets/plugin.go
    Note: Widget lifecycle events to cover in deterministic mock scenarios.
---

# Deterministic mock inference profile implementation guide

## Executive summary

The desired implementation is intentionally simple: add a special web-chat profile, for example `mock_parity`, and have the backend detect that selected profile before it delegates to the normal profile runtime system. If the selected profile is `mock_parity`, the runtime resolver returns a hardcoded deterministic mock inference engine. For every other profile, the existing profile/runtime/LLM path remains unchanged.

The profile is mainly a user-visible activation switch. We do **not** need a new mock runtime schema, a generalized mock runtime extension, or changes to normal profile composition unless a later requirement justifies that extra abstraction.

## Correct mental model

```text
Incoming message request
  └── profile = "mock_parity"?
        ├── yes → return deterministic mock ComposedRuntime{Engine: mockEngine}
        └── no  → continue existing ResolveEffectiveProfile + runtimeComposer.Compose path
```

The mock profile should behave like a normal selectable profile from the frontend perspective, but backend runtime resolution treats it as a test fixture.

## Non-goals and guardrails

- Do **not** trigger mock mode from prompt text such as `/mock` or `mock:all`.
- Do **not** reintroduce provider demo routes or capability showcase pages.
- Do **not** add a broad `MockInferenceRuntime` schema unless this proves necessary later.
- Do **not** modify normal runtime composition for real profiles.
- Do **not** put planning Markdown in `cmd/web-chat/web/src`.

## Target workflow

1. Start web-chat with devctl.
2. Select profile `mock_parity` in the header.
3. Send any ordinary prompt.
4. Backend sees `profile=mock_parity` and returns the deterministic mock engine instead of a real provider engine.
5. The normal provider-backed `WebChatApp` renders the resulting event stream through the same production `ChatProvider`, projectors, cards, tools, and widgets.
6. Playwright asserts deterministic UI evidence.

## Where to implement the shortcut

The cleanest place is `cmd/web-chat/canonical_runtime_resolver.go` because it already receives the selected `profile` string and is responsible for resolving the runtime for a message.

Recommended logic:

```go
const mockParityProfile = "mock_parity"

func (r *canonicalRuntimeResolver) Resolve(ctx context.Context, req *http.Request, sessionID string, profile string, registry string) (*infruntime.ComposedRuntime, error) {
    if strings.TrimSpace(profile) == mockParityProfile {
        composed := mockruntime.NewComposedRuntime(mockruntime.Options{
            Scenario: "parity_all",
            ChunkDelay: 5 * time.Millisecond,
        })
        return &composed, nil
    }

    // Existing normal profile/runtime logic remains unchanged.
}
```

If profile resolution can also pass an empty profile and rely on cookies/defaults, keep the first implementation explicit: only direct `profile=mock_parity` should activate the mock. Later, if needed, extend current-profile handling so selecting `mock_parity` in the UI reliably posts that profile on messages.

## Mock profile listing

The frontend needs to see `mock_parity` in the profile selector. Use the smallest reliable mechanism:

- Add `mock_parity` to the built-in/dev profile registry, or
- Add it through a test/dev profile YAML fixture that devctl loads.

The profile can have normal-looking metadata:

```yaml
mock_parity:
  display_name: Mock parity engine
  description: Deterministic event stream for web-chat parity tests; no LLM/API key required.
  inference_settings:
    chat:
      api_type: mock
      engine: mock-parity
```

These `inference_settings` are descriptive only if the resolver shortcut catches the profile before normal composition. They should never be passed to the real engine factory.

## Mock engine package

Add a small package rather than embedding test logic in `chatapp`:

```text
cmd/web-chat/mockruntime/
  engine.go
  scenario.go
  context.go        # only if widget/frontend-tool events need sessionstream publisher access
  engine_test.go
```

`engine.go` implements Geppetto's `engine.Engine`:

```go
type Engine struct {
    Scenario string
    ChunkDelay time.Duration
}

func (e *Engine) RunInference(ctx context.Context, turn *turns.Turn) (*turns.Turn, error) {
    // Publish deterministic events to ctx.
    // Return a final cloned/updated turn.
}
```

Use Geppetto events for anything already handled by existing plugins:

- chat text streaming
- reasoning/thinking streaming
- backend tool calls/results
- agent-mode events if covered by `newAgentModePlugin()`

This exercises the real chatapp plugin path rather than manually creating timeline entities.

## Events to cover in `parity_all`

The primary scenario should emit a fixed sequence with stable IDs derived from the message/run context where possible:

1. reasoning segment started
2. reasoning deltas
3. reasoning segment finished
4. backend tool call started
5. backend tool argument patch
6. backend tool call requested
7. backend tool execution started
8. backend tool result ready
9. backend tool call finished
10. frontend tool request for `app.confirm_action`
11. widget started for `mock.progress`
12. widget patched
13. widget completed
14. agent-mode committed event
15. assistant text segment started
16. assistant text patches
17. assistant text segment finished
18. run finished via existing chatapp runtime path

Stable IDs matter for hydration assertions. Use deterministic suffixes such as:

- `mock-thinking-1`
- `mock-backend-tool-1`
- `mock-frontend-tool-1`
- `mock-widget-1`

## Widget and frontend-tool events

A plain Geppetto `engine.Engine` only receives `context.Context` and `*turns.Turn`. Geppetto events can be published to context, but widget/frontend-tool events are app/sessionstream events. There are two simple options:

### Option A — first implementation: only Geppetto-plugin events

Start with chat streaming, reasoning, backend tool calls, and agent-mode events. This already makes parity testing much better and requires no new context bridge.

Then add widget/frontend-tool scenarios in a second step.

### Option B — minimal context bridge for app events

If `parity_all` must include widgets and frontend tools immediately, reuse the existing `PromptRequest.RuntimeContext` hook. The shortcut resolver can return a composed runtime with a runtime context function that stores session id, message id, and publisher in context for the mock engine.

This is not a generalized mock runtime system; it is just the existing per-run context hook used to let one hardcoded mock engine publish app-owned events.

Keep it small:

```go
type ScenarioContext struct {
    SessionID sessionstream.SessionId
    MessageID string
    Publisher sessionstream.EventPublisher
}
```

Then the mock engine can publish:

- `ChatFrontendToolCallRequested`
- `ChatWidgetInstanceStarted`
- `ChatWidgetInstancePatched`
- `ChatWidgetInstanceCompleted`

If this adds too much coupling, defer widget/frontend-tool coverage to Phase 2 of the mock-profile work.

## Frontend fixtures

If the mock engine emits frontend tool/widget events, the provider-backed app must register matching app-owned fixtures:

- human tool: `app.confirm_action`
- optional auto tool: `app.mock_echo`
- widget: `mock.progress`

Put them under:

```text
cmd/web-chat/web/src/features/web-chat/extensions/mock-parity/
  mockParityExtension.tsx
  index.ts
```

Register them from `WebChatProviderShell` only when the selected profile is `mock_parity`, if that profile information is readily available. If profile-gated registration is too much for the first implementation, register them globally but keep names clearly namespaced and harmless.

## Playwright scripts

Add scripts under the ticket `scripts/` directory:

```text
04-phase6-mock-profile-parity-smoke.js
05-phase6-mock-profile-frontend-tool-smoke.js
06-phase6-mock-profile-hydration-smoke.js
```

Primary smoke assertions:

- `mock_parity` appears in profile selector.
- Selecting `mock_parity` and sending a normal prompt produces deterministic output.
- Reasoning text appears.
- Backend tool card appears with `mock.search` or equivalent deterministic name.
- Widget appears if widget coverage is implemented.
- Human frontend tool appears and can be approved if frontend-tool coverage is implemented.
- Assistant final text appears.
- Reload with the same session id hydrates the same timeline.
- No provider demo/capability text appears.

## Backend tests

Add focused tests before relying on browser smokes:

1. `mockruntime.Engine` unit test
   - Runs the engine with a context event sink.
   - Asserts deterministic event names and order.

2. Resolver shortcut test
   - `profile=mock_parity` returns mock engine.
   - `profile=default` delegates to normal resolver/composer.

3. App/server integration test
   - Submit a message with `profile=mock_parity`.
   - Assert snapshot contains deterministic reasoning/chat/tool entities.

4. Optional widget/frontend-tool integration test
   - Only after minimal context bridge is implemented.

## Simplified implementation phases

### Phase A — Profile shortcut and mock engine skeleton

- Add `mock_parity` to dev/test profile listing.
- Add `cmd/web-chat/mockruntime.Engine`.
- Add resolver shortcut in `canonical_runtime_resolver.go`.
- Emit deterministic text-only streaming first.
- Add resolver and engine tests.

### Phase B — Canonical event coverage

- Add reasoning events.
- Add backend tool-call events.
- Add agent-mode event if straightforward.
- Add integration test asserting timeline entities.

### Phase C — Optional app-event coverage

- Add minimal context bridge only if needed for widgets/frontend tools.
- Emit frontend tool request and widget lifecycle events.
- Register mock frontend tool/widget fixtures in web-chat.

### Phase D — Playwright parity automation

- Add mock-profile Playwright scripts to the ticket `scripts/` folder.
- Update the parity checklist with deterministic evidence.
- Use this as the Phase 7 legacy deletion gate.

## Review checklist

- Is mock mode only activated by selecting `mock_parity`?
- Does every non-mock profile still use the existing runtime path?
- Is prompt text irrelevant to mock activation?
- Does the mock engine avoid live API keys/providers?
- Are event IDs deterministic enough for hydration tests?
- Are any app-event context bridges minimal and local to mockruntime?
- Are scripts stored under the ticket `scripts/` folder?
