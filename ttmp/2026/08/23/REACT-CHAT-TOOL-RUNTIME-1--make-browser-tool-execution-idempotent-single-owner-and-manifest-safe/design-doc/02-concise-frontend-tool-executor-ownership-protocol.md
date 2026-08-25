---
Title: Concise frontend-tool executor ownership protocol
Ticket: REACT-CHAT-TOOL-RUNTIME-1
Status: active
Topics:
    - frontend-tools
    - chat-provider
    - typescript
    - frontend
DocType: design-doc
Intent: long-term
Owners:
    - manuel
RelatedFiles:
    - Path: repo://packages/chat-provider/src/core/createChatClient.ts
      Note: Client connection identity manifest acknowledgement and result transport
    - Path: repo://packages/chat-provider/src/tools/toolRuntime.ts
      Note: Pre-claim executor filtering and immutable invocation completion
    - Path: repo://packages/chat-provider/src/ws/timelineSnapshot.ts
      Note: Hydrated requested-call reconciliation
    - Path: ws://pbui/pkg/chatserver/handlers.go
      Note: HTTP manifest acknowledgement and result adapter boundary
    - Path: ws://pinocchio/pkg/chatapp/frontendtools/manager.go
      Note: Manifest assignment pending capture result validation and terminal semantics
    - Path: ws://pinocchio/pkg/chatapp/frontendtools/plugin.go
      Note: Live and durable executor projection
    - Path: ws://pinocchio/proto/pinocchio/chatapp/frontendtools/v1/frontend_tool.proto
      Note: Current wire schema and target executor fields
ExternalSources: []
Summary: Authoritative cross-repository design for preventing duplicate browser tool execution with a compact client, connection, and assignment identity tuple.
LastUpdated: 2026-08-25T17:05:47-04:00
WhatFor: Implement single-owner frontend-tool execution across multiple tabs without introducing leases, heartbeats, deadlines, or a broad protocol-v2 framework.
WhenToUse: Before changing Pinocchio frontend-tool protobufs and manager state, react-chat manifest or tool runtime behavior, PBUI tool HTTP adapters, package versions, or multi-tab acceptance tests.
---


# Concise frontend-tool executor ownership protocol

## Executive summary

A conversation/session ID identifies which conversation owns a frontend-tool call. It does not identify which one of several browser tabs attached to that conversation may execute the call. Today, every attached tab can receive the same `ChatFrontendToolCallRequested` event. The terminal ledger in `@go-go-golems/chat-provider@0.5.1` prevents duplicate execution inside one runtime, and Pinocchio rejects conflicting duplicate results, but neither mechanism prevents two independent tabs from performing the browser effect before the second result is rejected.

This document defines the smallest cross-repository protocol that removes that ambiguity without introducing timed leases, heartbeats, run IDs, manifest digests, capability fields, or wire deadlines. An executor is identified by three values:

1. `client_instance_id`: a browser-tab identity stable across reloads in that tab;
2. `connection_id`: a fresh identity for one ready transport incarnation;
3. `assignment_id`: a server-generated identity for one period during which that connection is selected as the session executor.

The server accepts a client-scoped manifest, selects that connection as the current executor, and returns the complete executor tuple in the manifest acknowledgement. Every subsequently created tool request captures the current tuple. The browser executes or renders an actionable human tool only when all three values match its acknowledged tuple. Every result echoes the tuple, and Pinocchio accepts it only when it exactly matches the tuple captured by the pending call. A change of executor affects future calls only; an in-flight call is never silently reassigned.

This is an **honest-client concurrency protocol**, not a security credential. All tabs authorized for the session can observe broadcast events, including assignment IDs. Existing PBUI route authorization remains the security boundary. Cryptographic connection-bound proof can be added later if hostile same-principal clients are in scope.

The release is intentionally coordinated and fail-closed. Servers reject manifests/results missing the new identity. Browsers ignore requests missing or not matching an acknowledged assignment. There is no hidden v1 fallback. Pinocchio ships first, react-chat ships next, and PBUI consumes both releases atomically before the two-tab acceptance test is treated as passing.

## 1. Problem statement

### 1.1 Current failure

Two tabs can open the same session:

```text
conversation-123
├── Tab A: independent chat-provider runtime
└── Tab B: independent chat-provider runtime
```

The server broadcasts one request:

```json
{
  "name": "ChatFrontendToolCallRequested",
  "sessionId": "conversation-123",
  "payload": {
    "messageId": "msg-42",
    "toolCallId": "call-7",
    "toolName": "workbench_perform",
    "input": {}
  }
}
```

Both tabs pass the session check and each has an empty local invocation ledger:

```text
Tab A claims call-7 -> performs effect -> submits result
Tab B claims call-7 -> performs effect -> submits result
```

Pinocchio accepts one terminal result and rejects the other. PBUI's effect endpoint similarly accepts one canonical envelope and rejects a divergent duplicate. Those protections preserve server/model state but run after both local effects. They cannot undo a second pane split, download, external write, approval prompt, or message send.

Concrete evidence is recorded in PBUI's `various/03-phase5-multitab-executor-blocker.md`: both Chromium tabs changed local workbench state, while the second terminal result and effect envelope failed with conflicts.

### 1.2 Why session and tool-call identity are insufficient

The existing effective key is approximately:

```text
(session_id, tool_call_id, tool_name)
```

That answers:

- which conversation owns the call;
- which invocation is completing;
- which registered tool was requested.

It does not distinguish eligible runtimes inside the same session. The missing question is: **which connected browser incarnation did the server select to perform this call?**

### 1.3 Why one client ID is still too weak

A tab ID alone handles two different tabs, but not these cases:

- an old and new transport overlap during reconnect;
- a tab reloads and preserves its tab ID;
- ownership moves A -> B -> A and a delayed result from A's first ownership period arrives;
- logs say only `client-a`, leaving the connection/assignment period ambiguous.

The concise protocol adds one connection identity and one assignment epoch while avoiding timers and renewal machinery.

## 2. Scope

### 2.1 In scope

- one selected executor for each session;
- per-tab and per-connection identity;
- server-generated assignment epochs;
- client-scoped manifest acceptance and acknowledgement;
- assignment binding on requests, results, events, and durable timeline entities;
- automatic and human frontend tools;
- strict pending and terminal result validation;
- reconnect/reload and stale-result behavior;
- a coordinated breaking migration from chat-provider `0.5.1`;
- unit, race, integration, package, and real two-tab browser validation.

### 2.2 Explicitly deferred

- renewable or expiring leases;
- heartbeat/liveness protocols;
- automatic takeover of an in-flight call;
- protocol-wide `protocolVersion` negotiation;
- model run IDs;
- manifest content digests on every call;
- policy capability strings;
- request deadlines in the browser wire schema;
- targeted WebSocket delivery instead of broadcast-and-filter;
- cryptographic proof binding HTTP result submission to a WebSocket connection;
- durable executor recovery across server process restart.

Existing context cancellation and timeout behavior remains responsible for abandoned in-flight calls.

### 2.3 Non-goals

This design does not claim exactly-once distributed execution under arbitrary crashes. It provides:

```text
one honest selected browser executes a normally delivered request;
stale/non-selected honest browsers do not execute;
server result acceptance is bound to the selected assignment;
delivery retries do not replay the effect.
```

If a selected browser performs an effect and crashes before result delivery, the server cannot infer whether replay is safe. The call times out/cancels; it is not reassigned automatically.

## 3. Current-state evidence

### 3.1 Pinocchio schema and manager

`pinocchio/proto/pinocchio/chatapp/frontendtools/v1/frontend_tool.proto` currently defines:

- session-scoped manifest commands with only `tools` and `revision`;
- requests with message, call, tool, input, mode, and status;
- results with call, tool, result, status, and error;
- durable entities without executor provenance.

`pinocchio/pkg/chatapp/frontendtools/manager.go` currently:

- stores one manifest per session in `Manager.manifests`;
- keys pending/terminal state by session and call ID;
- validates tool name and status;
- retains bounded deterministic terminal digests;
- publishes cancellation/timeout terminal outcomes;
- broadcasts the same unassigned request to all session subscribers.

The pending call has no executor field, so `HandleResult` cannot distinguish two tabs in the same session.

### 3.2 react-chat runtime

`react-chat/packages/chat-provider/src/tools/toolRuntime.ts` claims before executing and retains terminal state by encoded session/call key. This protects one runtime from event/snapshot replay, but each tab owns a separate `states` map.

`react-chat/packages/chat-provider/src/core/createChatClient.ts` already has a local numeric `connectionGeneration` used to force manifest republishing after each ready generation. Manifest POST bodies currently contain only `{revision, tools}`, and result bodies contain no executor identity. `lastManifestAck` is internal and records local generation/revision/digest, but the HTTP response does not return server ownership.

`@go-go-golems/chat-provider@0.5.1` is the immutable baseline containing the in-runtime terminal ledger. It is necessary but not sufficient for cross-tab ownership.

### 3.3 PBUI transport adapter

`pbui/pkg/chatserver/handlers.go` currently decodes manifest revision/tools and result call/tool/result/status/error. It submits corresponding Pinocchio commands and returns a generic `acceptedResponse`. No executor assignment is accepted or returned.

The PBUI `Server` already holds both `hub *sessionstream.Hub` and `frontendTools *frontendtools.Manager`, so the HTTP adapter can call a new acknowledgement-returning manager API and publish through `Hub`, rather than querying manager state after an ordinary command and racing another manifest.

### 3.4 Durable projection

`pinocchio/pkg/chatapp/frontendtools/plugin.go` copies request/result fields into `FrontendToolCallEntity`. React-chat's `frontendToolTimelineAdapter` and `timelineSnapshot` then hydrate requested calls and reconcile them through the runtime. Executor fields must survive this projection; otherwise a reloaded observer cannot decide whether a hydrated request belongs to it.

## 4. Terminology and identity model

### 4.1 Session

A server-side conversation identity such as `conversation-123`. Many browser clients may subscribe to one session.

### 4.2 Client instance

One browser tab identity:

```text
client_instance_id = UUID stored in sessionStorage
```

Properties:

- unique per tab under normal browser behavior;
- stable across reload in that tab;
- different in a newly opened tab, including duplicated tabs once initialized independently;
- not a secret and not authentication;
- generated lazily with `crypto.randomUUID()`;
- injectable for SSR/tests/non-browser hosts.

Storage key should be package-namespaced, for example:

```text
@go-go-golems/chat-provider.client-instance-id
```

If `sessionStorage` is unavailable, generate a process-local UUID. The runtime still works, but reload stability is lost; this is reported through diagnostics rather than falling back to shared `localStorage`.

### 4.3 Connection

One ready transport incarnation:

```text
connection_id = fresh UUID for each transition into a new ready generation
```

Properties:

- never persisted;
- regenerated when a replacement/reconnected WebSocket becomes ready;
- shared by manifest sync, runtime filtering, and result submission for that ready generation;
- old callbacks/results retain their original immutable connection ID.

This turns react-chat's current internal numeric `connectionGeneration` concept into wire-visible identity. The numeric generation may remain as a diagnostic counter but is not authoritative.

### 4.4 Assignment

One server-created ownership epoch:

```text
assignment_id = fresh UUID when current executor connection changes
```

The complete executor tuple is:

```text
(client_instance_id, connection_id, assignment_id)
```

Properties:

- scoped to one session;
- server-generated;
- stable when the same current connection republishes a newer manifest;
- replaced when a different client/connection becomes current;
- captured immutably by every pending call;
- echoed by browser results;
- visible provenance, not a secret bearer credential.

### 4.5 Active executor

The executor tuple and manifest currently selected for **new** calls in a session. It is distinct from executor tuples already captured by in-flight calls.

## 5. Authoritative protocol contract

### 5.1 Shared protobuf type

```protobuf
message FrontendToolExecutor {
  string client_instance_id = 1;
  string connection_id = 2;
  string assignment_id = 3;
}
```

Validation for any complete executor tuple:

- every field is non-empty after trimming;
- values are bounded (recommended maximum: 128 UTF-8 bytes each);
- the server generates `assignment_id` as a UUID;
- clients treat values as opaque strings and compare exact bytes;
- partial tuples are invalid.

UUID syntax may be required for generated client/connection/assignment values in first-party adapters, but Pinocchio should primarily enforce non-empty bounded opaque identifiers so non-browser hosts can supply equivalent identities.

### 5.2 Manifest command

```protobuf
message FrontendToolManifestCommand {
  repeated FrontendToolDescriptor tools = 1;
  uint64 revision = 2;
  string client_instance_id = 3;
  string connection_id = 4;
}
```

HTTP request:

```json
{
  "clientInstanceId": "client-a",
  "connectionId": "connection-84b2",
  "revision": 12,
  "tools": []
}
```

The command does not carry `assignment_id`; only the server may create it.

### 5.3 Manifest acknowledgement/event

```protobuf
message FrontendToolManifestUpdated {
  repeated FrontendToolDescriptor tools = 1;
  uint64 revision = 2;
  FrontendToolExecutor executor = 3;
}
```

HTTP response:

```json
{
  "sessionId": "conversation-123",
  "accepted": true,
  "status": "manifest_updated",
  "revision": 12,
  "executor": {
    "clientInstanceId": "client-a",
    "connectionId": "connection-84b2",
    "assignmentId": "assignment-f81c"
  }
}
```

The response is authoritative. A browser must not consider itself assigned before validating this acknowledgement against the manifest request's client and connection IDs.

### 5.4 Tool request

```protobuf
message FrontendToolCallRequested {
  string message_id = 1;
  string tool_call_id = 2;
  string tool_name = 3;
  google.protobuf.Struct input = 4;
  ToolExecutionMode mode = 5;
  string status = 6;
  FrontendToolExecutor executor = 7;
}
```

Wire example:

```json
{
  "name": "ChatFrontendToolCallRequested",
  "sessionId": "conversation-123",
  "payload": {
    "messageId": "msg-42",
    "toolCallId": "call-7",
    "toolName": "workbench_perform",
    "executor": {
      "clientInstanceId": "client-a",
      "connectionId": "connection-84b2",
      "assignmentId": "assignment-f81c"
    },
    "input": {
      "expectedRevision": "sha256:723d...",
      "verbs": [{"kind": "tile.split", "tileId": "inventory", "axis": "inline", "ratio": 0.5}],
      "confirmationId": "approval-19"
    }
  }
}
```

The executor tuple is part of request identity and is immutable for the lifetime of that call.

### 5.5 Result command and event

```protobuf
message FrontendToolResultCommand {
  string tool_call_id = 1;
  string tool_name = 2;
  google.protobuf.Struct result = 3;
  string status = 4;
  string error = 5;
  FrontendToolExecutor executor = 6;
}

message FrontendToolResultReceived {
  string message_id = 1;
  string tool_call_id = 2;
  string tool_name = 3;
  google.protobuf.Struct result = 4;
  string status = 5;
  string error = 6;
  FrontendToolExecutor executor = 7;
}
```

Result body:

```json
{
  "toolCallId": "call-7",
  "toolName": "workbench_perform",
  "executor": {
    "clientInstanceId": "client-a",
    "connectionId": "connection-84b2",
    "assignmentId": "assignment-f81c"
  },
  "status": "success",
  "result": {
    "ok": true,
    "beforeRevision": "sha256:723d...",
    "afterRevision": "sha256:e73d..."
  }
}
```

The result command's complete executor tuple participates in deterministic terminal digest calculation.

### 5.6 Durable timeline entity

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
  FrontendToolExecutor executor = 9;
}
```

Both live and hydrated projections must preserve the tuple. Requested entities without a valid executor are not executable by the new runtime.

## 6. Manifest acceptance and ownership transitions

### 6.1 State model

Pinocchio replaces the current bare session manifest with:

```go
type assignedManifest struct {
    clientInstanceID string
    connectionID     string
    assignmentID     string
    revision         uint64
    tools            []*FrontendToolDescriptor
    deterministic    []byte // or digest for same-revision equality
}
```

One `assignedManifest` is current per session.

### 6.2 Acceptance algorithm

```text
acceptManifest(session, command):
    validate non-empty bounded client_instance_id and connection_id
    validate descriptors and deterministic encoding
    lock manager

    current = manifests[session]

    if current has same (client_instance_id, connection_id):
        if command.revision < current.revision:
            reject manifest_revision_regression
        if command.revision == current.revision:
            if semantic manifest bytes differ:
                reject manifest_revision_conflict
            return existing acknowledgement without new event
        assignment_id = current.assignment_id
    else:
        assignment_id = random UUID

    next = immutable clone(command + assignment_id)
    replace current manifest atomically
    unlock

    publish FrontendToolManifestUpdated(next)
    return next acknowledgement
```

A same-connection higher revision updates tools but retains ownership identity. A different connection creates a new assignment even when it uses the same client instance after reload.

### 6.3 Latest accepted connection wins

For the first release, accepting a manifest from a different connection selects it for future calls. This is deliberately simple and guarantees one current executor without a heartbeat service.

Consequences:

- whichever tab most recently connects/synchronizes can become executor;
- a background tab may become owner;
- a visibility/focus-aware claim policy may improve UX later;
- safety does not depend on which eligible tab wins;
- pending calls remain bound to the assignment captured when created.

### 6.4 Empty manifests

An accepted empty manifest still creates/retains the assignment and removes available tools for future model calls. It is not treated as disconnect. Explicit disconnect ownership release is deferred.

### 6.5 Atomic acknowledgement API

Do not implement HTTP acknowledgement by:

```text
hub.Submit(manifest)
manager.CurrentManifest(session)
```

Another tab can update the manifest between those operations. Instead, Pinocchio should expose one operation such as:

```go
func (m *Manager) AcceptManifest(
    ctx context.Context,
    sid sessionstream.SessionId,
    pub sessionstream.EventPublisher,
    command *FrontendToolManifestCommand,
) (*FrontendToolManifestUpdated, error)
```

`HandleManifest` calls this method and discards the returned acknowledgement for generic sessionstream command callers. PBUI's HTTP handler calls it directly with `s.hub` as publisher and serializes the returned acknowledgement. `sessionstream.Hub` already implements public `Publish` and therefore satisfies `EventPublisher`.

This keeps assignment creation, state replacement, event publication, and returned identity tied to one accepted command.

### 6.6 Publication failure semantics

The implementation must choose and test one policy. This design selects:

- build and validate the candidate under lock;
- reserve/replace manager state;
- publish the manifest-updated event;
- if publication fails, restore the exact previous assigned manifest under lock only if the candidate is still current;
- return failure and no acknowledgement.

This avoids acknowledging ownership that observers never saw while preventing rollback from overwriting a newer concurrent manifest. The compare-before-restore condition is essential.

## 7. Request creation and pending identity

### 7.1 Preconditions

`Manager.Request` must fail closed unless:

- the session has a current assigned manifest;
- the requested tool descriptor exists and is available in that manifest;
- the executor tuple is complete.

The bridge already checks descriptors during tool registration, but `Request` should capture and verify current assignment itself so correctness does not depend on a stale external lookup.

Recommended stable error codes:

```text
executor_unavailable
executor_mismatch
manifest_revision_regression
manifest_revision_conflict
```

### 7.2 Pending state

```go
type pendingCall struct {
    key       pendingKey
    messageID string
    toolName  string
    executor  *FrontendToolExecutor
    ch        chan *FrontendToolResultCommand
}
```

Under the manager lock, request creation:

1. reads the current assigned manifest;
2. validates the requested tool against it;
3. clones the current executor tuple;
4. creates pending state with that tuple;
5. publishes a request containing the same clone.

Changing the current manifest after this point does not mutate the pending call.

### 7.3 No automatic reassignment

If assignment A owns call 7 and assignment B becomes current:

```text
call 7 remains assigned to A
new call 8 is assigned to B
```

B must not execute hydrated call 7. If A disappears, existing context cancellation/timeout terminalizes call 7. Retrying the semantic operation requires a new tool call ID from the model/runtime, not reuse of call 7.

## 8. Browser runtime behavior

### 8.1 Identity creation

React-chat adds explicit identity providers so tests and non-browser hosts do not depend on globals:

```ts
type BrowserClientIdentity = {
  clientInstanceId: string;
  newConnectionId: () => string;
};
```

Production defaults:

```ts
clientInstanceId = sessionStorage value ?? crypto.randomUUID();
connectionId = crypto.randomUUID() on each new ready generation;
```

The client instance is created once per `createChatClient`; connection identity changes only when a genuinely new ready transport generation is established.

### 8.2 Runtime assignment state

`ToolRuntime` gains:

```ts
type ExecutorIdentity = {
  clientInstanceId: string;
  connectionId: string;
  assignmentId: string;
};

setExecutorIdentity(identity: ExecutorIdentity | null): void;
executorIdentity(): Readonly<ExecutorIdentity> | null;
```

Assignment objects are cloned/frozen. Each invocation captures the executor from its request; result retries use that immutable request executor rather than mutable current assignment.

### 8.3 Claim rule

Before creating local invocation state, looking up a tool, rendering human controls, or executing code:

```text
parse complete request executor
current = acknowledged runtime executor

if current is null:
    do not claim or execute
if request executor != current:
    emit tool-request-not-executor
    do not claim or execute
otherwise:
    continue existing claim state machine
```

An observer must not create a `waiting-human` state, because `ToolCallOutlet` derives actionable UI from runtime pending state.

### 8.4 Manifest acknowledgement ordering

For ordinary sends, react-chat already synchronizes the manifest before sending a message. The revised sequence is:

```text
WebSocket ready
-> create connection_id
-> clear old acknowledged assignment
-> POST manifest(client, connection, revision, tools)
-> validate acknowledgement client/connection
-> install executor tuple in runtime
-> allow message send
```

This guarantees the model cannot issue a new request before the sender has installed the assignment returned by its manifest sync.

A request can still arrive during reconnect for an older assignment. It must be ignored unless it matches the currently acknowledged tuple. Snapshot hydration after sync reconciles requested entities again. The implementation should explicitly order reconnect as:

```text
connect transport -> manifest acknowledgement -> hydrate/reconcile executable requests
```

If the transport currently hydrates before manifest sync, add a bounded deferred reconciliation hook rather than executing before acknowledgement.

### 8.5 Immutable result retries

`ToolRequest` gains `executor`. `ToolResultSubmission` gains the same tuple. `claimCompletion` derives result identity from the invocation request. Retries reuse the cached completion and captured tuple even if a later manifest changes current ownership.

### 8.6 Debug events

Add redacted identity-bearing events:

```text
tool-request-not-executor
executor-connection-created
executor-assignment-acknowledged
executor-assignment-cleared
executor-ack-mismatch
```

Events may include session, call, tool, client ID, connection ID, and assignment ID. They must not include tool inputs/results. UI diagnostics should display shortened identifiers.

## 9. Human tools

Human tools use the exact same ownership check.

For a request assigned to Tab A:

- Tab A enters `waiting-human` and renders active controls;
- Tab B receives/timelines the call but does not enter runtime pending state;
- Tab B may eventually display non-actionable provenance such as “Awaiting response in another tab,” but that UI is optional for the first release;
- only Tab A can call `completeHumanTool` because only A has matching pending state;
- the result echoes A's captured executor tuple.

If Tab A disconnects while waiting, the call is not transferred to B. Existing cancellation/timeout behavior terminates it. This avoids two people acting on one prompt or an old prompt becoming actionable after context changed.

## 10. Result validation and terminal semantics

### 10.1 Validation order

Pinocchio `HandleResult` should validate in this order while preserving current stable semantics:

1. payload type and required call ID;
2. canonical terminal status;
3. complete executor tuple;
4. locate terminal or pending entry by route session and call ID;
5. bind/validate tool name;
6. compare executor tuple;
7. compute deterministic digest including executor;
8. transition pending to terminal once;
9. publish and wake once.

For a terminal entry, executor mismatch is checked before treating payload equality as idempotent.

### 10.2 Error semantics

- matching executor + identical terminal payload: idempotent success;
- matching executor + different terminal payload: `terminal_conflict`;
- different executor for pending or terminal call: `executor_mismatch`;
- no pending/terminal call: existing `unknown_result`/`session_mismatch`;
- old result after context terminalization: existing `late_result`, provided executor matches the captured pending assignment.

PBUI should map stable invocation conflicts to HTTP `409 Conflict`, malformed/missing identity to `400 Bad Request`, authorization failures to existing nondisclosing `403`, and unexpected publication/internal failures to `500`.

### 10.3 Digest

The terminal digest length-prefixes all executor fields alongside existing call/tool/status/error/result fields:

```text
client_instance_id
connection_id
assignment_id
tool_call_id
tool_name
status
error
deterministic result bytes
```

Length-prefixing avoids concatenation ambiguity. The executor tuple is also stored separately in `terminalCall` for clear mismatch diagnostics.

### 10.4 Context cancellation

Server-generated cancellation/timeout results copy the executor from pending state into the terminal command/event/digest. A later browser result from the same assignment is classified under existing late-result rules; a result from another assignment is `executor_mismatch`.

## 11. Durable timeline and hydration

Pinocchio's plugin copies executor from request into `FrontendToolCallEntity` and preserves it when applying result events. React-chat's live and hydrate adapters expose the tuple in tool-call props.

Hydration rules:

- terminal entities are not reconciled for execution, as today;
- requested entities with a complete executor are passed to `ToolRuntime`;
- the runtime executes only exact current-assignment matches;
- requested entities from an old assignment remain visible history but inert;
- missing executor fields fail closed and emit a protocol diagnostic.

This is essential because process/browser reload can otherwise strip assignment evidence and turn a historical request into an unassigned executable call.

## 12. API and file-level changes

### 12.1 Pinocchio

#### `proto/pinocchio/chatapp/frontendtools/v1/frontend_tool.proto`

- add `FrontendToolExecutor`;
- add client/connection fields to manifest command;
- add executor to manifest event, request, result command/event, and timeline entity;
- regenerate Go code through repository protocol targets.

#### `pkg/chatapp/frontendtools/manager.go`

- replace session manifest value with assigned manifest state;
- add UUID injection to manager config/test constructor;
- add atomic `AcceptManifest` returning acknowledgement;
- enforce per-connection revision monotonicity/idempotency;
- capture executor in pending calls;
- reject missing/mismatched executor results;
- include executor in terminal digest and context terminalization;
- expose stable error codes without leaking result data.

#### `pkg/chatapp/frontendtools/plugin.go`

- project executor on live request/result and durable entity updates.

#### Tests

- `manager_test.go`, `bridge_test.go`, `plugin_test.go`, and race tests cover the state matrix in §15.

### 12.2 react-chat

#### `packages/chat-provider/src/core/createChatClient.ts`

- create/inject client identity;
- create connection ID on ready generation;
- include both in manifest POST;
- parse/validate assignment acknowledgement;
- install/clear runtime assignment in connection order;
- include captured executor in result bodies;
- ensure hydration/reconciliation follows acknowledgement.

#### `packages/chat-provider/src/tools/toolRuntime.ts`

- define executor types;
- parse complete request executor;
- filter before claim/render/execute;
- capture immutable executor per invocation;
- expose assignment setter/snapshot and diagnostics;
- preserve executor through retries and human completion.

#### `packages/chat-provider/src/ws/timelineEvents.ts`

- project executor in live tool entities.

#### `packages/chat-provider/src/ws/timelineSnapshot.ts`

- retain executor in hydrated requested calls and reconcile after assignment acknowledgement.

#### Public API

- expose read-only diagnostics/identity where useful;
- allow injected identity factories for tests and non-browser hosts;
- do not expose a caller method to fabricate `assignmentId`.

### 12.3 PBUI

#### `pkg/chatserver/handlers.go`

- extend manifest/result request DTOs;
- strictly validate required identity;
- call Pinocchio's acknowledgement-returning `AcceptManifest` with `s.hub` publisher;
- return revision and executor in manifest response;
- map stable invocation errors to appropriate HTTP statuses.

#### Server tests

- manifest acknowledgement shape;
- two client/connection ownership transitions;
- result acceptance/mismatch;
- old assignment result for old pending call remains valid after future ownership change;
- no duplicate durable result event.

#### TypeScript consumer

PBUI tool factories remain unaware of executor ownership. They execute only after chat-provider's runtime claim. Upgrade exact chat-provider dependency after its release and run the real two-tab scenario.

## 13. End-to-end flows

### 13.1 First tab connects

```text
A generates client-a (sessionStorage)
A WebSocket ready -> generates conn-a1
A POSTs manifest(client-a, conn-a1, rev 12)
Pinocchio creates assignment-1 and stores manifest
PBUI returns assignment-1
A installs (client-a, conn-a1, assignment-1)
A sends message only after sync succeeds
new tool call captures assignment-1
A executes; all observers ignore
A submits result with assignment-1
Pinocchio validates and terminalizes once
```

### 13.2 Second tab connects

```text
B generates client-b and conn-b1
B POSTs manifest
Pinocchio creates assignment-2; B becomes current for future calls
request already pending under assignment-1 remains owned by A
next request captures assignment-2
A sees it and ignores before claim
B executes once and submits assignment-2
```

### 13.3 Same connection updates availability

```text
B publishes revision 13 with same client-b/conn-b1
server retains assignment-2
future calls use updated tools under assignment-2
no ownership epoch churn
```

### 13.4 Reload/reconnect

```text
B reloads: client-b survives sessionStorage
new ready transport generates conn-b2
manifest acceptance creates assignment-3
old conn-b1 requests/results remain assignment-2
new requests use assignment-3
old delayed result cannot complete an assignment-3 call
```

### 13.5 Ownership moves away and back

```text
A/conn-a1 = assignment-1
B/conn-b1 = assignment-2
A/conn-a1 republishes = assignment-3 (different current connection -> new epoch)
```

A delayed result carrying assignment-1 cannot masquerade as assignment-3 despite sharing client and connection IDs.

### 13.6 Owner disappears mid-effect

```text
assignment-4 begins automatic effect
browser disappears before result submission
server does not assign call to another browser
request context eventually cancels/times out
terminal event records assignment-4
new semantic attempt requires a new call ID
```

This chooses possible temporary unavailability over duplicate consequential execution.

## 14. Decision records

### Decision: Keep timeline projections read-only and centralize action in ToolRuntime

- **Context:** Pinocchio's built-in `ToolCallCard` inferred an approval interaction from arbitrary timeline input and posted results directly, independently of chat-provider's registry, assignment state, human completion CAS, cancellation, and retry state machine. Adding executor fields to that card still left it unable to prove the local browser owned the broadcast assignment.
- **Options considered:** duplicate executor state in each card/application; pass request executor through and trust non-empty values; introduce a second approval-specific ownership context; make timeline cards projections only and route all actionable frontend/human interactions through `ToolCallOutlet` backed by the shared `ToolRuntime`.
- **Decision:** Timeline adapters and generic cards are read-only projections. `ToolRuntime` is the only browser execution/completion authority. An application that wants actionable human UI must register a `HumanTool` and render it through `ToolCallOutlet`; it must not infer actionability from timeline payload shape or call result HTTP APIs directly.
- **Rationale:** One state machine can enforce assignment matching before render, completion CAS, cancellation, terminal retention, and immutable retry provenance. Duplicating any subset repeatedly recreates split-brain authority bugs.
- **Consequences:** Legacy heuristic approval buttons are removed rather than shimmed. Unknown/unregistered frontend tools remain visible but read-only. First-party applications must upgrade to the executor-aware chat-provider and explicitly register supported human tools.
- **Status:** accepted.

### Decision: Use a three-part executor tuple

- **Context:** Session/call identity cannot distinguish tabs; tab identity cannot distinguish reconnects or repeated ownership periods.
- **Options considered:** session only; client ID only; client plus connection; client plus connection plus assignment; full timed lease protocol.
- **Decision:** Use `client_instance_id`, `connection_id`, and server-generated `assignment_id`.
- **Rationale:** It eliminates the known ambiguity classes with three opaque strings and no clock/renewal machinery.
- **Consequences:** Every manifest/request/result/projection changes; tests must cover all tuple components; liveness remains intentionally basic.
- **Status:** accepted for this concise design.

### Decision: Latest accepted different connection owns future calls

- **Context:** The server needs one deterministic initial selection rule without a heartbeat or active-tab service.
- **Options considered:** first connection forever; latest manifest; browser local election; visibility voting; explicit lease endpoint.
- **Decision:** A manifest from a different connection creates a new current assignment for future calls; same-connection updates retain assignment.
- **Rationale:** It is simple, server-authoritative, testable, and guarantees one selected tuple.
- **Consequences:** A background/reconnecting tab may become owner. This is a UX limitation, not a duplicate-execution safety failure.
- **Status:** accepted for first release.

### Decision: Never reassign an in-flight call

- **Context:** On disconnect, the server cannot know whether an effect happened before result delivery.
- **Options considered:** immediate takeover; retryable-tool metadata; wait and reassign; cancel/timeout only.
- **Decision:** Pending calls retain their captured assignment until terminal result or context terminalization.
- **Rationale:** It preserves at-most-once effect intent for consequential tools.
- **Consequences:** Owner loss can make a call unavailable until timeout; caller retries require a new invocation.
- **Status:** accepted.

### Decision: Explicit manifest acknowledgement

- **Context:** The browser must know the server-generated assignment before executing, and a post-submit manager query can race another client.
- **Options considered:** infer ownership from successful POST; return current manager state; receive only an async event; one atomic acknowledgement-returning manager operation.
- **Decision:** `AcceptManifest` atomically returns the exact accepted assignment; PBUI serializes it in the HTTP response.
- **Rationale:** It provides causal evidence without adding a second command/event correlation protocol.
- **Consequences:** PBUI calls a Pinocchio manager API directly with the Hub as publisher; generic command handling remains a wrapper.
- **Status:** accepted.

### Decision: Coordinated strict migration, no v1 fallback

- **Context:** Accepting unassigned requests/results would preserve the exact bug this protocol fixes, while partial deployment creates ambiguous behavior.
- **Options considered:** optional fields with fallback; server feature flag; dual protocol; coordinated release.
- **Decision:** New components require complete identity; upgrade Pinocchio, react-chat, and PBUI in order.
- **Rationale:** Fail-closed semantics are easier to reason about and test than a hidden compatibility mode.
- **Consequences:** This is a breaking browser/server contract and requires release sequencing and migration notes.
- **Status:** accepted.

### Decision: Assignment ID is provenance, not authentication

- **Context:** Broadcast subscribers can observe assignment IDs; echo validation therefore cannot defeat a malicious authorized tab.
- **Options considered:** call it a lease/token; signed per-call proof; HTTP/WebSocket connection binding; explicit honest-client scope.
- **Decision:** Treat the tuple as concurrency identity and provenance. Preserve route authorization as security boundary; defer cryptographic binding.
- **Rationale:** It accurately describes the feature being shipped and avoids false security claims.
- **Consequences:** Threat models with hostile same-principal clients need a later authenticated executor proof design.
- **Status:** accepted.

## 15. Test strategy

### 15.1 Pinocchio manager unit tests

1. reject empty client or connection ID;
2. first manifest creates a non-empty assignment;
3. same connection/higher revision retains assignment;
4. same connection/same revision/same content is idempotent;
5. same connection/same revision/different content conflicts;
6. same connection/lower revision regresses and is rejected;
7. different connection creates a new assignment;
8. request captures current assignment;
9. ownership change affects future call only;
10. matching result is accepted;
11. client mismatch is rejected;
12. connection mismatch is rejected;
13. assignment mismatch is rejected;
14. matching duplicate terminal result is idempotent;
15. different-assignment duplicate is `executor_mismatch`;
16. context cancellation copies executor;
17. publication failure rolls back only its own candidate;
18. concurrent manifests pass `go test -race` and leave one coherent assignment.

Inject assignment ID generation in tests for deterministic assertions.

### 15.2 Pinocchio projection tests

- request executor appears in live UI event and durable entity;
- result update preserves/replaces only with matching executor;
- snapshot round-trip retains all tuple fields;
- terminal statuses retain provenance.

### 15.3 react-chat runtime tests

Construct two runtimes with explicit identities:

```text
A = (client-a, conn-a, assignment-1)
B = (client-b, conn-b, assignment-2)
request assigned to A
```

Assert:

- A automatic executions: 1;
- B automatic executions: 0;
- submissions: 1;
- B has no local invocation state;
- B has no pending human tool;
- duplicate event/snapshot in A remains one execution;
- result retry carries immutable assignment-1;
- changing A's current assignment while call runs does not alter its result;
- missing/partial executor fails closed;
- old connection ID is ignored after reconnect;
- old assignment is ignored after ownership returns to same client/connection.

### 15.4 createChatClient tests

- client ID persists in sessionStorage and is injectable;
- connection ID changes on ready generation;
- manifest POST includes client/connection;
- malformed/mismatched acknowledgement rejects sync;
- send waits for manifest acknowledgement;
- assignment is installed before request reconciliation;
- result body echoes captured tuple, not mutable current tuple;
- failed sync clears executable assignment and surfaces error;
- same digest within one ready generation deduplicates sync as today.

### 15.5 PBUI HTTP tests

- manifest endpoint requires both IDs;
- acknowledgement returns exact executor and revision;
- two manifests produce two assignments;
- result endpoint requires complete executor;
- wrong tuple maps to 409 and publishes no result event;
- correct tuple maps to 200;
- authorization remains enforced before identity parsing;
- errors do not disclose another principal's session/assignment.

### 15.6 Real browser acceptance test

Use two separate Chromium pages sharing origin/session but separate `sessionStorage`:

1. open both tabs and record their diagnostics;
2. verify different client IDs and acknowledged assignment IDs;
3. trigger one automatic consequential workbench request;
4. assert exactly one tab mutates;
5. assert exactly one `/tools/results` POST;
6. assert exactly one effect envelope and verb event;
7. assert no terminal/envelope conflict responses;
8. trigger one human request and assert actionable controls in one tab only;
9. reload the owner, verify new connection/assignment, and trigger a new call;
10. close the selected owner during a slow call and verify no observer takeover/duplicate effect.

Capture screenshots, network logs, console logs, and durable SQLite/sessionstream evidence.

### 15.7 Release artifact tests

Do not validate through workspace symlinks alone:

- build react-chat dist;
- pack and install the tarball in a clean consumer layout;
- run the two-runtime probe against installed package code;
- publish immutable version;
- install exact registry version in PBUI;
- run typecheck/tests/build/package checks;
- rerun real two-tab browser acceptance.

## 16. Rollout and migration

### Phase 1: Pinocchio protocol and manager

1. add protobuf fields/type;
2. regenerate and prove reproducibility;
3. implement assigned manifest state and `AcceptManifest`;
4. bind request/pending/result/terminal/projection identity;
5. add unit/race/projection tests;
6. publish a new Pinocchio release.

Because this changes strict wire requirements, use an appropriate semver increment for the pre-1.0 module and document incompatibility.

### Phase 2: react-chat runtime and package

1. update against the new schema/API expectations;
2. implement identity lifecycle and assignment filtering;
3. preserve tuple through result retry/human completion/hydration;
4. add two-runtime and connection-order tests;
5. build/pack/install smoke;
6. publish a new npm version after `0.5.1` (recommend `0.6.0` for the breaking server contract).

Do not rewrite `0.5.1` or republish it under different contents.

### Phase 3: PBUI adapter and integration

1. update Pinocchio version with `GOWORK=off` validation;
2. update exact chat-provider version from `0.5.1`;
3. implement strict HTTP DTOs and acknowledgement;
4. update server tests and error mappings;
5. run all frontend/Go/protocol/security/package checks;
6. run real two-tab and process/reload cases;
7. update PBUI Phase 5 requirement audit only after evidence passes.

### Phase 4: Documentation and release closure

- update all three ticket diaries and changelogs;
- record package/module versions and integrity hashes;
- document strict migration and operational diagnostics;
- close protocol-v2/executor tasks that this concise contract supersedes;
- leave timed lease/durable recovery tasks explicitly open rather than claiming them.

## 17. Compatibility matrix

| Pinocchio | chat-provider | PBUI adapter | Outcome |
|---|---|---|---|
| old | `0.5.1` | old | existing single-runtime safety; multi-tab duplicates remain |
| new strict | `0.5.1` | new | manifests/results missing identity are rejected; intentionally incompatible |
| new strict | new executor package | old | PBUI drops identity/ack fields; intentionally incompatible |
| new strict | new executor package | new | supported concise ownership protocol |

There is no supported mixed-mode production deployment. CI should contain a compatibility test that proves old payloads fail clearly rather than silently executing unassigned calls.

## 18. Operational behavior and observability

Recommended diagnostics per session:

```text
current client instance (shortened)
current connection (shortened)
current assignment (shortened)
manifest revision/tool count
pending calls grouped by assignment
terminal mismatch counters
not-executor browser event count
last manifest acknowledgement/error
```

Logs must avoid raw tool input/result content. Stable server counters should distinguish:

- malformed identity;
- stale manifest revision;
- manifest conflict;
- executor mismatch;
- duplicate terminal result;
- terminal conflict;
- context cancellation/timeout.

A high `tool-request-not-executor` count is normal with broadcast delivery and multiple tabs. A high `executor_mismatch` result count indicates a client bug or incompatible version.

## 19. Risks and mitigations

### Background tab becomes executor

Latest accepted connection may not be user-visible. The first release accepts this UX limitation. It remains safe. A later explicit active-client claim can change selection without changing request/result tuple semantics.

### Owner disappears

No heartbeat means current ownership can be stale. Calls fail closed and time out rather than transfer. Reconnect/new manifest makes a new assignment for future calls.

### Manifest publication race

Atomic acknowledgement and compare-before-rollback prevent one failed publisher from overwriting a newer accepted assignment.

### Request arrives before acknowledgement

Normal send ordering prevents this for newly initiated runs. Reconnect ordering must sync/ack before executable hydration; unmatched requests remain inert and are reconciled after acknowledgement.

### Same-principal malicious client

Assignment IDs are observable and spoofable by an authorized malicious tab. This design prevents accidental independent runtimes, not hostile clients. Future security work can bind a signed per-call proof to an authenticated client channel.

### Server restart

Current manifests are already in-memory. After restart, no assigned manifest exists; clients reconnect/republish before new calls. Old pending calls do not survive the manager restart under current architecture. Durable recovery is deferred.

### UUID generation failure

Server assignment generation failure rejects manifest acceptance and preserves prior assignment. Browser UUID generation failure surfaces connection setup failure; do not use timestamps or low-entropy fallbacks.

## 20. Alternatives considered

### Session ID only

Rejected because all tabs intentionally share the session.

### Client instance ID only

Rejected because reconnect overlap and repeated ownership periods remain ambiguous.

### Client plus connection without assignment

Improves reconnect identity but cannot distinguish ownership moving away and back to the same connection, and provides no server-issued epoch.

### Browser `localStorage`, BroadcastChannel, or Web Locks election

Rejected as authoritative ownership. It is origin/profile-local, cannot coordinate different devices, can strand/crash, and Web Locks serialize but do not retain terminal knowledge after release. Browser coordination may optimize UX later but cannot replace server assignment.

### Timed lease with heartbeat

Deferred. It improves automatic liveness but introduces clocks, renewal races, grace periods, takeover semantics, and the dangerous question of mid-effect reassignment. The assignment epoch is deliberately lease-compatible without requiring expiry now.

### Targeted WebSocket delivery

Deferred. Broadcast-and-filter is sufficient for correctness and preserves observer timeline visibility. Targeted delivery may reduce noise/privacy exposure later.

### First connected tab owns forever

Rejected because a dead first tab could strand all future calls indefinitely and there is no explicit recovery path.

### Reassign pending calls on ownership change

Rejected because the old browser may already have performed the effect.

## 21. Open questions that do not block implementation

1. Should PBUI show observer text for human calls assigned to another tab, or simply omit actionable UI?
2. Should focus/visibility trigger an explicit manifest refresh to improve which tab becomes latest owner?
3. What exact maximum lengths and character rules should opaque IDs use?
4. Should stable invocation errors map `unknown_result` to 404 or 409? Existing nondisclosure policy must win.
5. Should assignment provenance appear in PBUI's Events/Tools diagnostic tiles by default or only in debug mode?
6. After the concise release is stable, is hostile same-principal execution in scope for signed/channel-bound proof?

None changes the core tuple or pending-call invariants.

## 22. Intern implementation checklist

### Contract

- [ ] add one shared executor protobuf type;
- [ ] preserve all existing field numbers;
- [ ] require complete identity at every new boundary;
- [ ] document no v1 fallback;
- [ ] regenerate artifacts reproducibly.

### Pinocchio

- [ ] assigned manifest state is immutable/cloned;
- [ ] same-connection revisions are monotonic/idempotent;
- [ ] ownership change creates a fresh assignment;
- [ ] request captures assignment under lock;
- [ ] pending/terminal validation compares full tuple;
- [ ] terminal digest includes full tuple;
- [ ] cancellation carries full tuple;
- [ ] plugin/live/hydrated entities retain full tuple;
- [ ] focused and race tests pass.

### react-chat

- [ ] tab identity is sessionStorage-scoped and injectable;
- [ ] ready transport identity is fresh and immutable;
- [ ] manifest acknowledgement is validated;
- [ ] runtime filters before claim/render/execute;
- [ ] retries use invocation-captured tuple;
- [ ] human controls appear only for owner;
- [ ] hydration waits/reconciles after acknowledgement;
- [ ] two-runtime tests prove one execution/submission;
- [ ] dist and installed tarball tests pass.

### PBUI

- [ ] strict DTOs carry identities;
- [ ] manifest response carries exact acknowledgement;
- [ ] invocation errors map intentionally;
- [ ] authorization precedes identity disclosure;
- [ ] exact published dependencies are consumed;
- [ ] two real tabs produce one effect/result/event and zero conflicts;
- [ ] browser/network/console/durable evidence is captured.

## 23. References

### Primary implementation files

- `pinocchio/proto/pinocchio/chatapp/frontendtools/v1/frontend_tool.proto`
- `pinocchio/pkg/chatapp/frontendtools/manager.go`
- `pinocchio/pkg/chatapp/frontendtools/plugin.go`
- `pinocchio/pkg/chatapp/frontendtools/manager_test.go`
- `pinocchio/pkg/chatapp/frontendtools/bridge_test.go`
- `react-chat/packages/chat-provider/src/core/createChatClient.ts`
- `react-chat/packages/chat-provider/src/tools/toolRuntime.ts`
- `react-chat/packages/chat-provider/src/tools/toolRuntime.test.ts`
- `react-chat/packages/chat-provider/src/ws/timelineEvents.ts`
- `react-chat/packages/chat-provider/src/ws/timelineSnapshot.ts`
- `pbui/pkg/chatserver/handlers.go`
- `pbui/pkg/chatserver/server.go`
- `pbui/pkg/chatserver/server_test.go`

### Companion design/evidence

- `react-chat/.../design-doc/01-chat-provider-browser-tool-runtime-hardening-idempotency-executor-ownership-manifests-implementation-guide.md`
- `pinocchio/.../design-doc/01-pinocchio-frontend-tool-bridge-hardening-invocation-identity-result-validation-implementation-guide.md`
- `pbui/.../design-doc/01-pbui-agent-to-ui-hardening-architecture-security-approvals-implementation-guide.md`
- `pbui/.../various/03-phase5-multitab-executor-blocker.md`

## Conclusion

The concise protocol does not need a lease service to stop the demonstrated two-tab duplicate execution. It needs one explicit server-selected executor epoch carried end to end.

The three-part tuple is the reasonable minimum: tab identity distinguishes clients, connection identity distinguishes transport incarnations, and assignment identity distinguishes server ownership periods. Atomic manifest acknowledgement tells the browser what the server accepted. Immutable pending-call capture prevents ownership changes from rewriting in-flight authority. Browser filtering prevents the second effect before it happens, while Pinocchio result validation and existing terminal ledgers preserve idempotent completion.

The design deliberately favors fail-closed behavior over speculative takeover. Timed leases, active-tab selection, targeted delivery, and cryptographic binding can be layered onto the same assignment model later without invalidating the first release.
