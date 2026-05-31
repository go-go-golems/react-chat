---
Title: Provider-scoped extension registry design and implementation guide
Ticket: CHATOVERLAY-008
Status: active
Topics:
    - chat-overlay
    - react
    - pinocchio
    - widgets
DocType: design-doc
Intent: long-term
Owners: []
RelatedFiles:
    - Path: ../../../../../../../pinocchio/cmd/web-chat/web/src/chat/provider/ProviderBackedChatWidget.tsx
      Note: Pinocchio provider config assembly and future extension install site
    - Path: ../../../../../../../pinocchio/cmd/web-chat/web/src/webchat/ProviderDemoPage.tsx
      Note: Current toolkit example with tools and widget descriptor
    - Path: packages/chat-provider/src/core/createChatClient.ts
      Note: Current config/session/send API and tool manifest synchronization
    - Path: packages/chat-provider/src/react/ChatProvider.tsx
      Note: Provider runtime construction and target home for provider-scoped registries
    - Path: packages/chat-provider/src/tools/toolRegistry.ts
      Note: Current tool descriptor and provider-scoped registry model
    - Path: packages/chat-provider/src/widgets/widgetRegistry.ts
      Note: Current global widget registry to replace
    - Path: packages/chat-provider/src/ws/timelineEvents.ts
      Note: Current hard-coded projector to extract into configurable projectors
    - Path: web/src/App.tsx
      Note: Ecommerce hook-based tool registration and widget side-effect import
    - Path: web/src/ecommerce/CartReview.tsx
      Note: Current import-side-effect widget registration example
ExternalSources: []
Summary: Design and implementation guide for replacing global/import-side-effect registries with provider-scoped tools, widgets, and timeline projectors.
LastUpdated: 2026-05-31T11:42:28.8357862-04:00
WhatFor: Guide a clean cutover of chat-provider extension registration APIs.
WhenToUse: Use before refactoring chat-provider, chat-overlay ecommerce demo, Pinocchio web-chat, or other consumers that register tools, widgets, or timeline projections.
---


# Provider-scoped extension registry design and implementation guide

## Executive summary

`@go-go-golems/chat-provider` is now the reusable headless runtime underneath the ecommerce chat overlay and Pinocchio `web-chat`. It owns sessions, WebSocket transport, timeline projection, frontend tool execution, typed widget rendering, and provider-scoped Redux state. The next cleanup is to make all extension points explicit, provider-scoped, and deterministic.

Today the system mixes two registration styles:

1. **React lifecycle registration for tools.** Components such as ecommerce `DemoTools` call `useFrontendTool(...)` and `useHumanTool(...)` inside a mounted provider tree. This is easy to reason about because registration exists while the component exists.
2. **Global import-side-effect registration for widgets.** `defineWidget(...)` currently mutates a module-level widget registry as soon as a file is imported. For example, `CartReview.tsx` exports `cartReviewWidget = defineWidget(...)`, and `web/src/App.tsx` imports `./ecommerce` for the side effect.

The proposed cutover is opinionated and intentionally not backwards-compatible:

- `defineTool`, `defineWidget`, and `defineTimelineProjector` become **pure descriptor factories**.
- `ChatProvider` owns **provider-scoped registries** for tools, widgets, and timeline projectors.
- Tools and widgets can be installed with hook/component registration under the provider tree.
- Timeline projectors should be supplied through provider configuration because they must be available before WebSocket events arrive.
- Import side effects are removed.
- Consumers migrate to explicit `<ChatExtensions />` components or `extensions` arrays.

The end state is simple for an app author:

```tsx
const appExtensions = defineChatExtensions({
  tools: [cartAddTool, checkoutConfirmTool],
  widgets: [cartReviewWidget],
  projectors: [pinocchioReasoningProjector, pinocchioAgentModeProjector],
});

<ChatProvider config={{ ...config, extensions: [appExtensions] }}>
  <EcommerceExtensions />   {/* optional hook/component registration */}
  <AppChatUI />
</ChatProvider>
```

For most applications, the recommended pattern is:

- static app-wide widgets/projectors in `config.extensions`,
- stateful browser tools in a component such as `<DemoTools />`,
- no import-time registration.

## Problem statement and scope

### The immediate problem

The provider migration exposed a design smell. Thinking/reasoning messages stopped appearing until `ChatProvider` gained explicit projection support for `ChatReasoningPatch`. That happened because live WebSocket UI events only become visible when the active projector knows how to map them into timeline entities.

The old Pinocchio `web-chat` had a Pinocchio-specific projector in `cmd/web-chat/web/src/ws/timelineEvents.ts`. The new provider runtime has its own generic projector in `packages/chat-provider/src/ws/timelineEvents.ts`. When we moved the main widget to `ChatProvider`, custom event support no longer came from the old web-chat projector. This is expected architecturally, but the current extension API does not make projector registration explicit enough.

### Why the current widget API is also a problem

Widgets have the opposite issue. They are too global. `defineWidget(...)` currently mutates a module-level registry. Importing a file can change widget behavior for every provider instance in the page. That is fragile for tests, hot reload, multiple providers, and future apps that need different widget sets.

### Scope

This design covers the frontend `chat-provider` package and its known consumers:

- `packages/chat-provider` in the chat-overlay workspace,
- `packages/chat-overlay`, especially `ChatOverlayProvider`,
- ecommerce demo app under `web/src/ecommerce`,
- Pinocchio `cmd/web-chat/web`, especially `src/chat/provider`,
- future CoinVault adoption.

This design does not change backend sessionstream protocol contracts. It changes frontend registration and projection APIs.

## System orientation for a new intern

This section explains the moving parts before proposing changes.

### What is `chat-provider`?

`@go-go-golems/chat-provider` is a headless React runtime for chat applications. It does not own a specific page layout. It provides state, transport, timeline projection, tool execution, widget lookup, and hooks.

At runtime, `ChatProvider` creates one isolated runtime per provider instance:

```tsx
<ChatProvider config={config}>
  <YourChatUI />
</ChatProvider>
```

The current implementation creates these runtime objects inside `ChatProvider`:

- a Redux store,
- a frontend tool registry,
- a tool runtime,
- a WebSocket manager,
- a `ChatClient` object exposed through context.

Evidence: `packages/chat-provider/src/react/ChatProvider.tsx:15-35` creates `createChatStore()`, `createToolRegistry()`, `createToolRuntime(...)`, `createChatClient(...)`, and `createWsManager()` inside a `useMemo`. This is the right shape for instance-scoped state.

### What is a frontend tool?

A frontend tool is browser code the assistant can ask to run. It can be fully automatic, human-mediated, or just a UI renderer for backend tools.

Current tool definitions live in `packages/chat-provider/src/tools/toolRegistry.ts`:

- `FrontendTool` has an `execute(...)` function.
- `HumanTool` has a `render(...)` function.
- `BackendToolUI` can render backend tool state.
- `ToolRegistry.register(...)` returns an unregister callback.

Evidence: `toolRegistry.ts:34-52` defines tool variants, and `toolRegistry.ts:62-109` defines the registry interface and `ChatToolRegistry` implementation.

The tool registration pattern is already mostly correct. `useFrontendTool(...)` registers during React effect mount and unregisters during cleanup. Evidence: `useFrontendTool.ts:5-16` calls `client.tools.register(tool)` and returns the unregister cleanup.

### What is a widget?

A widget is a typed piece of UI streamed from the backend. The backend sends lifecycle events such as:

- `ChatWidgetInstanceStarted`,
- `ChatWidgetInstancePatched`,
- `ChatWidgetInstanceCompleted`,
- `ChatWidgetInstanceRemoved`.

The frontend projects those events into timeline entities and then renders by widget name.

The current problem is the registry. `packages/chat-provider/src/widgets/widgetRegistry.ts:15-24` stores widgets in a module-level `Map` and mutates it inside `defineWidget(...)`. `WidgetOutlet.tsx:4-12` reads that global registry.

That means this line has a global side effect:

```ts
export const cartReviewWidget = defineWidget('CartReview', CartReviewWidget);
```

Evidence: ecommerce `CartReview.tsx:1-54` imports `defineWidget` and exports `cartReviewWidget`; ecommerce `App.tsx:5` imports `./ecommerce` with a comment saying `register ecommerce widgets`.

### What is a timeline projector?

A timeline projector maps a raw WebSocket UI event frame into a mutation for the provider timeline store.

Conceptually:

```ts
type TimelineProjector = (frame, context) => TimelineMutation | null;
```

The mutation can upsert an entity, delete an entity, update run status, or do nothing.

Current provider projection is hard-coded in `packages/chat-provider/src/ws/timelineEvents.ts`. Evidence: `timelineMutationFromUIEvent(...)` starts at line 45 and switches on UI event names. It currently covers normal messages, reasoning, widgets, and frontend tool calls.

The old Pinocchio projector still has additional Pinocchio-specific event coverage. Evidence: `pinocchio/cmd/web-chat/web/src/ws/timelineEvents.ts` handles agent-mode and backend tool-call events in addition to text/reasoning/widgets/tools.

### Current data flow

```text
User types prompt
  |
  v
ChatClient.send(prompt)
  |
  +--> ensure session
  +--> connect WebSocket
  +--> sync frontend tool manifest
  +--> POST /api/chat/sessions/{id}/messages

Backend publishes sessionstream UI events
  |
  v
WsManager parses frames
  |
  v
Timeline projector maps frame -> TimelineMutation
  |
  v
Redux timeline store updates
  |
  v
React timeline renders message/tool/widget cards
```

Evidence: `createChatClient.ts:167-183` implements send, `createChatClient.ts:124-133` syncs tool manifests, and `timelineEvents.ts:222-235` applies timeline mutations.

## Current-state analysis

### Tool registration is provider-scoped but scattered

The tool path is close to the desired architecture:

- `ChatProvider` creates a tool registry per provider instance.
- `useFrontendTool(...)` and `useHumanTool(...)` register tools through `useChatClient()`.
- `syncManifest()` advertises current tools to the backend.

Ecommerce already uses this pattern. `web/src/App.tsx:42-123` defines `DemoTools`, which calls `useFrontendTool(...)` and `useHumanTool(...)`. The component is mounted under `ChatOverlayProvider` at `web/src/App.tsx:127-144`.

This is a good React pattern: mounted component means registered capability; unmounted component means removed capability.

### Widget registration is global and import-order dependent

The widget path is not provider-scoped:

- `defineWidget(...)` mutates a module-level `Map`.
- `WidgetOutlet` reads from that global map.
- ecommerce imports `./ecommerce` only to trigger widget registration.

This is easy to miss when reading the app. A new intern might delete the import as unused and break widget rendering. It also conflicts with multi-provider isolation. The recent provider multi-instance smoke verifies separate runtime state, but global widget registration means both providers still share widget definitions.

### Projectors are hard-coded and incomplete for consumers

The provider projector now handles basic chat events and the recently restored reasoning events. But Pinocchio has more event types than the generic provider should permanently hard-code.

Examples of app-specific or domain-specific projector needs:

- Pinocchio agent-mode preview/commit/clear events,
- Pinocchio backend tool call/result events,
- CoinVault domain events,
- ecommerce-specific rich entities, if introduced later.

The clean solution is not to keep adding every app event to `chat-provider`. The provider should offer a generic extension slot for projectors.

### Toolkit API exists but is not complete

`ChatToolkit` already models grouped extensions with `tools?: ToolDefinition[]` and `widgets?: WidgetDefinition[]` at `packages/chat-provider/src/core/toolkit.ts:5-10`. However, `installToolkit(...)` currently registers only tools (`toolkit.ts:19-21`) and ignores `widgets`. This is a half-finished bridge. It confirms that the code already wants grouped extension descriptors, but the implementation needs a clean cutover.

## Gap analysis

The system needs one coherent extension story.

Current gaps:

1. **Widgets are not provider-scoped.** They use a global registry.
2. **Projectors are not configurable.** Consumers cannot add app-specific projection without editing provider source.
3. **Toolkits are incomplete.** They name widgets but do not install them.
4. **Registration styles differ.** Tools use React lifecycle; widgets use import side effects.
5. **No deterministic provider startup contract.** Projectors must exist before WebSocket connect, but current component registration could happen too late unless carefully ordered.
6. **No clean multi-provider widget isolation.** Different provider instances cannot have different widget sets.

## Design goals

### Primary goals

- Make extension registration explicit.
- Make extension registration provider-scoped.
- Remove import side effects.
- Preserve the ergonomic component/hook style for tools and widgets.
- Add provider-configured projectors for deterministic event handling.
- Keep `chat-provider` generic and app-agnostic.
- Prefer simple APIs over compatibility layers.

### Non-goals

- No backwards compatibility wrappers.
- No global registries for app-level widgets or projectors.
- No Pinocchio-specific imports inside `chat-provider`.
- No server protocol changes.
- No dynamic plugin loader in this phase.

## Proposed architecture

### Core idea

Make extensions data first, then install them explicitly.

```ts
type ChatExtension = {
  name?: string;
  tools?: ToolDefinition[];
  widgets?: WidgetDefinition[];
  projectors?: TimelineProjector[];
};
```

`defineTool`, `defineWidget`, and `defineTimelineProjector` return descriptors. They do not mutate global state.

`ChatProvider` receives static extensions in config:

```tsx
<ChatProvider
  config={{
    ...config,
    extensions: [webChatCoreExtensions, pinocchioProjectorExtensions],
  }}
>
  <WebChatTools />
  <ProviderBackedChatWidgetInner />
</ChatProvider>
```

Components can add dynamic extensions at runtime:

```tsx
function EcommerceExtensions() {
  useTool(cartAddTool);
  useTool(checkoutConfirmTool);
  useWidget(cartReviewWidget);
  return null;
}
```

Projectors should usually be static config, not late hook registration, because they must be active when frames arrive.

### Target runtime diagram

```text
ChatProvider(config.extensions)
  |
  +-- create provider store
  +-- create provider-scoped tool registry
  +-- create provider-scoped widget registry
  +-- create provider-scoped projector registry
  +-- install config extensions before client connects
  |
  v
Provider children
  |
  +-- <Tools /> may call useTool/useHumanTool/useFrontendTool
  +-- <Widgets /> may call useWidget
  +-- UI calls client.connect/send/reset
  |
  v
WsManager receives frames
  |
  v
projector registry: default projectors, then app projectors
  |
  v
Timeline store and render outlets
```

### Proposed provider config

```ts
type ChatProviderConfig = {
  basePrefix?: string;
  apiBase?: string;
  sessionIdParam?: string;
  sessionStorageKey?: string;
  onSessionIdChange?: (sessionId: string | null) => void;
  onDebugEvent?: ChatDebugHandler;

  createSessionBody?: () => ChatRequestBody | Promise<ChatRequestBody>;
  sendMessageBody?: (args: { prompt: string }) => ChatRequestBody | Promise<ChatRequestBody>;

  extensions?: ChatExtension[];
  tools?: ToolDefinition[];       // convenience, flattened with extensions
  widgets?: WidgetDefinition[];   // convenience, flattened with extensions
  projectors?: TimelineProjector[];
};
```

The convenience arrays keep common cases simple. Internally they are normalized into one `ChatExtension[]` list.

### Proposed extension contracts

```ts
type ChatExtension = {
  name?: string;
  tools?: ToolDefinition[];
  widgets?: WidgetDefinition[];
  projectors?: TimelineProjector[];
  install?: (runtime: ChatRuntimeApi) => void | (() => void);
};
```

`install` is an escape hatch for advanced cases. Most apps should not need it.

```ts
type ChatRuntimeApi = {
  client: ChatClient;
  tools: ToolRegistry;
  widgets: WidgetRegistry;
  projectors: TimelineProjectorRegistry;
};
```

### Proposed widget registry

Replace global widget storage with provider-scoped registry:

```ts
type WidgetRegistry = {
  register(widget: WidgetDefinition): () => void;
  get(name: string): WidgetDefinition | undefined;
  list(): WidgetDefinition[];
  revision(): number;
};
```

`defineWidget` becomes pure:

```ts
function defineWidget(name: string, component: ComponentType<WidgetProps>): WidgetDefinition {
  return { name, component };
}
```

Hook registration:

```ts
function useWidget(widget: WidgetDefinition, deps: unknown[] = []) {
  const { widgetRegistry } = useChatRuntime();
  useEffect(() => widgetRegistry.register(widget), [widgetRegistry, ...deps]);
}
```

`WidgetOutlet` changes from global lookup to context lookup:

```tsx
function WidgetOutlet(props: WidgetProps) {
  const { widgetRegistry } = useChatRuntime();
  const def = widgetRegistry.get(props.widgetName);
  if (!def) return <UnknownWidget {...props} />;
  return <def.component {...props} />;
}
```

### Proposed projector registry

```ts
type TimelineProjectorContext = {
  sessionId: string;
  toolRuntime: ToolRuntime;
};

type TimelineProjector = {
  name: string;
  priority?: number;
  project(frame: CanonicalFrame, context: TimelineProjectorContext): TimelineMutation | null;
};
```

`priority` lets app projectors override default projector behavior if needed. Keep the default simple:

- lower priority runs first,
- first non-null mutation wins,
- default core projector is installed at priority `0`,
- app projectors can use `-10` to override or `10` to extend after default misses.

Alternative composition strategy: all projectors return mutations and the provider merges them. This is more complex. First-match is easier to reason about.

### Projector flow pseudocode

```ts
function projectFrame(frame, context) {
  for (const projector of projectors.sortedByPriority()) {
    const mutation = projector.project(frame, context);
    if (mutation) return mutation;
  }
  return null;
}

function applyUIEvent(frame, dispatch, context) {
  context.toolRuntime.handleFrontendToolUIEvent(frame);
  const mutation = projectFrame(frame, context);
  applyMutation(dispatch, mutation);
  return mutation;
}
```

### Provider extension install pseudocode

```ts
function ChatProvider({ config, children }) {
  const runtime = useMemo(() => {
    const store = createChatStore();
    const tools = createToolRegistry();
    const widgets = createWidgetRegistry();
    const projectors = createTimelineProjectorRegistry();

    projectors.register(coreChatProjector);

    for (const extension of normalizeExtensions(config)) {
      for (const tool of extension.tools ?? []) tools.register(tool);
      for (const widget of extension.widgets ?? []) widgets.register(widget);
      for (const projector of extension.projectors ?? []) projectors.register(projector);
      extension.install?.({ client, tools, widgets, projectors });
    }

    const client = createChatClient({
      config,
      store,
      toolRegistry: tools,
      widgetRegistry: widgets,
      projectorRegistry: projectors,
      toolRuntime,
      wsManager,
    });

    return { store, context: { client, toolRuntime, widgets, projectors } };
  }, [config]);

  return <RuntimeContext.Provider value={runtime.context}>{children}</RuntimeContext.Provider>;
}
```

Implementation detail: because `client` currently needs registries during construction, build registries first, create the client, then run any `install` hooks that need the client.

## Consumer design

### Ecommerce demo after cutover

Current ecommerce has this import:

```ts
import './ecommerce'; // register ecommerce widgets
```

Remove it. Make ecommerce widgets explicit.

```ts
// web/src/ecommerce/CartReview.tsx
export const cartReviewWidget = defineWidget('CartReview', CartReviewWidget);
```

```tsx
// web/src/ecommerce/extensions.ts
export const ecommerceExtensions = defineChatExtensions({
  name: 'ecommerce-demo',
  widgets: [cartReviewWidget],
});
```

Then either provider config:

```tsx
<ChatOverlayProvider config={{ ...CHAT_OVERLAY_CONFIG, extensions: [ecommerceExtensions] }}>
  <DemoTools />
  <ChatPanel />
  <ChatBubble />
</ChatOverlayProvider>
```

or component registration:

```tsx
function EcommerceWidgets() {
  useWidget(cartReviewWidget);
  return null;
}

<ChatOverlayProvider config={CHAT_OVERLAY_CONFIG}>
  <DemoTools />
  <EcommerceWidgets />
  <ChatPanel />
  <ChatBubble />
</ChatOverlayProvider>
```

Recommendation: use config for static widgets and hooks for stateful tools.

### Pinocchio web-chat after cutover

Pinocchio should define its projectors as app-owned descriptors:

```ts
export const pinocchioReasoningProjector = defineTimelineProjector({
  name: 'pinocchio.reasoning',
  project(frame) {
    switch (frame.name) {
      case 'ChatReasoningPatch':
        return thinkingPatchMutation(frame);
      default:
        return null;
    }
  },
});
```

Then pass projectors into provider config:

```tsx
const config = useMemo(() => ({
  basePrefix,
  sessionIdParam: 'sessionId',
  sessionStorageKey: 'pinocchio.web-chat.sessionId',
  onSessionIdChange: setSessionIdInLocation,
  onDebugEvent: recordProviderDebugEvent,
  createSessionBody: () => ({ profile: selectedProfile }),
  sendMessageBody: ({ prompt }) => ({ prompt, profile: selectedProfile }),
  extensions: [pinocchioWebChatExtensions],
}), [basePrefix, selectedProfile]);
```

`pinocchioWebChatExtensions` should contain:

- provider capability tools,
- capability demo widget,
- reasoning projector,
- agent-mode projector,
- backend tool-call/result projector.

This removes the need to keep adding Pinocchio event names to provider core.

### Chat overlay package after cutover

`ChatOverlayProvider` currently forwards config to `ChatProvider`. Evidence: `packages/chat-overlay/src/overlay/ChatOverlayProvider.tsx` wraps `ChatProvider` and passes `config` through.

It should continue to do this. No separate extension API is needed unless we want overlay-specific defaults later.

```tsx
export function ChatOverlayProvider({ children, config }: ChatOverlayProviderProps) {
  return (
    <ChatProvider config={config}>
      <div className="chat-overlay-root">{children}</div>
    </ChatProvider>
  );
}
```

## API reference

### Descriptor factories

```ts
export function defineTool<T extends ToolDefinition>(tool: T): T;
export function defineWidget(name: string, component: ComponentType<WidgetProps>): WidgetDefinition;
export function defineTimelineProjector(projector: TimelineProjector): TimelineProjector;
export function defineChatExtensions<T extends ChatExtension>(extension: T): T;
```

All four are pure. None registers anything.

### Hook APIs

```ts
export function useTool(tool: ToolDefinition, deps?: unknown[]): void;
export function useFrontendTool<TInput, TResult>(tool: FrontendTool<TInput, TResult>, deps?: unknown[]): void;
export function useHumanTool<TInput, TResult>(tool: HumanTool<TInput, TResult>, deps?: unknown[]): void;
export function useWidget(widget: WidgetDefinition, deps?: unknown[]): void;
export function useChatExtensions(extension: ChatExtension, deps?: unknown[]): void;
```

`useFrontendTool` and `useHumanTool` can remain as typed convenience wrappers around `useTool`.

### Provider config APIs

```ts
type ChatProviderConfig = {
  extensions?: ChatExtension[];
  tools?: ToolDefinition[];
  widgets?: WidgetDefinition[];
  projectors?: TimelineProjector[];
  // existing transport/session/body fields remain
};
```

Use config for static capabilities that should exist before connection.

### Runtime context APIs

```ts
type ChatRuntimeContextValue = {
  client: ChatClient;
  toolRuntime: ToolRuntime;
  tools: ToolRegistry;
  widgets: WidgetRegistry;
  projectors: TimelineProjectorRegistry;
};
```

Expose only what app code needs. Avoid encouraging direct store mutation.

## Implementation phases

### Phase 1: Introduce provider-scoped widget registry

Files:

- `packages/chat-provider/src/widgets/widgetRegistry.ts`
- `packages/chat-provider/src/widgets/WidgetOutlet.tsx`
- `packages/chat-provider/src/react/ChatProvider.tsx`
- `packages/chat-provider/src/core/context.ts`

Steps:

1. Replace module-level widget `Map` with `createWidgetRegistry()`.
2. Add `widgetRegistry` to runtime context.
3. Make `defineWidget(...)` pure.
4. Add `useWidget(...)`.
5. Change `WidgetOutlet` to read widget registry from context.
6. Remove `clearWidgetRegistry()` unless tests need a local registry helper; do not expose a global reset API.

Validation:

- provider typecheck,
- ecommerce build,
- widget smoke.

### Phase 2: Normalize extension descriptors

Files:

- `packages/chat-provider/src/core/toolkit.ts`
- `packages/chat-provider/src/core/useToolkit.ts`
- new `packages/chat-provider/src/core/extensions.ts` if clearer.

Steps:

1. Rename `ChatToolkit` to `ChatExtension` or keep a transitional file but no backwards-compatible API exports.
2. Add `defineChatExtensions(...)`.
3. Implement `installChatExtension(...)` to register tools, widgets, and projectors.
4. Ensure cleanup unregisters in reverse order.
5. Update exports.

Because the user explicitly requested a clean cutover, do not keep old names unless they remain the final names.

### Phase 3: Add projector registry

Files:

- new `packages/chat-provider/src/ws/projectorRegistry.ts`
- `packages/chat-provider/src/ws/timelineEvents.ts`
- `packages/chat-provider/src/ws/wsManager.ts`
- `packages/chat-provider/src/core/createChatClient.ts`
- `packages/chat-provider/src/react/ChatProvider.tsx`

Steps:

1. Extract current hard-coded projector into `coreChatProjector`.
2. Add `createTimelineProjectorRegistry()`.
3. Install `coreChatProjector` by default.
4. Pass projector registry into `WsManager` or `applyUIEvent`.
5. Add debug event metadata showing which projector handled a frame.

Pseudocode:

```ts
const mutation = projectorRegistry.project(frame, {
  sessionId,
  toolRuntime,
});
```

### Phase 4: Provider config extension install

Files:

- `ChatProvider.tsx`
- `createChatClient.ts`
- extension helper files.

Steps:

1. Add `extensions`, `tools`, `widgets`, `projectors` to config.
2. Install config extensions during provider runtime creation before any child can call `client.connect()`.
3. Ensure config identity does not cause accidental reinstall loops. Require consumers to memoize config; document it.
4. Keep hook registration for dynamic capabilities.

### Phase 5: Migrate ecommerce demo

Files:

- `web/src/App.tsx`
- `web/src/ecommerce/CartReview.tsx`
- `web/src/ecommerce/index.ts`
- new `web/src/ecommerce/extensions.ts` if needed.

Steps:

1. Remove `import './ecommerce';` side-effect registration.
2. Export `ecommerceExtensions` or `EcommerceWidgets`.
3. Pass static widgets through provider config or render `<EcommerceWidgets />` under provider.
4. Keep `DemoTools` as component/hook registration because it has local state.

### Phase 6: Migrate Pinocchio web-chat

Files:

- `pinocchio/cmd/web-chat/web/src/chat/provider/*`
- `pinocchio/cmd/web-chat/web/src/webchat/ProviderDemoPage.tsx`
- new `pinocchio/cmd/web-chat/web/src/chat/provider/extensions.ts`
- new `pinocchio/cmd/web-chat/web/src/chat/provider/projectors/*.ts`

Steps:

1. Move provider demo tools/widgets into explicit extension descriptors.
2. Move Pinocchio reasoning projection out of provider core into Pinocchio extension, unless we decide reasoning is generic enough to stay core.
3. Add Pinocchio agent-mode projector.
4. Add Pinocchio backend tool projector.
5. Keep `ProviderBackedChatWidget` config as the place that installs static projectors.
6. Keep optional `<WebChatTools />` for tools that depend on browser state.

### Phase 7: Remove global behavior and update tests

Steps:

1. Remove any remaining global widget registry usage.
2. Update imports and package exports.
3. Add provider multi-instance tests proving different provider instances can render different widgets for the same widget name if deliberately configured that way.
4. Add projector tests for first-match priority behavior.
5. Add ecommerce and web-chat browser smokes.

## Testing strategy

### Unit tests

Add tests in `packages/chat-provider` if test tooling exists or is introduced:

- `defineWidget` is pure and does not register globally.
- `useWidget` registers on mount and unregisters on unmount.
- `WidgetOutlet` resolves from the provider-local registry.
- two provider instances can have different widget registries.
- projector registry respects priority and first-match semantics.
- default core projector still handles normal text/widgets/frontend tools.

### Integration tests

Use existing browser smokes:

- ecommerce `show me boots`, `review my cart`, `add boots to cart`,
- Pinocchio main web-chat smoke,
- Pinocchio capabilities showcase smoke,
- provider multi-instance smoke.

Add one new smoke:

- render two provider instances with same `widgetName` but different registered components; assert each provider renders its own component.

### Regression tests for current bug class

Add explicit projector coverage:

```ts
expect(project(ChatReasoningPatch)).toEqual({
  upsert: expect.objectContaining({ kind: 'message', props: expect.objectContaining({ role: 'thinking' }) }),
});
```

For Pinocchio-owned projectors, test under Pinocchio web-chat rather than provider core.

## Risks and mitigations

### Risk: hooks register too late for projectors

Mitigation: projectors are primarily config extensions, installed before child effects run. Hook registration remains available for advanced dynamic cases but should not be the default for projectors.

### Risk: config arrays cause runtime recreation

React `useMemo` in `ChatProvider` depends on `config`. If consumers create new config objects every render, the provider runtime can be recreated. This is already a concern. Document and enforce memoized config in examples.

Possible future improvement:

```tsx
<ChatProvider config={config} extensions={extensions}>
```

But for now, keeping all setup under `config` is simpler.

### Risk: removing globals breaks existing demos

This is intended. The ticket explicitly chooses a clean cutover. Every consumer must import descriptors and register them explicitly.

### Risk: provider core becomes too abstract

Mitigation: keep the default path simple:

```tsx
<ChatProvider config={{ basePrefix, widgets: [myWidget] }}>
```

Do not require users to learn projectors unless they add custom event types.

## Alternatives considered

### Alternative A: keep global widget registry

Rejected. It is simple for one app, but it breaks provider isolation and makes behavior depend on imports.

### Alternative B: put all app projectors into provider core

Rejected. It would make `chat-provider` depend conceptually on Pinocchio-specific event types and would repeat the same problem for CoinVault or other apps.

### Alternative C: only use hook/component registration for everything

Rejected for projectors. Hooks run after render. WebSocket events can arrive as soon as the provider connects. Static projectors must be installed before connection.

### Alternative D: only use provider config, no hook registration

Rejected for tools/widgets that depend on local React state. Ecommerce `DemoTools` is a good example: it maintains cart state and uses hooks naturally.

## Recommended final API examples

### Simple widget-only app

```tsx
const weatherWidget = defineWidget('weather.forecast', WeatherWidget);

<ChatProvider config={{ basePrefix: '', widgets: [weatherWidget] }}>
  <ChatUI />
</ChatProvider>
```

### Stateful browser tools

```tsx
function BrowserTools() {
  const [count, setCount] = useState(0);

  useFrontendTool(defineTool({
    name: 'counter.increment',
    mode: 'frontend',
    execute: async () => {
      setCount((x) => x + 1);
      return { count: count + 1 };
    },
  }), [count]);

  return <div>{count}</div>;
}
```

### App-specific projectors

```ts
const agentModeProjector = defineTimelineProjector({
  name: 'pinocchio.agent-mode',
  priority: 10,
  project(frame) {
    if (frame.name !== 'ChatAgentModeCommitted') return null;
    return {
      upsert: {
        id: 'agent-mode',
        kind: 'agent_mode',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        props: frame.payload,
      },
    };
  },
});
```

### Full web-chat provider config

```tsx
const config = useMemo(() => ({
  basePrefix,
  sessionIdParam: 'sessionId',
  sessionStorageKey: 'pinocchio.web-chat.sessionId',
  onDebugEvent: recordProviderDebugEvent,
  createSessionBody: () => ({ profile: selectedProfile }),
  sendMessageBody: ({ prompt }) => ({ prompt, profile: selectedProfile }),
  extensions: [pinocchioWebChatExtensions],
}), [basePrefix, selectedProfile]);

return (
  <ChatProvider config={config}>
    <ProviderBackedChatWidgetInner />
  </ChatProvider>
);
```

## File reference map

### Provider core

- `packages/chat-provider/src/react/ChatProvider.tsx`
  - Provider runtime construction.
- `packages/chat-provider/src/core/createChatClient.ts`
  - Session creation, WebSocket connect, send, tool manifest sync.
- `packages/chat-provider/src/tools/toolRegistry.ts`
  - Tool descriptor and registry contracts.
- `packages/chat-provider/src/tools/useFrontendTool.ts`
  - Existing hook-based registration model.
- `packages/chat-provider/src/widgets/widgetRegistry.ts`
  - Current global widget registry to replace.
- `packages/chat-provider/src/widgets/WidgetOutlet.tsx`
  - Current global widget lookup to make provider-scoped.
- `packages/chat-provider/src/ws/timelineEvents.ts`
  - Current hard-coded projector to extract into registry model.

### Ecommerce consumer

- `web/src/App.tsx`
  - Good tool hook example and current widget side-effect import.
- `web/src/ecommerce/CartReview.tsx`
  - Current import-side-effect widget descriptor.

### Pinocchio consumer

- `pinocchio/cmd/web-chat/web/src/chat/provider/ProviderBackedChatWidget.tsx`
  - Main provider config assembly.
- `pinocchio/cmd/web-chat/web/src/chat/provider/ProviderBackedChatWidgetInner.tsx`
  - Provider-backed UI shell and timeline rendering.
- `pinocchio/cmd/web-chat/web/src/webchat/ProviderDemoPage.tsx`
  - Current toolkit example with tools and widgets.
- `pinocchio/cmd/web-chat/web/src/ws/timelineEvents.ts`
  - Legacy Pinocchio projector with app-specific event support.

## Definition of done

This refactor is done when:

- `defineWidget` is pure.
- Widgets are provider-scoped.
- Projectors are provider-configurable.
- Tools, widgets, and projectors share one extension descriptor model.
- Ecommerce has no import-side-effect widget registration.
- Pinocchio web-chat passes all current smokes.
- Multi-provider smoke proves widget/projector isolation.
- Documentation examples show the new recommended patterns.
