---
Title: Deterministic mock inference profile implementation guide
Ticket: CHATOVERLAY-009
Status: draft
Topics:
    - web-chat
    - chat-provider
    - parity
    - testing
    - profiles
DocType: design-doc
Intent: Specify a profile-driven mock inference engine for deterministic web-chat parity testing without prompt hacks or live LLM dependencies.
Owners: []
RelatedFiles:
    - Path: ../../../../../../../pinocchio/cmd/web-chat/app/server.go
      Note: |-
        Submits prompts and must pass runtime context hooks from the composed runtime into chatapp.
        Server must pass composed runtime context into PromptRequest
    - Path: ../../../../../../../pinocchio/cmd/web-chat/profiles/resolver.go
      Note: |-
        Resolves profile runtime extensions and should expose mock-mode profile configuration to runtime composition.
        Profile runtime resolution entry point for mock profile settings
    - Path: ../../../../../../../pinocchio/cmd/web-chat/runtime_composer.go
      Note: |-
        Composes the profile runtime and should switch to the mock engine only when a profile explicitly enables it.
        Runtime composition should select mock engine for mock profiles
    - Path: ../../../../../../../pinocchio/cmd/web-chat/web/src/features/web-chat/WebChatProviderShell/WebChatProviderShell.tsx
      Note: Registers provider extensions and should install only real app-owned test widgets/tools, not prompt hacks.
    - Path: ../../../../../../../pinocchio/pkg/chatapp/frontendtools/bridge.go
      Note: |-
        Existing frontend-tool bridge context pattern should be reused for browser tool calls.
        Frontend tool bridge context pattern to reuse
    - Path: ../../../../../../../pinocchio/pkg/chatapp/runtime_inference.go
      Note: RuntimeContext is applied before Geppetto inference starts.
    - Path: ../../../../../../../pinocchio/pkg/chatapp/service.go
      Note: |-
        PromptRequest already has RuntimeContext, the correct hook for per-run session/publisher handles.
        PromptRequest RuntimeContext hook already exists
    - Path: ../../../../../../../pinocchio/pkg/chatapp/widgets/plugin.go
      Note: |-
        Widget events are app/sessionstream events and require a mock scenario publisher path.
        Widget lifecycle events to cover in mock scenarios
ExternalSources: []
Summary: ""
LastUpdated: 0001-01-01T00:00:00Z
WhatFor: ""
WhenToUse: ""
---


# Deterministic mock inference profile implementation guide

## Executive summary

Yes: web-chat should have a deterministic mock inference mode. It should be implemented as a **custom profile/runtime**, not as prompt text detection and not as a demo route. The profile selects a mock runtime that emits the same canonical backend events a real Geppetto/LLM run would produce, plus app-owned sessionstream events for widgets and frontend-tool requests.

The goal is to make parity testing boring: choose profile `mock_parity`, send any prompt, and receive a known script containing chat streaming, reasoning streaming, backend tool calls/results, frontend tool requests/results, widget lifecycle events, app-specific agent-mode events, stop/error variants, and hydration-friendly snapshots. Playwright can then assert exact UI behavior without relying on provider availability, rate limits, model choices, or probabilistic output.

## Non-goals and guardrails

- Do **not** implement mock scenarios by matching prompt strings like `/mock` inside `pkg/chatapp/demo.go`.
- Do **not** bring back `?providerDemo=1`, `?providerMultiDemo=1`, or capability showcase pages.
- Do **not** place migration/checklist Markdown in `cmd/web-chat/web/src`.
- Do **not** hardcode the mock into production default behavior.
- Do **not** make `ChatProvider` depend on Pinocchio/web-chat types.
- Do **not** make Pinocchio core packages import `chat-overlay`.

The mock mode should be explicit, profile-owned, and testable from normal production routes.

## Target developer workflow

1. Start web-chat with devctl:
   ```bash
   cd /home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio
   devctl up --force
   cd cmd/web-chat/web && npm run dev:url
   ```
2. Select profile `mock_parity` in the header, or create the session with `profile: "mock_parity"`.
3. Send any ordinary prompt, for example `run parity scenario`.
4. The backend uses the profile runtime extension to select the deterministic mock engine.
5. The normal provider-backed `WebChatApp` renders all events through the same production `ChatProvider`, projectors, cards, tools, and widgets.
6. Playwright asserts the expected cards and provider state.

## Architecture overview

```text
Engine profile: mock_parity
  └── pinocchio.webchat_runtime.v1
        └── mock_inference.enabled = true
        └── mock_inference.scenario = "parity_all"

cmd/web-chat/profiles
  └── resolves the profile and runtime extension

cmd/web-chat/runtime_composer.go
  └── sees mock_inference.enabled
  └── returns ComposedRuntime{Engine: mockruntime.Engine, RuntimeContext: ...}

cmd/web-chat/app/server.go
  └── passes ComposedRuntime.RuntimeContext into chatapp.PromptRequest

pkg/chatapp/runtime_inference.go
  └── applies RuntimeContext(ctx, sid, messageID, pub)
  └── starts engine inference

mockruntime.Engine.RunInference(ctx, turn)
  ├── publishes Geppetto events to ctx for canonical chat/reasoning/tool plugins
  ├── publishes frontend-tool requests through frontendtools.Manager or sessionstream publisher
  ├── publishes widget lifecycle events through sessionstream publisher
  └── returns a final Turn for turn persistence

Provider-backed WebChatApp
  ├── projectors handle reasoning/tool/agent-mode events
  ├── ToolCallOutlet handles human/browser tool request cards
  ├── WidgetOutlet handles registered mock widgets
  └── parity Playwright scripts assert deterministic DOM evidence
```

## Profile shape

Extend Pinocchio's web-chat runtime extension instead of adding ad-hoc query flags. The existing extension type is `pkg/inference/runtime.ProfileRuntime`.

Recommended addition:

```go
type ProfileRuntime struct {
    SystemPrompt string          `json:"system_prompt,omitempty" yaml:"system_prompt,omitempty"`
    Middlewares  []MiddlewareUse `json:"middlewares,omitempty" yaml:"middlewares,omitempty"`
    Tools        []string        `json:"tools,omitempty" yaml:"tools,omitempty"`
    MockInference *MockInferenceRuntime `json:"mock_inference,omitempty" yaml:"mock_inference,omitempty"`
}

type MockInferenceRuntime struct {
    Enabled      bool              `json:"enabled,omitempty" yaml:"enabled,omitempty"`
    Scenario     string            `json:"scenario,omitempty" yaml:"scenario,omitempty"`
    ChunkDelayMs int               `json:"chunk_delay_ms,omitempty" yaml:"chunk_delay_ms,omitempty"`
    Options      map[string]any    `json:"options,omitempty" yaml:"options,omitempty"`
}
```

Example profile registry entry:

```yaml
slug: default
profiles:
  mock_parity:
    display_name: Mock parity engine
    description: Deterministic web-chat event scenario; no LLM/API key required.
    inference_settings:
      chat:
        api_type: mock
        engine: mock-parity
    extensions:
      pinocchio.webchat_runtime.v1:
        mock_inference:
          enabled: true
          scenario: parity_all
          chunk_delay_ms: 5
        middlewares: []
        tools:
          - app.confirm_action
          - app.mock_echo
```

Notes:

- The `api_type: mock`/`engine: mock-parity` values are metadata for profile visibility and debugging. Runtime selection should rely on `mock_inference.enabled`, not string-matching `api_type`.
- Keep `middlewares: []` for the deterministic parity profile unless a scenario explicitly tests middleware output. This prevents agent-mode middleware from producing extra events that make assertions flaky.
- Use `scenario` to select deterministic scripts. Do not use prompt contents as the scenario selector.

## Runtime composition changes

### 1. Clone and validate the new runtime field

Update `pkg/inference/runtime/profile_runtime.go`:

- Add `MockInferenceRuntime` type.
- Add `MockInference *MockInferenceRuntime` to `ProfileRuntime`.
- Update `Clone()` to deep-copy `MockInference` and `Options`.
- Update runtime fingerprinting inputs if needed so changing scenario/chunk delay invalidates persisted/runtime cache identity.

Validation rules:

- `enabled=false` or nil means normal runtime composition.
- `enabled=true` with empty scenario defaults to `parity_all`.
- `chunk_delay_ms < 0` is invalid.
- Unknown scenarios should produce a clear profile validation error before the browser starts a run.

### 2. Add a mock runtime package

Recommended package:

```text
cmd/web-chat/mockruntime/
  engine.go
  scenario.go
  context.go
  profiles.go       # optional helpers for builtin profile definitions
  engine_test.go
```

Responsibilities:

- Implement `engine.Engine` from Geppetto.
- Emit canonical Geppetto events for things that already travel through plugins:
  - text segment start/delta/finish
  - reasoning segment start/delta/finish
  - tool call started/arguments/requested/execution/result/finished
  - agent mode preview/commit if the app plugin already consumes Geppetto agent-mode events
- Publish app/sessionstream events for things not represented as Geppetto events:
  - `ChatFrontendToolCallRequested`
  - `ChatWidgetInstanceStarted`
  - `ChatWidgetInstancePatched`
  - `ChatWidgetInstanceCompleted`
  - `ChatWidgetInstanceRemoved` if testing removal

The engine should return a final `*turns.Turn` that includes deterministic assistant text so turn persistence/export remains meaningful.

### 3. Add a per-run mock context bridge

`PromptRequest.RuntimeContext` already exists and is applied in `pkg/chatapp/runtime_inference.go` before `StartInference`. Use that hook rather than changing `RunInference` signatures.

Add to `cmd/web-chat/mockruntime/context.go`:

```go
type ScenarioContext struct {
    SessionID sessionstream.SessionId
    MessageID string
    Publisher sessionstream.EventPublisher
    FrontendTools *frontendtools.Manager // optional
}

func WithScenarioContext(ctx context.Context, sc ScenarioContext) context.Context
func ScenarioContextFromContext(ctx context.Context) (ScenarioContext, bool)
```

Then update `infruntime.ComposedRuntime` with an optional context hook:

```go
type ComposedRuntime struct {
    Engine engine.Engine
    Registry geptools.ToolRegistry
    ToolExecutor geptools.ToolExecutor
    WrapSink EventSinkWrapper
    RuntimeContext func(ctx context.Context, sid sessionstream.SessionId, messageID string, pub sessionstream.EventPublisher) context.Context
    RuntimeFingerprint string
    RuntimeKey string
}
```

Update `cmd/web-chat/app/server.go` so `handleSubmitMessage` copies the hook into `chatapp.PromptRequest`:

```go
req := chatapp.PromptRequest{Prompt: in.Prompt, IdempotencyKey: in.IdempotencyKey, Runtime: runtime}
if runtime != nil && runtime.RuntimeContext != nil {
    req.RuntimeContext = runtime.RuntimeContext
}
```

For mock mode, runtime composition should set:

```go
RuntimeContext: func(ctx context.Context, sid sessionstream.SessionId, messageID string, pub sessionstream.EventPublisher) context.Context {
    return mockruntime.WithScenarioContext(ctx, mockruntime.ScenarioContext{
        SessionID: sid,
        MessageID: messageID,
        Publisher: pub,
        FrontendTools: frontendToolManager,
    })
}
```

This keeps the mock engine profile-driven while still allowing it to publish app-owned events that require sessionstream handles.

### 4. Compose the mock runtime only for mock profiles

In `cmd/web-chat/runtime_composer.go`, before constructing a real provider engine:

```go
mockSpec := req.ResolvedProfileRuntime.GetMockInference()
if mockSpec != nil && mockSpec.Enabled {
    scenario, err := mockruntime.LookupScenario(mockSpec.Scenario)
    if err != nil { return infruntime.ComposedRuntime{}, err }
    return infruntime.ComposedRuntime{
        Engine: mockruntime.NewEngine(mockruntime.Options{
            Scenario: scenario,
            ChunkDelay: time.Duration(mockSpec.ChunkDelayMs) * time.Millisecond,
        }),
        RuntimeKey: req.ProfileKey,
        RuntimeFingerprint: req.ResolvedProfileFingerprint,
        RuntimeContext: ..., // see previous section
    }, nil
}
```

Do not add checks like `if strings.Contains(prompt, "mock")` anywhere in `chatapp`.

## Scenario contract

Create a small scenario DSL so tests can request specific fixtures without code duplication.

Suggested scenarios:

1. `parity_all`
   - user message accepted
   - run started
   - provider call metadata
   - reasoning start/patch/finish
   - backend tool call arguments streaming
   - backend tool execution/result/finish
   - frontend human tool request
   - frontend auto tool request if available
   - widget started/patched/completed
   - agent-mode committed event
   - assistant text streaming start/patch/finish
   - run finished

2. `streaming_text_only`
   - deterministic multi-chunk assistant answer
   - useful for scroll/follow behavior

3. `reasoning_only`
   - thinking segment streams before final text
   - useful for reasoning projector/card tests

4. `backend_tool_only`
   - tool call argument patch + result entity
   - useful for tool-call renderer tests

5. `frontend_tool_human`
   - requests `app.confirm_action`
   - waits for browser result through `/tools/results`
   - then emits final text acknowledging the result

6. `widget_lifecycle`
   - starts, patches, completes, optionally removes a registered widget

7. `error_and_stop`
   - emits a failed run or allows stop button tests to cancel mid-stream

Each scenario should have stable IDs derived from `messageID`, for example:

- `messageID + ":thinking:1"`
- `messageID + ":tool:backend-search"`
- `messageID + ":tool:frontend-confirm"`
- `messageID + ":widget:progress"`

Stable IDs make hydration/snapshot assertions straightforward.

## Frontend extension requirements

The mock backend should request real app-owned tools/widgets that are registered by the provider-backed app shell. Add a small extension under web-chat, not chat-provider core:

```text
cmd/web-chat/web/src/features/web-chat/extensions/mock-parity/
  mockParityExtension.tsx
  index.ts
```

It should export a `ChatExtension` containing:

- `app.confirm_action` human tool for approval/denial UI.
- Optional `app.mock_echo` frontend auto tool.
- `mock.progress` widget for widget lifecycle rendering.

Register it in `WebChatProviderShell` alongside `pinocchioWebChatProjectors` **only if** the tool/widget names are considered app-owned production-test fixtures. If the team wants them test-only, gate registration by profile metadata from `/api/chat/profiles/:slug` or an explicit runtime feature flag returned by the profile API.

Preferred profile-driven registration path:

1. Profile API includes runtime extension data for the selected profile.
2. `WebChatProviderShell` sees `runtime.mock_inference.enabled`.
3. It includes `mockParityExtension` only for that selected profile.
4. Normal profiles do not advertise mock tools/widgets.

Avoid route flags and prompt flags.

## Frontend tool result loop

For `frontend_tool_human`, the mock engine should verify the complete request/result cycle:

1. Mock scenario publishes `ChatFrontendToolCallRequested` with `tool_name=app.confirm_action`.
2. `ChatProvider` receives the UI event and marks the human tool pending.
3. `ToolCallOutlet` renders the registered human tool UI.
4. Playwright clicks Approve or Deny.
5. `ChatProvider` submits result to `/api/chat/sessions/:id/tools/results`.
6. `frontendtools.Manager` publishes `ChatFrontendToolResultReceived`.
7. The frontend-tool plugin projects the result into `ChatFrontendToolCall` timeline entity.
8. Mock scenario either:
   - waits for manager result before final text, or
   - emits final text immediately and lets result projection be asserted independently.

For strongest parity coverage, prefer waiting for the result in the scenario with a timeout, then emit final text containing the deterministic result status.

## Playwright test plan

Add ticket scripts, then later promote to package scripts/CI if useful.

Suggested scripts:

```text
ttmp/.../scripts/04-phase6-mock-profile-parity-smoke.js
ttmp/.../scripts/05-phase6-mock-profile-frontend-tool-smoke.js
ttmp/.../scripts/06-phase6-mock-profile-hydration-smoke.js
```

Assertions for `04-phase6-mock-profile-parity-smoke.js`:

- Select `mock_parity` profile.
- Send `run parity scenario`.
- Assert visible user message.
- Assert reasoning card contains deterministic thinking text.
- Assert backend tool card contains `mock.search` and result JSON.
- Assert agent-mode card appears.
- Assert widget card renders `mock.progress` through `WidgetOutlet`.
- Assert assistant final message says the mock run completed.
- Assert run status returns to `finished`.
- Assert no provider demo/capability text appears.

Assertions for `05-phase6-mock-profile-frontend-tool-smoke.js`:

- Select `mock_parity` or `mock_frontend_tool`.
- Send prompt.
- Wait for `app.confirm_action` human tool UI.
- Click Approve.
- Assert result card/status becomes success.
- Assert final assistant text references approval.

Assertions for `06-phase6-mock-profile-hydration-smoke.js`:

- Run `parity_all` once and capture session id.
- Reload page with `?sessionId=<id>`.
- Assert snapshot hydration reconstructs reasoning, tool, widget, and final text entities.
- Assert duplicate live events do not create duplicate cards.

## Backend tests

Add Go tests before relying on browser smokes:

1. `mockruntime.Engine` unit tests
   - Runs each scenario with a fake event sink/context.
   - Asserts event order and stable IDs.

2. `ProfileRuntime` tests
   - Clone preserves `MockInference` deeply.
   - Runtime fingerprint changes when scenario changes.

3. `runtime_composer` tests
   - Mock profile returns `mockruntime.Engine`.
   - Normal profile still uses standard engine factory.
   - Unknown scenario returns a clear error.

4. `app/server` integration test
   - Create a profile registry with `mock_parity`.
   - Submit a message with `profile=mock_parity`.
   - Read snapshot and assert `ChatMessage`, `ChatToolCall`, `ChatFrontendToolCall`, and `ChatWidgetInstance` entities.

## Rollout plan

### Phase A — Design and schema

- Add `MockInferenceRuntime` to profile runtime extension.
- Add validation/clone/fingerprint support.
- Add a built-in `mock_parity` profile for dev/test registries, or document a profile YAML fixture.

### Phase B — Mock engine package

- Add `cmd/web-chat/mockruntime`.
- Implement scenario registry and `parity_all` scenario.
- Emit Geppetto events for chat/reasoning/backend tool/agent-mode paths.
- Add unit tests for event order.

### Phase C — Sessionstream context bridge

- Add `RuntimeContext` to `infruntime.ComposedRuntime`.
- Pass it from `app/server.go` to `chatapp.PromptRequest`.
- Add mock scenario context helpers for session id/message id/publisher/frontend-tool manager.
- Publish widget and frontend-tool events through the context bridge.

### Phase D — Profile-driven frontend fixtures

- Add `mockParityExtension` with app-owned test tools/widgets.
- Register it only when selected profile runtime says mock inference is enabled.
- Add visible `data-testid` hooks for deterministic Playwright assertions.

### Phase E — Automated parity scripts

- Add the three Playwright scripts listed above under the ticket `scripts/` folder.
- Update `reference/02-provider-parity-checklist.md` with mock-profile evidence.
- Promote stable scripts to `npm run` or CI only after they are reliable locally.

### Phase F — Legacy deletion gate

- Re-run existing Phase 6 scripts plus mock-profile scripts.
- Only then proceed with Phase 7 legacy Redux/WebSocket deletion.

## Review checklist

- Is mock mode impossible to trigger accidentally from normal prompts?
- Does the selected profile make mock mode visible in `/api/chat/profiles`?
- Are all mock tool/widget names app-owned and namespaced?
- Does the mock engine exercise live WebSocket and snapshot hydration paths?
- Do frontend tool requests go through the same `/tools/manifest` and `/tools/results` path as production?
- Does `mock_parity` work without API keys?
- Are scripts stored under the ticket `scripts/` folder?
- Are docs stored under the ticket, not under `cmd/web-chat/web/src`?
