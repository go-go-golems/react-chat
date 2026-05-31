---
Title: Generic Chat Provider Framework Analysis
Ticket: CHATOVERLAY-006
Status: active
Topics:
    - chat-overlay
    - pinocchio
    - frontend
    - web-chat
DocType: design-doc
Intent: long-term
Owners: []
RelatedFiles:
    - Path: ../../../../../../../../pinocchio/cmd/web-chat/web/src/store/store.ts
      Note: Pinocchio web-chat Redux store shape and profile API middleware
    - Path: ../../../../../../../../pinocchio/cmd/web-chat/web/src/webchat/ChatWidget.tsx
      Note: Pinocchio web-chat interaction component to migrate or rebuild on the generic provider
    - Path: ../../../../../../../../pinocchio/cmd/web-chat/web/src/webchat/types.ts
      Note: Existing theming/components/renderers extension API
    - Path: ../../../../../../../../pinocchio/cmd/web-chat/web/src/ws/wsManager.ts
      Note: Pinocchio web-chat WebSocket manager with debug and app status integration
    - Path: ../../../../../../../pinocchio/cmd/web-chat/web/src/webchat/ChatWidget.tsx
      Note: Pinocchio web-chat interaction component and migration target
    - Path: ../../../../../../../pinocchio/cmd/web-chat/web/src/webchat/types.ts
      Note: Existing web-chat component/theme/renderer extension API
    - Path: ../../../../../../../pinocchio/cmd/web-chat/web/src/ws/wsManager.ts
      Note: Pinocchio transport variant with debug/status integration
    - Path: ../../../../../../../web/src/core/createChatOverlay.ts
      Note: Current provider runtime API and session/tool orchestration
    - Path: ../../../../../../../web/src/overlay/ChatOverlayProvider.tsx
      Note: Current React provider wrapper around singleton overlay runtime/store
    - Path: ../../../../../../../web/src/tools/toolRegistry.ts
      Note: Current frontend tool registry API
    - Path: ../../../../../../../web/src/widgets/widgetRegistry.ts
      Note: Current widget registration API
    - Path: ../../../../../../../web/src/ws/wsManager.ts
      Note: Current chat-overlay WebSocket manager and hydration flow
    - Path: web/src/core/createChatOverlay.ts
      Note: Current chat-overlay runtime API and session/tool orchestration
    - Path: web/src/overlay/ChatOverlayProvider.tsx
      Note: Current provider wrapper to generalize
    - Path: web/src/tools/toolRegistry.ts
      Note: Frontend tool registry API to preserve in provider package
    - Path: web/src/widgets/widgetRegistry.ts
      Note: Widget registry API to preserve in provider package
    - Path: web/src/ws/wsManager.ts
      Note: Current chat-overlay sessionstream transport and hydration loop
ExternalSources: []
Summary: Analysis of turning ChatOverlayProvider into a generic ChatProvider and using the package as the basis for Pinocchio web-chat frontend interaction.
LastUpdated: 2026-05-30T21:45:00-04:00
WhatFor: Use when planning the next frontend package extraction and web-chat migration.
WhenToUse: Before implementing a reusable npm chat provider package shared by chat-overlay, Pinocchio web-chat, and future chat apps.
---


# Generic Chat Provider Framework Analysis

## Executive summary

Yes: `ChatOverlayProvider` can become a general `ChatProvider`, and the chat-overlay frontend package can become the basis for Pinocchio `cmd/web-chat/web` interaction. The reason this is feasible is that both frontends already speak the same backend shape: session creation through `/api/chat/sessions`, message submission through `/api/chat/sessions/{id}/messages`, live updates through `/api/chat/ws`, snapshot hydration, durable timeline entities, and sessionstream UI events. The recent backend work moved the shared Go mechanics into Pinocchio packages (`serverkit`, `frontendtools`, and `widgets`), so the frontend can now follow the same direction.

The current code is not ready to be consumed directly as a general package. `ChatOverlayProvider` is tied to a singleton Redux store, a fixed local-storage key, overlay-specific state, overlay-specific CSS, a fixed WebSocket manager, and ecommerce/demo-oriented UI exports. Pinocchio web-chat also has features that chat-overlay does not yet model: profile selection, export controls, debug stream recording, app error reporting, renderer parts, and configurable component slots. The correct move is not to rename `ChatOverlayProvider` in place. The correct move is to extract a headless chat runtime and provider, then keep `ChatOverlayProvider` as an overlay preset built on top of that provider.

The target package should have three layers:

1. A **headless interaction core** that owns session creation, WebSocket subscription, snapshot hydration, UI-event projection, message submission, stop/reset, frontend tool manifests, frontend tool results, and widget/tool registries.
2. A **React provider layer** that creates an instance-scoped store/runtime and exposes hooks such as `useChat()`, `useChatActions()`, `useTimelineEntities()`, `useFrontendTool()`, `useHumanTool()`, and `useWidgetRegistry()`.
3. One or more **UI presets**: an overlay preset for chat-overlay, and a web-chat preset for Pinocchio. Pinocchio can initially keep its current `ChatWidget` shell and replace only transport/runtime internals; later it can consume more of the shared UI primitives.

The practical recommendation is to create a reusable npm package such as `@go-go-golems/chat-provider` or to split `@go-go-golems/chat-overlay` into `@go-go-golems/chat-provider` plus `@go-go-golems/chat-overlay`. The provider package should not contain ecommerce widgets, application profile policy, or a hard-coded visual theme. It should contain sessionstream-native transport, typed timeline projection, registries, hooks, and extension points.

## The foundation: what both frontends already share

Both chat-overlay and Pinocchio web-chat are sessionstream clients. This fact matters more than the visual differences between the two applications. A sessionstream client performs the same sequence of operations in each app:

```text
Create or reuse a session
  -> connect WebSocket to /api/chat/ws
  -> subscribe to the session
  -> receive snapshot
  -> buffer live UI events until hydration completes
  -> project snapshot/entities into local state
  -> submit messages to /api/chat/sessions/{id}/messages
  -> apply UI events into the local timeline
```

The chat-overlay frontend already implements this sequence in `web/src/core/createChatOverlay.ts`. The runtime type begins with `ChatOverlayConfig` at line 9 and the public `ChatOverlay` API at line 27. Session persistence uses the fixed local-storage key at line 39. `createChatOverlay` starts at line 65, creates sessions in `ensureSession` at line 69, connects the WebSocket in `ensureConnection` at line 92, synchronizes the frontend tool manifest in `syncToolManifest` at line 103, and submits frontend tool results in `submitToolResult` at line 122. The `send` method then composes these operations: ensure session, connect, sync manifest, and POST the message at lines 154-156.

Pinocchio web-chat implements the same basic path inside `ChatWidget.tsx`. It reads or writes the session id from the URL with `setSessionIdInLocation` at line 40, resolves profile data through RTK Query at lines 88-90, connects the WebSocket when an existing session is present at line 141, creates sessions through `fetch('/api/chat/sessions')` at line 177, connects before sending at line 202, and posts messages at line 215. The same responsibilities exist, but they are embedded in the visual widget component.

The WebSocket managers also overlap. Chat-overlay's `WsManager` starts at `web/src/ws/wsManager.ts:20`, creates a `WebSocket` at line 43, applies snapshots at line 119, buffers UI events until hydration at line 134, and applies UI events at line 138. Pinocchio's manager starts at `pinocchio/cmd/web-chat/web/src/ws/wsManager.ts:42`, creates a `WebSocket` at line 68, applies snapshots at line 158, buffers UI events until hydration at line 173, and applies UI events at line 177. Pinocchio adds debug recording and app status integration, but the transport loop is the same.

This shared sequence is the stable center of the future package. The package should not be organized around the overlay visual form. It should be organized around the sessionstream chat interaction contract.

## What `ChatOverlayProvider` does today

`ChatOverlayProvider` is small, but it is not generic. It imports the singleton Redux store and `createChatOverlay`, creates one overlay object with `useMemo`, installs the Redux provider, installs the React context, and wraps children in a `chat-overlay-root` div. The evidence is direct: `ChatOverlayProvider.tsx` imports `store` at line 3, imports `createChatOverlay` at line 4, defines the `config` prop as `Parameters<typeof createChatOverlay>[0]` at line 10, creates the overlay at line 14, renders `<Provider store={store}>` at line 17, and wraps children in `.chat-overlay-root` at line 19.

That implementation has useful shape. A provider should create a runtime instance, provide it to React, and install state. The problem is that the current provider fixes the runtime and state choices too early. It assumes:

- There is one global `store` for the page.
- There is one global `defaultToolRegistry`.
- There is one global `wsManager`.
- The persistent session key is always `chat-overlay.sessionId`.
- The root class is always `chat-overlay-root`.
- The provider is visually tied to an overlay preset.

Those assumptions are acceptable for a demo app and for a single embedded overlay. They are not acceptable for a shared package that might host multiple chat instances, a full-page web-chat, a debug UI, a CoinVault-style domain app, or tests that mount several providers in one process.

A generic `ChatProvider` should be instance-scoped. Each provider instance should create its own store, transport manager, registries, cancellation set, session persistence adapter, and runtime object. The provider can still expose a default singleton for simple demos, but the default should be built on the same instance factory used by production callers.

## What Pinocchio web-chat has that chat-overlay does not

Pinocchio web-chat is already more than an overlay. It is a full chat application with server profile management, export controls, debug stream recording, status lanes, custom renderer registry, component slots, and theme parts. Those features are not obstacles, but they define the package boundary.

The most important evidence is in `pinocchio/cmd/web-chat/web/src/webchat/ChatWidget.tsx`:

- Profile data comes from `useGetProfileQuery`, `useGetProfilesQuery`, and `useSetProfileMutation` at lines 88-90.
- Profile options and selection are resolved between lines 92-116.
- The component creates sessions with a selected profile at lines 177-180.
- Message submission also includes the selected profile at lines 215-220.
- Profile switching calls the backend at lines 251-257.
- Renderer extension is already supported through `resolveTimelineRenderers(renderers)` at line 298.
- Component override points are selected at lines 304-306.
- Theme, style, part props, and root props are applied at lines 308-318.
- The timeline renders through `ChatTimeline` at lines 357-364.
- The composer renders through `ComposerComponent` at line 378.

These are valuable pieces. A generic provider should not erase them. Instead, it should let Pinocchio express them as configuration and extensions:

```ts
type ChatProviderConfig = {
  endpoint?: ChatEndpointConfig;
  session?: SessionConfig;
  transport?: TransportConfig;
  projections?: ProjectionConfig;
  tools?: ToolConfig;
  widgets?: WidgetConfig;
  app?: Record<string, unknown>;
};
```

Pinocchio would then supply profile behavior as an app extension. The shared package would know how to create sessions and submit messages, but Pinocchio would tell it which extra fields to include:

```ts
<ChatProvider
  config={{
    endpoint: { basePrefix: basePrefixFromLocation() },
    session: {
      idSource: urlSearchParam('sessionId'),
      persist: urlSearchParamPersistence('sessionId'),
      createBody: ({ app }) => ({ profile: app.profile }),
    },
    message: {
      submitBody: ({ prompt, app }) => ({ prompt, profile: app.profile }),
    },
  }}
>
  <PinocchioWebChatShell />
</ChatProvider>
```

The important design point is that the provider owns the protocol sequence, while Pinocchio owns profile policy. This avoids copying WebSocket and timeline code while preserving web-chat's application semantics.

## Proposed package structure

The package should be extracted as a library, not as a bundled application. The current `web/package.json` is private and named `web`, so the first packaging step is to create a package boundary. There are two reasonable layouts.

### Recommended monorepo-local package layout

```text
2026-05-29--chatbot-overlay-glm/
  packages/
    chat-provider/
      package.json
      src/
        core/
        react/
        sessionstream/
        store/
        tools/
        widgets/
        timeline/
        ui/
    chat-overlay-preset/
      package.json
      src/
        ChatOverlayProvider.tsx
        ChatBubble.tsx
        ChatPanel.tsx
        retroMacTheme.css
  web/
    src/App.tsx
```

This layout makes the dependency direction explicit:

```text
chat-overlay app
  -> @go-go-golems/chat-overlay-preset
      -> @go-go-golems/chat-provider

pinocchio cmd/web-chat/web
  -> @go-go-golems/chat-provider
  -> optional @go-go-golems/chat-webchat-preset or local Pinocchio shell
```

### Minimal in-place package layout

```text
web/src/core       -> generic provider internals
web/src/overlay    -> overlay preset
web/src/tools      -> generic tools
web/src/widgets    -> generic widget registry/outlet
web/src/ws         -> generic sessionstream transport
```

This is faster, but it keeps the package name and visual app coupled for longer. It is acceptable for one implementation slice, but it should not be the final boundary.

## The target `ChatProvider` API

The provider should expose a runtime that is not overlay-specific. The current `ChatOverlay` type contains useful methods: `send`, `stop`, `open`, `close`, `toggle`, `reset`, `getStore`, `tools`, and `use`. A full-page chat does not need `open`, `close`, and `toggle`; those are overlay shell state. The generic provider should split interaction from presentation.

A better core type is:

```ts
export type ChatClient = {
  ensureSession(): Promise<string>;
  connect(sessionId?: string): Promise<void>;
  send(prompt: string, options?: SendOptions): Promise<void>;
  stop(): Promise<void>;
  reset(options?: ResetOptions): void;
  getState(): ChatState;
  subscribe(listener: () => void): () => void;
  tools: ChatToolRegistry;
  widgets: ChatWidgetRegistry;
};
```

The React layer then exposes hooks:

```ts
export function ChatProvider(props: ChatProviderProps): JSX.Element;
export function useChatClient(): ChatClient;
export function useChatActions(): { send(prompt: string): Promise<void>; stop(): Promise<void>; reset(): void };
export function useChatStatus(): ChatStatus;
export function useTimelineEntities(): TimelineEntity[];
export function useChatErrorList(): AppError[];
export function useFrontendTool(tool: FrontendTool): void;
export function useHumanTool(tool: HumanTool): void;
export function useWidget(definition: WidgetDefinition): void;
```

Overlay behavior becomes a preset hook and component:

```ts
export function ChatOverlayProvider(props: ChatOverlayProviderProps) {
  return (
    <ChatProvider config={props.config} store={props.store} registries={props.registries}>
      <OverlayStateProvider defaultOpen={props.defaultOpen}>
        <div className="chat-overlay-root">{props.children}</div>
      </OverlayStateProvider>
    </ChatProvider>
  );
}
```

This preserves backwards compatibility for existing chat-overlay callers while giving web-chat a headless provider it can consume without importing overlay state.

## Required extraction work

### 1. Make state instance-scoped

The current chat-overlay store is a singleton in `web/src/store/store.ts`. It defines only `timeline` and `overlay` reducers at lines 6-10. Pinocchio's store is also a singleton, but with a different shape: `app`, `timeline`, `errors`, and `profileApi` at `pinocchio/cmd/web-chat/web/src/store/store.ts:9-14`. A shared provider cannot pick one of these shapes as the only possible store.

The package should export a store factory:

```ts
export function createChatStore(options?: CreateChatStoreOptions): ChatStoreBundle {
  const reducers = {
    chat: chatSlice.reducer,
    timeline: timelineSlice.reducer,
    errors: errorsSlice.reducer,
    ...options?.extraReducers,
  };
  return { store: configureStore({ reducer: reducers, middleware: options?.middleware }) };
}
```

Pinocchio can supply `profileApi.reducer` and middleware through `extraReducers` and `middleware`. Chat-overlay can supply overlay UI state as an extra reducer or keep overlay state in a separate local provider.

The key change is that `ChatProvider` receives or creates a store per provider instance:

```ts
type ChatProviderProps = {
  children: React.ReactNode;
  config?: ChatProviderConfig;
  store?: ChatStore;
  createStore?: () => ChatStore;
};
```

This also fixes the current multi-instance limitation: two chat providers on one page should not share a session id, WebSocket, tool registry, or timeline unless explicitly configured to do so.

### 2. Make transport generic and injectable

Both frontends use `buildWebSocketURL`, `encodeSubscribeFrame`, `parseServerFrame`, `applySnapshot`, and `applyUIEvent`. The generic package should expose these as a sessionstream transport module:

```ts
export type ChatTransport = {
  connect(args: ConnectArgs): Promise<void>;
  disconnect(): void;
  isConnected(): boolean;
};

export function createSessionstreamTransport(options: SessionstreamTransportOptions): ChatTransport;
```

The transport should accept hooks rather than importing a fixed app slice:

```ts
type SessionstreamTransportOptions = {
  urlForSession(args: { basePrefix: string }): string;
  onStatus(status: ChatConnectionStatus): void;
  onSnapshot(frame: CanonicalFrame): void;
  onUIEvent(frame: CanonicalFrame): void;
  onError(error: ChatError): void;
  debug?: StreamDebugSink;
};
```

Pinocchio's debug recording (`recordRawWS`, `recordParsedFrame`, `recordLifecycle`) can become a `debug` sink instead of being hard-coded into the base transport. Chat-overlay can omit the debug sink. CoinVault can provide its own diagnostics later.

### 3. Normalize endpoint and request adapters

The provider should not hard-code request bodies. Chat-overlay creates sessions with `{}` and sends `{ prompt }`. Pinocchio creates sessions with `{ profile }` and sends `{ prompt, profile }`. CoinVault has a different app profile/model surface. The transport endpoint is shared, but the body shape is app-configurable.

The package should define adapters:

```ts
type ChatRequestAdapters<TAppState = unknown> = {
  createSessionBody?: (ctx: { app: TAppState }) => unknown;
  submitMessageBody?: (ctx: { prompt: string; app: TAppState }) => unknown;
  parseCreateSessionResponse?: (body: unknown) => string;
  parseSubmitMessageResponse?: (body: unknown) => Partial<ChatStatus>;
};
```

The default adapters match chat-overlay:

```ts
createSessionBody: () => ({}),
submitMessageBody: ({ prompt }) => ({ prompt }),
parseCreateSessionResponse: (body) => String((body as any).sessionId ?? ''),
```

Pinocchio overrides the first two functions to include `profile`.

### 4. Move timeline projection into package modules

The package should own generic event normalization and timeline projection, but it must remain extensible. Chat-overlay and Pinocchio already have timeline projections that overlap but are not identical. Pinocchio knows additional provider-call and agent-mode event names; chat-overlay knows frontend tool UI and widget outlets. Recent backend work moved frontend tools and widgets into Pinocchio packages, so those event names are now generic enough to support in the shared frontend package.

A good structure is:

```ts
type TimelineProjector = (frame: CanonicalFrame, ctx: ProjectionContext) => TimelineMutation | null;

const defaultProjectors = [
  chatMessageProjector,
  reasoningProjector,
  backendToolProjector,
  frontendToolProjector,
  widgetInstanceProjector,
];
```

Pinocchio can add:

```ts
projectors: [agentModeProjector, providerCallDebugProjector]
```

The provider then applies projectors in order. This avoids putting every application-specific event into the base package while still sharing the common chat, tool, and widget logic.

### 5. Generalize frontend tools and widgets without moving application widgets

The current chat-overlay package already has the right frontend concepts:

- `defineTool` and `defineToolUI` are exported from `web/src/tools/toolRegistry.ts:110-114`.
- `ToolRegistry` is defined at `toolRegistry.ts:62`.
- `defineWidget` is exported from `web/src/widgets/widgetRegistry.ts:17`.
- `WidgetOutlet` renders widget instances through the registry at `web/src/widgets/WidgetOutlet.tsx:4`.
- `ToolCallOutlet` renders tool calls at `web/src/tools/ToolCallOutlet.tsx:13`.

These should move into the generic package, but ecommerce widgets should not. The generic package should know how to register a widget renderer by name and how to render an unknown widget. It should not know what `ProductCarousel` means.

The package API should look like this:

```ts
export const productCarousel = defineWidget<ProductCarouselProps>({
  name: 'ProductCarousel',
  render: ProductCarousel,
});

export const cartTools = defineToolkit((chat) => {
  chat.widgets.register(productCarousel);
  chat.tools.register(cartAddTool);
  chat.tools.register(checkoutApprovalTool);
});
```

Pinocchio can use the same mechanism for generic widget renderers or application-specific cards. Its existing renderer registry in `webchat/rendererRegistry.ts` already maps entity kinds to React components; the shared package can either provide the entity-kind renderer map directly or expose a `WidgetInstanceRenderer` that delegates by `widgetName`.

### 6. Keep web-chat UI composition, but put interaction behind the provider

Pinocchio's `ChatWidget` already has an advanced UI API: `unstyled`, `theme`, `themeVars`, `rootProps`, `partProps`, `components`, and `renderers` appear in `ChatWidget.tsx:66-73`, and corresponding type definitions appear in `webchat/types.ts:79-86`. That API should be preserved. The migration should not force Pinocchio to adopt chat-overlay's bubble UI.

The recommended first migration is internal:

```tsx
export function ChatWidget(props: ChatWidgetProps) {
  return (
    <ChatProvider config={pinocchioProviderConfig(props)}>
      <PinocchioChatWidgetView {...props} />
    </ChatProvider>
  );
}
```

`PinocchioChatWidgetView` keeps the existing header, statusbar, timeline, composer, export menu, profile menu, stream debug panel, and styling. It replaces direct imports of `wsManager`, `timelineSlice`, and low-level fetch calls with provider hooks. This is the least disruptive path because the DOM and Storybook stories can remain stable while the interaction framework changes underneath.

A later migration can move shared UI components into the package. That later step should be optional. The high-value extraction is interaction and state; the visual shell can remain app-owned.

## Proposed target architecture

```text
@go-go-golems/chat-provider
  core/
    createChatClient
    createSessionstreamTransport
    endpoint adapters
    session persistence adapters
  store/
    createChatStore
    chatSlice
    timelineSlice
    errorsSlice
  timeline/
    frame normalization
    snapshot decode
    default projectors
    projector registry
  tools/
    defineTool
    defineToolUI
    frontend tool runtime
    human tool runtime
  widgets/
    defineWidget
    WidgetOutlet
    UnknownWidget
  react/
    ChatProvider
    hooks

@go-go-golems/chat-overlay
  ChatOverlayProvider
  ChatBubble
  ChatPanel
  ChatComposer
  ChatMessages
  retro Mac theme
  ecommerce toolkit/preset

pinocchio/cmd/web-chat/web
  PinocchioChatWidgetView
  profile extension
  export/debug extension
  app-specific renderers
  imports @go-go-golems/chat-provider
```

The dependency rule should be strict: the provider package must not import Pinocchio web-chat, CoinVault, or ecommerce widgets. Applications import the provider and register their own policies and renderers.

## Migration plan

### Phase 1: Rename concepts in the public API without moving files

Start with compatibility exports inside chat-overlay:

```ts
export type ChatProviderConfig = ChatOverlayConfig;
export type ChatClient = ChatOverlay;
export const createChatClient = createChatOverlay;
export const ChatProvider = ChatOverlayProvider;
export const useChat = useChatOverlay;
```

This phase is intentionally shallow. It lets callers begin using neutral names while tests still cover the same implementation. It also reveals which API names are overlay-specific and should not survive.

Do not remove old names yet. Keep `ChatOverlayProvider` and `createChatOverlay` as compatibility aliases until Pinocchio web-chat migrates.

### Phase 2: Introduce instance factories

Replace singleton imports with factories:

```ts
const { store, client, registries } = createChatRuntime(config);
```

`ChatProvider` should create this runtime with `useMemo`, and the context should provide the runtime. The current singleton `store`, `defaultToolRegistry`, and `wsManager` can remain as deprecated defaults for one release. New code should use provider-scoped instances.

Acceptance criteria:

- Two `ChatProvider` instances on one page can hold different sessions.
- Two providers can register different frontend tools under the same tool name without collision.
- Tests can mount providers without leaking session ids or tool registry state.

### Phase 3: Extract the package boundary

Create `packages/chat-provider` or an equivalent package directory. Move generic modules first:

- `ws/protocol.ts`
- `ws/wsManager.ts`, after converting it to a factory
- `ws/timelineSnapshot.ts`
- generic parts of `ws/timelineEvents.ts`
- `store/timelineSlice.ts`
- generic chat/app status slice
- `tools/*`
- `widgets/widgetRegistry.ts`
- `widgets/WidgetOutlet.tsx`
- `widgets/UnknownWidget.tsx`
- `core/toolkit.ts`
- `core/useToolkit.ts`

Leave overlay UI in the overlay package/app:

- `ChatBubble`
- `ChatPanel`, unless it is renamed as an overlay preset
- `ChatComposer`, unless generalized as a default composer
- `ChatMessages`, unless generalized as a default timeline
- `retro-mac.css`
- ecommerce widgets

The package should have real npm metadata:

```json
{
  "name": "@go-go-golems/chat-provider",
  "version": "0.1.0",
  "type": "module",
  "sideEffects": ["**/*.css"],
  "exports": {
    ".": "./dist/index.js",
    "./react": "./dist/react/index.js",
    "./tools": "./dist/tools/index.js",
    "./widgets": "./dist/widgets/index.js",
    "./sessionstream": "./dist/sessionstream/index.js",
    "./styles/base.css": "./dist/styles/base.css"
  },
  "peerDependencies": {
    "react": ">=18",
    "react-dom": ">=18"
  },
  "dependencies": {
    "@reduxjs/toolkit": "^2",
    "react-redux": "^9",
    "zod": "^4"
  }
}
```

### Phase 4: Migrate chat-overlay to consume its own package boundary

After extraction, the chat-overlay demo app should import from the package rather than from relative `src/core`, `src/tools`, `src/widgets`, and `src/ws` internals. This proves that the package boundary is real.

The app-specific code should become small:

```tsx
<ChatOverlayProvider config={{ endpoint: { basePrefix: '' } }}>
  <DemoCart />
  <ChatBubble />
</ChatOverlayProvider>
```

The ecommerce toolkit should be registered through `useToolkit` or `overlay.use(...)`. It should not be loaded by the provider by default.

### Phase 5: Migrate Pinocchio web-chat interaction internals

Pinocchio should migrate in this order:

1. Replace `ws/protocol.ts` with the package protocol utilities.
2. Replace `ws/wsManager.ts` with `createSessionstreamTransport`, preserving debug sinks.
3. Replace `timelineSnapshot.ts` and common message/tool/widget projectors with package projectors.
4. Wrap `ChatWidget` in `ChatProvider` but keep current markup and components.
5. Move send/create-session logic out of `ChatWidget.tsx` into provider request adapters.
6. Keep profile, export, debug, and renderer extension as Pinocchio modules.

The first Pinocchio PR should avoid visual changes. It should prove that web-chat can use the shared transport and projection without changing the user-facing UI.

### Phase 6: Add package-level tests and cross-app smokes

The package needs tests at three levels:

1. Unit tests for frame normalization, snapshot projection, UI-event projection, request adapter behavior, and registry isolation.
2. React tests for provider instance isolation and hook behavior.
3. Playwright smoke tests for chat-overlay, Pinocchio web-chat, and CoinVault using the devctl scripts added in `CHATOVERLAY-005`.

The existing scripts in `CHATOVERLAY-005/scripts` are a good starting point. They should eventually move to a permanent `scripts/smoke` or `test/smoke` location after the provider package exists.

## What would be needed in the backend

No major backend architecture change is required before starting the frontend provider extraction. The necessary backend pieces are already in place or nearly in place:

- Shared HTTP contracts and helpers live in `pinocchio/pkg/chatapp/serverkit`.
- Shared frontend tool support lives in `pinocchio/pkg/chatapp/frontendtools`.
- Shared widget support lives in `pinocchio/pkg/chatapp/widgets`.
- Chat-overlay and Pinocchio web-chat both expose `/api/chat/sessions`, `/api/chat/sessions/{id}/messages`, `/api/chat/sessions/{id}`, and `/api/chat/ws`.

The missing backend convenience is a fully shared frontend API capability descriptor. The provider package would benefit from a discovery endpoint such as:

```http
GET /api/chat/capabilities
```

with a response like:

```json
{
  "protocol": "sessionstream-chat-v1",
  "features": {
    "profiles": true,
    "frontendTools": true,
    "widgets": true,
    "exports": true,
    "debugStream": true
  },
  "routes": {
    "sessions": "/api/chat/sessions",
    "websocket": "/api/chat/ws"
  }
}
```

This endpoint is not required for a first implementation. Static provider config is enough. It becomes useful when one package must adapt to multiple hosts without compile-time knowledge.

## Risks and design constraints

### Naming conflict: frontend provider vs model provider

Pinocchio already has events named `ChatProviderCallStarted`, `ChatProviderCallMetadataUpdated`, and `ChatProviderCallFinished`. A frontend `ChatProvider` component is normal React terminology, but documentation and code should distinguish between:

- `ChatProvider`: React provider for frontend chat state and actions.
- `provider call`: LLM provider invocation telemetry.

If this ambiguity becomes costly, use `ChatRuntimeProvider` or `SessionChatProvider` internally while exporting `ChatProvider` as the ergonomic React name.

### Store coupling

The greatest technical risk is trying to force Pinocchio's store and chat-overlay's store into one fixed Redux shape. The safer design is a store factory plus extension reducers. The provider owns base chat state, but apps can attach extra slices.

### Visual coupling

The second major risk is moving visual components too early. Chat-overlay's overlay is not the same product as Pinocchio web-chat. Shared interaction should come first; shared UI should remain optional.

### Registry lifetime

The current tool registry is global. A general provider must make tool and widget registries instance-scoped. This matters for embedded pages, Storybook, tests, and future multi-chat layouts.

### Request-body differences

Pinocchio requires profile-aware create/send bodies. CoinVault has app profile and model concepts. Hard-coding chat-overlay's `{ prompt }` shape would recreate the current duplication under a new name. Request adapters are required.

### Debug and observability

Pinocchio's WebSocket manager records raw frames, parsed frames, and lifecycle events. The base provider should support debug sinks, but debug recording should be optional so embedders do not pay the complexity cost by default.

## Recommendation

Proceed, but implement it as an extraction rather than a rename. The first milestone should be a provider package that can run chat-overlay unchanged through compatibility aliases. The second milestone should migrate Pinocchio web-chat's transport and projection internals while preserving its current UI. Only after those two milestones should the team consider moving shared timeline UI components.

The minimum useful deliverable is:

```text
@go-go-golems/chat-provider
  - ChatProvider
  - createChatClient/createChatRuntime
  - instance-scoped store factory
  - sessionstream WebSocket transport factory
  - snapshot/UI-event timeline projection
  - frontend tool registry/runtime
  - widget registry/outlet
  - request adapters for create/send/stop/tool manifest/tool result
```

The migration is valuable because it makes Pinocchio web-chat, chat-overlay, and CoinVault share one frontend interaction contract. It also aligns the frontend architecture with the backend direction already taken in `serverkit`, `frontendtools`, and `widgets`.

## Implementation checklist

### Package setup

- [ ] Create `packages/chat-provider` with TypeScript build, exports, peer dependencies, and Storybook/Vitest support.
- [ ] Decide final package name: `@go-go-golems/chat-provider` is clearer than overloading `@go-go-golems/chat-overlay`.
- [ ] Keep compatibility exports from `@go-go-golems/chat-overlay` for existing overlay users.

### Runtime and provider

- [ ] Rename generic types: `ChatOverlayConfig` -> `ChatProviderConfig`, `ChatOverlay` -> `ChatClient`.
- [ ] Split overlay shell state from chat runtime state.
- [ ] Add `createChatRuntime(config)` that returns `{ store, client, transport, tools, widgets }`.
- [ ] Make store, WebSocket manager, tool registry, and widget registry instance-scoped.
- [ ] Add session persistence adapters for local storage, URL query parameters, and caller-provided persistence.

### Transport and projection

- [ ] Extract `buildWebSocketURL`, `encodeSubscribeFrame`, `parseServerFrame`, and frame normalization.
- [ ] Extract WebSocket manager as `createSessionstreamTransport`.
- [ ] Convert debug recording into optional sinks.
- [ ] Extract snapshot projection and default UI-event projectors.
- [ ] Add projector extension API for app-specific entities such as agent mode.

### Tools and widgets

- [ ] Move `defineTool`, `defineToolUI`, `useFrontendTool`, `useHumanTool`, and `useToolUI` into the generic package.
- [ ] Move `defineWidget`, `WidgetOutlet`, and `UnknownWidget` into the generic package.
- [ ] Keep ecommerce widget definitions in the chat-overlay demo/preset package.
- [ ] Generate or hand-maintain TypeScript payload types for Pinocchio `frontendtools` and `widgets` proto packages.

### Pinocchio web-chat migration

- [ ] Wrap `ChatWidget` with `ChatProvider` while keeping current UI components.
- [ ] Move session creation, WebSocket connection, and message submission into provider adapters.
- [ ] Keep profile selection as a Pinocchio extension.
- [ ] Keep export/debug APIs as Pinocchio extensions.
- [ ] Replace local duplicated transport/projection code with provider package imports.
- [ ] Preserve existing Storybook stories and renderer APIs.

### Validation

- [ ] Package unit tests: transport, protocol normalization, snapshot projection, UI-event projection, registry isolation.
- [ ] React tests: provider instance isolation, hooks, compatibility aliases.
- [ ] App smokes: chat-overlay widget/tool flow, Pinocchio web-chat send/finish flow, CoinVault dashboard/query flow.
- [ ] Browser console policy: fail on new console errors; allow documented favicon or development warnings only.

## Open questions

1. Should the final package be `@go-go-golems/chat-provider`, or should `@go-go-golems/chat-overlay` become the generic package with overlay exported as a preset? I recommend `@go-go-golems/chat-provider` because it describes the headless contract and avoids visual coupling.
2. Should the provider depend on Redux Toolkit, or should it expose an external-store interface and provide Redux as the default implementation? I recommend Redux Toolkit for the first extraction because both current frontends already use it, but the public API should not expose Redux-specific types except through an advanced escape hatch.
3. Should Pinocchio web-chat use the package's default timeline UI, or only its transport/projection/hooks? I recommend only transport/projection/hooks first, then optional UI consolidation later.
4. Should frontend tool and widget TypeScript payloads be generated from Pinocchio protos? I recommend yes, but it can happen after the provider API stabilizes.
5. Should a `/api/chat/capabilities` endpoint be added before migration? I recommend no for the first milestone. Static config is sufficient; capabilities discovery can follow.

## References

- `web/src/core/createChatOverlay.ts`: current chat-overlay runtime API and request sequence.
- `web/src/overlay/ChatOverlayProvider.tsx`: current provider wrapper and singleton store usage.
- `web/src/ws/wsManager.ts`: current chat-overlay sessionstream transport.
- `web/src/tools/toolRegistry.ts`: frontend tool registry and definitions.
- `web/src/widgets/widgetRegistry.ts`: widget registry and definitions.
- `pinocchio/cmd/web-chat/web/src/webchat/ChatWidget.tsx`: current Pinocchio web-chat UI and interaction logic.
- `pinocchio/cmd/web-chat/web/src/ws/wsManager.ts`: current Pinocchio transport with debug/status integration.
- `pinocchio/cmd/web-chat/web/src/webchat/types.ts`: existing component/theme/renderer extension points.
- `pinocchio/pkg/chatapp/frontendtools`: backend frontend tool package that the provider should target.
- `pinocchio/pkg/chatapp/widgets`: backend widget package that the provider should target.
