---
Title: ChatProvider transport convergence and downstream migration guide
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
    - Path: /home/manuel/workspaces/2026-08-12/deploy-dev-indexer/coinvault/web/src/ws/wsManager.ts
      Note: 'Parallel lifecycle implementation covered by downstream issue #9'
    - Path: /home/manuel/workspaces/2026-08-12/deploy-dev-indexer/rag-ttc/apps/customer/web/packages/ttc-garden-assistant/package.json
      Note: Downstream ChatProvider version to update
    - Path: /home/manuel/workspaces/2026-08-12/deploy-dev-indexer/rag-ttc/apps/customer/web/packages/ttc-garden-assistant/src/features/chat/TtcChatProviderShell.tsx
      Note: Real Garden Assistant ChatProvider integration proof
    - Path: /home/manuel/workspaces/2026-08-12/deploy-dev-indexer/react-chat/packages/chat-provider/src/ws/protocol.ts
      Note: Wire-envelope parser that already recognizes ping and pong
    - Path: /home/manuel/workspaces/2026-08-12/deploy-dev-indexer/react-chat/packages/chat-provider/src/ws/wsManager.ts
      Note: Canonical browser socket lifecycle and immediate heartbeat/reconnect implementation target
    - Path: /home/manuel/workspaces/2026-08-12/deploy-dev-indexer/coinvault/web/src/ws/snapshotMapping.ts
      Note: CoinVault-specific hydration mapping that remains product-owned
    - Path: /home/manuel/workspaces/2026-08-12/deploy-dev-indexer/coinvault/web/src/ws/uiEventMapping.ts
      Note: CoinVault-specific mapping that remains product-owned
ExternalSources:
    - https://github.com/goldeneagle/coinvault/issues/9
Summary: Implementation design for heartbeat-correct shared WebSocket lifecycle, reconnect and resume semantics, and RAG-TTC adoption.
LastUpdated: 2026-08-18T19:33:51.664419923-04:00
WhatFor: Define the shared WebSocket lifecycle contract and give implementers a staged path from protocol correctness to downstream adoption.
WhenToUse: Before changing ChatProvider transport behavior or migrating RAG-TTC and CoinVault away from local transport copies.
---


# ChatProvider transport convergence and downstream migration guide

## Executive Summary

ChatProvider should become the single browser-side owner of the sessionstream WebSocket lifecycle: URL construction, connection state, application heartbeat, ordered frame delivery, reconnect, and resume. Product packages should retain their domain-specific decoding, state, tools, and presentation.

The immediate defect is concrete. Sessionstream sends a ping after 30 seconds of inactivity and expects a pong with the same nonce within 10 seconds. ChatProvider parses ping frames but drops them. An idle or long-running chat therefore closes with code `1006` at roughly 40 seconds. RAG-TTC exposes the close directly; CoinVault often hides it because its copied manager reconnects.

This ticket fixes the shared transport first, proves it in the real RAG-TTC Garden Assistant, and leaves CoinVault adoption to [goldeneagle/coinvault#9](https://github.com/goldeneagle/coinvault/issues/9). It deliberately does not combine transport convergence with a global Redux or UI rewrite.

## Problem Statement

There are currently three layers that can be mistaken for one another:

1. **Wire protocol:** sessionstream envelopes such as `ping`, `pong`, `event`, `snapshot`, and control messages.
2. **Connection lifecycle:** socket ownership, heartbeat response, reconnect/backoff, resume cursor, shutdown, and diagnostics.
3. **Product semantics:** protobuf decoding, Redux actions, widget/tool registration, domain projections, and UI.

React Chat implements part of layers 1 and 2. RAG-TTC consumes that package. CoinVault imports `buildWebSocketURL` but implements the remainder of layer 2 locally alongside its product semantics. This causes two failures:

- protocol changes do not reach every client; and
- fixes diverge because each application grows a different lifecycle state machine.

### Evidence

- `packages/chat-provider/src/ws/protocol.ts` recognizes ping and pong envelopes.
- `packages/chat-provider/src/ws/wsManager.ts` does not handle ping in frame dispatch and has no resilient reconnect/resume loop.
- RAG-TTC's Garden Assistant currently declares ChatProvider `0.2.1`, while this checkout is `0.4.2`; the current source still lacks pong handling, so upgrading alone is insufficient.
- CoinVault's manager reconnects after abnormal closure, masking the missing pong as periodic churn.
- Sessionstream commits `0dbd8e5` and `5a1d9eb` established heartbeat state/deadline behavior; merge `c40a861` carried downstream WebSocket hardening.

### Required outcome

An idle browser connection must remain healthy across repeated heartbeat intervals. A transient network loss must reconnect with bounded backoff and resume without gaps or duplicates. An intentional disconnect must remain disconnected. Consumers must be able to add product-specific interpretation without taking ownership of the socket.

## Proposed Solution

### 1. Make heartbeat response a transport invariant

When the parser returns `{ type: "ping", nonce }`, the manager immediately sends exactly one JSON pong on the same open socket:

```ts
socket.send(JSON.stringify({ pong: { nonce } }))
```

Treat the nonce as opaque; do not parse, regenerate, trim, or substitute it. Heartbeat frames do not enter chat state and do not reset event ordinals. A pong write failure follows the ordinary connection-failure path.

### 2. Introduce an explicit lifecycle state machine

Use a small state machine rather than scattered callback flags:

```text
idle -> connecting -> hydrating -> open
            |            |         |
            +------------+---------+-> backoff -> connecting

any state -- intentional disconnect/unmount --> stopped
```

The manager must distinguish intentional shutdown from transport failure. Only failure enters backoff. Keep one socket generation token so callbacks from a replaced socket cannot mutate current state.

Recommended reconnect policy:

- exponential delay with jitter;
- short initial delay and a bounded maximum;
- reset the attempt count after a stable successful connection;
- cancel the timer on disconnect/unmount;
- never run more than one connection attempt or reconnect timer.

Make timing injectable for deterministic tests. Defaults belong in one exported configuration object rather than component code.

### 3. Resume from committed delivery, not receipt

Track the highest ordinal successfully accepted by the consumer. On reconnect, request hydration/resume after that cursor using the backend's existing contract. Do not advance the cursor merely because bytes arrived: decode and consumer dispatch must succeed first.

During hydration, buffer live frames if the backend can overlap them, then merge by ordinal and deduplicate. If the existing backend guarantees snapshot-before-live ordering, document and test that guarantee rather than inventing a more complex merge layer.

### 4. Expose a narrow consumer boundary

The shared manager should emit typed protocol frames or a documented normalized transport event. Consumers may provide callbacks/decoders, but may not replace heartbeat or reconnect behavior.

The intended division is:

| Shared ChatProvider transport | Product package |
| --- | --- |
| socket construction and teardown | protobuf/domain mapping |
| ping/pong | Redux/domain actions |
| lifecycle status | widgets and frontend tools |
| reconnect/backoff | auth/lease policy inputs |
| resume cursor and ordered delivery | product UI and telemetry labels |

Avoid a generic compatibility adapter for CoinVault's current manager. If an extension point is truly missing, design it around a transport capability and add a focused test in React Chat.

### 5. Add safe diagnostics

Expose lifecycle events adequate to explain connection behavior: state transition, close code/reason, reconnect attempt/delay, resume cursor, and heartbeat send success/failure. Never log access tokens, prompts, model content, attachment payloads, or full WebSocket URLs containing credentials.

### 6. Prove the design in RAG-TTC

After the shared package passes unit tests:

- update the Garden Assistant dependency to the fixed package/workspace version;
- ensure `TtcChatProviderShell.tsx` uses the shared lifecycle without a local socket wrapper;
- rebuild the real full-corpus bundle;
- run the real assistant longer than three heartbeat intervals;
- exercise a response with search plus source-results widgets;
- force a socket interruption and verify recovery/resume.

Use `~/.cache/rag-ttc/...` for corpus/index caches, consistent with the current real setup. Do not validate only against the mock assistant.

## Design Decisions

1. **Transport convergence precedes store convergence.** Heartbeat/reconnect correctness is separable from Redux and presentation. This keeps the first change reviewable and lets CoinVault preserve its domain model.
2. **The client answers application heartbeat even if browser WebSocket already has protocol-level control frames.** Sessionstream's JSON heartbeat is the server contract visible to JavaScript.
3. **Reconnect is shared behavior.** A consumer should not need a copied manager to survive an abnormal close.
4. **Intentional shutdown is terminal.** Reconnect after unmount, logout, or explicit disconnect is both wasteful and potentially unsafe.
5. **Resume is cursor-based and ordered.** Replaying everything or trusting arrival order invites duplicate tool calls and UI mutations.
6. **RAG-TTC is the first integration proof.** It already consumes ChatProvider and reproduced the failure without CoinVault's reconnect masking it.
7. **CoinVault migration is tracked separately.** Its authorization lease, protobuf mappings, and larger local manager warrant a downstream review after the shared API settles.

## Alternatives Considered

- **Add pong only in RAG-TTC.** Fast but repeats protocol ownership in an application and leaves every other ChatProvider consumer vulnerable.
- **Patch CoinVault and RAG-TTC independently.** Corrects the immediate symptom but deepens duplication and guarantees future drift.
- **Upgrade RAG-TTC to current ChatProvider without source changes.** Insufficient: version `0.4.2` still parses and ignores ping.
- **Migrate CoinVault fully to ChatProvider Redux/provider state immediately.** Too broad for the protocol failure and makes behavioral parity difficult to review.
- **Rely on reconnect instead of pong.** Produces periodic interruption, can lose in-flight output, and violates the server contract.
- **Disable server heartbeat.** Removes dead-peer detection for every client and conceals client noncompliance.

## Implementation Plan

### Phase A — contract and deterministic tests

1. Capture representative ping, pong, event, close, and hydration frames as test fixtures.
2. Add fake-WebSocket tests asserting exact nonce echo, one pong per ping, and no dispatch into chat state.
3. Add injectable timer/randomness seams for reconnect tests.
4. Specify lifecycle states and public status semantics before altering the manager.

### Phase B — shared lifecycle

1. Implement pong handling in the manager.
2. Implement generation-safe connection ownership and intentional-stop behavior.
3. Implement bounded exponential reconnect with jitter.
4. Implement cursor-based resume using the existing server request shape.
5. Ensure errors in decode/consumer dispatch have an explicit policy and cannot silently advance the cursor.
6. Add sanitized lifecycle diagnostics.

### Phase C — React Chat verification

Run the package's unit tests, typecheck, lint, and build. Add an integration harness if unit tests cannot demonstrate snapshot/live ordering. Keep the server in tmux for browser interaction and inspect it with `capture-pane`.

### Phase D — RAG-TTC adoption

1. Bump/link the Garden Assistant to the fixed package version and update the lockfile intentionally.
2. Remove any newly redundant local lifecycle behavior; retain TTC tools/widgets and domain wiring.
3. Rebuild/restart the real full-corpus assistant with its existing bundle and cache root.
4. Verify idle stability for more than 90 seconds, a long tool-using run, and forced reconnect/resume.
5. Record exact commands and logs in this ticket's diary.

### Phase E — downstream handoff

Publish/version the package as required by repository policy. Add the final API/version and migration notes to CoinVault issue #9. CoinVault then replaces its local lifecycle while retaining its mapping/state boundary.

### Acceptance criteria

- [ ] Three or more idle heartbeat intervals complete without `1006`.
- [ ] Ping nonce is echoed exactly once and heartbeat frames never enter chat state.
- [ ] Abnormal close reconnects with bounded backoff; explicit disconnect never reconnects.
- [ ] Reconnect resumes from the last committed ordinal without missing or duplicate events.
- [ ] Stale callbacks from an earlier socket generation cannot change active state.
- [ ] Lifecycle logs contain no secrets or conversation payloads.
- [ ] React Chat tests, typecheck, lint, and build pass.
- [ ] Real RAG-TTC full-corpus search/widget chat remains connected and recovers from a forced interruption.
- [ ] CoinVault issue #9 contains the released version/API handoff.

## Open Questions

1. What exact sessionstream request resumes after an ordinal in the currently deployed backend, and does it guarantee hydration-before-live ordering?
2. Should reconnect policy be configurable per provider, or should only a small set of safe timing values be exposed?
3. Does auth-lease ownership belong above the shared transport as assumed, or does the transport need an explicit asynchronous authorization hook before connecting?
4. Which package release/version will RAG-TTC consume, and is workspace linking acceptable for integration proof before publication?
5. Should consumer dispatch failure close/retry the connection, surface a terminal error, or park the offending frame? Decide before implementation because cursor correctness depends on it.

## References

- [CoinVault transport convergence issue #9](https://github.com/goldeneagle/coinvault/issues/9)
- `packages/chat-provider/src/ws/wsManager.ts`
- `packages/chat-provider/src/ws/protocol.ts`
- RAG-TTC `TtcChatProviderShell.tsx` and package manifest listed in RelatedFiles
- CoinVault `web/src/ws/wsManager.ts`, `uiEventMapping.ts`, and `snapshotMapping.ts`
- Sessionstream heartbeat commits `0dbd8e5`, `5a1d9eb`, and merge `c40a861`
