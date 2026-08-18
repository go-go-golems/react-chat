---
Title: Complete ChatProvider transport foundation intern implementation guide
Ticket: REACT-CHAT-TRANSPORT-001
Status: active
Topics:
    - chat
    - websocket
    - chat-provider
    - sessionstream
    - react
    - architecture
DocType: design-doc
Intent: long-term
Owners: []
RelatedFiles:
    - Path: /home/manuel/workspaces/2026-08-12/deploy-dev-indexer/react-chat/packages/chat-provider/src/core/createChatClient.ts
      Note: Session HTTP send stop tool and persistence APIs extended by the design
    - Path: /home/manuel/workspaces/2026-08-12/deploy-dev-indexer/react-chat/packages/chat-provider/src/ws/protocol.ts
      Note: Current untyped frame normalization and numeric ordinal boundary to replace
    - Path: /home/manuel/workspaces/2026-08-12/deploy-dev-indexer/react-chat/packages/chat-provider/src/ws/timelineAdapterRegistry.ts
      Note: Existing live and hydration projection boundary that the transport must preserve
    - Path: /home/manuel/workspaces/2026-08-12/deploy-dev-indexer/react-chat/packages/chat-provider/src/ws/wsManager.ts
      Note: Current Redux-coupled socket lifecycle to split into transport and projection layers
    - Path: /home/manuel/workspaces/2026-08-12/deploy-dev-indexer/coinvault/web/src/ws/wsManager.ts
      Note: Future consumer and source of reconnect ownership buffering and decoder requirements
    - Path: /home/manuel/workspaces/2026-08-12/deploy-dev-indexer/rag-ttc/apps/customer/web/packages/ttc-garden-assistant/package.json
      Note: Published ChatProvider dependency and package scripts to update
    - Path: /home/manuel/workspaces/2026-08-12/deploy-dev-indexer/rag-ttc/apps/customer/web/packages/ttc-garden-assistant/src/features/chat/TtcChatProviderShell.tsx
      Note: Primary downstream integration and real-backend validation target
ExternalSources:
    - https://github.com/goldeneagle/coinvault/issues/9
Summary: End-to-end intern guide for transport extraction, typed protocol, lifecycle correctness, session policy, safe diagnostics, attachments, RAG-TTC adoption, and future CoinVault integration.
LastUpdated: 2026-08-18T19:52:27.884519875-04:00
WhatFor: Give a new engineer enough architecture, protocol, API, sequencing, and validation detail to implement the complete shared ChatProvider foundation and migrate RAG-TTC safely.
WhenToUse: Use as the primary implementation and review guide for REACT-CHAT-TRANSPORT-001, and later as context for the CoinVault migration tracked in issue 9.
---


# Complete ChatProvider transport foundation intern implementation guide

## Executive Summary

This project turns `@go-go-golems/chat-provider` into the canonical browser client for the sessionstream chat transport and proves the result in the real RAG-TTC Garden Assistant. The work starts with the observed heartbeat failure, but deliberately completes the adjacent foundation now: typed protocol frames, a Redux-independent transport, explicit connection states, bounded reconnect, string-safe ordinals, resume and deduplication, bounded hydration buffering, safe diagnostics, request/auth hooks, session policy, attachments, and reusable conformance tests.

CoinVault is not migrated in this ticket. Its current implementation is used as a requirements source because it already contains behaviors that ChatProvider lacks: consumer ownership, reconnect, protobuf decoding, bounded buffering, attachment APIs, and richer snapshot mapping. The shared API produced here must allow CoinVault to adopt the transport later without adopting ChatProvider's Redux store or deleting product-specific mappings. That downstream work is tracked in [goldeneagle/coinvault#9](https://github.com/goldeneagle/coinvault/issues/9).

The implementation should be delivered as a series of focused commits. Do not maintain parallel old and new transports through a compatibility adapter. Change ChatProvider internally, update its tests and public exports, then update RAG-TTC in the same project. If a public behavior must change, document it and update consumers directly.

### Definition of done

- ChatProvider has one store-independent sessionstream transport.
- Application heartbeat is correct over repeated idle intervals.
- Reconnect and resume are deterministic, bounded, ordered, and deduplicated.
- Ordinals never pass through unsafe JavaScript numbers.
- Connection readiness and errors are explicit rather than timer-assumed or swallowed.
- Debugging is metadata-safe by default.
- Session restoration, request customization, and attachments have documented APIs.
- RAG-TTC consumes the updated package and passes unit, build, and real-backend smoke tests.
- The real full-corpus Garden Assistant survives more than three heartbeat intervals and a forced reconnect during a tool-using run.
- CoinVault issue #9 is updated with the final package version and integration API.

## Problem Statement

### The immediate failure

Sessionstream uses an application-level JSON heartbeat in addition to WebSocket protocol control frames. With current defaults, the server sends a ping after 30 seconds and waits 10 seconds for a pong containing the same nonce. ChatProvider recognizes a ping in `protocol.ts`, but `WsManager.handleFrame` ignores it. An otherwise healthy browser is therefore closed around 40 seconds after becoming idle. RAG-TTC exposes the close as code `1006`. CoinVault frequently masks it because its local manager reconnects after abnormal closure.

The correct response is structurally simple:

```json
{"pong":{"nonce":"the exact nonce from ping"}}
```

The nonce is opaque. It must not be parsed, trimmed, regenerated, or converted to a number.

### The architectural failure

ChatProvider's current `WsManager` mixes three responsibilities:

1. Sessionstream wire protocol and WebSocket lifecycle.
2. Hydration and ordered event delivery.
3. Projection into ChatProvider's Redux timeline and tool runtime.

Because it imports `AppDispatch`, `applySnapshot`, `applyUIEvent`, `ToolRuntime`, and `TimelineAdapterRegistry`, another product cannot reuse its connection lifecycle independently. CoinVault therefore imports only `buildWebSocketURL` and owns another manager. That manager has accumulated reconnect, consumer reference counting, buffering, snapshot state, logging, and its own generated-protobuf decoder.

### The behavioral gaps

The current shared client also has several correctness and integration gaps:

- `connect()` resolves after an unconditional 1.5-second timeout even if the socket did not open.
- Status is an arbitrary string rather than a stable public union.
- `send()` and `connect()` catch errors and expose no failure to the caller.
- Subscribe always starts from ordinal zero; the parsed ordinal is unused.
- Hydration buffering is unbounded.
- Ordinals are converted to `number`, despite originating as protobuf `uint64`.
- Debug events can contain complete raw frames, prompts, tool arguments, results, and attachment data.
- HTTP calls use global `fetch` and fixed headers, leaving no narrow authentication or testing seam.
- Session restoration is configured through loosely related flags; RAG-TTC manually clears local storage during provider construction.
- `send(prompt: string)` has no first-class attachment references even though CoinVault already supports image attachments.

### Project boundary

This ticket changes React Chat and RAG-TTC. It defines the future CoinVault boundary but does not edit CoinVault. The product-specific layers remain separate:

```text
                         SHARED FOUNDATION
  +-----------------------------------------------------------+
  | sessionstream codec | transport lifecycle | HTTP client   |
  | heartbeat           | reconnect/resume    | session policy|
  | status/errors       | safe diagnostics    | attachments   |
  +----------------------------+------------------------------+
                               |
                  typed frames and client operations
               +---------------+----------------+
               |                                |
        REACT CHAT / RAG-TTC               COINVAULT (later)
  +-----------------------------+     +---------------------------+
  | ChatProvider Redux store    |     | CoinVault Redux/domain    |
  | timeline adapters           |     | protobuf/domain mappings  |
  | TTC tools and widgets       |     | auth lease and admin UI   |
  | Garden presentation         |     | CoinVault widgets         |
  +-----------------------------+     +---------------------------+
```

## Proposed Solution

## Part I — Understand the Existing System

### React Chat package structure

The implementation lives primarily under `packages/chat-provider/src`:

- `ws/protocol.ts` parses JSON envelopes and builds subscribe URLs/frames.
- `ws/wsManager.ts` owns the current socket and directly projects frames.
- `ws/timelineEvents.ts` maps live UI events through adapters into Redux.
- `ws/timelineSnapshot.ts` maps snapshot entities through the same registry.
- `ws/timelineAdapterRegistry.ts` defines product extension points and explicit hydration support.
- `core/createChatClient.ts` owns session creation, message sending, stop, tool manifest synchronization, and session persistence.
- `react/ChatProvider.tsx` constructs the store, registries, tool runtime, client, and manager.

The timeline adapter design is valuable and should remain. An adapter can support live events, hydration entities, or both, and must explicitly state when hydration is unsupported. The transport refactor should feed this layer; it should not absorb it.

### RAG-TTC integration

The Garden Assistant is already a real ChatProvider consumer. `TtcChatProviderShell.tsx` supplies runtime paths, widgets, timeline adapters, session behavior, and developer logging. `TtcGardenAssistantExtensions.tsx` registers TTC-specific tools and widgets. `ttcTimelineAdapters.ts` maps TTC result entities and live events.

RAG-TTC is therefore the ideal first proof:

- it exercises backend tools and source-result widgets;
- it reproduces the heartbeat close without CoinVault's reconnect masking;
- it has a real full-corpus bundle and cache configuration;
- it does not require the CoinVault auth lease or admin state.

### CoinVault requirements source

CoinVault's `web/src/ws/wsManager.ts` shows the minimum shape required by a second consumer:

- an `acquire()`/release ownership model;
- connection keyed by session and base prefix;
- reconnect after an established connection closes;
- explicit hydrating/subscribed flags;
- bounded buffering and event ordering;
- a consumer callback independent of socket parsing;
- snapshot ordinal state;
- product-owned protobuf decoding and entity mapping.

CoinVault's attachment API and parsing tests show another necessary shared capability: message submission must carry attachment references, and both live and hydrated messages must preserve the same attachment model.

## Part II — Target Architecture

Split the current implementation into four layers.

```text
Layer 4  ChatProvider React/Redux integration
         store, overlay, tools, widgets, adapters
              ^
              | TransportObserver callbacks
              |
Layer 3  SessionStreamTransport
         lifecycle, heartbeat, resume, ordering, buffering
              ^
              | SessionStreamCodec
              |
Layer 2  Protocol codec
         parse/validate frames, encode subscribe/pong
              ^
              | text WebSocket messages
              |
Layer 1  Platform adapters
         WebSocket factory, timers, randomness, fetch
```

No layer may import a layer above it. In particular, the transport package must not import Redux, React, timeline adapters, tools, or widgets.

### Proposed module layout

```text
packages/chat-provider/src/
  transport/
    types.ts
    sessionStreamCodec.ts
    sessionStreamTransport.ts
    reconnectPolicy.ts
    diagnostics.ts
    testkit/
      fakeWebSocket.ts
      fakeClock.ts
      conformance.ts
  ws/
    chatTimelineConsumer.ts
    timelineAdapterRegistry.ts
    timelineEvents.ts
    timelineSnapshot.ts
  http/
    chatHttpClient.ts
    attachments.ts
  core/
    createChatClient.ts
    sessionPolicy.ts
```

Names may be adjusted to match repository conventions, but preserve the dependency direction.

## Part III — Typed Protocol and Ordinals

### Opaque ordinal type

Use canonical decimal strings at public boundaries:

```ts
export type EventOrdinal = string & { readonly __eventOrdinal: unique symbol };

export function parseEventOrdinal(value: unknown): EventOrdinal {
  const text = typeof value === 'bigint' ? value.toString() : String(value ?? '');
  if (!/^(0|[1-9][0-9]*)$/.test(text)) {
    throw new ProtocolError('invalid ordinal');
  }
  return text as EventOrdinal;
}

export function compareOrdinals(a: EventOrdinal, b: EventOrdinal): number {
  const aa = BigInt(a);
  const bb = BigInt(b);
  return aa < bb ? -1 : aa > bb ? 1 : 0;
}
```

Never use `Number(ordinal)`. Never sort ordinal strings lexicographically. Decimal strings serialize cleanly to JSON and interoperate with protobuf `uint64` values.

### Frame union

Replace the generic canonical record with a discriminated union:

```ts
export type SessionStreamFrame =
  | { type: 'hello'; connectionId?: string }
  | { type: 'ping'; nonce: string }
  | { type: 'pong'; nonce: string }
  | { type: 'subscribed'; sessionId: string; sinceOrdinal: EventOrdinal }
  | { type: 'unsubscribed'; sessionId: string }
  | {
      type: 'snapshot';
      sessionId: string;
      ordinal: EventOrdinal;
      entities: SnapshotEntityFrame[];
    }
  | {
      type: 'ui-event';
      sessionId: string;
      ordinal: EventOrdinal;
      name: string;
      payload: unknown;
    }
  | { type: 'error'; sessionId?: string; code?: string; message: string };
```

Unknown frames should produce a typed protocol error or an explicit `unknown` variant. They should not silently become an arbitrary record.

### Codec interface

```ts
export interface SessionStreamCodec {
  decodeServerFrame(raw: string): SessionStreamFrame;
  encodeSubscribe(args: {
    sessionId: string;
    sinceSnapshotOrdinal: EventOrdinal;
  }): string;
  encodePong(nonce: string): string;
}
```

Ship a default JSON codec matching the currently deployed sessionstream endpoint. Keep the interface narrow enough that CoinVault can later use its generated protobuf decoder. Do not add an adapter for CoinVault now.

Validate required fields at the codec boundary. A malformed ping without a string nonce is a protocol error; it is not a pong with an empty or invented nonce.

## Part IV — Transport API

### Public types

```ts
export type TransportStatus =
  | 'idle'
  | 'connecting'
  | 'socket-open'
  | 'subscribing'
  | 'hydrating'
  | 'ready'
  | 'backoff'
  | 'stopped'
  | 'failed';

export type TransportError = {
  kind: 'network' | 'protocol' | 'consumer' | 'buffer-overflow' | 'aborted';
  message: string;
  cause?: unknown;
  retryable: boolean;
};

export interface TransportObserver {
  onSnapshot(frame: Extract<SessionStreamFrame, { type: 'snapshot' }>):
    void | Promise<void>;
  onEvent(frame: Extract<SessionStreamFrame, { type: 'ui-event' }>):
    void | Promise<void>;
  onStatus?(status: TransportStatus): void;
  onError?(error: TransportError): void;
  onDiagnostic?(event: SafeTransportDiagnostic): void;
}

export type ConnectRequest = {
  sessionId: string;
  sinceOrdinal?: EventOrdinal;
  signal?: AbortSignal;
};
```

### Transport object

```ts
export interface SessionStreamTransport {
  connect(request: ConnectRequest, observer: TransportObserver): Promise<void>;
  disconnect(reason?: string): void;
  dispose(): void;
  readonly status: TransportStatus;
  readonly lastCommittedOrdinal: EventOrdinal;
}
```

`connect()` resolves only when the subscription is usable according to the selected hydration policy. For the normal ChatProvider path, that means the snapshot has been accepted and buffered live events have been delivered. It rejects on terminal failure or abort. Do not retain the 1.5-second success timeout.

Use `dispose()` as the initial ownership model. Full reference counting is unnecessary in the shared core until a demonstrated consumer needs it. CoinVault can wrap one transport in its existing lease/acquire layer later.

### Platform dependencies

Constructor dependencies make the transport deterministic without a framework:

```ts
export type TransportPlatform = {
  createWebSocket(url: string): WebSocketLike;
  setTimeout(fn: () => void, milliseconds: number): unknown;
  clearTimeout(handle: unknown): void;
  random(): number;
};
```

Production defaults use browser APIs. Tests use a fake socket, fake clock, and deterministic random values.

## Part V — Lifecycle State Machine

```text
                         socket error / abnormal close
                        +-----------------------------+
                        |                             v
 idle -- connect --> connecting --> socket-open --> subscribing
  ^          |              |              |              |
  |          |              |              |              v
  |          +--------------+--------------+----------> hydrating
  |                                                    |      |
  |                                                    |      v
  |                                                    +--> ready
  |                                                           |
  |                                  retryable failure         |
  |                         +----------------------------------+
  |                         v
  |                      backoff -- timer --> connecting
  |
  +-- disconnect/dispose --> stopped

 terminal protocol/consumer failure --> failed
```

### Generation safety

Each connection attempt receives a monotonically increasing generation. Every WebSocket callback compares its captured generation with the active generation. Disconnect, dispose, and a replacement connection increment the generation before closing the previous socket. This prevents stale `close` or `message` callbacks from changing the new connection.

### Hello and subscribe

Follow the deployed backend contract consistently. If the server requires `hello` before subscribe, subscribe from the hello handler. Do not have one client subscribe in `onopen` while another waits for hello. Add an integration fixture that locks this down.

### Heartbeat

Heartbeat is handled before any hydration or product dispatch:

```ts
if (frame.type === 'ping') {
  send(codec.encodePong(frame.nonce));
  diagnostics.emit({ type: 'heartbeat-pong-sent' });
  return;
}
```

Pings do not change the resume ordinal and never reach Redux or tools. If the socket is no longer open, treat the failed send as an ordinary network failure.

### Intentional versus abnormal close

Set an intentional-stop flag and invalidate the generation before calling `close()`. The subsequent browser close event must not schedule reconnect. Logout, reset, unmount, route teardown, and explicit abort are intentional.

### Reconnect policy

Use bounded exponential backoff with jitter:

```ts
base = 250ms
cap = 10s
raw = min(cap, base * 2 ** attempt)
delay = raw * (0.8 + random() * 0.4)
```

Only one reconnect timer may exist. Reset attempts after the connection reaches `ready` and remains stable for a documented interval. Authentication/protocol failures should normally be terminal; abnormal network closes are retryable. Allow the caller to abort backoff using `AbortSignal` or `disconnect()`.

## Part VI — Hydration, Resume, Ordering, and Backpressure

### Committed ordinal

The transport owns a `lastCommittedOrdinal`. Advance it only after the observer successfully accepts a snapshot or event. Receiving or decoding a frame is insufficient. This prevents a failed product projection from being skipped after reconnect.

```text
bytes received -> decode -> validate -> observer accepts -> commit ordinal
                                      X
                                      +-- failure: do not advance
```

### Snapshot and live-event overlap

While hydrating, buffer live UI events. After the observer accepts the snapshot:

1. discard buffered events at or below the snapshot ordinal;
2. sort remaining events by ordinal;
3. remove duplicate ordinals;
4. deliver each event sequentially;
5. advance the committed ordinal after each successful delivery;
6. transition to `ready`.

Do not execute tool side effects while applying a historical snapshot. Existing timeline adapters distinguish hydration from live projection; preserve that distinction.

### Buffer limits

Use configurable safe defaults, such as 1,000 frames and a total-byte limit. A buffer overflow is visible and deterministic. Do not silently discard the oldest event because that creates an unrecoverable transcript gap. Recommended policy:

- emit a `buffer-overflow` error;
- close the connection;
- clear partial hydration state;
- retry from the last committed ordinal if the error is configured as retryable;
- stop after the normal retry limit.

### Deduplication

Deduplicate by session ID and ordinal, not entity ID. Several UI events may update the same entity; entity identity is not event identity. If the backend permits multiple events at the same ordinal, confirm and encode the actual compound key before implementation.

## Part VII — ChatProvider Integration

Create a thin observer that adapts transport frames to existing ChatProvider behavior:

```ts
const observer: TransportObserver = {
  async onSnapshot(frame) {
    applySnapshot(frame, dispatch, sessionId, adapterRegistry);
  },
  async onEvent(frame) {
    applyUIEvent(frame, dispatch, sessionId, toolRuntime, adapterRegistry);
  },
  onStatus(status) {
    dispatch(overlaySlice.actions.setWsStatus(status));
  },
  onError(error) {
    dispatch(overlaySlice.actions.setError(error.message));
  },
};
```

The exact adapter can remain named `WsManager` temporarily only if it is purely a ChatProvider integration object. Prefer naming that exposes the distinction, such as `ChatTimelineConnection`.

### Error semantics

Change `ChatClient.connect()` and `send()` to reject or return a typed result after updating Redux. Callers need to distinguish success from failure.

```ts
type ChatOperationResult =
  | { ok: true }
  | { ok: false; error: ChatClientError };
```

Pick either thrown errors or result objects consistently. Do not silently swallow errors. Update RAG-TTC call sites to intentionally handle or ignore a returned promise.

## Part VIII — HTTP, Authentication, and Request Customization

Create a small HTTP client rather than a middleware framework:

```ts
export type ChatHttpConfig = {
  apiBase: string;
  fetch?: typeof fetch;
  headers?: () => HeadersInit | Promise<HeadersInit>;
  beforeRequest?: (operation: ChatOperation) => void | Promise<void>;
};
```

Every operation uses the injected fetch and merges JSON content type with returned headers. `beforeRequest` is suitable for a narrow lease/authorization gate if CoinVault needs it later. Never log returned authorization headers.

WebSocket configuration should similarly accept either `basePrefix` or a URL builder:

```ts
buildWebSocketURL?: (args: { sessionId: string; basePrefix: string }) => string;
```

Do not invent token query parameters. Use the deployment's existing cookie/auth model unless a product explicitly supplies a URL builder.

## Part IX — Session Policy

Replace loosely coupled persistence flags and application-side storage clearing with one declarative policy:

```ts
export type SessionPolicy =
  | { restore: 'never' }
  | { restore: 'local-storage'; storageKey: string }
  | { restore: 'url'; parameter: string; fallback?: 'local-storage' | 'new' };
```

RAG-TTC uses `{ restore: 'never' }`: a page load starts a fresh conversation, while the in-memory session remains stable for the loaded page. This removes `clearPersistedGardenSession()` from provider construction.

If an application needs both URL and storage restoration, add that mode because a real consumer requires it, not to preserve every combination of the old flags. This project does not require backwards compatibility; update known consumers directly.

## Part X — Attachments

### Shared model

Define attachment references independently of upload UI:

```ts
export type ChatAttachmentRef = {
  attachmentId: string;
  kind: 'image' | 'file';
  mediaType: string;
  filename?: string;
  sizeBytes?: number;
  width?: number;
  height?: number;
  url?: string;
};

export type SendMessageRequest = {
  prompt: string;
  attachments?: ChatAttachmentRef[];
};
```

Change `client.send(prompt)` to `client.send(request)`. Update all known consumers in the same change rather than maintaining an overload for backwards compatibility.

### Attachment operations

Expose the backend operations already demonstrated by CoinVault:

```ts
client.attachments.upload(sessionId, file, signal)
client.attachments.remove(sessionId, attachmentId, signal)
```

The HTTP client owns endpoints and errors. RAG-TTC does not need to expose attachment UI immediately, but unit tests should prove that attachment references pass through message submission. CoinVault can later reuse the client API or provide compatible endpoint hooks.

### Projection parity

Attachments on live user-message events and hydrated snapshot messages must normalize to the same `ChatAttachmentRef` structure. Add adapter conformance fixtures for both paths.

## Part XI — Diagnostics and Privacy

### Safe-by-default diagnostic union

```ts
export type SafeTransportDiagnostic =
  | { type: 'state-changed'; from: TransportStatus; to: TransportStatus }
  | { type: 'socket-closed'; code: number; reason?: string }
  | { type: 'reconnect-scheduled'; attempt: number; delayMs: number }
  | { type: 'frame-received'; frameType: string; ordinal?: EventOrdinal; size: number }
  | { type: 'heartbeat-pong-sent' }
  | { type: 'resume-requested'; sinceOrdinal: EventOrdinal }
  | { type: 'buffer-depth'; frames: number; bytes: number };
```

Do not include raw frames, parsed payloads, prompts, tool arguments, results, attachment bytes, URLs containing credentials, or headers.

If raw debugging remains necessary, put it behind a deliberately alarming development-only option such as `unsafeDebugFrames`, default false. RAG-TTC's current developer logger must stop logging `input`, `arguments`, `result`, `error`, and the complete payload. It can retain tool call ID, tool name, status, event name, ordinal, and adapter name.

## Part XII — Conformance Test Kit

Build reusable deterministic test utilities in ChatProvider. They are not a new published package unless later needed.

### Fake WebSocket capabilities

- record constructed URLs and sent messages;
- trigger open, message, error, and close;
- expose ready state;
- reject sends when not open;
- preserve separate instances for reconnect assertions.

### Fake clock capabilities

- inspect pending timer count;
- advance by exact milliseconds;
- execute timers deterministically;
- verify timers are cancelled on disconnect/dispose.

### Core protocol tests

- every supported envelope decodes to the typed union;
- malformed required fields fail clearly;
- ordinals above `Number.MAX_SAFE_INTEGER` remain exact;
- subscribe serializes the exact decimal ordinal;
- pong echoes the nonce exactly.

### Core lifecycle tests

- connect waits for usable subscription/hydration;
- ping produces exactly one pong and no observer event;
- abnormal close schedules one bounded reconnect;
- intentional disconnect schedules none;
- stale socket callbacks are ignored;
- retry attempts reset after stability;
- abort cancels connect or backoff;
- terminal protocol/auth failure does not loop.

### Resume/hydration tests

- live frames arriving before snapshot are buffered;
- frames at or below snapshot ordinal are discarded;
- out-of-order buffered events are sorted numerically by bigint ordinal;
- duplicate ordinals deliver once;
- observer failure does not advance committed ordinal;
- overflow is explicit and follows the documented recovery policy;
- reconnect subscribes from the last committed ordinal.

### Projection conformance tests

For each core or TTC adapter, compare equivalent live and snapshot inputs:

```text
live frame ----> projectLive -----+
                                  +--> equivalent normalized entity/state
snapshot entity -> projectSnapshot+
```

Cover text messages, tool calls, tool results, reasoning/status mutations, widgets, cancellation, and attachment-bearing user messages. Historical hydration must not execute frontend tools.

## Part XIII — RAG-TTC Migration and Real Validation

### Source changes

1. Update the Garden Assistant package to the new ChatProvider version or workspace link during development.
2. Replace manual storage clearing with `sessionPolicy: { restore: 'never' }`.
3. Update `client.send` call sites to the request object.
4. Replace payload-rich logging with safe diagnostics.
5. Preserve TTC widget definitions, tool extensions, and timeline adapters.
6. Add focused unit tests for the resulting provider configuration.

### Build validation

From the appropriate repository roots, run the existing package scripts using pnpm:

```bash
pnpm --filter @go-go-golems/chat-provider test
pnpm --filter @go-go-golems/chat-provider typecheck
pnpm --filter @go-go-golems/chat-provider build

pnpm --filter ttc-garden-assistant test
pnpm --filter ttc-garden-assistant typecheck
pnpm --filter ttc-garden-assistant build
```

Adjust filter names only after checking the workspace manifests. Do not create a second package manager lockfile.

### Real-backend smoke test

Use the existing real full-corpus bundle and `~/.cache/rag-ttc/...` caches. Start the server through devctl in tmux, per repository instructions. Capture logs with `tmux capture-pane`.

Test sequence:

1. Load the real Garden Assistant, not a mock.
2. Open chat and establish a new session.
3. Leave the connection idle for at least 100 seconds.
4. Confirm heartbeat diagnostics and absence of close `1006`.
5. Ask a query that invokes `ttc_search` and `ttc_search_results_show`.
6. Confirm tool and widget completion with no sensitive payload logging.
7. Start another sufficiently long request.
8. Force only the browser WebSocket connection closed; do not kill unrelated services.
9. Confirm bounded reconnect and a resume subscription from the committed ordinal.
10. Confirm no duplicate message, tool call, tool result, or widget entity.
11. Stop/restart the assistant intentionally and confirm no orphan reconnect loop remains.

Record timestamps, close codes, resume ordinal, reconnect attempt/delay, and final outcome in the diary. Do not record prompts or results containing sensitive data.

## Part XIV — Future CoinVault Integration

When this foundation is released, CoinVault issue #9 should use it as follows:

```ts
const transport = createSessionStreamTransport({
  codec: coinvaultProtobufCodec,
  platform: browserTransportPlatform,
  url: buildCoinVaultWebSocketURL(...),
});

await transport.connect(
  { sessionId, sinceOrdinal, signal },
  {
    onSnapshot: applyCoinVaultSnapshot,
    onEvent: applyCoinVaultUiEvent,
    onStatus: updateCoinVaultConnectionState,
    onError: showCoinVaultConnectionError,
  },
);
```

CoinVault retains:

- generated protobuf files and decoder;
- `uiEventMapping.ts`, `snapshotMapping.ts`, and domain entity helpers;
- Redux state and admin presentation;
- authorization lease policy, expressed through the shared pre-connect/request hook if required;
- CoinVault-specific widgets and attachment UI.

CoinVault removes after parity succeeds:

- local socket construction and callbacks;
- heartbeat logic;
- reconnect timer/state;
- resume sequencing and generic buffering;
- duplicated lifecycle diagnostics.

Do not maintain both transports behind a feature flag unless the owner explicitly requests a staged production rollout. The repository guideline rejects speculative compatibility layers.

## Design Decisions

1. **Complete the foundation now.** RAG-TTC becomes a real proof and CoinVault later consumes a stable boundary rather than shaping it during migration.
2. **Transport is independent of React and Redux.** This is the enabling decision for CoinVault reuse.
3. **Codec injection is narrow.** It supports JSON today and protobuf later without becoming a general serialization framework.
4. **Ordinals are decimal strings.** This preserves protobuf `uint64` precision and remains JSON-friendly.
5. **Delivery acknowledgment defines resume progress.** A decoded frame is not committed until its consumer succeeds.
6. **Hydration and live projection remain distinct.** Historical replay must not repeat live side effects.
7. **Diagnostics are safe by default.** Raw conversation frames are not normal observability data.
8. **Session behavior is declarative.** Products should not manipulate provider storage as a lifecycle workaround.
9. **Attachments enter the public client model now.** CoinVault already proves they are part of the shared chat contract.
10. **Simple disposal before reference counting.** The shared core needs deterministic ownership, not speculative multi-owner machinery.
11. **Known consumers update directly.** No backwards-compatibility overloads or adapters are included unless explicitly approved.
12. **RAG-TTC validation uses the real corpus.** Mock success cannot prove sessionstream lifecycle, tools, or widget delivery.

## Alternatives Considered

- Patch only ping/pong. This fixes the timer symptom but leaves reconnect, resume, unsafe ordinals, coupling, and downstream duplication intact.
- Copy CoinVault's manager into ChatProvider. It contains useful requirements but also product state, a fixed reconnect delay, numeric ordinals, and silent buffer truncation; copying would preserve the wrong boundary.
- Move all CoinVault mappings into ChatProvider. Those mappings are product semantics and would turn the shared package into a CoinVault dependency.
- Require CoinVault to adopt ChatProvider Redux. This unnecessarily couples transport reuse to application state migration.
- Publish a separate transport repository/package immediately. A module inside ChatProvider is sufficient until another repository proves independent versioning is valuable.
- Retain `send(string)` as an overload. The project explicitly does not need backwards compatibility; update known consumers to the clearer request shape.
- Build a generic request middleware chain. Injected fetch, headers, URL construction, and a pre-request hook cover known requirements with less surface area.
- Silently discard buffer overflow. It creates invisible transcript gaps and invalid resume state.
- Treat reconnect as heartbeat recovery. It interrupts in-flight streams and violates the server protocol.

## Implementation Plan

Use the following phases and commits. Keep code and diary updates paired at appropriate checkpoints.

### Phase 0 — Baseline and fixtures

- Record current package scripts and versions.
- Capture sanitized examples of every server frame.
- Confirm hello/subscribe and resume semantics against sessionstream source and the deployed backend.
- Add regression tests demonstrating the missing pong and unsafe current readiness behavior.

Suggested commit: `test(chat-provider): capture sessionstream transport contracts`

### Phase 1 — Typed protocol

- Add `EventOrdinal`, parsing, comparison, and serialization.
- Add the discriminated frame union and protocol error type.
- Implement the default JSON codec.
- Replace generic-record parser tests.
- Export types from the package's documented transport entry point.

Suggested commit: `refactor(chat-provider): type sessionstream protocol frames`

### Phase 2 — Independent transport

- Add platform, observer, configuration, status, and error types.
- Implement lifecycle generation safety and disposal.
- Implement hello/subscribe handshake and exact readiness semantics.
- Add heartbeat handling.
- Remove Redux/tool imports from the transport.

Suggested commit: `feat(chat-provider): add independent sessionstream transport`

### Phase 3 — Reconnect and resume

- Implement bounded jittered backoff.
- Track committed ordinal after successful observer delivery.
- Implement buffered hydration ordering, deduplication, and limits.
- Add abort and intentional-close behavior.
- Complete deterministic lifecycle and recovery tests.

Suggested commit: `feat(chat-provider): add ordered reconnect and resume`

### Phase 4 — ChatProvider adapter and client semantics

- Adapt snapshots and events into the existing Redux/timeline adapter layer.
- Replace arbitrary status strings with the shared union.
- Remove the 1.5-second success timeout.
- Make connect/send failure observable to callers.
- Update provider construction and cleanup.

Suggested commit: `refactor(chat-provider): project shared transport into chat state`

### Phase 5 — HTTP, session policy, and attachments

- Introduce the injectable HTTP client and narrow request hooks.
- Add declarative session policy and update persistence tests.
- Change send to `SendMessageRequest`.
- Add attachment upload/remove operations and attachment projection parity fixtures.
- Update all React Chat examples and stories.

Suggested commit: `feat(chat-provider): unify sessions requests and attachments`

### Phase 6 — Safe diagnostics

- Replace raw default events with metadata-only transport diagnostics.
- Add explicit unsafe development opt-in if still required.
- Add tests that search serialized diagnostics for forbidden content.
- Document privacy expectations.

Suggested commit: `refactor(chat-provider): make transport diagnostics safe by default`

### Phase 7 — RAG-TTC adoption

- Update package version/workspace resolution and lockfile intentionally.
- Use the new session policy and send API.
- Simplify TTC debug logging.
- Update unit tests and build.
- Restart the real full-corpus assistant and run the smoke sequence.

Suggested commit in RAG-TTC: `feat(garden-assistant): adopt shared chat transport foundation`

### Phase 8 — Documentation and release handoff

- Record final commands, failures, evidence, versions, and commit hashes in the diary.
- Update package API docs and changelog.
- Publish or identify the exact consumable version.
- Update CoinVault issue #9 with API examples and the verified version.
- Run `docmgr doctor` and upload the final guide to reMarkable.

Suggested documentation commit: `docs: complete ChatProvider transport implementation handoff`

### Review gates

Request focused review after:

- protocol and ordinal types;
- transport state machine and resume semantics;
- public client/session/attachment API changes;
- RAG-TTC real-backend validation.

The most important invariants are exact heartbeat echo, one active socket generation, no reconnect after intentional stop, commit-after-delivery, bigint-safe ordinal ordering, no live side effects during hydration, and safe diagnostics.

## Open Questions

Resolve these in Phase 0 before writing the corresponding behavior:

1. Does the deployed server require subscribe only after hello, and is that contract identical in local development?
2. Does `sinceSnapshotOrdinal` mean strictly greater than the supplied ordinal, or can the boundary event repeat?
3. Can multiple events share one ordinal? If so, what is the complete event identity?
4. Can live events arrive before or during snapshot delivery on one connection?
5. Which close codes/messages represent terminal authentication or authorization failure?
6. What stability interval should reset reconnect attempts?
7. Should a consumer projection error retry from the last committed ordinal or become terminal to avoid a poison-frame loop?
8. Do RAG-TTC and CoinVault attachment endpoints have identical request/response contracts? If not, keep endpoint operations injectable while preserving the shared reference type.
9. Does CoinVault's lease require a pre-WebSocket asynchronous gate, or is cookie authorization sufficient once the lease is acquired by application code?
10. What package version and publication mechanism will RAG-TTC and later CoinVault consume?

## References

### Ticket documents

- [Initial transport convergence design](./01-chatprovider-transport-convergence-and-downstream-migration-guide.md)
- [Investigation diary](../reference/01-investigation-diary.md)
- [Task list](../tasks.md)
- [CoinVault issue #9](https://github.com/goldeneagle/coinvault/issues/9)

### React Chat implementation

- `packages/chat-provider/src/ws/wsManager.ts`
- `packages/chat-provider/src/ws/protocol.ts`
- `packages/chat-provider/src/ws/timelineAdapterRegistry.ts`
- `packages/chat-provider/src/ws/timelineEvents.ts`
- `packages/chat-provider/src/ws/timelineSnapshot.ts`
- `packages/chat-provider/src/core/createChatClient.ts`
- `packages/chat-provider/src/core/extensions.ts`
- `packages/chat-provider/src/react/ChatProvider.tsx`

### RAG-TTC integration

- `apps/customer/web/packages/ttc-garden-assistant/src/features/chat/TtcChatProviderShell.tsx`
- `apps/customer/web/packages/ttc-garden-assistant/src/features/chat/TtcGardenAssistantExtensions.tsx`
- `apps/customer/web/packages/ttc-garden-assistant/src/features/chat/ttcTimelineAdapters.ts`
- `apps/customer/web/packages/ttc-garden-assistant/package.json`

### CoinVault requirements references

- `web/src/ws/wsManager.ts`
- `web/src/ws/protobuf.ts`
- `web/src/ws/uiEventMapping.ts`
- `web/src/ws/snapshotMapping.ts`
- `web/src/ws/entityData.ts`
- `web/src/ws/wsManager.test.ts`
- `web/src/ws/parsing.test.ts`
- `web/src/api/chatApi.ts`

### Sessionstream history

- `0dbd8e5`: heartbeat state machine
- `5a1d9eb`: pong/deadline arbitration
- `c40a861`: downstream WebSocket hardening merge
- CoinVault `d4f341c`: abnormal-close reconnect behavior that can mask missing pong
