---
Title: ""
Ticket: ""
Status: ""
Topics: []
DocType: ""
Intent: ""
Owners: []
RelatedFiles:
    - Path: ../../../../../../../pinocchio/cmd/web-chat/web/.storybook/main.ts
      Note: Story discovery configuration
    - Path: ../../../../../../../pinocchio/cmd/web-chat/web/.storybook/preview.tsx
      Note: Storybook global decorators and store split
    - Path: ../../../../../../../pinocchio/cmd/web-chat/web/src/App.tsx
      Note: App route-mode switch between debug
    - Path: ../../../../../../../pinocchio/cmd/web-chat/web/src/chat/provider/ProviderBackedChatWidget.tsx
      Note: Current canonical provider-backed production shell
    - Path: ../../../../../../../pinocchio/cmd/web-chat/web/src/chat/provider/ProviderBackedChatWidgetInner.tsx
      Note: Provider-backed web-chat chrome composition
    - Path: ../../../../../../../pinocchio/cmd/web-chat/web/src/chat/provider/projectors/pinocchioProjectors.ts
      Note: Promising provider-scoped projector boundary
    - Path: ../../../../../../../pinocchio/cmd/web-chat/web/src/debug-ui/DebugUIApp.tsx
      Note: Separate debug UI app boundary
    - Path: ../../../../../../../pinocchio/cmd/web-chat/web/src/webchat/ChatWidget.stories.tsx
      Note: Current single Storybook story file and legacy-story hotspot
    - Path: ../../../../../../../pinocchio/cmd/web-chat/web/src/webchat/ChatWidget.tsx
      Note: Legacy Redux/WebSocket chat implementation to quarantine or delete
    - Path: ../../../../../../../pinocchio/cmd/web-chat/web/src/webchat/cards.tsx
      Note: Large card-renderer monolith to split into component folders
    - Path: ../../../../../../../pinocchio/cmd/web-chat/web/src/webchat/index.ts
      Note: Public export boundary that aliases provider-backed ChatWidget and legacy ChatWidget
    - Path: ../../../../../../../pinocchio/cmd/web-chat/web/src/webchat/styles/webchat.css
      Note: Large scoped data-part CSS file to modularize
    - Path: ../../../../../../../pinocchio/cmd/web-chat/web/src/ws/timelineEvents.ts
      Note: Legacy timeline projection hotspot
    - Path: ../../../../../../../pinocchio/cmd/web-chat/web/src/ws/wsManager.ts
      Note: Legacy singleton WebSocket manager
ExternalSources: []
Summary: ""
LastUpdated: 0001-01-01T00:00:00Z
WhatFor: ""
WhenToUse: ""
---


# Web Chat React and Storybook Cleanup Assessment

## Executive summary

Pinocchio `cmd/web-chat/web` is now a capable React application, but it is no longer a small single-purpose UI. It contains at least four overlapping systems in one `src/` tree:

1. the production web-chat shell,
2. the new headless `ChatProvider`-backed shell,
3. the legacy Redux/WebSocket web-chat shell,
4. the debug UI and its own Redux/WebSocket stack.

That overlap is understandable: the project has been migrating from local Redux/WebSocket mechanics to a reusable `@go-go-golems/chat-provider` runtime while preserving the old UI surface and adding demos/smokes. The result is functional but messy. An intern entering this codebase sees `src/webchat/ChatWidget.tsx`, `src/webchat/ProviderBackedChatWidget.tsx`, `src/chat/provider/ProviderBackedChatWidget.tsx`, `src/webchat/ProviderDemoPage.tsx`, `src/webchat/ProviderMultiDemoPage.tsx`, `src/ws/timelineEvents.ts`, and `src/chat/provider/projectors/pinocchioProjectors.ts` without a clear hierarchy of what is canonical, what is compatibility, and what is test/demo scaffolding.

The highest-leverage cleanup is to make the web app opinionated:

- keep `ChatProvider` as the canonical runtime for production chat,
- move legacy Redux/WebSocket chat code behind an explicit `legacy/` or delete it after parity is accepted,
- convert component organization to one folder per component/feature,
- move demo-only capability code out of production widget internals,
- make Storybook a first-class component workbench, not one large scenario file,
- eliminate import-side-effect registries and global extension registries in favor of provider-scoped config and local component registration,
- keep generated protobuf code and debug UI boundaries visibly separate from authored UI code.

The recommended target shape is a modular frontend with feature folders like this:

```text
src/
  app/
    App.tsx
    routes.tsx
    providers.tsx
  features/
    web-chat/
      WebChatApp/
        WebChatApp.tsx
        WebChatApp.stories.tsx
        types.ts
        index.ts
      ChatHeader/
        ChatHeader.tsx
        ChatHeader.stories.tsx
        types.ts
        index.ts
      ChatTimeline/
        ChatTimeline.tsx
        ChatTimeline.stories.tsx
        types.ts
        index.ts
      ChatComposer/
        ChatComposer.tsx
        ChatComposer.stories.tsx
        types.ts
        index.ts
      extensions/
        index.ts
        projectors.ts
        capabilities.tsx
    debug-ui/
      DebugUiApp/
      lanes/
      store/
      ws/
  shared/
    api/
    styles/
    components/
    testing/
  generated/
    chatapp/
```

This is not just aesthetic. The current organization hides important runtime boundaries. For example, `src/App.tsx` uses query parameters to switch between debug mode, provider demo mode, provider multi-demo mode, and the main app. The main app is wrapped in the legacy Redux store, but the exported `ChatWidget` is actually provider-backed through `src/webchat/index.ts`. That mixed boundary is correct for the current migration, but it should be explicit and temporary.

## Scope and evidence base

This review covers the React/Vite/Storybook frontend under:

```text
/home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/web
```

Evidence was gathered from repository structure, build configuration, Storybook configuration, production app boot, provider-backed chat code, legacy chat code, Redux stores, WebSocket managers, timeline projection code, debug UI code, CSS, and current validation scripts.

Important facts from discovery:

- `package.json` defines `dev`, `typecheck`, `build`, `lint`, `storybook`, and `build-storybook` scripts.
- There are approximately 11,296 lines of TypeScript/TSX/CSS in `src/` if generated protobuf files are included.
- The largest authored hotspots are:
  - `src/webchat/styles/webchat.css` at about 514 lines,
  - `src/ws/timelineEvents.ts` at about 428 lines,
  - `src/webchat/ChatWidget.tsx` at about 390 lines,
  - `src/webchat/cards.tsx` at about 325 lines,
  - `src/ws/wsManager.test.ts` at about 304 lines,
  - `src/webchat/ProviderDemoPage.tsx` at about 296 lines,
  - `src/webchat/hooks/useStickyScrollFollow.ts` at about 236 lines,
  - `src/chat/provider/projectors/pinocchioProjectors.ts` at about 219 lines,
  - `src/chat/provider/ProviderBackedChatWidgetInner.tsx` at about 192 lines.
- There is currently one Storybook story file: `src/webchat/ChatWidget.stories.tsx`.
- Storybook matches every `../src/**/*.stories.@(ts|tsx)` file, but the current source tree does not yet use a one-folder-per-component story convention.
- The app currently has both `package-lock.json` and `pnpm-lock.yaml`, which is a signal that package manager ownership should be clarified.

## Mental model for a new intern

### What the app does

Pinocchio `cmd/web-chat` is a browser UI for a Go chat backend. The backend owns sessions, turns, sessionstream events, typed widget events, frontend tool requests, and export endpoints. The frontend renders a full-page chat application and subscribes to live sessionstream frames over WebSocket.

The current production UI is intended to be provider-backed:

```text
Browser
  │
  ├─ React app shell (`src/App.tsx`)
  │    ├─ ?debug=1                 → debug UI
  │    ├─ ?providerDemo=1          → provider API demo
  │    ├─ ?providerMultiDemo=1     → multi-provider isolation demo
  │    └─ default                  → main web-chat widget
  │
  ├─ Main web-chat widget
  │    ├─ legacy Redux store for profile/query chrome
  │    └─ ChatProvider runtime for chat session, WS, timeline, tools, widgets
  │
  └─ Go backend
       ├─ /api/chat/sessions
       ├─ /api/chat/sessions/{id}/messages
       ├─ /api/chat/sessions/{id}/tools/*
       ├─ /ws
       └─ export/debug endpoints
```

### Current runtime split

The root route switch is in `src/App.tsx`. It reads URL query parameters and chooses one of four render paths:

- `?debug=1` renders `DebugUIApp`.
- `?providerDemo=1` renders `ProviderDemoPage`.
- `?providerMultiDemo=1` renders `ProviderMultiDemoPage`.
- otherwise it renders `<Provider store={store}><ChatWidget /></Provider>`.

Evidence: `src/App.tsx` imports all four app variants at lines 1-6, checks query params around lines 8-30, and wraps only the default main app in the legacy Redux `Provider` around lines 32-36.

The exported `ChatWidget` is not the old `src/webchat/ChatWidget.tsx`. `src/webchat/index.ts` exports the old implementation as `LegacyChatWidget` at line 1 and exports `ProviderBackedChatWidget` as `ChatWidget` at line 7. This means the default app path is already provider-backed, while still requiring the legacy Redux store around it for profile API state and app chrome.

That split is subtle and should be made much more obvious in the folder structure.

### Transport and projection model

There are two projection pipelines today:

1. **Legacy pipeline** under `src/ws/`:
   - singleton `wsManager` in `src/ws/wsManager.ts`,
   - `applySnapshot(...)` in `src/ws/timelineSnapshot.ts`,
   - `applyUIEvent(...)` / `timelineMutationFromUIEvent(...)` in `src/ws/timelineEvents.ts`,
   - Redux timeline store in `src/store/timelineSlice.ts`.

2. **Provider-backed pipeline** under `@go-go-golems/chat-provider` plus Pinocchio projectors:
   - `ChatProvider` creates provider-local store/tool/widget/projector registries,
   - Pinocchio installs `pinocchioWebChatProjectors` through provider config,
   - `src/chat/provider/projectors/pinocchioProjectors.ts` maps Pinocchio-specific live events into provider timeline entities.

The provider-backed production widget still reuses web-chat visual components such as `DefaultHeader`, `DefaultComposer`, `ChatTimeline`, renderer registry helpers, CSS, and sticky scroll behavior. Evidence: `src/chat/provider/ProviderBackedChatWidgetInner.tsx` imports those webchat components at lines 9-18 and uses provider selectors at lines 1-6.

## Current-state architecture

### Build and package management

The web app is a Vite React app. `vite.config.ts` uses `@vitejs/plugin-react`, builds to `../static/dist`, and proxies `/api`, `/ws`, `/chat`, `/hydrate`, and `/app-config.js` to `VITE_BACKEND_ORIGIN` during development. The devctl plugin overrides the port and backend origin when launching the app.

The package scripts are reasonable:

```json
{
  "dev": "vite",
  "typecheck": "tsc -p tsconfig.json --noEmit",
  "build": "vite build --outDir ../static/dist",
  "lint": "npx --yes @biomejs/biome@2.3.8 ci .",
  "lint:fix": "npx --yes @biomejs/biome@2.3.8 check --write .",
  "check": "npm run typecheck && npm run lint",
  "storybook": "storybook dev -p 6006",
  "build-storybook": "storybook build"
}
```

Problems:

- The repo contains both `package-lock.json` and `pnpm-lock.yaml`. Since the project uses `npm run ...` in scripts and devctl uses `npx vite`, npm appears to be the primary tool here, but pnpm artifacts exist too. This should be decided and documented.
- The local dependency on `@go-go-golems/chat-provider` uses a file path to the chat-overlay workspace. That is appropriate while the packages are unreleased, but it must be marked as temporary.
- Devctl can choose ephemeral ports when defaults are occupied. This is useful for smokes, but manual testing docs must say to read `.devctl/state.json` or rerun `devctl down && devctl up --force` to restore default ports.

Recommended direction:

- Keep `npm` as the Pinocchio web-chat frontend package manager unless the whole Pinocchio repo moves to pnpm.
- Remove `pnpm-lock.yaml` from this app if npm remains canonical.
- Add `scripts/print-dev-url.mjs` or a devctl command that prints the actual Vite URL from `.devctl/state.json`.

### App entry and routing

`src/main.tsx` is clean: it finds `#root`, wraps `<App />` in `React.StrictMode`, and uses a top-level `ErrorBoundary`.

`src/App.tsx` is small but semantically overloaded. It performs routing by directly reading `window.location.search` three times. This works, but it makes app modes ad hoc and hard to document.

Current flow:

```tsx
if (?debug=1) return <DebugUIApp />
if (?providerDemo=1) return <ProviderDemoPage />
if (?providerMultiDemo=1) return <ProviderMultiDemoPage />
return <Provider store={store}><ChatWidget /></Provider>
```

Problems:

- Query-mode routing is embedded directly in the app component.
- The debug UI and main app use different Redux stores, but that boundary is hidden in route branches.
- Provider demo imports live under `src/webchat`, while their implementation is really provider/demo infrastructure.

Recommended direction:

```text
src/app/
  App.tsx              # small root shell
  routes.tsx           # parses mode and returns route definition
  providers.tsx        # MainReduxProvider, DebugReduxProvider
  devModes.ts          # debug/providerDemo/providerMultiDemo flags
```

Pseudocode:

```tsx
export function App() {
  const route = useWebChatRoute(window.location.search);
  return <RouteRenderer route={route} />;
}

function RouteRenderer({ route }: { route: WebChatRoute }) {
  switch (route.kind) {
    case 'debug':
      return <DebugUiRoot />;
    case 'provider-demo':
      return <ProviderDemoRoot />;
    case 'provider-multi-demo':
      return <ProviderMultiDemoRoot />;
    case 'chat':
      return <MainWebChatRoot />;
  }
}
```

This makes dev-only routes discoverable and testable.

### Production chat shell

The production shell is currently provider-backed but not fully provider-native.

Evidence:

- `src/webchat/index.ts` exports old `ChatWidget` as `LegacyChatWidget` and provider-backed widget as `ChatWidget`.
- `src/chat/provider/ProviderBackedChatWidget.tsx` creates `ChatProvider` config with `sessionIdParam`, `sessionStorageKey`, `onSessionIdChange`, `onDebugEvent`, Pinocchio projectors, and request body adapters.
- `src/chat/provider/ProviderBackedChatWidgetInner.tsx` consumes provider selectors and uses `client.connect()` in an effect.
- The provider-backed widget still imports profile APIs and app Redux from `src/store`, which means it needs the outer Redux provider.

This is a pragmatic bridge. The valuable part is that the chat session mechanics are now provider-owned. The problematic part is that a reader cannot see where the bridge ends.

Recommended direction:

- Rename the current provider-backed production root to `WebChatApp` or `PinocchioWebChatApp`.
- Move it into a feature folder:

```text
src/features/web-chat/WebChatApp/
  WebChatApp.tsx          # production composition
  WebChatProviderShell.tsx # ChatProvider config + profile bridge
  WebChatBody.tsx         # header/timeline/composer layout
  types.ts
  index.ts
```

- Make the bridge explicit in names:
  - `ProfileBridge` for legacy Redux profile API integration,
  - `ProviderRuntimeShell` for `ChatProvider` configuration,
  - `WebChatChrome` for header/timeline/composer layout.

Suggested decomposition:

```tsx
export function WebChatApp(props: WebChatAppProps) {
  return (
    <WebChatProfileBridge>
      {(profile) => (
        <WebChatProviderShell profile={profile}>
          <WebChatChrome {...props} />
        </WebChatProviderShell>
      )}
    </WebChatProfileBridge>
  );
}
```

### Legacy chat implementation

`src/webchat/ChatWidget.tsx` is the old Redux/WebSocket implementation. It is still valuable as a reference, but it is no longer the default export. It is large and mixes many responsibilities:

- session id query parsing and mutation,
- profile fetching and mutation,
- WebSocket connection lifecycle,
- session creation,
- message sending,
- scroll following,
- error toggles,
- renderer resolution,
- header/composer/timeline composition.

Evidence: `src/webchat/ChatWidget.tsx` defines URL session helpers around lines 28-51, subscribes legacy `wsManager` around lines 134-151, creates sessions and sends messages around lines 174-239, and renders the full page around lines 306-390.

This file should not be in the same conceptual namespace as the canonical provider-backed `ChatWidget`.

Recommended options:

1. **Preferred after parity sign-off: delete it.**
   - Keep tests for protocol/projection if still useful.
   - Keep a migration note in the ticket.

2. **If still needed for comparison: move to explicit legacy namespace.**

```text
src/legacy/webchat-redux/
  LegacyChatWidget/
    LegacyChatWidget.tsx
    types.ts
    index.ts
  ws/
  store/
  README.md
```

3. **If needed for only tests: extract test helpers and remove the runtime component.**

The important rule: no new code should import from `src/webchat/ChatWidget.tsx` unless it is explicitly testing legacy behavior.

### Timeline rendering and cards

The visual timeline pipeline is reusable and worth preserving. `src/webchat/components/Timeline.tsx` is a good component boundary: it receives render entities, error state, renderer map, and part props, then renders turns and bubbles through `data-part` attributes.

Valuable patterns:

- `data-pwchat` and `data-part` styling gives a stable theming surface.
- `ChatTimeline` receives renderers instead of hard-coding every entity card.
- `partProps` lets consumers customize specific DOM parts.

Problematic areas:

- `src/webchat/cards.tsx` is a 325-line monolith containing multiple card types and inline styles.
- `rendererRegistry.ts` still has a global extension map. That was acceptable before provider-scoped extensions, but it is now inconsistent with the new direction.
- `timelinePropsRegistry.ts` also keeps a global extension normalizer map, which is another import-order/global-state surface.
- `RenderEntity.props` is typed as `any` in `src/webchat/types.ts`, which makes card contracts unclear.

Recommended direction:

```text
src/features/web-chat/entities/
  MessageCard/
    MessageCard.tsx
    MessageCard.stories.tsx
    types.ts
    index.ts
  ToolCallCard/
  ToolResultCard/
  AgentModeCard/
  WidgetInstanceCard/
  GenericCard/
  renderers.ts
  normalizers.ts
```

Pseudocode for a non-global renderer API:

```ts
export type TimelineRendererMap = Partial<Record<TimelineEntityKind, TimelineRenderer>>;

export function createWebChatRenderers(options: {
  base?: TimelineRendererMap;
  overrides?: TimelineRendererMap;
}): RequiredTimelineRendererMap {
  return {
    ...defaultWebChatRenderers,
    ...options.base,
    ...options.overrides,
    default: options.overrides?.default ?? GenericCard,
  };
}
```

For Storybook, each entity card gets its own story with realistic static props. The full timeline story should compose those fixtures rather than generating all examples in one file.

### Provider demo and capabilities showcase

`src/webchat/ProviderDemoPage.tsx` is useful but too large and too mixed. It currently contains:

- widget definition for `demo.capability_card`,
- frontend tool definition for `browser.get_page_context`,
- human tool definition for `browser.confirm_action`,
- capability hook component,
- provider message card,
- provider timeline,
- provider composer,
- provider status bar,
- demo shell,
- demo page root.

Evidence: the file defines `CapabilityCard` around lines 51-88, `webChatProviderCapabilitiesExtension` around lines 92-154, `WebChatProviderCapabilities` around lines 160-166, timeline/composer/statusbar/demo shell around lines 183-281, and `ProviderDemoPage` around lines 283-296.

This code is promising because it is the best example of provider-scoped tools/widgets. But as a single file under `src/webchat`, it is hard to reuse and easy to accidentally ship as production chrome.

Recommended direction:

```text
src/features/web-chat/extensions/capabilities/
  CapabilityCard/
    CapabilityCard.tsx
    CapabilityCard.stories.tsx
    types.ts
    index.ts
  confirmActionTool.tsx
  getPageContextTool.ts
  capabilitiesExtension.ts
  useWebChatProviderCapabilities.ts
  index.ts

src/features/web-chat/demos/ProviderDemoPage/
  ProviderDemoPage.tsx
  ProviderDemoPage.stories.tsx
  ProviderDemoTimeline.tsx
  ProviderDemoComposer.tsx
  ProviderDemoStatusBar.tsx
  index.ts
```

Production code can import `useWebChatProviderCapabilities` if the capability showcase is intentionally part of the main app. Otherwise, demos should live under `demos/` and main app should not import them.

### Pinocchio projectors

`src/chat/provider/projectors/pinocchioProjectors.ts` is a valuable new boundary. It moves Pinocchio-specific event projection out of generic `chat-provider` and into Pinocchio web-chat. It defines projectors for reasoning, agent mode, and backend tools, then exports a `pinocchioWebChatProjectors` extension.

This is the right direction. Improvements:

- Move from `src/chat/provider/projectors/` to `src/features/web-chat/extensions/pinocchio-projectors/`.
- Add unit tests with representative raw frames.
- Define typed payload helpers for each event group instead of using generic `unknown`/record plumbing throughout.
- Document priority semantics locally.

Suggested folder:

```text
src/features/web-chat/extensions/pinocchio-projectors/
  pinocchioProjectors.ts
  reasoningProjector.ts
  agentModeProjector.ts
  backendToolProjector.ts
  fixtures.ts
  pinocchioProjectors.test.ts
  index.ts
```

Pseudocode:

```ts
export const pinocchioWebChatExtensions = defineChatExtensions({
  name: 'pinocchio.web-chat',
  projectors: [
    reasoningProjector,
    agentModeProjector,
    backendToolProjector,
  ],
});
```

### Debug UI

The debug UI under `src/debug-ui/` is a separate app. It has its own Redux store, CSS system, routes, and debug WebSocket manager. That separation is good and should be preserved.

Evidence:

- `DebugUIApp.tsx` wraps `AppRouter` in a debug-specific Redux `Provider`.
- Storybook preview switches to the debug store for stories whose title starts with `Debug UI/`.
- The debug UI has many CSS files under `src/debug-ui/styles/`, which is more modular than webchat's single large `webchat.css`.

Problems:

- The debug UI has no stories despite having many reusable lanes/components.
- `src/debug-ui/ws/debugWsManager.ts` imports `AppDispatch` from `../../store/store`, which is the main web-chat store, not the debug store. That is a suspicious type-boundary leak and should be checked.
- The top-level app mode switch makes debug UI look like a peer route, but it is really a diagnostic app.

Recommended direction:

```text
src/features/debug-ui/
  DebugUiApp/
  AppShell/
  TimelineLanes/
  EventTrackLane/
  ProjectionLane/
  NowMarker/
  store/
  ws/
  styles/
```

Add stories for lane components using fixture events/entities.

### CSS and theming

The web-chat CSS is strong in one important way: it uses `:where([data-pwchat] [data-part="..."])`, so styles are scoped and customizer-friendly. `theme-default.css` provides variables and `webchat.css` provides structural styles.

Valuable:

- `data-pwchat` root isolation.
- `data-theme="default"` theme selection.
- `data-part` component parts.
- CSS variables such as `--pwchat-bg`, `--pwchat-fg`, `--pwchat-accent`, etc.

Problems:

- `webchat.css` is a single 514-line file. It is easy to append to and hard to understand.
- Several React components still contain inline styles, especially `ProviderDemoPage.tsx`, `cards.tsx`, `StreamDebugPanel.tsx`, and `ExportMenu.tsx`.
- `ChatPart` in `types.ts` is incomplete relative to actual CSS parts. For example, CSS uses parts like `pill`, `pill-button`, `main`, `card`, `card-body`, `error-panel`, etc., but the public `ChatPart` union only lists root/header/timeline/composer/statusbar/turn/bubble/content/composer-input/composer-actions/send-button.

Recommended direction:

```text
src/features/web-chat/styles/
  tokens.css
  root.css
  layout.css
  header.css
  statusbar.css
  timeline.css
  cards.css
  composer.css
  debug-panel.css
  theme-default.css
  index.css
```

And update the part API:

```ts
export type WebChatPart =
  | 'root'
  | 'header'
  | 'header-title'
  | 'statusbar'
  | 'main'
  | 'timeline'
  | 'turn'
  | 'bubble'
  | 'content'
  | 'composer'
  | 'composer-input'
  | 'composer-actions'
  | 'send-button'
  | 'card'
  | 'card-header'
  | 'card-body'
  | 'pill'
  | 'pill-button'
  | 'toolbar'
  | 'error-panel';
```

### Storybook

Storybook is configured but underused. `.storybook/main.ts` points to `../src/**/*.stories.@(ts|tsx)`, and `.storybook/preview.tsx` imports global CSS, initializes MSW, and chooses either the debug store or chat store based on the story title prefix.

Current issue: the only story file is `src/webchat/ChatWidget.stories.tsx`. It contains default, theme override, unstyled, custom renderer, and multiple scenario stories in one file. It also imports the legacy `ChatWidget` from `./ChatWidget`, not the provider-backed public `ChatWidget` from `./index`.

This is important: stories are currently exercising the legacy widget, not necessarily the production provider-backed widget. That may be intentional for reducer scenario fixtures, but it should be explicit.

Recommended Storybook conventions:

```text
ComponentName/
  ComponentName.tsx
  ComponentName.stories.tsx
  types.ts
  index.ts
  fixtures.ts       # optional
  test.tsx          # optional
```

Story categories:

- `Web Chat/App/WebChatApp`
- `Web Chat/Layout/ChatHeader`
- `Web Chat/Layout/ChatComposer`
- `Web Chat/Timeline/ChatTimeline`
- `Web Chat/Cards/MessageCard`
- `Web Chat/Cards/ToolCallCard`
- `Web Chat/Cards/AgentModeCard`
- `Web Chat/Extensions/CapabilityCard`
- `Debug UI/AppShell`
- `Debug UI/Lanes/EventTrackLane`

Story fixtures should be plain data. Avoid dispatching into the production store in most stories. Prefer component props.

Pseudocode:

```tsx
// MessageCard.stories.tsx
export const AssistantMessage = {
  args: {
    entity: fixtures.assistantMessage,
  },
};

// ChatTimeline.stories.tsx
export const MixedTimeline = {
  args: {
    entities: [
      fixtures.userMessage,
      fixtures.assistantMessage,
      fixtures.toolCall,
      fixtures.widgetInstance,
    ],
  },
};
```

### State management

The legacy Redux store in `src/store/store.ts` combines `app`, `timeline`, `errors`, and `profileApi`. The provider-backed widget still depends on this store for profiles and app profile selection. The provider runtime itself owns another store internally through `@go-go-golems/chat-provider`.

Valuable:

- RTK Query for profiles is appropriate.
- `timelineSlice` has useful patch merge semantics for streaming content and tool arguments.
- `errorsSlice` gives user-visible error panels.

Problems:

- `TimelineEntity.props` is `any`.
- `selectTimelineEntities` returns a new array every time because it maps `order` to `byId`. That can be fine for small timelines but should be watched under high-frequency streaming.
- Provider-backed production no longer needs legacy timeline state, but legacy timeline files are still in the same top-level namespace.

Recommended direction:

- Keep profile API/store as an app-shell concern.
- Move legacy timeline Redux under `legacy/` or delete after parity.
- For provider-backed timeline rendering, rely on provider selectors and app-owned projector extensions.
- Add typed entity definitions for rendered entities:

```ts
type MessageEntity = RenderEntity<'message', MessageProps>;
type ToolCallEntity = RenderEntity<'tool_call', ToolCallProps>;
type WidgetEntity = RenderEntity<'widget', WidgetProps>;
type AgentModeEntity = RenderEntity<'agent_mode', AgentModeProps>;
```

### Global registries and side effects

The codebase now has a good provider-scoped extension model in `@go-go-golems/chat-provider`, but `src/webchat/rendererRegistry.ts` and `src/webchat/timelinePropsRegistry.ts` still expose global registration APIs.

These are problematic for an example project because they teach import-order global state. They also make multi-instance behavior harder to reason about.

Recommended direction:

- Replace global renderer registration with explicit renderer maps passed to the web-chat app.
- Replace global props normalizers with projector-level normalization or provider extension descriptors.
- If a global registry must remain, move it to `legacy/` and mark it as deprecated.

## Proposed target architecture

### Folder convention

Use one folder per component or feature. A component folder should normally contain:

```text
WidgetName/
  WidgetName.tsx
  WidgetName.stories.tsx
  types.ts
  index.ts
```

Optional files:

```text
  fixtures.ts
  WidgetName.test.tsx
  WidgetName.css
  parts.ts
```

Rules:

- `WidgetName.tsx` exports the implementation.
- `types.ts` exports props and local data contracts.
- `index.ts` exports the public component surface.
- `WidgetName.stories.tsx` demonstrates default, edge, and themed states.
- Feature-level `index.ts` files should be explicit exports, not `export *` barrels from everything.
- Demo-only code lives under `demos/`.
- Legacy code lives under `legacy/` or is removed.
- Generated code lives under `generated/` and is never hand-edited.

### Proposed tree

```text
src/
  app/
    App.tsx
    routeMode.ts
    MainWebChatRoot.tsx
    DebugUiRoot.tsx
    ProviderDemoRoot.tsx
    ProviderMultiDemoRoot.tsx

  features/
    web-chat/
      WebChatApp/
        WebChatApp.tsx
        WebChatApp.stories.tsx
        types.ts
        index.ts
      WebChatProviderShell/
        WebChatProviderShell.tsx
        types.ts
        index.ts
      ChatHeader/
      ChatStatusbar/
      ChatTimeline/
      ChatComposer/
      StreamDebugPanel/
      ExportMenu/
      cards/
        MessageCard/
        ToolCallCard/
        ToolResultCard/
        AgentModeCard/
        WidgetInstanceCard/
        GenericCard/
      extensions/
        pinocchio-projectors/
        capabilities/
      styles/
        index.css
        theme-default.css
        tokens.css
        layout.css
        timeline.css
        cards.css
        composer.css

    debug-ui/
      DebugUiApp/
      AppShell/
      TimelineLanes/
      EventTrackLane/
      ProjectionLane/
      NowMarker/
      routes/
      store/
      ws/
      styles/

  legacy/
    webchat-redux/
      LegacyChatWidget/
      ws/
      store/
      README.md

  shared/
    api/
    components/
    styles/
    testing/
    utils/

  generated/
    chatapp/
      proto/
```

### Dependency diagram

```text
app/App
  ├─ MainWebChatRoot
  │    ├─ Redux profile provider
  │    └─ features/web-chat/WebChatApp
  │         ├─ WebChatProviderShell
  │         │    └─ @go-go-golems/chat-provider
  │         ├─ ChatHeader / ChatStatusbar
  │         ├─ ChatTimeline
  │         │    └─ cards/*
  │         ├─ ChatComposer
  │         └─ extensions/*
  │
  ├─ ProviderDemoRoot
  │    └─ features/web-chat/demos/*
  │
  └─ DebugUiRoot
       └─ features/debug-ui/*
```

Forbidden dependencies:

```text
features/web-chat/*      must not import legacy/webchat-redux/*
features/web-chat/cards  must not import app store or ws manager
features/debug-ui/*      must not import main store types
shared/*                 must not import feature code
legacy/*                 must not be imported by production app except explicit legacy route
```

### API references for the target app

Production app API:

```ts
export type WebChatAppProps = {
  profile?: string;
  profiles?: ProfileInfo[];
  onProfileChange?: (slug: string) => void;
  components?: Partial<WebChatComponents>;
  renderers?: Partial<TimelineRendererMap>;
  theme?: 'default' | string;
  themeVars?: ThemeVars;
};
```

Provider shell API:

```ts
export type WebChatProviderShellProps = {
  selectedProfile: string;
  children: React.ReactNode;
};

export function WebChatProviderShell({ selectedProfile, children }: WebChatProviderShellProps) {
  const config = useMemo(() => ({
    basePrefix: basePrefixFromLocation(),
    sessionIdParam: 'sessionId',
    sessionStorageKey: 'pinocchio.web-chat.sessionId',
    onSessionIdChange: setSessionIdInLocation,
    onDebugEvent: recordProviderDebugEvent,
    extensions: [pinocchioWebChatExtensions],
    createSessionBody: () => ({ profile: selectedProfile }),
    sendMessageBody: ({ prompt }) => ({ prompt, profile: selectedProfile }),
  }), [selectedProfile]);

  return <ChatProvider config={config}>{children}</ChatProvider>;
}
```

Renderer API:

```ts
export type TimelineRenderer<P = unknown> = React.ComponentType<{
  entity: RenderEntity<string, P>;
}>;

export type TimelineRendererMap = Record<string, TimelineRenderer> & {
  default: TimelineRenderer;
};
```

Story fixture API:

```ts
export const fixtures = {
  userMessage: entity.message({ role: 'user', content: 'Show me boots' }),
  assistantMessage: entity.message({ role: 'assistant', content: 'Here are some boots.' }),
  toolCall: entity.toolCall({ toolName: 'browser.confirm_action', status: 'requested' }),
  widget: entity.widget({ widgetName: 'demo.capability_card', status: 'ready' }),
};
```

## Code review: valuable, promising, problematic, legacy

### Valuable and worth preserving

- **Provider-backed runtime integration**: `src/chat/provider/ProviderBackedChatWidget.tsx` is the correct production direction because chat session mechanics are provider-owned.
- **Pinocchio projectors**: `src/chat/provider/projectors/pinocchioProjectors.ts` is the correct app-owned extension boundary.
- **Themed `data-part` CSS**: `src/webchat/styles/webchat.css` and `theme-default.css` establish a strong customization model.
- **Slot components**: `DefaultHeader`, `DefaultStatusbar`, and `DefaultComposer` are small and composable.
- **Sticky scroll hook**: `useStickyScrollFollow` is a reusable behavior boundary.
- **Debug UI separation**: `src/debug-ui` is already a separate app area with its own store and styles.
- **Devctl smokes**: current repeatable smoke scripts are valuable and should be kept.

### Promising but needs improvement

- **Provider demo capabilities**: excellent demonstration of tools/widgets, but should move into extension folders and stories.
- **Renderer registry**: useful concept, problematic global implementation.
- **Timeline prop normalizers**: useful concept, should become explicit projector/renderer inputs.
- **Export menu**: useful feature, but needs CSS extraction and store-free API as primary surface.
- **Stream debug panel**: valuable during development, but should be componentized and styled with CSS classes rather than inline styles.

### Problematic APIs/code

- `RenderEntity.props: any` in `src/webchat/types.ts` hides contracts.
- `src/store/store.ts` uses `getDefaultMiddleware: any`.
- `src/webchat/ChatWidget.tsx` is still present as a large legacy component in the same namespace as canonical web-chat.
- `src/webchat/ChatWidget.stories.tsx` imports `./ChatWidget`, so Storybook exercises legacy code rather than the current default `ChatWidget` export.
- `rendererRegistry.ts` and `timelinePropsRegistry.ts` are global registries inconsistent with provider-scoped extension design.
- Many components contain inline styles, making them harder to theme, test, and document.
- Generated protobuf code is under `src/chatapp/pb/...`, mixed into source counts and navigation with authored code.

### Legacy/deprecated candidates

Mark these as legacy or delete after parity review:

- `src/webchat/ChatWidget.tsx`
- `src/ws/wsManager.ts`
- `src/ws/timelineEvents.ts`
- `src/ws/timelineSnapshot.ts`
- `src/store/timelineSlice.ts` if no longer used by production provider-backed chat
- `src/webchat/ProviderBackedChatWidget.tsx` compatibility re-export after imports are updated
- `src/webchat/ProviderMultiDemoPage.tsx` compatibility re-export after route imports are updated
- global registry APIs in `src/webchat/rendererRegistry.ts` and `src/webchat/timelinePropsRegistry.ts`

Do not delete immediately if tests still depend on them. First add explicit `legacy/README.md` stating whether each file is kept for comparison, tests, or deletion.

## Refactoring roadmap

### Phase 1: Make boundaries obvious without changing behavior

1. Create `src/app/` and move route-mode parsing out of `src/App.tsx`.
2. Create `src/features/web-chat/` and move provider-backed production files there.
3. Create `src/legacy/webchat-redux/` and move old `ChatWidget.tsx`, legacy `ws/`, and legacy timeline store files there, or at least add deprecation banners before moving.
4. Move compatibility re-exports into a small `src/webchat/compat.ts` or remove them after imports are changed.
5. Add `README.md` files to `features/web-chat`, `features/debug-ui`, and `legacy/webchat-redux`.

Validation:

```bash
cd pinocchio/cmd/web-chat/web
npm run typecheck
npm run lint
npm run build
```

### Phase 2: Component folder layout and Storybook expansion

1. Split `src/webchat/components/*` into one folder per component.
2. Split `src/webchat/cards.tsx` into one folder per card.
3. Split `src/webchat/styles/webchat.css` into modular CSS files imported by `styles/index.css`.
4. Replace `ChatWidget.stories.tsx` with focused stories:
   - app shell story,
   - header story,
   - composer story,
   - timeline story,
   - one story per card.
5. Add debug UI stories for lanes and AppShell.

Validation:

```bash
npm run build-storybook
npm run check
```

### Phase 3: Remove global registries and strengthen types

1. Replace global renderer registry with explicit renderer maps.
2. Replace global timeline props registry with projector/renderer-local normalization.
3. Introduce typed render entity unions.
4. Add projector unit tests for Pinocchio events.
5. Add Storybook interaction tests for human tools/widgets if practical.

### Phase 4: Legacy deletion or quarantine

1. Decide whether legacy Redux chat still needs to run.
2. If no, delete legacy widget/runtime and update tests to use provider projector fixtures.
3. If yes, keep it under `/legacy` with explicit route flag and docs.
4. Remove stale compatibility re-exports.

## Suggested implementation order for an intern

Start with safe moves and tests. Do not begin by changing runtime behavior.

1. **Create folders and READMEs.**
   - Add `features/web-chat/README.md`, `features/debug-ui/README.md`, `legacy/webchat-redux/README.md`.
   - Explain what code is canonical and what is legacy.

2. **Move pure visual components first.**
   - `DefaultComposer` → `ChatComposer/ChatComposer.tsx`
   - `DefaultHeader` → `ChatHeader/ChatHeader.tsx`
   - `DefaultStatusbar` → `ChatStatusbar/ChatStatusbar.tsx`
   - `ChatTimeline` → `ChatTimeline/ChatTimeline.tsx`

3. **Add stories while moving.**
   - Each component gets a story before or during the move.
   - Use static fixtures, not live WebSocket state.

4. **Move provider app shell second.**
   - Move `ProviderBackedChatWidget.tsx` and `ProviderBackedChatWidgetInner.tsx` into `WebChatApp/` or `WebChatProviderShell/`.
   - Keep old re-export temporarily only if needed.

5. **Move demos third.**
   - Move `ProviderDemoPage` and multi-demo into `demos/`.
   - Keep routes unchanged initially.

6. **Quarantine legacy last.**
   - Move old `ChatWidget.tsx` and legacy `ws/` only after current smokes pass.

## Validation plan

Required after each phase:

```bash
cd /home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/web
npm run typecheck
npm run lint
npm run build
```

Required before merging a large reorganization:

```bash
cd /home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm
node ttmp/2026/05/30/CHATOVERLAY-005--move-typed-widget-plugin-support-into-pinocchio-chatapp/scripts/03-pinocchio-webchat-devctl-playwright.js
node ttmp/2026/05/30/CHATOVERLAY-007--showcase-web-chat-frontend-tools-and-typed-widgets/scripts/01-webchat-capabilities-showcase-smoke.js
node ttmp/2026/05/30/CHATOVERLAY-007--showcase-web-chat-frontend-tools-and-typed-widgets/scripts/02-webchat-chatprovider-demo-smoke.js
node ttmp/2026/05/30/CHATOVERLAY-007--showcase-web-chat-frontend-tools-and-typed-widgets/scripts/03-webchat-provider-multi-instance-smoke.js
```

Storybook validation:

```bash
cd /home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/web
npm run build-storybook
```

Manual dev URL note:

```bash
cd /home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio
devctl up --force
python3 - <<'PY'
import json
from pathlib import Path
state=json.loads(Path('.devctl/state.json').read_text())
for s in state.get('services', []):
    print(s['name'], s.get('health_url'))
PY
```

## Open questions

1. Should Pinocchio web-chat standardize on npm or pnpm for this frontend?
2. Is legacy Redux chat still needed as a runnable comparison path, or can it be deleted once provider-backed smoke coverage is accepted?
3. Should `WebChatProviderCapabilities` be installed in production main web-chat, or only in demo routes?
4. Should `rendererRegistry` be removed entirely, or kept as a local non-global renderer factory?
5. Should debug UI be built into the same Vite app forever, or become a separate route/package with shared generated protocol code?
6. Should generated protobuf files move from `src/chatapp/pb` to `src/generated/chatapp`?
7. Should the `ChatPart` public type enumerate every CSS `data-part`, or should part customization be split into stable public parts and internal parts?

## Reference file list

Primary app/build files:

- `/home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/web/package.json`
- `/home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/web/vite.config.ts`
- `/home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/web/src/main.tsx`
- `/home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/web/src/App.tsx`

Production/provider-backed web-chat:

- `/home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/web/src/webchat/index.ts`
- `/home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/web/src/chat/provider/ProviderBackedChatWidget.tsx`
- `/home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/web/src/chat/provider/ProviderBackedChatWidgetInner.tsx`
- `/home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/web/src/chat/provider/projectors/pinocchioProjectors.ts`

Legacy web-chat/runtime:

- `/home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/web/src/webchat/ChatWidget.tsx`
- `/home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/web/src/ws/wsManager.ts`
- `/home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/web/src/ws/timelineEvents.ts`
- `/home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/web/src/ws/timelineSnapshot.ts`
- `/home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/web/src/store/timelineSlice.ts`

Components/styles/storybook:

- `/home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/web/src/webchat/components/Header.tsx`
- `/home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/web/src/webchat/components/Statusbar.tsx`
- `/home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/web/src/webchat/components/Composer.tsx`
- `/home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/web/src/webchat/components/Timeline.tsx`
- `/home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/web/src/webchat/cards.tsx`
- `/home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/web/src/webchat/styles/webchat.css`
- `/home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/web/src/webchat/ChatWidget.stories.tsx`
- `/home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/web/.storybook/main.ts`
- `/home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/web/.storybook/preview.tsx`

Debug UI:

- `/home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/web/src/debug-ui/DebugUIApp.tsx`
- `/home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/web/src/debug-ui/components/AppShell.tsx`
- `/home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/web/src/debug-ui/ws/debugWsManager.ts`
