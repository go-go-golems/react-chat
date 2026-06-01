---
Title: Timeline adapter API design and implementation guide
Ticket: CHATOVERLAY-010
Status: active
Topics:
    - chat-provider
    - web-chat
    - architecture
    - parity
DocType: design-doc
Intent: long-term
Owners: []
RelatedFiles:
    - Path: ../../../../../../../packages/chat-provider/src/core/extensions.ts
      Note: Extension registration should accept adapters, not independent live-only projectors.
    - Path: ../../../../../../../packages/chat-provider/src/react/ChatProvider.tsx
      Note: Provider runtime creates registries and installs extensions before WebSocket connect/hydration.
    - Path: ../../../../../../../packages/chat-provider/src/ws/projectorRegistry.ts
      Note: Current live UI-event projector registry; should be replaced or extended into a unified adapter registry.
    - Path: ../../../../../../../packages/chat-provider/src/ws/timelineEvents.ts
      Note: Current live event projection path that applies mutations from registered projectors.
    - Path: ../../../../../../../packages/chat-provider/src/ws/timelineSnapshot.ts
      Note: Current hydration/snapshot mapping path; lacks app-owned registered projectors.
    - Path: ../../../../../../../pinocchio/cmd/web-chat/web/src/features/web-chat/WebChatApp/ProviderToolCallRenderer.tsx
      Note: Renderer behavior exposed the need for entity-kind consistency between live and hydrated paths.
    - Path: ../../../../../../../pinocchio/cmd/web-chat/web/src/features/web-chat/extensions/pinocchio-projectors/pinocchioProjectors.ts
      Note: |-
        Current app-owned live projectors for reasoning, agent-mode, and backend tools.
        Pinocchio live projectors to migrate to adapters
    - Path: ../../../../../../../pinocchio/cmd/web-chat/web/src/features/web-chat/provider-support/providerTimeline.ts
      Note: |-
        Temporary app-owned hydration normalization patch; should be replaced by registered adapters.
        Temporary hydration normalization patch to remove after adapters
    - Path: packages/chat-provider/src/core/extensions.ts
      Note: Extension API to move from projectors to timelineAdapters
    - Path: packages/chat-provider/src/ws/projectorRegistry.ts
      Note: Current live-only projector registry to replace
    - Path: packages/chat-provider/src/ws/timelineEvents.ts
      Note: Current live projection application path
    - Path: packages/chat-provider/src/ws/timelineSnapshot.ts
      Note: Current hardcoded hydration mapping path
ExternalSources: []
Summary: Design a unified timeline adapter API so live event projection and snapshot hydration are registered together and cannot drift.
LastUpdated: 2026-05-31T20:35:09.210760149-04:00
WhatFor: Implementing CHATOVERLAY-010 and unblocking safe legacy hydration deletion.
WhenToUse: Before changing ChatProvider timeline projection, snapshot hydration, or app-owned Pinocchio projectors.
---


# Timeline adapter API design and implementation guide

## Executive Summary

`ChatProvider` currently has a registry for live UI-event projection, but hydration/snapshot normalization is separate. That split caused a real regression: Pinocchio `AgentMode` rendered correctly while live, but rehydrated as a generic raw JSON/system card because the provider snapshot mapper did not know the app-specific durable entity kind.

The fix should not be another app-specific patch. We should introduce a unified **timeline adapter API**. An app registers one adapter for each timeline concept, and that adapter owns both sides of the timeline contract:

1. live UI events -> normalized provider timeline entities,
2. durable snapshot entities -> the same normalized provider timeline entities.

This ticket should replace the live-only projector registry and snapshot-only mapper with a single adapter registry. There should be no backwards-compatibility shim: existing projectors must migrate to adapters, and the type/API shape should make it hard to register a live mapping without also making an explicit hydration decision.

## Problem Statement

### Current split

Today the code has two independent pipelines:

```text
Live WebSocket UI event
  -> projectorRegistry.project(frame)
  -> timeline mutation
  -> render entity

Snapshot/hydration entity
  -> timelineEntityFromSnapshotEntity(entity)
  -> render entity
```

The live path is extensible through `TimelineProjector` registration. The snapshot path is a hardcoded mapper in `@go-go-golems/chat-provider` with a small set of generic kinds such as `ChatMessage`, `ChatWidgetInstance`, and `ChatFrontendToolCall`.

App-specific Pinocchio entities such as `AgentMode`, `ChatToolCall`, and `ChatToolResult` therefore need special handling in both places. The live handling existed in `pinocchioProjectors.ts`; hydration handling did not.

### Failure mode

The user observed a hydrated agent-mode card rendered like this:

```html
<div data-part="turn" data-role="system">
  ...
  <pre data-part="mono">
    {
      "@type": "type.googleapis.com/pinocchio.chatapp.v1.AgentModeEntity",
      "messageId": "chat-msg-2",
      "title": "agentmode: mode switched",
      "from": "financial_analyst",
      "to": "mock_reviewer",
      "analysis": "..."
    }
  </pre>
</div>
```

This means the hydrated snapshot entity kind `AgentMode` bypassed the app-specific renderer kind `agent_mode` and fell through to the generic fallback.

### Why this matters before legacy deletion

The legacy Redux/WebSocket code had explicit Pinocchio-specific snapshot normalization in `src/ws/timelineSnapshot.ts`. Provider-backed web-chat moved live projection to app extensions, but did not provide an equivalent registered hydration path. Deleting legacy code before fixing this would remove useful behavior and make future app-specific timeline entities easy to break.

## Design Goals

1. **Register once for live and hydration.** A timeline concept should be declared in one adapter object.
2. **Make drift hard.** If a live projector exists, the adapter should either provide hydration or explicitly declare `hydrate: false` with a reason.
3. **No backwards-compatibility layer.** Replace the old live-only projector API and migrate call sites.
4. **Preserve generic ChatProvider boundaries.** ChatProvider owns the mechanism; Pinocchio/web-chat owns Pinocchio-specific adapters.
5. **Keep apps in control of domain UI.** Adapter output should remain normalized timeline entities; renderers remain app-owned.
6. **Install before connect/hydration.** Adapters must be registered before WebSocket events or snapshots are processed.
7. **Test live/hydration parity.** Each adapter should have tests proving live and snapshot paths normalize to the same render kind/props.

## Proposed API

Replace `TimelineProjector` with `TimelineAdapter`.

### Core types

```ts
export type TimelineEntity = {
  id: string;
  kind: string;
  createdAt: number;
  updatedAt?: number;
  props: Record<string, unknown>;
};

export type TimelineMutation = {
  upsert?: TimelineEntity;
  upsertIfExists?: TimelineEntity;
  deleteId?: string;
  status?: string;
};

export type LiveProjectionContext = {
  sessionId: string;
  toolRuntime?: ToolRuntime;
  getEntity?: (id: string) => TimelineEntity | undefined;
};

export type SnapshotProjectionContext = {
  sessionId: string;
  snapshotOrdinal?: string | number;
};

export type HydrationPolicy =
  | { kind: 'supported'; project(entity: SnapshotEntityFrame, ctx: SnapshotProjectionContext): TimelineMutation | TimelineEntity | null }
  | { kind: 'not-supported'; reason: string };

export type TimelineAdapter = {
  name: string;
  priority?: number;

  /** Live UI-event projection. Required unless the adapter is explicitly snapshot-only. */
  live?: {
    accepts(frame: CanonicalFrame): boolean;
    project(frame: CanonicalFrame, ctx: LiveProjectionContext): TimelineMutation | null;
  };

  /** Snapshot/hydration projection. Required unless explicitly not-supported. */
  hydrate: HydrationPolicy;
};
```

### Strict adapter factory

Use factory helpers to make incorrect shapes difficult:

```ts
export function defineTimelineAdapter(adapter: TimelineAdapter): TimelineAdapter;

export function defineLiveAndHydrateAdapter(args: {
  name: string;
  priority?: number;
  live: TimelineAdapter['live'];
  hydrate: Extract<HydrationPolicy, { kind: 'supported' }>;
}): TimelineAdapter;

export function defineLiveOnlyAdapter(args: {
  name: string;
  priority?: number;
  live: TimelineAdapter['live'];
  hydrationUnsupportedReason: string;
}): TimelineAdapter;

export function defineHydrateOnlyAdapter(args: {
  name: string;
  priority?: number;
  hydrate: Extract<HydrationPolicy, { kind: 'supported' }>;
}): TimelineAdapter;
```

Rules:

- `defineTimelineAdapter` validates at runtime in development/test.
- A live-only adapter must spell out `hydrationUnsupportedReason`.
- Empty reason strings are invalid.
- Duplicate adapter names are invalid.
- Duplicate live priorities are allowed, but stable ordering must be deterministic: priority desc, registration order asc.

### Adapter registry

Replace `createTimelineProjectorRegistry` with `createTimelineAdapterRegistry`.

```ts
export type TimelineAdapterRegistry = {
  register(adapter: TimelineAdapter): () => void;
  projectLive(frame: CanonicalFrame, ctx: LiveProjectionContext): TimelineProjectionResult | null;
  projectSnapshot(entity: SnapshotEntityFrame, ctx: SnapshotProjectionContext): TimelineProjectionResult | null;
  list(): TimelineAdapter[];
  assertHydrationCoverage(): HydrationCoverageReport;
};
```

`TimelineProjectionResult` should include adapter name:

```ts
export type TimelineProjectionResult = {
  adapterName: string;
  mutation: TimelineMutation;
};
```

### Built-in adapters

ChatProvider should ship built-in adapters for generic entities:

- `chat-provider.message`
  - live: `ChatUserMessageAccepted`, `ChatTextPatch`, `ChatTextSegmentFinished`
  - hydrate: `ChatMessage`
- `chat-provider.run-status`
  - live: run started/finished/stopped/failed
  - hydrate: not supported, reason: run status is derived from hydrated entities/snapshot state
- `chat-provider.widget`
  - live: `ChatWidgetInstanceStarted/Patched/Completed/Removed`
  - hydrate: `ChatWidgetInstance`
- `chat-provider.frontend-tool`
  - live: `ChatFrontendToolCallRequested/ResultReceived`
  - hydrate: `ChatFrontendToolCall`

Pinocchio web-chat should supply adapters for:

- `pinocchio.reasoning`
  - live: `ChatReasoningSegmentStarted/Patch/Finished`
  - hydrate: durable kind is `ChatMessage` with `role=thinking`, or not needed if covered by generic message hydration; this must be explicit.
- `pinocchio.agent-mode`
  - live: `ChatAgentModePreviewUpdated/Committed/Cleared`
  - hydrate: `AgentMode`
- `pinocchio.backend-tool`
  - live: `ChatToolCall*`, `ChatToolResultReady`
  - hydrate: `ChatToolCall`, `ChatToolResult`

## Required Behavior

### Live projection

The WebSocket handler should call:

```ts
adapterRegistry.projectLive(frame, { sessionId, toolRuntime })
```

Then apply the returned mutation. No direct call to `coreChatProjector.project` should remain.

### Hydration projection

Snapshot hydration should call:

```ts
adapterRegistry.projectSnapshot(entity, { sessionId, snapshotOrdinal: frame.ordinal })
```

If no adapter handles the snapshot entity, it may fall back to a generic system entity only through a named built-in adapter such as `chat-provider.unknown-snapshot`. This fallback should be explicit and testable, not hidden in a helper.

### Renderer registration remains separate

Adapters normalize timeline entities. Renderers still map normalized `kind` strings to components.

Example:

```ts
pinocchioAgentModeAdapter.hydrate.project(AgentMode) -> { kind: 'agent_mode', props: ... }
rendererRegistry['agent_mode'] -> AgentModeCard
```

The adapter API should not import app card components.

## Migration Plan

### 1. Introduce adapter registry in chat-provider

Files:

- `packages/chat-provider/src/ws/timelineAdapterRegistry.ts`
- replace or delete `projectorRegistry.ts`
- update exports in `packages/chat-provider/src/index.ts`

Implement:

- adapter types,
- factory helpers,
- registry,
- duplicate-name detection,
- priority ordering,
- live projection,
- snapshot projection,
- hydration coverage reporting.

### 2. Convert built-in provider projector to built-in adapters

Files:

- `packages/chat-provider/src/ws/timelineEvents.ts`
- `packages/chat-provider/src/ws/timelineSnapshot.ts`

Replace:

- `coreChatProjector` with `coreChatAdapters` or individual exported adapters.
- hardcoded snapshot mapper with adapter-backed mapping.

Delete:

- live-only `TimelineProjector` API unless fully replaced in one patch.

### 3. Update ChatProvider runtime installation

Files:

- `packages/chat-provider/src/react/ChatProvider.tsx`
- `packages/chat-provider/src/core/extensions.ts`
- `packages/chat-provider/src/core/context.ts`
- `packages/chat-provider/src/core/createChatClient.ts`
- `packages/chat-provider/src/ws/wsManager.ts`

Replace `projectorRegistry` with `adapterRegistry` everywhere.

Extension config should become:

```ts
export type ChatExtension = {
  name?: string;
  tools?: ToolDefinition[];
  widgets?: WidgetDefinition[];
  timelineAdapters?: TimelineAdapter[];
  install?: (runtime: ChatRuntimeApi) => void | (() => void);
};
```

Do not keep `projectors?: TimelineProjector[]` as a compatibility alias. This is a clean cutover.

### 4. Migrate Pinocchio projectors into adapters

Files:

- `pinocchio/cmd/web-chat/web/src/features/web-chat/extensions/pinocchio-projectors/pinocchioProjectors.ts`

Rename or split into:

```text
extensions/pinocchio-timeline-adapters/
  reasoningAdapter.ts
  agentModeAdapter.ts
  backendToolAdapter.ts
  index.ts
```

Each adapter must define both live and hydration policy.

Expected hydrated mappings:

- `AgentMode` -> `agent_mode`
- `ChatToolCall` -> `tool_call`
- `ChatToolResult` -> `tool_result`
- `ChatMessage` with `role=thinking` -> `message` (possibly built-in generic message hydration is sufficient, but the Pinocchio adapter must explicitly document that it relies on the built-in adapter)

### 5. Delete temporary hydration patch

Files:

- `pinocchio/cmd/web-chat/web/src/features/web-chat/provider-support/providerTimeline.ts`

The current `toRenderEntity` should go back to being a tiny shape conversion, or disappear if provider entities are already render entities. It should not contain `AgentMode`, `ChatToolCall`, or `ChatToolResult` normalization after adapters are in place.

### 6. Update tests and smokes

Add tests in chat-provider:

- adapter registry priority order,
- duplicate adapter name rejection,
- live adapter projection,
- snapshot adapter projection,
- live-only adapter requires reason,
- snapshot-only adapter behavior,
- unknown snapshot fallback is explicit.

Add tests in Pinocchio web-chat:

- `pinocchio.agent-mode` live commit -> `agent_mode`,
- `pinocchio.agent-mode` snapshot `AgentMode` -> `agent_mode`,
- `pinocchio.backend-tool` live events -> `tool_call`/`tool_result`,
- `pinocchio.backend-tool` snapshot `ChatToolCall`/`ChatToolResult` -> same kinds,
- live and snapshot normalized props are equivalent enough for renderers.

Update Playwright:

- Keep `04-phase6-mock-profile-parity-smoke.js`.
- Add hydration smoke that sends `mock_parity`, reloads with `sessionId`, and asserts `agent_mode` and backend tool cards still render as cards, not generic raw JSON.
- Current smoke path: `scripts/01-mock-profile-hydration-smoke.js`; it writes evidence to `/tmp/pinocchio-chatprovider-timeline-adapter-hydration.json` by default.

## API Misuse Prevention

The implementation should make wrong usage difficult:

1. Remove `projectors` from extension config entirely.
2. Remove `createTimelineProjectorRegistry` exports.
3. Make adapter registration reject duplicate names.
4. Make live adapters declare hydration support or explicit unsupported reason.
5. Make snapshot fallback a named adapter, not invisible default code.
6. Add tests that fail if Pinocchio adapters support live but omit hydration.
7. Add lint-like unit tests that enumerate registered adapters and assert coverage decisions.

## Alternatives Considered

### Keep app-specific hydration patch in web-chat

Rejected. It fixes the immediate bug but preserves two separate mechanisms and makes future app-specific entities easy to break.

### Add a second snapshot projector registry only

Rejected. Separate live and snapshot registries would improve extensibility but still allow apps to register one side and forget the other.

### Put Pinocchio snapshot cases in ChatProvider core

Rejected. `ChatProvider` must remain generic and should not know about `AgentMode`, Pinocchio backend tools, or product-specific durable entity kinds.

## Open Questions

1. Should the normalized entity type remain generic `{ kind: string; props: Record<string, unknown> }`, or should this ticket introduce discriminated unions for provider/app entities?
2. Should unknown snapshot fallback be enabled by default, or should unknown hydrated entities be dropped with debug warnings in development?
3. Should adapter hydration coverage be asserted automatically in `ChatProvider` startup, or only by unit tests?
4. Should adapter names be globally unique across extensions, or scoped by extension name?

## Acceptance Criteria

- There is one adapter registry used by both live event projection and snapshot hydration.
- ChatProvider extension config accepts `timelineAdapters`, not live-only `projectors`.
- Pinocchio reasoning/agent-mode/backend-tool mappings are migrated to adapters.
- Hydrated `AgentMode` renders as `AgentModeCard`, not generic raw JSON.
- Hydrated `ChatToolCall` and `ChatToolResult` render as web-chat tool cards, not generic raw JSON.
- The temporary app-side hydration normalization in `providerTimeline.ts` is removed.
- Unit tests prove live/hydration parity for adapter-owned entities.
- Playwright hydration smoke proves `mock_parity` survives reload with correct card layout.
