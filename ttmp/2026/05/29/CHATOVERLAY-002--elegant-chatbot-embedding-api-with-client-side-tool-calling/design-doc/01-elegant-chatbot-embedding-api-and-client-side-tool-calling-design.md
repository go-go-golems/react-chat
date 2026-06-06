---
Title: Elegant chatbot embedding API and client-side tool calling design
Ticket: CHATOVERLAY-002
Status: active
Topics:
    - chat-overlay
    - react
    - sessionstream
    - pinocchio
    - geppetto
    - widgets
    - protobuf
    - ecommerce
DocType: design-doc
Intent: long-term
Owners: []
RelatedFiles:
    - Path: ../../../../../../../../../../code/wesen/go-go-golems/go-go-parc/Projects/2026/05/29/ARTICLE - Chat Overlay API - Two Proposals for a Typed Widget Streaming Architecture.md
      Note: Original Obsidian article comparing Proposal A and Proposal B
    - Path: ../../../../../../../pinocchio/pkg/chatapp/plugins/toolcall.go
      Note: Existing Pinocchio tool lifecycle projection plugin
    - Path: ../../../../../../../sessionstream/proto/sessionstream/v1/transport.proto
      Note: Canonical sessionstream WebSocket frame schema
    - Path: internal/mockengine/engine.go
      Note: Current backend command/event publisher used as reference for future tool pause/resume path
    - Path: internal/widgets/plugin.go
      Note: Current sessionstream projection plugin pattern to reuse for frontend tools
    - Path: proto/chatoverlay/tools/v1/frontend_tool.proto
      Note: Implemented first protocol slice from the design
    - Path: proto/chatoverlay/widgets/v1/widget.proto
      Note: Current typed widget lifecycle schema and action command boundary
    - Path: ttmp/2026/05/29/CHATOVERLAY-002--elegant-chatbot-embedding-api-with-client-side-tool-calling/scripts/03-client-tool-browser-smoke.js
      Note: Automated browser smoke test for the design
    - Path: web/src/core/createChatOverlay.ts
      Note: Current public overlay API assessed for embedding and extension points
    - Path: web/src/tools/toolRegistry.ts
      Note: Implemented first frontend tool registry slice
    - Path: web/src/widgets/widgetRegistry.ts
      Note: Current widget registration API assessed for schema and lifecycle gaps
    - Path: web/src/ws/timelineEvents.ts
      Note: Current UI event to timeline mutation path where tool events should be added
ExternalSources:
    - https://docs.copilotkit.ai/reference/hooks/useFrontendTool
    - https://docs.copilotkit.ai/reference/hooks/useHumanInTheLoop
    - https://docs.copilotkit.ai/agentic-protocols/ag-ui
    - https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling
    - https://ai-sdk.dev/docs/ai-sdk-ui/chatbot-tool-usage
    - https://ai-sdk.dev/docs/ai-sdk-ui/generative-user-interfaces
    - https://www.assistant-ui.com/docs/guides/tools
    - https://www.assistant-ui.com/docs/guides/tool-ui
Summary: Design for an embeddable chat overlay API with typed widgets and client-side tool calling across Geppetto, Pinocchio, sessionstream, and React.
LastUpdated: 2026-05-29T14:40:31.080906183-04:00
WhatFor: Guide a new intern through the current system, prior art, proposed API, protocol changes, and implementation plan for client-side tool calling.
WhenToUse: Use before implementing frontend tools, human-in-the-loop workflows, or deeper Geppetto/Pinocchio/sessionstream changes.
---



# Elegant Chatbot Embedding API and Client-Side Tool Calling Design

## Executive summary

The current chat overlay has the right foundation. It embeds a React chat panel into an existing page, opens a session, subscribes to a sessionstream WebSocket, sends prompts through HTTP, renders streamed text, and renders typed widget instances such as `ProductCarousel`. The implementation already proves the central product idea: the backend sends typed events, the frontend controls rendering, and a page can add a chatbot without letting the model emit arbitrary UI code.

The next step is to make the API elegant enough for real applications. An application developer should be able to add the overlay, register widgets, register frontend tools, and define human-in-the-loop interactions with a small set of composable primitives. These primitives should feel like CopilotKit's `useFrontendTool` and `useHumanInTheLoop`, Vercel AI SDK's client-side tool output flow, and assistant-ui's toolkit and tool UI model, while still matching our Go-native architecture: Geppetto produces canonical tool events, Pinocchio translates them into chat events, sessionstream provides ordered command/event/projection/hydration, and the React overlay renders typed timeline entities.

The design proposed here is opinionated:

- The model never emits React code, JSX, HTML, or arbitrary JavaScript. It requests named tools and named widgets with schema-validated arguments.
- Tools are declared, scoped, and registered by the host page. A tool is available only when the component that owns it says it is available.
- Frontend tools are not a side channel. A frontend tool call is a sessionstream event with a durable timeline entity and a result command that resumes the backend run.
- Human approval is a first-class tool mode, not an ad hoc widget convention.
- Widgets and tools are related but not identical. A widget is durable UI state. A tool is an action contract. A tool may render a widget-like UI while it runs, but the action/result lifecycle must remain explicit.

The most important backend change is a pause/resume path for tool calls that must execute in the browser. Today, Geppetto and Pinocchio can observe and project tool lifecycle events, but the tool execution loop is still backend-owned. Client-side tool calling requires a remote tool executor: when the model calls a frontend tool, the backend publishes a `FrontendToolCallRequested` event and parks the run until the frontend submits a `FrontendToolResultCommand`. That result is fed back into the Geppetto tool loop, and inference continues.

## Problem statement

The current overlay API is useful for a demo but too small for a real embedded agent. It provides:

```ts
const overlay = createChatOverlay({ basePrefix: '' });
await overlay.send('show me boots');
overlay.stop();
overlay.open();
overlay.close();
overlay.reset();
```

It also provides a minimal widget registry:

```ts
defineWidget('ProductCarousel', ProductCarouselWidget);
```

This is enough to render backend-produced widgets. It is not enough to let the page participate in the agent loop. A production embedded chatbot needs the page to contribute capabilities:

- The page should expose local actions such as `cart_add`, `cart_remove`, `navigate_to_product`, `checkout_open`, `selection_get`, or `document_insert_text`.
- Some actions should execute automatically in the browser and return a result to the model.
- Some actions should require user approval before execution.
- Some actions should be purely backend tools but still render a custom frontend UI.
- All tool calls should appear in the timeline so users can understand what the agent tried to do.
- Tool availability should depend on component scope, user permissions, current page state, and host application configuration.

The hard part is not the React hook syntax. The hard part is preserving the sessionstream model. The frontend tool call must travel through the same ordered event system as text deltas and widgets. If it bypasses sessionstream, reconnect, auditability, cancellation, and timeline hydration become inconsistent.

## Current implementation: what exists today

The current implementation has four relevant layers.

### 1. Public frontend API

Current file:

```text
web/src/core/createChatOverlay.ts
```

The API constructs a singleton-like overlay object around the Redux store, HTTP routes, and WebSocket manager:

```ts
export type ChatOverlay = {
  send: (prompt: string) => Promise<void>;
  stop: () => Promise<void>;
  open: () => void;
  close: () => void;
  toggle: () => void;
  reset: () => void;
  getStore: () => typeof store;
};
```

This API is intentionally small. It should remain small, but it needs extension points. The overlay object should become the runtime boundary for tools, widgets, context, and transport. Application code should not import Redux actions or sessionstream internals.

### 2. Widget registration

Current file:

```text
web/src/widgets/widgetRegistry.ts
```

The current widget API is:

```ts
export function defineWidget(
  name: string,
  component: React.ComponentType<WidgetProps>,
): WidgetDefinition
```

This is a good start, but it is only a renderer map. It lacks schema validation, lifecycle hooks, action dispatch, and typed props. The next version should accept a Zod schema and return a typed definition:

```ts
const ProductCarousel = defineWidget({
  name: 'ProductCarousel',
  props: z.object({
    title: z.string(),
    products: z.array(ProductCardSchema),
    reason: z.string().optional(),
  }),
  render: ProductCarouselWidget,
});
```

### 3. Event normalization

Current file:

```text
web/src/ws/timelineEvents.ts
```

The frontend maps live sessionstream UI events into Redux timeline mutations. It already handles:

- `ChatUserMessageAccepted`
- `ChatRunStarted`, `ChatRunFinished`, `ChatRunStopped`, `ChatRunFailed`
- `ChatTextPatch`, `ChatTextSegmentFinished`
- `ChatWidgetInstanceStarted`, `ChatWidgetInstancePatched`, `ChatWidgetInstanceCompleted`, `ChatWidgetInstanceRemoved`

This is the correct location for frontend tool events too. Tool calls should not be special-cased in React components. They should become timeline entities just like messages and widgets.

### 4. Backend mock engine and widget events

Current files:

```text
internal/mockengine/engine.go
internal/widgets/plugin.go
proto/chatoverlay/widgets/v1/widget.proto
```

The backend can now publish message events and widget lifecycle events. It uses sessionstream correctly: commands are submitted to a Hub, events are projected into UI events and durable timeline entities, and the WebSocket sends snapshot-before-live frames.

The existing widget protobuf schema is:

```protobuf
message WidgetInstanceStarted {
  string instance_id = 1;
  string widget_name = 2;
  string parent_message_id = 3;
  WidgetStatus status = 4;
  google.protobuf.Struct props = 5;
}

message WidgetActionCommand {
  string instance_id = 1;
  string widget_name = 2;
  string action_name = 3;
  google.protobuf.Struct input = 4;
}
```

`WidgetActionCommand` is the seed of user-to-backend interaction, but it is not enough for client-side tool calling. Widget actions say, "the user clicked something inside a widget." Frontend tools say, "the model requested a named capability that is implemented by the browser, and the backend run must wait for its result."

## Prior art findings

The sources downloaded into `sources/` are not implementation targets. They are design inputs. The best parts should be adapted to our architecture, not copied mechanically.

### CopilotKit

CopilotKit's `useFrontendTool` is the closest match to the developer experience we want. It registers a tool at React component scope, uses Zod for parameter schemas, executes a browser handler when the agent calls the tool, and optionally renders tool execution UI.

Relevant source:

```text
sources/01-copilotkit-use-frontend-tool.md
```

The useful ideas are:

- Tool registration belongs in React component scope and cleans up on unmount.
- The tool definition includes `name`, `description`, `parameters`, `handler`, optional `render`, and availability.
- The handler receives an abort signal so long-running browser operations can stop.
- `available: "remote"` distinguishes frontend-declared tools from backend-executed tools.

CopilotKit's `useHumanInTheLoop` separates human approval from automatic execution. It provides a status machine and a `respond` callback. The agent remains paused until the user responds.

Relevant source:

```text
sources/02-copilotkit-use-human-in-the-loop.md
```

The useful idea is that human approval is not a boolean flag bolted onto every tool. It is a distinct tool mode with different runtime behavior. A human tool has no automatic handler. Its render function owns the decision UI and eventually calls `respond(result)`.

### Vercel AI SDK

The Vercel AI SDK distinguishes three tool cases in chat:

1. Automatically executed server-side tools.
2. Automatically executed client-side tools.
3. Client-side tools requiring user interaction.

Relevant sources:

```text
sources/04-ai-sdk-tools-and-tool-calling.md
sources/05-ai-sdk-chatbot-tool-usage.md
sources/06-ai-sdk-generative-user-interfaces.md
```

The strongest idea is the tool result round trip. Tool calls are forwarded to the client. Client-side tools execute in `onToolCall`. The client then calls `addToolOutput`. The chat can be configured to continue automatically when tool results are available.

For our system, the equivalent of `addToolOutput` should be a sessionstream command:

```text
FrontendToolResultCommand
```

The equivalent of `sendAutomaticallyWhen` is backend-owned. When the backend receives all required frontend tool results for a paused run, it should resume the Geppetto tool loop automatically.

The AI SDK also documents approval requests. The important difference is that AI SDK approval can be modeled as two model calls. In our architecture, a frontend human tool should pause the same backend run when possible, because sessionstream already supports long-lived runs and stop semantics.

### assistant-ui

assistant-ui provides two useful abstractions:

- A centralized `Tools()` toolkit API for registering many tools at once.
- A separate tool UI API for rendering existing backend tools without necessarily executing them in the browser.

Relevant sources:

```text
sources/08-assistant-ui-tools.md
sources/09-assistant-ui-tool-ui.md
```

The useful distinction is between tool execution and tool visualization:

```ts
type ToolDefinition =
  | { type?: 'frontend'; execute: (...) => Promise<any>; render?: (...) => ReactNode }
  | { type: 'human'; render: (...) => ReactNode }
  | { type: 'backend'; render?: (...) => ReactNode };
```

This distinction maps cleanly onto our needs. A frontend tool executes in the browser. A human tool pauses for user input. A backend tool executes in Go but may still have custom UI. This should become our public tool model.

### AG-UI

AG-UI is an event protocol for connecting agents to user-facing applications. The relevant idea is not a specific message format; sessionstream already gives us a typed event protocol. The relevant idea is that frontend tool calls, shared state, UI components, and agent events should all travel through one protocol instead of through custom side channels.

Relevant source:

```text
sources/03-copilotkit-ag-ui.md
```

For us, sessionstream is the protocol. Client-side tools should be sessionstream commands and events, not a separate WebSocket, not a second HTTP polling loop, and not hidden state inside Redux.

## Design principles

### Principle 1: The model requests capabilities, not UI code

The model should see tool names, descriptions, and schemas. It should never send JSX, HTML, component names outside an allowlist, or executable JavaScript. This keeps rendering deterministic and safe.

### Principle 2: The frontend owns browser-side effects

If a tool mutates browser state, reads DOM-adjacent state, navigates, opens checkout, or calls a host page API, the browser should execute it. The backend may request it and wait for its result, but the backend should not pretend to know page-local state it cannot observe.

### Principle 3: The backend owns the agent run

Even when a tool executes in the browser, the backend run is still the run. The backend owns the model call, the tool loop, cancellation, retries, and final assistant response. The frontend returns tool results; it does not become the agent runtime.

### Principle 4: Every important state transition is a sessionstream event

A frontend tool call should have events for requested, arguments patched, executing, result ready, rejected, failed, and finished. These events should project to live UI and durable timeline state.

### Principle 5: Registration is scoped and revocable

A checkout button tool may exist only on checkout-capable pages. A selected-text tool may exist only when an editor is mounted. Tool registration should follow React component lifecycle and should update the backend manifest when availability changes.

## Proposed public API

The public API should support both imperative embedding and React-native composition.

### Minimal embed API

```ts
import {
  createChatOverlay,
  mountChatOverlay,
  defineWidget,
  defineTool,
} from '@go-go-golems/chat-overlay';

const overlay = createChatOverlay({
  basePrefix: '/assistant',
  session: {
    persistKey: 'shop-assistant-session',
  },
  theme: {
    preset: 'retro-mac',
    position: 'bottom-right',
  },
});

overlay.registerWidget(ProductCarouselWidget);
overlay.registerTool(cartAddTool);

overlay.mount(document.body);
```

This API is for existing pages that are not already React applications. It should create its own React root internally.

### React provider API

```tsx
import {
  ChatOverlayProvider,
  ChatBubble,
  ChatPanel,
  useFrontendTool,
  useHumanTool,
  defineWidget,
} from '@go-go-golems/chat-overlay/react';

function App() {
  return (
    <ChatOverlayProvider config={{ basePrefix: '/assistant' }}>
      <CatalogPage />
      <ChatPanel />
      <ChatBubble />
    </ChatOverlayProvider>
  );
}
```

This API is for React applications that want direct control over placement and composition.

### Widget API

```ts
const ProductCarousel = defineWidget({
  name: 'ProductCarousel',
  props: z.object({
    title: z.string(),
    products: z.array(ProductCardSchema),
    reason: z.string().optional(),
  }),
  render: ({ props, status, actions }) => (
    <ProductCarouselView
      products={props.products}
      onAddToCart={(product) => actions.dispatch('cart_add', { productId: product.id })}
    />
  ),
});
```

A widget renderer receives `actions` so user interactions can submit widget actions. Widget actions are not model tool calls. They are user-originated commands. The backend may respond to them with events, but they do not resume a paused model tool call unless explicitly connected.

### Frontend tool API

```tsx
function CartTools() {
  useFrontendTool({
    name: 'cart_add',
    description: 'Add a purchasable product variant to the user cart.',
    parameters: z.object({
      variantId: z.string(),
      quantity: z.number().int().positive().default(1),
    }),
    availability: ({ state }) => state.page.kind === 'product' || state.page.kind === 'catalog',
    execute: async ({ variantId, quantity }, { signal }) => {
      await cart_add({ variantId, quantity }, { signal });
      return { ok: true, cart: cart.snapshot() };
    },
    render: ({ args, status, result }) => (
      <ToolCard title="Add to cart" status={status}>
        <p>{args.quantity} × {args.variantId}</p>
        {result ? <p>Cart updated.</p> : null}
      </ToolCard>
    ),
  });

  return null;
}
```

A frontend tool has four jobs:

- Advertise a capability to the backend.
- Validate model-provided input in the browser before execution.
- Execute local side effects safely.
- Submit a result back to the backend so the model can continue.

### Human tool API

```tsx
function CheckoutApprovalTool() {
  useHumanTool({
    name: 'checkout_confirm',
    description: 'Ask the user to confirm before opening checkout.',
    parameters: z.object({
      subtotal: z.string(),
      reason: z.string(),
    }),
    render: ({ args, status, respond }) => {
      if (status === 'executing') {
        return (
          <ApprovalCard title="Open checkout?">
            <p>{args.reason}</p>
            <button onClick={() => respond({ approved: true })}>Continue</button>
            <button onClick={() => respond({ approved: false })}>Cancel</button>
          </ApprovalCard>
        );
      }
      return <ToolCard title="Checkout approval" status={status} />;
    },
  });

  return null;
}
```

A human tool has no `execute` function. The render component is the execution surface. The backend remains paused until `respond(result)` submits a tool result command.

### Backend tool UI API

```tsx
const CatalogSearchToolUI = defineToolUI({
  name: 'catalog_search',
  args: CatalogSearchArgsSchema,
  result: CatalogSearchResultSchema,
  render: ({ args, result, status }) => (
    <CatalogSearchCard query={args.query} result={result} status={status} />
  ),
});
```

This covers tools that execute in Go but still need richer frontend display than a JSON fallback.

### Toolkit API

Large applications should not call many hooks manually. They should be able to declare toolkits:

```ts
const commerceToolkit = defineToolkit({
  tools: [cartAddTool, cartRemoveTool, checkoutConfirmTool],
  widgets: [ProductCarousel, CartReview, CheckoutNudge],
  context: commerceContextProvider,
});

overlay.use(commerceToolkit);
```

This mirrors assistant-ui's centralized toolkit idea while still supporting component-scoped hooks.

## Runtime model

A frontend tool has a lifecycle. The lifecycle must be visible in three places: backend run state, WebSocket events, and frontend timeline state.

```text
registered
  └─ advertised to backend manifest
requested
  └─ backend publishes FrontendToolCallRequested
arguments_streaming
  └─ backend may publish FrontendToolArgumentsPatch
executing
  └─ browser validates args and starts handler OR shows human UI
complete
  └─ browser submits FrontendToolResultCommand
resumed
  └─ backend feeds result into Geppetto tool loop
finished
  └─ backend publishes tool finished and continues/finalizes assistant response
```

Error and cancellation paths:

```text
requested -> rejected     // validation failed or tool unavailable
requested -> cancelled    // user stopped run before execution
executing -> failed       // handler threw or returned error
executing -> cancelled    // AbortSignal fired
executing -> complete     // result command accepted
```

## Proposed protocol additions

The current sessionstream transport only allows subscribe/unsubscribe/ping/pong client frames. That is acceptable for now because the current frontend already uses HTTP for commands. We do not need to add client command frames to the WebSocket in the first implementation. Client-side tool results can be submitted through HTTP endpoints that call `Hub.Submit`.

The protocol needs new protobuf messages at the chatapp or overlay level.

### Frontend tool manifest

The backend needs to know which frontend tools exist for a session before it can advertise them to the model.

```protobuf
message FrontendToolDescriptor {
  string name = 1;
  string description = 2;
  google.protobuf.Struct input_schema = 3;  // JSON Schema form of Zod schema
  ToolExecutionMode mode = 4;
  bool available = 5;
}

enum ToolExecutionMode {
  TOOL_EXECUTION_MODE_UNSPECIFIED = 0;
  TOOL_EXECUTION_MODE_FRONTEND_AUTO = 1;
  TOOL_EXECUTION_MODE_FRONTEND_HUMAN = 2;
  TOOL_EXECUTION_MODE_BACKEND = 3;
}

message FrontendToolManifestCommand {
  repeated FrontendToolDescriptor tools = 1;
  uint64 revision = 2;
}

message FrontendToolManifestUpdated {
  repeated FrontendToolDescriptor tools = 1;
  uint64 revision = 2;
}
```

The frontend sends `FrontendToolManifestCommand` when the session starts and whenever scoped tool registration changes. The backend stores the manifest in session metadata or session state. A real Geppetto tool registry can be assembled from this manifest.

### Frontend tool call events

```protobuf
message FrontendToolCallRequested {
  string message_id = 1;
  string tool_call_id = 2;
  string tool_name = 3;
  google.protobuf.Struct input = 4;
  ToolExecutionMode mode = 5;
  string status = 6; // requested | executing | complete | failed | cancelled
}

message FrontendToolArgumentsPatched {
  string message_id = 1;
  string tool_call_id = 2;
  string tool_name = 3;
  string arguments_patch = 4;
  ChatStreamPatchMode mode = 5;
  string status = 6;
}

message FrontendToolResultCommand {
  string tool_call_id = 1;
  string tool_name = 2;
  google.protobuf.Struct result = 3;
  string status = 4; // success | denied | failed | cancelled
  string error = 5;
}

message FrontendToolResultReceived {
  string message_id = 1;
  string tool_call_id = 2;
  string tool_name = 3;
  google.protobuf.Struct result = 4;
  string status = 5;
  string error = 6;
}
```

### Tool timeline entity

```protobuf
message FrontendToolCallEntity {
  string tool_call_id = 1;
  string tool_name = 2;
  string parent_message_id = 3;
  ToolExecutionMode mode = 4;
  string status = 5;
  google.protobuf.Struct input = 6;
  google.protobuf.Struct result = 7;
  string error = 8;
}
```

This entity lets reconnecting clients render pending confirmations, completed tool results, and failed tools correctly.

## Backend architecture

The backend needs a component that bridges Geppetto's tool loop to browser-executed tools.

### Current backend tool flow

Geppetto emits canonical tool events. Pinocchio's `ToolCallPlugin` translates those into chatapp events:

```text
Geppetto EventToolCallStarted
  -> Pinocchio ChatToolCallStarted
  -> sessionstream UI event
  -> timeline entity ChatToolCall
```

This works for observing backend tool calls. It does not pause a tool call for frontend execution.

### Proposed frontend tool executor

Add a `FrontendToolExecutor` in the Geppetto or Pinocchio integration layer. Its job is to implement the Geppetto tool execution interface for tools whose execution mode is frontend.

Pseudocode:

```go
type FrontendToolExecutor struct {
    pending map[string]chan FrontendToolResult
    publish func(ctx context.Context, eventName string, payload proto.Message) error
}

func (e *FrontendToolExecutor) ExecuteToolCall(ctx context.Context, call tools.ToolCall) (tools.ToolResult, error) {
    desc, ok := e.manifest.Lookup(call.Name)
    if !ok || !desc.Available {
        return tools.ToolResult{Error: "frontend tool unavailable"}, nil
    }

    resultCh := make(chan FrontendToolResult, 1)
    e.pending[call.ID] = resultCh
    defer delete(e.pending, call.ID)

    e.publish(ctx, "FrontendToolCallRequested", &FrontendToolCallRequested{
        ToolCallId: call.ID,
        ToolName: call.Name,
        Input: decodeStruct(call.Arguments),
        Mode: desc.Mode,
        Status: "requested",
    })

    select {
    case result := <-resultCh:
        if result.Status == "success" {
            return tools.ToolResult{Result: result.Result}, nil
        }
        return tools.ToolResult{Error: result.ErrorOrStatus()}, nil
    case <-ctx.Done():
        return tools.ToolResult{Error: ctx.Err().Error()}, ctx.Err()
    }
}

func (e *FrontendToolExecutor) SubmitResult(cmd FrontendToolResultCommand) error {
    ch, ok := e.pending[cmd.ToolCallId]
    if !ok {
        return fmt.Errorf("no pending frontend tool call %q", cmd.ToolCallId)
    }
    ch <- FrontendToolResult{...}
    return nil
}
```

The executor needs access to sessionstream's `EventPublisher`. Pinocchio's runtime sink already has a `RuntimeEventContext.Publish` function for plugins. A production implementation should avoid inventing a second publisher path. The cleanest location is Pinocchio's runtime composition layer, where the run already has a session id, message id, context, event sink, and publisher.

### Required Pinocchio changes

Pinocchio should gain a feature plugin similar to the existing tool call plugin:

```go
type FrontendToolPlugin struct {
    manifests *ManifestStore
    pending   *PendingToolCalls
}
```

Responsibilities:

- Register frontend tool command/event/entity schemas.
- Register `FrontendToolManifestCommand` and `FrontendToolResultCommand` handlers.
- Provide a tool executor or runtime wrapper that recognizes frontend tools.
- Publish frontend tool requested/result events.
- Project frontend tool events into UI events and timeline entities.

### Required Geppetto changes

There are two possible designs.

#### Option A: Executor-level extension

Geppetto's tool executor interface accepts tool calls and returns results. A frontend tool executor can block until a result arrives from the browser. This is the most direct model.

Benefits:

- The Geppetto tool loop remains the owner of tool sequencing.
- The model sees a normal tool result after the browser responds.
- Existing provider/tool-call handling remains intact.

Costs:

- The executor needs a way to publish events while waiting.
- The executor needs session-aware state, which may currently live more naturally in Pinocchio than in Geppetto.

#### Option B: Pause/resume event in the tool loop

The tool loop can return a special pause result when it encounters a frontend tool. The app persists the pending call and resumes the loop when the frontend result arrives.

Benefits:

- No goroutine blocks on a browser response.
- Pending state is explicit and durable.

Costs:

- This is a larger Geppetto API change.
- Resume semantics must preserve model context, partial turn state, and run cancellation.

Recommendation: implement Option A first in Pinocchio's runtime integration. Keep the executor session-aware and use sessionstream events for visibility. Revisit Option B if long-lived approvals need to survive server restarts.

## Frontend architecture

The frontend needs four registries:

```text
WidgetRegistry
  name -> props schema + renderer

ToolRegistry
  name -> tool schema + execution mode + handler + renderer

ToolUIRegistry
  name -> renderer for backend or frontend tool call entity

ContextRegistry
  key -> provider that can produce page/cart/user state
```

### Tool registry shape

```ts
type ToolMode = 'frontend' | 'human' | 'backend';

type FrontendTool<TArgs, TResult> = {
  name: string;
  description: string;
  mode?: 'frontend';
  parameters: z.ZodType<TArgs>;
  execute: (args: TArgs, ctx: ToolExecutionContext) => Promise<TResult>;
  render?: React.ComponentType<ToolRenderProps<TArgs, TResult>>;
  available?: boolean | ((ctx: ToolAvailabilityContext) => boolean);
};

type HumanTool<TArgs, TResult> = {
  name: string;
  description: string;
  mode: 'human';
  parameters: z.ZodType<TArgs>;
  render: React.ComponentType<HumanToolRenderProps<TArgs, TResult>>;
};

type BackendToolUI<TArgs, TResult> = {
  name: string;
  mode: 'backend';
  render: React.ComponentType<ToolRenderProps<TArgs, TResult>>;
};
```

### Hook behavior

```ts
function useFrontendTool(tool, deps = []) {
  const overlay = useChatOverlay();

  useEffect(() => {
    const unregister = overlay.tools.register(tool);
    overlay.tools.syncManifest();
    return () => {
      unregister();
      overlay.tools.syncManifest();
    };
  }, deps);
}
```

When a `FrontendToolCallRequested` event arrives:

1. `timelineEvents.ts` creates or updates a `tool_call` entity.
2. `ToolRuntime` checks whether the named tool is registered and available.
3. If `mode === 'frontend'`, it validates args and runs `execute(args, { signal })`.
4. If `mode === 'human'`, it marks the call as waiting for user response and renders the tool UI with `respond`.
5. Completion calls `overlay.tools.submitResult(toolCallId, result)`.
6. The backend receives `FrontendToolResultCommand` and resumes the run.

### Frontend timeline rendering

The existing widget outlet should not render tool calls. Add a separate `ToolCallOutlet` or extend the renderer registry:

```tsx
function TimelineEntityRenderer({ entity }) {
  switch (entity.kind) {
    case 'message': return <MessageCard entity={entity} />;
    case 'widget': return <WidgetOutlet entity={entity} />;
    case 'tool_call': return <ToolCallOutlet entity={entity} />;
    default: return <UnknownEntity entity={entity} />;
  }
}
```

This gives the UI a single timeline with messages, tool calls, and widgets in order.

## End-to-end sequence diagrams

### Automatic frontend tool

```text
Browser                    Server/sessionstream          Pinocchio/Geppetto          Model
   |                                |                           |                      |
   | register cart_add              |                           |                      |
   |------------------------------->| FrontendToolManifestCmd   |                      |
   |                                | store manifest             |                      |
   | send prompt                    |                           |                      |
   |------------------------------->| ChatOverlayStartInference  |                      |
   |                                |-------------------------->| start run             |
   |                                |                           |--------------------->| tools include cart_add
   |                                |                           |<---------------------| tool_call cart_add
   |                                |<--------------------------| FrontendToolCallRequested
   |<-------------------------------| UI event                   | pause/wait           |
   | validate + execute cart_add    |                           |                      |
   | FrontendToolResultCommand      |                           |                      |
   |------------------------------->| route result to pending    |                      |
   |                                |-------------------------->| tool result           |
   |                                |                           |--------------------->| continue with result
   |                                |<--------------------------| final text events     |
   |<-------------------------------| UI events                  |                      |
```

### Human approval tool

```text
Model requests checkout_confirm
Backend publishes FrontendToolCallRequested(mode=HUMAN)
Frontend renders approval card
User clicks Continue or Cancel
Frontend submits FrontendToolResultCommand(status=success, result={approved:true|false})
Backend feeds result to Geppetto
Model continues with confirmed or denied path
```

## Implementation guide for an intern

### Phase 1: Make the current API explicit

Files:

```text
web/src/core/createChatOverlay.ts
web/src/core/context.ts
web/src/widgets/widgetRegistry.ts
web/src/ws/timelineEvents.ts
```

Tasks:

- Add an `OverlayRuntime` object with namespaces: `overlay.session`, `overlay.transport`, `overlay.widgets`, `overlay.tools`, `overlay.context`.
- Keep backward compatibility for `send`, `stop`, `open`, `close`, `toggle`, and `reset`.
- Convert `defineWidget(name, component)` to an object-form API while keeping the old form as a small adapter.
- Add unit tests for widget registration and lookup.

### Phase 2: Add frontend tool registry without backend execution

Files:

```text
web/src/tools/toolRegistry.ts
web/src/tools/useFrontendTool.ts
web/src/tools/useHumanTool.ts
web/src/tools/ToolCallOutlet.tsx
```

Tasks:

- Implement registry add/remove/update.
- Convert Zod schemas to JSON Schema for backend manifest submission.
- Add Storybook stories for automatic frontend tool, human approval tool, backend tool UI, failed tool, and cancelled tool.
- Do not call the backend yet. Test with synthetic timeline entities.

### Phase 3: Add protocol schemas

Files:

```text
proto/chatoverlay/tools/v1/frontend_tool.proto
internal/pb/proto/chatoverlay/tools/v1/*.pb.go
```

Tasks:

- Add manifest command.
- Add result command.
- Add requested/result/failed/cancelled events.
- Add durable timeline entity.
- Generate Go and TypeScript protobuf types.

### Phase 4: Add sessionstream backend plugin

Files:

```text
internal/frontendtools/plugin.go
internal/frontendtools/manifest_store.go
internal/frontendtools/pending.go
```

Tasks:

- Register schemas.
- Register manifest and result command handlers.
- Project tool events to UI events.
- Project tool events to durable timeline entities.
- Add tests for manifest update and result submission.

### Phase 5: Bridge to Pinocchio/Geppetto tool execution

Files to study first:

```text
pinocchio/pkg/chatapp/runtime_inference.go
pinocchio/pkg/chatapp/runtime_sink.go
pinocchio/pkg/chatapp/plugins/toolcall.go
geppetto/pkg/inference/toolloop/loop.go
geppetto/pkg/inference/tools/executor.go
```

Tasks:

- Build a session-aware frontend tool executor.
- Publish `FrontendToolCallRequested` when a frontend tool is called.
- Wait for `FrontendToolResultCommand` or cancellation.
- Convert successful result into a Geppetto tool result.
- Convert denied/failed result into a tool error or structured denial result.
- Add cancellation tests.

### Phase 6: Connect frontend runtime to backend

Files:

```text
web/src/core/createChatOverlay.ts
web/src/tools/toolRuntime.ts
web/src/ws/timelineEvents.ts
```

Tasks:

- Sync manifest after session creation and whenever registrations change.
- Execute frontend tools on `FrontendToolCallRequested` events.
- Render human tools with `respond` callback.
- Submit results through HTTP command endpoints.
- Add browser integration tests.

## API reference sketch

```ts
type ChatOverlay = {
  send(prompt: string): Promise<void>;
  stop(): Promise<void>;
  open(): void;
  close(): void;
  toggle(): void;
  reset(): void;

  widgets: WidgetRegistry;
  tools: ToolRegistry;
  context: ContextRegistry;
  transport: ChatTransport;
};

function createChatOverlay(config: ChatOverlayConfig): ChatOverlay;
function mountChatOverlay(target: HTMLElement, config: ChatOverlayConfig): ChatOverlay;

function defineWidget<TProps>(def: WidgetDefinition<TProps>): WidgetDefinition<TProps>;
function defineTool<TArgs, TResult>(def: ToolDefinition<TArgs, TResult>): ToolDefinition<TArgs, TResult>;
function defineToolkit(def: ToolkitDefinition): ToolkitDefinition;

function useFrontendTool<TArgs, TResult>(tool: FrontendTool<TArgs, TResult>, deps?: unknown[]): void;
function useHumanTool<TArgs, TResult>(tool: HumanTool<TArgs, TResult>, deps?: unknown[]): void;
function useToolUI<TArgs, TResult>(toolUI: BackendToolUI<TArgs, TResult>, deps?: unknown[]): void;
function useChatOverlay(): ChatOverlay;
```

## Security and trust boundaries

Client-side tool calling is powerful because it gives the model access to page-local capabilities. That power needs explicit guardrails.

- Tool schemas must validate every model-provided input before execution.
- Tools that mutate data, spend money, send messages, delete records, or navigate away should default to human approval.
- The backend should know which tools are frontend-executed and should not assume their results are trusted server facts unless the host application says so.
- Tool results should be size-limited and serialized through a typed result envelope.
- Tool availability should be session-scoped and permission-aware.
- The frontend should abort running tool handlers when the user stops the run.
- The timeline should show what tool was requested and what result was returned.

## Design decisions

### Decision 1: Keep sessionstream as the only protocol substrate

Do not add a second ad hoc tool WebSocket. Use sessionstream commands for manifests/results and sessionstream events for tool lifecycle. This preserves ordering, reconnect, and projection semantics.

### Decision 2: Use HTTP commands first; consider WebSocket client commands later

The current sessionstream WebSocket client frame only supports subscribe/unsubscribe/ping/pong. We can add client command frames later, but it is not required for client-side tool calling. The first implementation should submit tool results through HTTP routes that call `Hub.Submit`.

### Decision 3: Separate widget UI from tool execution

Widgets are durable UI instances. Tools are action contracts. They can share render infrastructure, but they should not share the same protocol messages.

### Decision 4: Make human tools first-class

Human approval should be a tool mode with `respond`, not a widget convention. This gives the backend a clear pause/resume contract and gives the frontend a clear status model.

### Decision 5: Prefer Pinocchio-level integration first

Geppetto should eventually understand resumable remote tools, but the first implementation should live in Pinocchio/chat-overlay integration. Pinocchio has the session id, message id, event publisher, and chat timeline concepts needed to make this work.

## Open questions

- Should frontend tool manifests be persisted in session metadata or only held in memory? In-memory is simpler, but reconnect and server restart behavior are weaker.
- Should denied human approvals be represented as tool errors or successful results with `{ approved: false }`? The recommended default is successful structured result; reserve errors for system failures.
- Should frontend tool result values be `google.protobuf.Struct`, `Any`, or a concrete `ToolResultEnvelope` with JSON bytes? `Struct` is easiest; a concrete envelope gives better size/type metadata.
- Should the frontend submit results through `/api/chat/sessions/{id}/tool-results` or the existing command endpoint? A named endpoint is clearer for application developers; internally it should still submit a sessionstream command.
- Should frontend tool descriptors be included in the model prompt as normal tools or as a separate capability list? For provider portability, they should become normal tool definitions where possible.

## Validation plan

A correct implementation must pass these tests:

1. Register a frontend tool, submit a prompt that calls it, and verify the browser executes it and the backend continues the model run.
2. Register a human tool, submit a prompt that calls it, verify the timeline shows a pending approval, click approve, and verify the backend continues.
3. Refresh the page while a human tool is pending. The snapshot must restore the pending tool entity.
4. Stop the run while a frontend tool handler is executing. The handler's `AbortSignal` must fire, and the backend run must publish stopped/cancelled state.
5. Unmount the component that registered a tool, sync the manifest, and verify the backend no longer advertises it to the model.
6. Attempt a tool call with invalid arguments. The frontend must reject it and submit a failed/denied result; the backend must continue or fail according to policy.
7. Run with no custom UI for a backend tool. The fallback renderer must show tool name, args, status, result, and error.

## File reference list

Current implementation files:

- `/home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/web/src/core/createChatOverlay.ts`
- `/home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/web/src/widgets/widgetRegistry.ts`
- `/home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/web/src/ws/timelineEvents.ts`
- `/home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/internal/mockengine/engine.go`
- `/home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/internal/widgets/plugin.go`
- `/home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/proto/chatoverlay/widgets/v1/widget.proto`

Reference implementation files:

- `/home/manuel/workspaces/2026-05-29/chatbot-react/sessionstream/proto/sessionstream/v1/transport.proto`
- `/home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/pkg/chatapp/plugins/toolcall.go`
- `/home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/pkg/chatapp/runtime_inference.go`
- `/home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/pkg/chatapp/runtime_sink.go`
- `/home/manuel/workspaces/2026-05-29/chatbot-react/geppetto/pkg/inference/toolloop/loop.go`
- `/home/manuel/workspaces/2026-05-29/chatbot-react/geppetto/pkg/inference/tools/executor.go`

Research sources:

- `sources/01-copilotkit-use-frontend-tool.md`
- `sources/02-copilotkit-use-human-in-the-loop.md`
- `sources/03-copilotkit-ag-ui.md`
- `sources/04-ai-sdk-tools-and-tool-calling.md`
- `sources/05-ai-sdk-chatbot-tool-usage.md`
- `sources/06-ai-sdk-generative-user-interfaces.md`
- `sources/08-assistant-ui-tools.md`
- `sources/09-assistant-ui-tool-ui.md`

The attempted `surf chatgpt transcript` export produced `sources/10-last-chatgpt-session.md`, but the active page was the local chat overlay rather than a ChatGPT conversation. Treat it as evidence that no useful ChatGPT transcript was available in the current browser state.
