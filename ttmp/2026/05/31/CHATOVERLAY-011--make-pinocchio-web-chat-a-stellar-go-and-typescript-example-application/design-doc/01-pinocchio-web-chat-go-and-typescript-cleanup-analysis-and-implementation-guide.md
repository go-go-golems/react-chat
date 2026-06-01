---
Title: ""
Ticket: ""
Status: ""
Topics: []
DocType: ""
Intent: ""
Owners: []
RelatedFiles:
    - Path: ../../../../../../../pinocchio/cmd/web-chat/app/server.go
      Note: Go app server and sessionstream route implementation analyzed as the backend runtime boundary
    - Path: ../../../../../../../pinocchio/cmd/web-chat/app/showcase_tools.go
      Note: Production frontend-tool endpoint file with misleading showcase name analyzed for cleanup
    - Path: ../../../../../../../pinocchio/cmd/web-chat/main.go
      Note: Go command bootstrap and overloaded wiring file analyzed for backend cleanup phases
    - Path: ../../../../../../../pinocchio/cmd/web-chat/profiles/api.go
      Note: Profile API route file analyzed for splitting and current-profile cleanup
    - Path: ../../../../../../../pinocchio/cmd/web-chat/web/src/features/web-chat/WebChatApp/WebChatApp.tsx
      Note: Production React composition point and renderer override boundary analyzed for remaining typing/organization cleanup
    - Path: ../../../../../../../pinocchio/cmd/web-chat/web/src/features/web-chat/WebChatProviderShell/WebChatProviderShell.tsx
      Note: Provider-backed frontend shell and ChatProvider configuration analyzed for the TypeScript cleanup plan
    - Path: ../../../../../../../pinocchio/cmd/web-chat/web/src/webchat/types.ts
      Note: Renderer-facing types and public part contract analyzed as a confusing remaining legacy-shaped namespace
ExternalSources: []
Summary: ""
LastUpdated: 0001-01-01T00:00:00Z
WhatFor: ""
WhenToUse: ""
---


# Pinocchio Web-Chat Go and TypeScript Cleanup Analysis and Implementation Guide

## Executive summary

Pinocchio `cmd/web-chat` is already much cleaner than it was before the provider migration: the production chat UI is provider-backed, the legacy Redux/WebSocket chat runtime is gone, the timeline adapter model has closed the live/hydration drift, and the frontend now has feature folders, Storybook stories, modular CSS, and a documented debug UI boundary. The next cleanup should make the application a stellar example for both Go and TypeScript readers by removing remaining legacy-shaped names, finishing ownership boundaries, documenting the runtime contract, and separating production app code from diagnostics, generated bindings, compatibility exports, and example-only utilities.

The current confusion comes from three sources. First, the TypeScript code still keeps several support modules under a `src/webchat` namespace even though the production implementation lives under `src/features/web-chat`. Second, the Go code still has mixed responsibilities in a few files: `cmd/web-chat/main.go` builds CLI flags, runtime dependencies, static UI routing, profile APIs, debug observers, app plugins, and the HTTP server; `cmd/web-chat/app/showcase_tools.go` contains production frontend-tool endpoints despite the word `showcase`; and `profiles/api.go` combines profile list/detail endpoints, current-profile cookie state, schema endpoints, mock-profile exposure, and response shaping. Third, some files are now either unused or only compatibility shims after the cleanup.

This ticket should turn web-chat into an example application with explicit layers:

```text
cmd/web-chat
  -> command/bootstrap layer: parse CLI, build config, wire dependencies
  -> HTTP composition layer: mount profile API, chat API, debug API, static UI
  -> app server layer: sessionstream chat service, WebSocket transport, exports, tools
  -> runtime layer: profile resolution, middleware composition, Geppetto engine creation
  -> example fixtures: deterministic mock profile and test scenarios

cmd/web-chat/web/src
  -> app: route-mode and root selection
  -> features/web-chat: production chat shell and UI components
  -> features/web-chat/model: profile API and app-local state
  -> features/web-chat/adapters: Pinocchio timeline adapters
  -> features/web-chat/rendering: renderer types and renderer factory
  -> debug-ui: isolated diagnostics application
  -> shared: cross-feature utilities
  -> generated: generated protobuf files, if still needed
```

The recommended implementation is incremental. Start by adding inventory tooling and docs, then move TypeScript support modules into the feature folder, then split Go composition code into clearly named packages/files, then remove unused generated/frontend shims if no future feature imports them, and finally run repeatable frontend, Go, and browser validations.

## Scope

This document analyzes:

- TypeScript and React code under `/home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/web`.
- Go code under `/home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat`.
- The boundary between the Pinocchio example app and reusable provider/core packages.

This document does not implement the cleanup. It is an analysis, design, and implementation guide for a future implementer.

## Evidence collected

The investigation used these commands:

```bash
cd /home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio
find cmd/web-chat/web/src -type f \( -name '*.ts' -o -name '*.tsx' \) | sort | wc -l
find cmd/web-chat -type f -name '*.go' | sort | wc -l
go list ./cmd/web-chat/...

cd cmd/web-chat/web
npm run typecheck
npm test
npx --yes knip --include files,exports --reporter compact

cd /home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio
go test ./cmd/web-chat/... -count=1
```

Observed validation results:

- `npm run typecheck` passed.
- `npm test` passed: 9 test files and 32 tests.
- `go test ./cmd/web-chat/... -count=1` passed for `cmd/web-chat`, `cmd/web-chat/app`, `cmd/web-chat/mockruntime`, and `cmd/web-chat/profiles`.
- `npx --yes knip --include files,exports --reporter compact` reported unused files and exports and exited non-zero, which is expected for a cleanup inventory run.
- A mistaken `npm test -- --runInBand=false` failed because Vitest does not accept Jest's `--runInBand` option. The correct command is `npm test`.

Current size:

| Area | Count |
|---|---:|
| TypeScript/TSX files under `cmd/web-chat/web/src` | 137 |
| Generated TypeScript protobuf files | 2 |
| Story files | 16 |
| Test files | 9 |
| Go files under `cmd/web-chat` | 44 |
| Go packages under `cmd/web-chat/...` | 4 |

## System overview for a new intern

The web-chat application is a small single-page application served by a Go command. The Go command owns profile resolution, runtime construction, chat sessions, durable timeline snapshots, exports, WebSocket transport, frontend tool result ingestion, and optional debugging endpoints. The browser owns the React shell, profile picker, composer, timeline rendering, cards, styling, and developer debug UI.

The browser does not call an LLM directly. The browser sends a prompt to the Go server. The Go server resolves the selected profile, builds a runtime, runs inference through the Pinocchio/Geppetto runtime stack, and publishes sessionstream commands/events. The browser receives a snapshot and live WebSocket frames through `@go-go-golems/chat-provider`. Pinocchio-specific timeline adapters convert those frames into renderer-facing entities, and the React app renders those entities with Pinocchio-owned cards.

### Runtime diagram

```text
Browser React app
  |
  | POST /api/chat/sessions
  | POST /api/chat/sessions/{sessionId}/messages
  | WS   /api/chat/ws
  v
Go web-chat HTTP mux
  |
  +-- profile API: /api/chat/profiles, /api/chat/profile
  +-- chat API:    /api/chat/sessions, /api/chat/sessions/{id}/...
  +-- websocket:   /api/chat/ws
  +-- debug API:   /api/debug/sessions/... when --debug-api is set
  |
  v
app.Server
  |
  +-- chatapp.Service
  +-- sessionstream.Hub
  +-- sessionstream hydration store
  +-- WebSocket transport
  +-- frontendtools.Manager
  +-- export service
  |
  v
RuntimeResolver
  |
  +-- mock_parity shortcut
  +-- profile registry resolution
  +-- runtime composer
  |
  v
Geppetto engine + Pinocchio plugins
```

### Frontend diagram

```text
src/main.tsx
  -> ErrorBoundary
  -> App
  -> routeModeFromLocation(window.location)
      -> ?debug=1: DebugUiRoot
      -> default: MainWebChatRoot
           -> Redux Provider for app-local profile state
           -> WebChatProviderShell
                -> ChatProvider from @go-go-golems/chat-provider
                -> WebChatApp
                     -> ChatTimeline
                     -> app-owned card renderers
                     -> StreamDebugPanel
```

### Backend request flow pseudocode

```go
func handleSubmitMessage(request) {
    sessionID := pathSessionID(request.URL.Path)
    body := decode SubmitMessageRequest
    if body.Prompt is empty: return 400

    runtime := nil
    if server.runtimeResolver != nil {
        runtime = server.runtimeResolver.Resolve(ctx, request, sessionID, body.Profile, body.Registry)
    }

    service.SubmitPromptRequest(ctx, sessionID, chatapp.PromptRequest{
        Prompt: body.Prompt,
        IdempotencyKey: body.IdempotencyKey,
        Runtime: runtime,
    })

    return { sessionId, accepted: true, status: "running", profile }
}
```

This flow is implemented in `cmd/web-chat/app/server.go:317-352`.

### Frontend provider flow pseudocode

```ts
function WebChatProviderShell() {
  const selectedProfile = resolveSelectedProfile(appState, serverProfile, profileOptions);

  const config = {
    basePrefix,
    sessionIdParam: 'sessionId',
    sessionStorageKey: 'pinocchio.web-chat.sessionId',
    onSessionIdChange: setSessionIdInLocation,
    onDebugEvent: recordProviderDebugEvent,
    extensions: [pinocchioWebChatTimelineAdapters],
    createSessionBody: () => ({ profile: selectedProfile }),
    sendMessageBody: ({ prompt }) => ({ prompt, profile: selectedProfile }),
  };

  return (
    <ChatProvider config={config}>
      <WebChatApp selectedProfile={selectedProfile} ... />
    </ChatProvider>
  );
}
```

This flow is implemented in `cmd/web-chat/web/src/features/web-chat/WebChatProviderShell/WebChatProviderShell.tsx:16-97`.

## TypeScript inventory

### Directory inventory

| Directory | Files | Current role | Cleanup assessment |
|---|---:|---|---|
| `src/app` | 6 | Route-mode selection and root wrappers. | Good direction. Keep small. |
| `src/features/web-chat` | 70 | Production web-chat feature: shell, UI components, cards, adapters, styles. | Canonical production area. More support code should move here. |
| `src/debug-ui` | 25 | Separate developer/operator diagnostics app. | Good boundary; keep isolated and gate before public deploy. |
| `src/webchat` | 14 | Renderer types, parts, utility functions, compatibility exports, support components. | Confusing name after feature migration; split into `features/web-chat/rendering`, `features/web-chat/shared`, or `shared/web-chat-contracts`. |
| `src/ws` | 5 | Protocol re-exports, stream debug helpers, frontend tool result helper. | Mixed production and diagnostics. Move by responsibility. |
| `src/store` | 5 | App-local Redux store and profile API. | Rename/move into feature model layer to avoid implying provider state lives here. |
| `src/utils` | 5 | Runtime config helpers and generic utilities. | Some files are unused. Keep only shared utilities with active imports. |
| `src/generated` | 2 generated TS files plus README. | Generated protobuf bindings. | Currently unused by app code; decide whether to keep for future or remove frontend generation. |
| `src/components` | 1 | Top-level `ErrorBoundary`. | Either keep as `shared/ui/ErrorBoundary` or move under `app`. |
| `src/config` | 1 | Reads `window.__PINOCCHIO_WEBCHAT_CONFIG__`. | Good; could become `app/runtimeConfig.ts`. |

The file-count evidence came from `find cmd/web-chat/web/src -type f \( -name '*.ts' -o -name '*.tsx' \)` and directory grouping.

### What is already good

The production entrypoint is simple. `src/main.tsx:11-17` renders `ErrorBoundary` and `App`. `src/app/App.tsx:5-13` selects between the debug route and the chat route. `src/app/routeMode.ts:1-17` has only two modes: `chat` and `debug`. Removed provider demo flags now fall back to normal chat, as covered by `src/app/routeMode.test.ts`.

The provider shell is a clear boundary. `WebChatProviderShell.tsx:69-80` builds `ChatProvider` config with `basePrefix`, session ID synchronization, debug event hook, Pinocchio timeline adapters, and profile-aware request bodies. `WebChatProviderShell.tsx:86-96` wraps `WebChatApp` in `ChatProvider`.

The app renderer is app-owned. `WebChatApp.tsx:83-93` creates a renderer map through `createWebChatRenderers`, then overrides `tool_call` and `widget` with provider-aware renderers. This is better than a global renderer registry.

The styling boundary is documented. `src/features/web-chat/styles/README.md:1-25` states that web-chat CSS is scoped under `[data-pwchat]` and `data-part` names.

The debug UI boundary is documented. `src/debug-ui/README.md:1-15` states that `?debug=1` selects the debug app and that debug state must stay under `src/debug-ui/store`.

### Deprecated, unused, or compatibility-shaped TypeScript inventory

`knip` reported these unused files:

| File | Assessment | Recommended action |
|---|---|---|
| `public/mockServiceWorker.js` | Likely leftover MSW asset. No current app import. | Remove if Storybook MSW does not need it, or document MSW usage and add it to Storybook config. |
| `src/debug-ui/types/index.ts` | Empty/comment-only file. | Delete. |
| `src/generated/chatapp/proto/pinocchio/chatapp/rpc/v1/rpc_pb.ts` | Generated but no app imports. | Either remove frontend generation or add a documented consumer. |
| `src/generated/chatapp/proto/pinocchio/chatapp/v1/chat_pb.ts` | Generated but no app imports. | Same as above. |
| `src/utils/guards.ts` | Contains `isRecord` but not imported; duplicate local guards exist. | Delete or centralize all record guards here. |
| `src/utils/number.ts` | Contains `toNumber` helpers but not imported. | Delete or use from card normalization code. |
| `src/webchat/Markdown.tsx` | Compatibility re-export of feature Markdown. | Delete if there are no external consumers; otherwise move to a documented public package surface. |
| `src/webchat/cards.tsx` | Compatibility re-export of feature cards. | Delete or move to `features/web-chat/index.ts`. |
| `src/webchat/index.ts` | Public-style barrel exporting feature components and support types. | Decide whether web-chat is an importable library. If not, delete. If yes, rename to `src/features/web-chat/public.ts`. |

Important caveat: `knip` can report false positives for library barrels, Storybook default exports, or future public API surfaces. Treat its output as an inventory, not an automatic deletion list. Each deletion should be followed by `npm run typecheck`, `npm test`, Storybook build, and browser smoke tests.

### Confusing TypeScript organization

The largest confusion is the remaining `src/webchat` namespace. Production files under `src/features/web-chat` import support code from `../../../webchat/...` in many places. Examples:

- `WebChatApp.tsx:9-12` imports `StreamDebugPanel`, `parts`, `renderers`, and `types` from `src/webchat`.
- `ChatStatusbar.tsx` imports `ExportMenu`, `parts`, and `fmtShort` from `src/webchat`.
- Card components import `fmtSentAt`, `normalizeAgentModeAnalysis`, and `RenderEntity` from `src/webchat`.
- `WebChatProviderShell.tsx:8` imports profile selection from `src/webchat/profileSelection`.

This makes the old namespace look like the real implementation, even though the actual feature lives under `src/features/web-chat`. For a new intern, that is a false map.

Recommended target:

```text
src/features/web-chat/
  rendering/
    renderers.ts
    types.ts
    parts.ts
    providerTimeline.ts
  model/
    appSlice.ts
    profileApi.ts
    profileSelection.ts
  diagnostics/
    StreamDebugPanel.tsx
    streamDebug.ts
  components/
    ExportMenu.tsx
  cards/
  styles/
```

Alternative target if these contracts are meant to be shared by other apps:

```text
src/shared/web-chat-contracts/
  renderers.ts
  renderEntity.ts
  parts.ts
  profileSelection.ts
```

Do not keep the middle state where `features/web-chat` imports from `webchat` while `webchat/index.ts` re-exports `features/web-chat`.

### TypeScript typing issues

There are still controlled `any` uses:

| Location | Evidence | Why it matters | Recommended action |
|---|---|---|---|
| `WebChatApp.tsx` | `Statusbar={StatusbarComponent as any}` at line 145. | Slot typing is not aligned between `DefaultHeader` and override statusbar component. | Make `DefaultHeader` accept `Statusbar?: ComponentType<StatusbarSlotProps>` directly, or split header/statusbar composition so no cast is needed. |
| `Markdown.tsx` | Renderer callbacks use `any` at lines 40, 51, and 55; `components as any` at line 72. | Markdown component customization bypasses strict TS. | Use `Components` from `react-markdown` and typed callback props. |
| `streamDebug.ts` | Raw payload access uses `(e.raw as any)?.kind` and `(frame.payload as any)?.messageId` at lines 112-127; window global uses `(window as any)` at line 176. | Debug-only code is acceptable, but it should be visibly isolated and typed enough for contributors. | Define a debug global interface and helper `recordValueField(value, key)`. |

`tsconfig.json:11` enables `strict`, but `tsconfig.json` does not enable `noUnusedLocals` or `noUnusedParameters`. Add a separate cleanup script before enabling these globally because Storybook and generated files may need exclusions.

Suggested script:

```json
{
  "scripts": {
    "audit:unused": "knip --include files,exports",
    "check:strict-unused": "tsc -p tsconfig.json --noEmit --noUnusedLocals --noUnusedParameters"
  }
}
```

Use `audit:unused` as an advisory report first. Do not make it required until the generated and barrel-export strategy is settled.

### Generated TypeScript bindings

`src/generated/README.md:1-11` says generated files are produced from protobuf schemas. The current app imports no generated chatapp files. The only matches under `src` are the generated files and the README.

There are two valid outcomes:

1. **Keep generated bindings** if a near-term feature will decode protobuf types directly in the browser. In that case, document the expected consumer and add a small typed example or test.
2. **Remove frontend generation** if all browser protocol handling stays JSON-normalized through `@go-go-golems/chat-provider/ws`. In that case, update `buf.chatapp.web.gen.yaml`, remove `@bufbuild/protobuf` if no longer needed, and delete `src/generated/chatapp`.

For a stellar example application, unused generated code is worse than no generated code. It makes readers ask which protocol path is real.

### Debug UI and stream debug

The debug UI route is intentionally separate, but two diagnostics systems now coexist:

- `src/debug-ui/**`: the full sessionstream debug app selected by `?debug=1`.
- `src/webchat/components/StreamDebugPanel.tsx` plus `src/ws/streamDebug.ts`: an inline production-route debug panel and local capture buffer.

This may be acceptable, but it should be documented as two distinct diagnostics levels:

| Diagnostic tool | Location | Intended user | Recommended future state |
|---|---|---|---|
| Full debug app | `src/debug-ui` | Developer/operator debugging sessionstream projections. | Keep under `?debug=1`; gate in public deploys. |
| Inline stream panel | `StreamDebugPanel` | Developer inspecting current provider frames from the normal chat route. | Move under `features/web-chat/diagnostics` and load only behind config/localStorage. |

`src/debug-ui/README.md:13-15` already says the debug route should be revisited before public hosting. Keep that warning and add the inline panel to the same boundary doc.

### TypeScript API boundaries to target

Use these target contracts:

```ts
// src/features/web-chat/model/profileApi.ts
export type ProfileInfo = {
  registry?: string;
  slug: string;
  displayName?: string;
  description?: string;
  defaultPrompt?: string;
  isDefault?: boolean;
};
```

Normalize snake_case API fields at the API boundary instead of carrying them through UI props. The current `ProfileInfo` uses `display_name`, `default_prompt`, and `is_default` from `profileApi.ts:5-12`, which leaks backend JSON naming into React components.

```ts
// src/features/web-chat/rendering/renderEntity.ts
export type WebChatRenderEntity =
  | { kind: 'message'; id: string; createdAt: number; props: MessageEntityProps }
  | { kind: 'tool_call'; id: string; createdAt: number; props: ToolCallEntityProps }
  | { kind: 'tool_result'; id: string; createdAt: number; props: ToolResultEntityProps }
  | { kind: 'agent_mode'; id: string; createdAt: number; props: AgentModeEntityProps }
  | { kind: 'ChatWidgetInstance' | 'widget_instance'; id: string; createdAt: number; props: WidgetEntityProps }
  | { kind: string; id: string; createdAt: number; props: Record<string, unknown> };
```

This would improve the current `RenderEntityProps` union in `src/webchat/types.ts:72-87`, which is better than `any` but not yet discriminated by `kind`.

## Go inventory

### Package inventory

| Package | Files | Role | Cleanup assessment |
|---|---:|---|---|
| `cmd/web-chat` | 15 | Cobra/Glazed command, static UI routing, runtime composition, agent-mode plugin, tests. | Too many responsibilities in `main` package. Split bootstrap/composition from `main.go`. |
| `cmd/web-chat/app` | 21 | Chat HTTP server, sessionstream setup, exports, frontend tool endpoints, debug recorder and reconciliation. | Good app-server boundary, but debug and frontend-tool files need clearer names. |
| `cmd/web-chat/profiles` | 5 | Profile API, request resolver, profile DTOs, mock profile helpers. | Useful package, but API file is large and mixes route registration with response shaping. |
| `cmd/web-chat/mockruntime` | 3 | Deterministic runtime for parity tests. | Good example fixture. Keep explicit and test-owned. |

`go list ./cmd/web-chat/...` reports four packages:

```text
github.com/go-go-golems/pinocchio/cmd/web-chat
github.com/go-go-golems/pinocchio/cmd/web-chat/app
github.com/go-go-golems/pinocchio/cmd/web-chat/mockruntime
github.com/go-go-golems/pinocchio/cmd/web-chat/profiles
```

### Go current architecture

`cmd/web-chat/main.go` does all of the following:

- embeds static frontend assets with `//go:embed static` at line 47,
- builds runtime config JavaScript at lines 56-82,
- mounts static UI assets at lines 104-140,
- registers profile, chat, WebSocket, debug, and app-config routes at lines 142-182,
- builds custom root mounting at lines 185 onward,
- defines CLI flags at lines 257-272,
- resolves profile runtime and base inference settings at lines 299-333,
- creates agent-mode service and middleware definitions at lines 316-344,
- builds request/runtime resolvers at lines 346-355,
- creates debug recorder and Geppetto observer-enabled engine factory at lines 357-380,
- creates `app.Server` at lines 381-391,
- starts the HTTP server at lines 396-406,
- creates Cobra root and help at lines 409 onward.

This works, but it is not a stellar example because the reader must understand CLI parsing, static asset serving, profile registries, middleware registry construction, debug observers, turn persistence, plugin installation, and HTTP server startup in one file.

`cmd/web-chat/app/server.go` has a stronger boundary. `Server` owns `chatapp.Service`, WebSocket transport, runtime resolver, turn store, export service, chat plugins, frontend tool manager, debug recorder, and close function at lines 28-42. `NewServer` builds the schema registry, hydration store, WebSocket transport, chatapp engine, sessionstream hub, plugin installation, frontend tool manager, service, and export service at lines 136-191. Route handlers live later in the file.

`cmd/web-chat/profiles` owns profile resolution and profile API responses. The API mounts schema endpoints at `profiles/api.go:24-40`, profile listing at `profiles/api.go:42-98`, profile details at `profiles/api.go:100-194`, and current-profile cookie state at `profiles/api.go:200-267`. The request resolver chooses profile and registry from request inputs at `profiles/resolver.go:57-117`, resolves effective profiles at `profiles/resolver.go:119-133`, and builds conversation plans at `profiles/resolver.go:135-169`.

### Deprecated, unused, or confusing Go inventory

| File or concept | Assessment | Evidence | Recommended action |
|---|---|---|---|
| `cmd/web-chat/app/showcase_tools.go` | Misleading file name. It contains production frontend-tool manifest/result endpoints, not showcase-only code. | Endpoint structs and handlers are at lines 16-167; `server.go:298-303` routes to these handlers. | Rename to `server_frontend_tools.go` or split DTOs into `frontend_tools_api.go`. |
| `parseWebChatSessionPath` in `showcase_tools.go` | Path parser is used by core session routes but lives in frontend-tool file. | Function at `showcase_tools.go:47-64`; used by `server.go:267-268`. | Move to `server_routes.go` with tests. |
| `cmd/web-chat/main.go` | Overloaded composition file. | Lines 45-406 cover embed, routing, CLI, profile/runtime/debug/server wiring. | Split into `command.go`, `http_mux.go`, `static_assets.go`, `runtime_wiring.go`, `debug_wiring.go`, `main.go`. |
| `idle-timeout-seconds`, `evict-idle-seconds`, `evict-interval-seconds` flags | Appear in CLI flags but are not decoded into `serverSettings` or used in `RunIntoWriter`. | Flags at `main.go:262-264`; `serverSettings` at `main.go:277-286` does not include them. | Delete if obsolete or wire them to actual server/sessionstream behavior. |
| `profiles/api.go` | Large mixed route and DTO file. | 576 lines; route registration and helper functions in one file. | Split into `api_routes.go`, `api_current_profile.go`, `api_profiles.go`, `api_schemas.go`, `api_mock_profile.go`, `api_dto.go`. |
| Secure current-profile cookie | `Secure: true` can prevent cookie persistence on plain HTTP local development depending on browser behavior. | `profiles/api.go:252-259`. | Confirm whether profile switching persists on `http://127.0.0.1`; if not, make cookie security configurable or rely on app state/local storage in dev. |
| Legacy cookie fallback | Supports old cookie value format. | `profiles/resolver.go:211-230` parses `legacyProfile`. | Keep only if migration still matters; otherwise remove and document cookie format. |
| `app/contracts.go` type aliases | Aliases serverkit request/response types into app package. | `contracts.go:1-9`. | Acceptable for handler readability, but document why app re-exports serverkit contracts or import serverkit types directly. |
| `debug_reconcile_*` files | Large diagnostics subsystem in app package. | 8 files plus recorder/record files in `cmd/web-chat/app`. | Keep, but group under names with a clear prefix and add `doc.go` explaining the debug API. |
| `mock_parity` in production profile API | Deterministic profile is exposed in normal profile listing. | `profiles/api.go:69-71` and `profiles/api.go:92`; resolver shortcut at `canonical_runtime_resolver.go:36-38`. | Keep for example/test value, but mark it clearly as deterministic local/test profile in API metadata and docs. |

### Go target structure

Recommended structure:

```text
cmd/web-chat/
  main.go                    # only cobra.CheckErr(root.Execute()) and command construction
  command.go                 # NewCommand, flag sections, RunIntoWriter high-level orchestration
  config.go                  # serverSettings, runtime config JS, base prefix normalization
  http_mux.go                # buildAppMux, buildRootHandler, route mounting
  static_assets.go           # embed FS and static SPA handlers
  runtime_wiring.go          # buildRuntimeComposer, profile resolver, agent-mode service
  debug_wiring.go            # debug recorder and observer-enabled engine factory
  agentmode_plugin.go        # app-specific agent-mode chat plugin
  middleware_definitions.go  # web-chat middleware definitions
  turn_persistence.go        # turn store persister/hook

cmd/web-chat/app/
  server.go                  # Server struct and NewServer only
  server_routes.go           # session path parser and HandleSessionRoutes dispatch
  server_sessions.go         # create session, snapshot, submit message
  server_frontend_tools.go   # frontend tool manifest/result endpoints
  server_export.go           # timeline/turn/full export endpoints
  server_debug.go            # debug route dispatch
  debug_*.go                 # recorder and reconcile implementation with doc.go
  contracts.go               # optional alias file or deleted

cmd/web-chat/profiles/
  resolver.go                # request resolver only
  api_routes.go              # RegisterAPIHandlers route mounting only
  api_profiles.go            # list/detail profile handlers
  api_current_profile.go     # current-profile cookie route
  api_schemas.go             # middleware/extension schema routes
  api_mock_profile.go        # mock parity profile documents
  types.go                   # exported DTOs and APIOptions
```

This split does not change behavior. It changes the shape of the example so a new reader can open a file that matches the concept they are trying to learn.

### Go wiring pseudocode target

```go
func (c *Command) RunIntoWriter(ctx context.Context, parsed *values.Values, out io.Writer) error {
    cfg := DecodeWebChatSettings(parsed)
    profileRuntime := ResolveProfileRuntime(ctx, parsed)
    baseInference := ResolveBaseInferenceSettings(parsed)
    turnStore := OpenTurnStore(cfg.Turns)
    defer turnStore.Close()

    runtimeDeps := BuildRuntimeDependencies(RuntimeDependencyOptions{
        ProfileRuntime: profileRuntime,
        BaseInference: baseInference,
        TurnStore: turnStore,
    })

    debugDeps := BuildDebugDependencies(DebugOptions{
        Enabled: cfg.DebugAPI,
        Observability: parsedObservability,
        RuntimeComposer: runtimeDeps.Composer,
    })

    appServer := BuildAppServer(AppServerOptions{
        TimelineStore: cfg.Timeline,
        TurnStore: turnStore,
        RuntimeResolver: runtimeDeps.Resolver,
        DebugRecorder: debugDeps.Recorder,
        Plugins: DefaultWebChatPlugins(),
    })

    handler := BuildHTTPHandler(HTTPOptions{
        Root: cfg.Root,
        StaticFS: staticFS,
        RuntimeConfig: RuntimeConfig{BasePrefix: cfg.Root, DebugAPIEnabled: cfg.DebugAPI},
        RequestResolver: runtimeDeps.RequestResolver,
        AppServer: appServer,
    })

    return RunHTTPServer(ctx, cfg.Addr, handler, appServer.Close)
}
```

The goal is that every noun in the pseudocode corresponds to a small file and a small testable function.

## Cross-language contracts

The cleanup should document these API contracts as the stable boundary between Go and TypeScript.

### Runtime config script

Go emits `/app-config.js` through `buildAppConfigHandler` (`main.go:85-97`) and `runtimeConfigScript` (`main.go:74-82`). TypeScript reads it through `src/config/runtimeConfig.ts:1-24` and uses it in `basePrefixFromLocation`.

Contract:

```ts
type WebChatRuntimeConfig = {
  basePrefix?: string;
  debugApiEnabled?: boolean;
};
```

### Profile APIs

Go routes:

```text
GET  /api/chat/profiles
GET  /api/chat/profiles/{slug}
GET  /api/chat/profile
POST /api/chat/profile
GET  /api/chat/schemas/middlewares
GET  /api/chat/schemas/extensions
```

TypeScript consumer: `src/store/profileApi.ts:95-121`.

Recommended contract cleanup: transform backend snake_case DTOs into frontend camelCase DTOs at the API boundary.

### Chat APIs

Go routes mounted by `buildAppMux` and `app.Server`:

```text
POST /api/chat/sessions
GET  /api/chat/sessions/{sessionId}
POST /api/chat/sessions/{sessionId}/messages
GET  /api/chat/sessions/{sessionId}/timeline
GET  /api/chat/sessions/{sessionId}/turns
GET  /api/chat/sessions/{sessionId}/export
POST /api/chat/sessions/{sessionId}/tools/manifest
POST /api/chat/sessions/{sessionId}/tools/results
WS   /api/chat/ws
```

TypeScript consumers:

- `@go-go-golems/chat-provider` consumes session creation, message submission, snapshot, and WebSocket routes through `ChatProvider` config.
- `src/ws/frontendTools.ts:5-28` posts frontend tool results.
- `src/webchat/components/ExportMenu.tsx` and `ExportMenuForSession` consume export routes.

### Timeline adapters

Pinocchio-specific timeline adapters live in:

```text
src/features/web-chat/extensions/pinocchio-timeline-adapters/pinocchioTimelineAdapters.ts
```

They are registered by `WebChatProviderShell.tsx:77`. This is the cross-language interpretation boundary: Go emits sessionstream events and durable entities; TypeScript adapters project those into app renderer entities.

For new entity kinds, the implementation rule is:

1. Add or reuse a Go chatapp plugin/schema.
2. Emit live events and durable snapshot entities.
3. Add a TypeScript timeline adapter with both live and hydration behavior or an explicit unsupported hydration reason.
4. Add unit tests for live projection and hydration.
5. Add a mockruntime scenario if browser parity is important.
6. Add a Playwright reload smoke if durable rendering is important.

## Proposed implementation plan

### Phase 1: Add repeatable inventory tooling

Goal: make future cleanup measurable.

Actions:

- Add a frontend `audit:unused` script using `knip` or a checked-in equivalent.
- Add a ticket script that writes file-count and unused-export reports into `ttmp/.../sources`.
- Add a Go package inventory command to the same script.
- Do not fail CI on `knip` yet.

Validation:

```bash
cd cmd/web-chat/web
npm run typecheck
npm test
npm run audit:unused || true

cd /home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio
go test ./cmd/web-chat/... -count=1
```

### Phase 2: Remove genuinely unused TypeScript files

Goal: delete dead code before moving live code.

Candidate deletions after confirmation:

- `src/debug-ui/types/index.ts`
- `src/utils/guards.ts` if not chosen as the central guard helper
- `src/utils/number.ts` if not used by normalization code
- `public/mockServiceWorker.js` if Storybook/MSW does not require it
- `src/webchat/Markdown.tsx`, `src/webchat/cards.tsx`, and `src/webchat/index.ts` if no external imports rely on them

Generated bindings decision:

- If no direct TypeScript protobuf decoding is planned, remove `src/generated/chatapp`, remove the Buf frontend generation config, and remove `@bufbuild/protobuf` if unused.
- If direct protobuf decoding is planned, keep generated files and add a minimal consumer/test so they are no longer mystery code.

Validation:

```bash
npm run typecheck
npm test
npm run lint
npm run build
npm run check:storybook
```

### Phase 3: Move TypeScript support modules into the feature boundary

Goal: remove the misleading `src/webchat` namespace.

Suggested moves:

| Current file | Target |
|---|---|
| `src/webchat/types.ts` | `src/features/web-chat/rendering/types.ts` |
| `src/webchat/renderers.ts` | `src/features/web-chat/rendering/renderers.ts` |
| `src/webchat/parts.ts` | `src/features/web-chat/rendering/parts.ts` |
| `src/features/web-chat/provider-support/providerTimeline.ts` | `src/features/web-chat/rendering/providerTimeline.ts` |
| `src/webchat/utils.ts` | `src/features/web-chat/rendering/format.ts` or `src/shared/format.ts` |
| `src/webchat/profileSelection.ts` | `src/features/web-chat/model/profileSelection.ts` |
| `src/store/appSlice.ts` | `src/features/web-chat/model/appSlice.ts` |
| `src/store/profileApi.ts` | `src/features/web-chat/model/profileApi.ts` |
| `src/webchat/components/ExportMenu.tsx` | `src/features/web-chat/components/ExportMenu.tsx` |
| `src/webchat/components/StreamDebugPanel.tsx` | `src/features/web-chat/diagnostics/StreamDebugPanel.tsx` |
| `src/ws/streamDebug.ts` | `src/features/web-chat/diagnostics/streamDebug.ts` |
| `src/ws/frontendTools.ts` | `src/features/web-chat/tools/frontendTools.ts` or delete if provider owns it |

Keep `src/ws/protocol.ts` only if debug UI still needs a thin re-export of provider protocol helpers. Otherwise import directly from `@go-go-golems/chat-provider/ws`.

Validation should include an import grep:

```bash
rg "from ['\"].*webchat|src/webchat|\.\./\.\./\.\./webchat" cmd/web-chat/web/src -S
```

Target result: no production imports from `src/webchat` because the directory no longer exists.

### Phase 4: Tighten TypeScript public contracts

Goal: make the example pleasant to copy.

Actions:

- Replace `StatusbarComponent as any` with a precise component type.
- Type `react-markdown` component overrides without `any`.
- Add a debug global type for `window.__pinocchioStreamDebug`.
- Transform profile API DTOs from snake_case to camelCase at `profileApi` boundary.
- Consider discriminated `RenderEntity` unions for core known kinds.

Validation:

```bash
npm run typecheck
npm test
npm run lint
```

Optional later check:

```bash
tsc -p tsconfig.json --noEmit --noUnusedLocals --noUnusedParameters
```

### Phase 5: Split Go command composition

Goal: make `cmd/web-chat` readable as an example Go application.

Actions:

- Split `main.go` into `main.go`, `command.go`, `config.go`, `http_mux.go`, `static_assets.go`, `runtime_wiring.go`, and `debug_wiring.go`.
- Remove or wire unused idle/eviction flags.
- Move starter-suggestion extension schema out of `buildAppMux` into a named function.
- Keep behavior unchanged in this phase.

Validation:

```bash
gofmt -w cmd/web-chat/*.go
go test ./cmd/web-chat/... -count=1
```

### Phase 6: Split app server routes and rename frontend-tool file

Goal: align filenames with production behavior.

Actions:

- Rename `app/showcase_tools.go` to `app/server_frontend_tools.go`.
- Move `parseWebChatSessionPath` into `app/server_routes.go`.
- Move create/snapshot/submit handlers into `app/server_sessions.go` if `server.go` remains too large.
- Add or keep tests for route parsing and frontend tool validation.

Validation:

```bash
gofmt -w cmd/web-chat/app/*.go
go test ./cmd/web-chat/app -count=1
```

### Phase 7: Split profile API files

Goal: make profile behavior easy to understand.

Actions:

- Keep `RegisterAPIHandlers` as the route mount function.
- Move list/detail handlers to `api_profiles.go`.
- Move current-profile cookie route to `api_current_profile.go`.
- Move schema endpoints to `api_schemas.go`.
- Move mock parity profile document/list helpers to `api_mock_profile.go`.
- Decide whether legacy cookie fallback is still required.
- Confirm current-profile cookie behavior on local HTTP.

Validation:

```bash
gofmt -w cmd/web-chat/profiles/*.go
go test ./cmd/web-chat/... -count=1
```

### Phase 8: Add an intern-facing README and architecture map

Goal: make the application self-explaining.

Add or expand:

- `cmd/web-chat/README.md` for backend architecture, routes, CLI flags, runtime composition, persistence, and debug API.
- `cmd/web-chat/web/README.md` for frontend architecture, route modes, provider runtime, profile state, renderers, styles, Storybook, generated code, and validation.
- `cmd/web-chat/app/doc.go` for app-server package responsibilities.
- `cmd/web-chat/profiles/doc.go` for profile package responsibilities.
- `cmd/web-chat/mockruntime/doc.go` for deterministic test profile responsibilities.

### Phase 9: Final browser acceptance

Goal: prove the example still works after cleanup.

Run:

```bash
cd /home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio
devctl down
devctl up --force
cd cmd/web-chat/web
npm run dev:url
```

Then run existing Playwright smokes from ticket scripts:

- mock profile parity smoke,
- hydration reload smoke,
- debug route smoke.

Acceptance criteria:

- The normal route renders chat.
- Profile selection includes `mock_parity`.
- Sending a prompt through `mock_parity` renders thinking, backend tool, agent-mode, and final assistant text cards.
- Reloading preserves adapter-backed hydrated cards.
- `?debug=1` still renders debug UI if debug route is intentionally kept.
- No raw protobuf `@type` JSON appears for known app entities after hydration.

## Risk analysis

| Risk | Why it matters | Mitigation |
|---|---|---|
| Deleting public barrels breaks external imports. | `src/webchat/index.ts` looks like a library entrypoint. | Search the repository and any downstream app before deletion. If needed, keep a documented public entrypoint with a new name. |
| Removing generated TS bindings blocks a near-term typed protocol feature. | Generated files may have been preserved intentionally. | Decide explicitly and document. If kept, add a consumer/test. |
| Moving app store files breaks RTK Query hooks. | `MainWebChatRoot` currently imports `store` from `src/store/store.ts`. | Move store files in one commit and run typecheck/tests. |
| Cookie security behavior differs between localhost and production. | `Secure: true` cookies may not persist over HTTP. | Test profile switching on `http://127.0.0.1`; add environment-aware config if needed. |
| Splitting Go files accidentally changes route registration order. | `net/http.ServeMux` path matching is order-insensitive for exact patterns but route coverage can still regress. | Add route table tests and run browser smokes. |
| Debug route remains public by accident. | `?debug=1` exposes operator diagnostics. | Add config/build-time guard before public deployment. |
| `knip` false positives lead to deleting useful Storybook/default exports. | Static export tools do not always understand framework conventions. | Treat inventory as advisory and validate after each deletion. |

## Review guide for the future implementer

Start review in this order:

1. `cmd/web-chat/web/src/app/App.tsx` and `routeMode.ts` to understand route selection.
2. `cmd/web-chat/web/src/features/web-chat/WebChatProviderShell/WebChatProviderShell.tsx` to understand provider config.
3. `cmd/web-chat/web/src/features/web-chat/WebChatApp/WebChatApp.tsx` to understand UI composition.
4. `cmd/web-chat/web/src/features/web-chat/extensions/pinocchio-timeline-adapters/pinocchioTimelineAdapters.ts` to understand app-specific event/entity projection.
5. `cmd/web-chat/main.go` to understand current Go bootstrap before splitting.
6. `cmd/web-chat/app/server.go` to understand server construction and handlers.
7. `cmd/web-chat/profiles/resolver.go` and `profiles/api.go` to understand profile selection.
8. `cmd/web-chat/mockruntime/engine.go` to understand deterministic parity behavior.

## Reference file list

Key TypeScript files:

- `/home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/web/src/main.tsx`
- `/home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/web/src/app/App.tsx`
- `/home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/web/src/app/routeMode.ts`
- `/home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/web/src/features/web-chat/WebChatProviderShell/WebChatProviderShell.tsx`
- `/home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/web/src/features/web-chat/WebChatApp/WebChatApp.tsx`
- `/home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/web/src/features/web-chat/extensions/pinocchio-timeline-adapters/pinocchioTimelineAdapters.ts`
- `/home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/web/src/webchat/types.ts`
- `/home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/web/src/webchat/renderers.ts`
- `/home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/web/src/ws/streamDebug.ts`
- `/home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/web/src/store/profileApi.ts`

Key Go files:

- `/home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/main.go`
- `/home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/app/server.go`
- `/home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/app/showcase_tools.go`
- `/home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/app/server_export.go`
- `/home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/app/server_debug.go`
- `/home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/profiles/api.go`
- `/home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/profiles/resolver.go`
- `/home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/canonical_runtime_resolver.go`
- `/home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/runtime_composer.go`
- `/home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/mockruntime/engine.go`

## Recommended acceptance checklist

The cleanup is complete when all of these are true:

- No production TypeScript imports from a misleading `src/webchat` namespace remain.
- No unused generated TypeScript bindings remain without a documented consumer.
- `knip` has either a clean report or documented accepted false positives.
- `StatusbarComponent as any` and Markdown renderer `any` casts are removed or justified in comments.
- `cmd/web-chat/main.go` is a small entrypoint plus high-level command wiring, not the full application composition.
- `cmd/web-chat/app/showcase_tools.go` has been renamed and production frontend-tool endpoints are clearly named.
- CLI flags are either wired to behavior or removed.
- Profile APIs are split into files by responsibility.
- `cmd/web-chat/README.md` and `cmd/web-chat/web/README.md` explain the system to a new intern.
- `npm run typecheck`, `npm test`, `npm run lint`, `npm run build`, `npm run check:storybook`, and `go test ./cmd/web-chat/... -count=1` pass.
- Browser smokes prove normal chat, mock parity, hydration reload, and debug route behavior.
