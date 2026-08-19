---
Title: Investigation diary
Ticket: REACT-CHAT-TRANSPORT-001
Status: active
Topics:
    - chat
    - websocket
    - chat-provider
    - sessionstream
    - react
    - architecture
DocType: reference
Intent: long-term
Owners: []
RelatedFiles:
    - Path: repo://scripts/packages/pack-smoke.mjs
      Note: Preflights publish directories and reports the correct build prerequisite before npm pack (commit d17b450)
ExternalSources: []
Summary: Chronological evidence and commands behind the transport convergence ticket.
LastUpdated: 2026-08-18T19:33:52.258634718-04:00
WhatFor: Preserve the evidence, decisions, commands, and handoff details behind the transport convergence plan.
WhenToUse: During implementation and review, especially when validating heartbeat behavior or revisiting subsystem boundaries.
---


# Investigation diary

This diary records the investigation that turned an observed Garden Assistant `1006` close into a cross-repository transport plan. It is intentionally detailed enough that another engineer can reproduce the reasoning without relying on chat history.

## Step 1: Trace the premature close and identify transport ownership

### Prompt Context

> Create a gh issue in coinvault with all the details for that later, so that an intern can pick it up. THen let's create a ticket in react-chat to properly implement the transport convergence (and move rag-ttc towards it too).

The request followed a real RAG-TTC Garden Assistant run whose browser stream ended with WebSocket close code `1006`. The final visible frames were successful TTC tool events, followed by a new `ChatRunStarted`; there was no application error frame. The user also pointed to recent sessionstream heartbeat work and added the React Chat source checkout to the workspace.

### What I did

- Inspected the current React Chat, RAG-TTC, CoinVault, and sessionstream source trees and recent Git history.
- Compared the sessionstream heartbeat contract with both browser WebSocket managers.
- Distinguished generic lifecycle responsibilities from product-specific protobuf/Redux mapping.
- Checked package versions and confirmed RAG-TTC declares ChatProvider `0.2.1` while this React Chat checkout is `0.4.2`.
- Checked CoinVault's GitHub repository and searched for an existing matching issue.
- Created [goldeneagle/coinvault#9](https://github.com/goldeneagle/coinvault/issues/9) with phased intern-ready scope, tests, acceptance criteria, non-goals, history, and estimate.
- Created this React Chat ticket and its implementation design using `docmgr`.

### Why

The symptom crosses repository boundaries. A local Garden patch would make one UI survive while leaving ChatProvider's transport contract broken. Conversely, a full CoinVault provider/store rewrite would turn a precise protocol fix into a risky migration. The right boundary is shared connection lifecycle with downstream-owned domain semantics.

### What worked

- Git history made the timing clear: sessionstream heartbeat enforcement landed after CoinVault's abnormal-close reconnect logic.
- The protocol parser already distinguished `ping` and `pong`, narrowing the immediate shared fix to manager dispatch plus tests.
- CoinVault's code cleanly exposed the seam: URL construction comes from ChatProvider, while socket lifecycle and product mapping remain local.
- GitHub authentication was active for `wesen`, and the duplicate issue search returned no obvious match.

### What did not work

- An initial attempt to display an existing diary returned `sed: can't read ...: No such file or directory` even though a subsequent `find` showed the expected path. This was non-blocking and no file was modified; the new diary follows the current diary skill format directly.
- `docmgr doc relate` normalized two absolute paths containing the `/ws/` directory into invalid `ws://coinvault/...` URIs and retained two pre-seeded React Chat paths as relative paths. I corrected the four frontmatter entries directly, then reran `docmgr doctor`. This is worth reporting upstream if it reproduces in a smaller fixture.
- Merely upgrading RAG-TTC cannot solve the defect: the current `0.4.2` source also ignores parsed ping frames.

### What I learned

- Sessionstream defaults explain the timing: ping at 30 seconds, then a 10-second pong deadline, producing a close around 40 seconds.
- CoinVault's reconnect is useful but masks protocol noncompliance; repeated reconnect is not connection health.
- The shared manager has two distinct gaps: immediate heartbeat correctness and durable reconnect/resume behavior.
- Product schema mapping does not need to move to achieve transport convergence.

### What was tricky

The most subtle point was separating the visible failure from its masking behavior. RAG-TTC surfaced `1006`; CoinVault can appear healthy because it reconnects. Both clients still fail the same ping/pong obligation. Another subtle point is resume cursor ownership: the cursor must advance after successful consumer delivery, not merely after receipt, or reconnect can skip a failed event.

### What warrants a second pair of eyes

- Confirm the deployed sessionstream resume request and ordering guarantees before implementing hydration buffering.
- Review whether CoinVault's auth lease requires a generic pre-connect authorization hook or stays entirely above transport.
- Review the proposed consumer decoder/event boundary before public API changes.
- Confirm reconnect defaults and sanitized diagnostic fields.

### What should be done differently next time

When adding a server-visible protocol requirement, enumerate and test every shipped client in the same change. A small protocol-conformance fixture shared by demos and browser packages would have exposed the missing pong before deployment.

### How to review this step

1. Read `packages/chat-provider/src/ws/protocol.ts` and verify ping parsing.
2. Read `packages/chat-provider/src/ws/wsManager.ts` and follow the parsed-frame switch/dispatch path.
3. Compare CoinVault's `web/src/ws/wsManager.ts`, especially abnormal-close handling.
4. Inspect sessionstream commits `0dbd8e5`, `5a1d9eb`, and `c40a861`.
5. Review issue #9 and the design document beside this diary for consistent scope.

### Commands run

```bash
git log --all --since='2026-08-01' --oneline --decorate -- sessionstream
rg -n 'ping|pong|Heartbeat|PongTimeout|HeartbeatInterval' sessionstream react-chat coinvault rag-ttc
git -C react-chat status --short --branch
git -C coinvault status --short --branch
gh auth status
gh issue list --repo goldeneagle/coinvault --state all --limit 100 --search 'chat-provider websocket transport convergence heartbeat'
gh issue create --repo goldeneagle/coinvault --title 'Converge CoinVault WebSocket transport onto ChatProvider' --body-file /tmp/coinvault-chat-provider-issue.md
docmgr ticket create --ticket REACT-CHAT-TRANSPORT-001 --title 'Converge ChatProvider WebSocket transport and migrate RAG-TTC' --topics chat,websocket,chat-provider,sessionstream,react,architecture
docmgr doc add --ticket REACT-CHAT-TRANSPORT-001 --doc-type design-doc --title 'ChatProvider transport convergence and downstream migration guide' ...
docmgr doc add --ticket REACT-CHAT-TRANSPORT-001 --doc-type reference --title 'Investigation diary' ...
```

### Technical details

- Sessionstream heartbeat interval: 30 seconds by default.
- Sessionstream pong timeout: 10 seconds by default.
- Required response shape: `{"pong":{"nonce":"<exact ping nonce>"}}`.
- Observable failure: abnormal close `1006`, typically around 40 seconds when otherwise idle.
- React Chat source package version inspected: `0.4.2`.
- RAG-TTC Garden Assistant declared ChatProvider version: `0.2.1`.
- CoinVault GitHub handoff: `https://github.com/goldeneagle/coinvault/issues/9`.
- Estimated CoinVault transport-only adoption after the shared API lands: 1–2 focused engineering days; full provider/store migration is a separate 3–5 day effort.

## Step 2: Expand the scope into a complete intern implementation guide

The initial design intentionally separated the minimum transport correction from optional platform work. The user chose to build the solid foundation in one coordinated project so RAG-TTC can validate it before CoinVault adopts it. This step converted that decision into a second, canonical design document rather than erasing the earlier scope discussion.

The expanded guide now connects the system architecture to concrete TypeScript APIs, lifecycle invariants, test cases, commit boundaries, RAG-TTC rollout steps, and the later CoinVault integration. No runtime code changed in this step.

### Prompt Context

**User prompt (verbatim):** "Actually I think it would be good to just do it at once, that way we can have a solid foundation _and_ an already updated rag-ttc for when we are ready to carry over coinvault.

Create a new design doc with a full implementation plan for all, from heartbeat to all the things we described.

Create  a detailed analysis / design / implementation guide that is for a new intern, explaining all the parts of the system needed to understand what it is, with prose paragraphs and bullet point sand pseudocode and diagrams and api references and file references. It should be very clear and technical. Store in the ticket and the nupload to remarkable."

**Assistant interpretation:** Create a new comprehensive guide inside the existing ticket, preserve the earlier document as historical context, document the full foundation and RAG-TTC migration in intern-usable detail, then validate, commit, and upload it to reMarkable.

**Inferred user intent:** Make the future implementation executable by a new contributor and ensure CoinVault later integrates against a foundation already proven by a real downstream application.

### What I did

- Added `design-doc/02-complete-chatprovider-transport-foundation-intern-implementation-guide.md` through `docmgr`.
- Documented the existing React Chat, RAG-TTC, CoinVault, and sessionstream responsibilities.
- Specified a Redux-independent transport API, typed codec, opaque ordinal type, lifecycle states, reconnect policy, delivery acknowledgment, hydration ordering, buffer policy, HTTP/auth hooks, session policy, attachments, and safe diagnostics.
- Added ASCII architecture and state diagrams that remain readable in Markdown and PDF.
- Defined deterministic unit/conformance tests, real full-corpus RAG-TTC validation, phased commits, review gates, and the future CoinVault integration example.
- Related seven central implementation files and retained CoinVault issue #9 as an external source.

### Why

- Building and validating the complete boundary in React Chat and RAG-TTC reduces uncertainty during the later CoinVault migration.
- A separate document preserves the rationale of the earlier pragmatic scope while making the user's expanded decision explicit.
- The intern needs both conceptual ownership boundaries and copyable API/test sketches; a task list alone would not be sufficient.

### What worked

- The existing timeline adapter abstraction provided a clean boundary between transport delivery and product projection.
- CoinVault's local manager and parsing tests supplied concrete downstream requirements without requiring CoinVault changes in this ticket.
- ASCII diagrams avoided requiring a Mermaid rendering extension during reMarkable PDF conversion.

### What didn't work

- `docmgr doc relate` again normalized absolute paths: React Chat paths became `repo://...`, while paths containing the workspace's `ws` directory segment became `ws://...`. The command reported success, but the generated paths were not the requested absolute paths. I corrected all seven `RelatedFiles` entries directly and will verify them with `docmgr doctor`.

### What I learned

- The complete project has one essential dependency direction: platform and codec feed transport; transport feeds product projection. CoinVault reuse fails if Redux imports cross downward into transport.
- Attachment references, safe diagnostics, and session policy are not separate UI features; they shape the public client API that CoinVault will eventually consume.
- Commit-after-consumer-delivery is the key invariant connecting reconnect, resume, projection errors, and deduplication.

### What was tricky to build

- The guide had to be complete without prematurely deciding facts that must be verified against the server, such as whether resume is strictly greater than the supplied ordinal or whether multiple events can share an ordinal. Those are marked as Phase 0 questions rather than hidden assumptions.
- The plan avoids backwards-compatibility overloads while still producing reviewable commits. Known consumers are updated directly after the shared API changes.
- The design separates historical hydration from live tool execution so replay cannot repeat side effects.

### What warrants a second pair of eyes

- Review the proposed codec boundary against the generated sessionstream protobuf schema.
- Verify the committed-ordinal definition and poison-frame behavior.
- Confirm attachment endpoints are sufficiently aligned before making upload/remove behavior non-injectable.
- Confirm the proposed terminal-versus-retryable close classification against deployed auth behavior.
- Review diagnostic fields for accidental payload or credential exposure.

### What should be done in the future

- Implement the phases in the documented order and record code commits and test evidence as new diary steps.
- Update CoinVault issue #9 with the final published package version and exact integration API after RAG-TTC validation.
- Report the repeatable `docmgr doc relate` URI normalization behavior with a minimal reproduction.

### Code review instructions

- Start with the new guide's Executive Summary, Target Architecture, Transport API, and Implementation Plan.
- Compare its boundaries with `packages/chat-provider/src/ws/wsManager.ts` and `core/createChatClient.ts`.
- Compare the future consumer API with CoinVault's `web/src/ws/wsManager.ts`.
- Run `docmgr doctor --ticket REACT-CHAT-TRANSPORT-001` and inspect the rendered PDF for code-block and diagram readability.

### Technical details

- New canonical guide: `design-doc/02-complete-chatprovider-transport-foundation-intern-implementation-guide.md`.
- Downstream validation target: the real full-corpus RAG-TTC Garden Assistant using `~/.cache/rag-ttc/...` caches.
- Planned shared ordinal representation: branded decimal string, compared through `BigInt`.
- Planned transport observer commits an ordinal only after successful snapshot/event consumption.
- Planned reMarkable destination: `/ai/2026/08/18/REACT-CHAT-TRANSPORT-001/`.

## Step 3: Implement the typed protocol and independent transport core

This step implemented the first executable foundation: a strict sessionstream codec and a transport that has no React, Redux, timeline, tool, or widget dependency. The transport now owns heartbeat response, connection generations, lifecycle status, bounded reconnect, committed ordinals, hydration buffering, and safe metadata diagnostics.

Reading the server source corrected an assumption in the design before it became code. `sinceSnapshotOrdinal` is currently advisory: the server always sends a current snapshot, filters hydration fanout at the snapshot boundary, and then transitions live. Multiple UI events in one published batch also share an ordinal, so ordinal-only deduplication would incorrectly drop valid events. The implementation preserves stable same-ordinal batch order and only filters events covered by the current snapshot.

### Prompt Context

**User prompt (verbatim):** "Ok, implement, commit at appropriate intervals and keep a detailed diary as you work (using the diary format from the skill)"

**Assistant interpretation:** Implement the complete ticket in phased, tested commits while maintaining the strict implementation diary throughout the work.

**Inferred user intent:** Produce a production-quality shared ChatProvider foundation and an already migrated RAG-TTC application, with enough evidence and history for review and later CoinVault adoption.

**Commit (code):** `a8152b323d7be0dfb9c2077005332741b5798612` — "feat(chat-provider): add resilient sessionstream transport"

### What I did

- Replaced loose protocol normalization with a typed `SessionStreamFrame` union and `SessionStreamCodec`.
- Added branded decimal-string `EventOrdinal` values and `BigInt` comparison.
- Added strict subscribe and pong encoders and validation for malformed/unknown frames.
- Added a Redux-independent `SessionStreamTransport` with injected WebSocket, timers, and randomness.
- Implemented explicit lifecycle states, generation-safe callbacks, intentional disconnect, disposal, bounded exponential reconnect, committed ordinal tracking, bounded hydration buffering, and metadata-only diagnostics.
- Added deterministic protocol and transport tests using fake sockets and timers.
- Inspected sessionstream server implementation and hydration race tests to verify actual subscribe ordering and cursor behavior.

### Why

- CoinVault cannot reuse the former manager because it directly imported ChatProvider Redux and projection code.
- Decimal strings preserve protobuf `uint64` ordinals beyond JavaScript's safe integer range.
- Deterministic platform seams make timing and stale-callback behavior testable without browser sleeps.
- The server's fresh-snapshot contract makes snapshot-boundary filtering the reliable recovery mechanism today.

### What worked

- `pnpm install --frozen-lockfile` restored the exact workspace dependencies without changing the lockfile.
- The final checkpoint passed 36 tests across eight files and passed package TypeScript checking.
- Tests verify exact opaque nonce echo, readiness only after hydration/subscription, committed-cursor reconnect, stale callback rejection, intentional-stop behavior, explicit overflow, and commit-after-delivery.

### What didn't work

- The first test command failed because dependencies were absent:

  ```text
  sh: 1: vitest: not found
  ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL @go-go-golems/chat-provider@0.4.2 test
  spawn ENOENT
  WARN Local package.json exists, but node_modules missing, did you mean to install?
  ```

- The first strict frame typing made existing projection-unit fixtures invalid because those fixtures intentionally construct partial projection frames. TypeScript reported errors such as:

  ```text
  Type '{ type: "ui-event"; name: string; }' is not assignable to type 'SessionStreamFrame'.
  ```

  I separated the strict wire `SessionStreamFrame` from the narrower, optional-field `CanonicalFrame` used by projection adapters. This preserves a strict transport boundary without forcing synthetic projection tests to claim they are complete wire frames.

- The first transport test run had four failures because chained asynchronous message processing had not drained after three manually awaited microtasks. I replaced fragile microtask counting with `vi.waitFor`. That run also exposed a real error-reporting bug: `fail()` cleared the observer before invoking `onError`, so the callback was never called. Capturing the observer before teardown fixed it.
- The next typecheck found browser-interface and TypeScript configuration issues:

  ```text
  Type 'WebSocket' is not assignable to type 'WebSocketLike'.
  error TS1294: This syntax is not allowed when 'erasableSyntaxOnly' is enabled.
  ```

  I isolated the browser WebSocket cast inside the platform adapter and replaced a constructor parameter property with an explicitly declared field.

### What I learned

- Sessionstream currently documents resume input as advisory rather than event replay. Correct recovery comes from accepting a fresh snapshot and then its post-snapshot live fanout.
- A sessionstream publish batch can contain multiple events with the same ordinal. Deduplication must not assume ordinal uniqueness.
- The server sends snapshot and buffered live events before `subscribed`; readiness therefore means the client has processed the snapshot and reaches `subscribed`, not merely `onopen`.
- Observer teardown order is part of the error contract: capture notification targets before clearing lifecycle state.

### What was tricky to build

- Serialized message processing was necessary because snapshot and consumer callbacks may be asynchronous. Without one promise queue, an event could commit before its snapshot or another event finishes.
- The committed cursor advances after successful observer delivery. A rejected projection leaves the cursor unchanged and terminates the connection, preventing silent loss.
- Stale WebSocket callbacks are rejected by both generation and socket identity; either check alone leaves edge cases during replacement.
- Same-ordinal events require stable arrival order. Buffer sorting uses ordinal first and an explicit insertion counter second.

### What warrants a second pair of eyes

- Review whether eight reconnect attempts and the 250ms-to-10s policy match production expectations.
- Review terminal protocol-error handling, especially authentication-related server error codes.
- Confirm string-length is a sufficient buffer-byte approximation for UTF-16 browser strings; use encoded UTF-8 size if exact byte enforcement matters.
- Review the decision to reject consumer errors rather than retry poison frames indefinitely.

### What should be done in the future

- Adapt ChatProvider Redux/timeline behavior onto this transport and remove the old socket implementation.
- Add request, session, attachment, and public error contracts before migrating RAG-TTC.
- When server-side replay is introduced, revise resume tests to cover the replay boundary without changing the committed-delivery invariant.

### Code review instructions

- Start at `packages/chat-provider/src/ws/protocol.ts`, then read `sessionStreamTransport.ts` from public types through `processRawFrame` and failure handling.
- Review `sessionStreamTransport.test.ts` for lifecycle invariants and server-order assumptions.
- Validate with:

  ```bash
  pnpm --filter @go-go-golems/chat-provider typecheck
  pnpm --filter @go-go-golems/chat-provider test
  ```

### Technical details

- Validation result: 8 test files, 36 tests passed.
- Server reference: `sessionstream/pkg/sessionstream/transport/ws/server.go` states the cursor is advisory and subscribe always sends a current snapshot followed by live fanout.
- Default reconnect: 250ms base, 10s cap, 20% jitter, eight attempts.
- Default hydration limits: 1,000 frames and 4 MiB approximated from received string lengths.

## Step 4: Integrate the transport and complete the public client foundation

This step removed the old socket lifecycle from ChatProvider and made its Redux/timeline behavior an observer of the independent transport. It also completed the public API changes needed before a downstream migration: declarative session restoration, injected HTTP/auth hooks, explicit operation failures, structured send requests, and attachment upload/removal.

Diagnostics are now metadata-only by default. Raw frames and full timeline mutations were removed from the debug stream because they can contain prompts, tool arguments, results, and attachment data. The devtools retain lifecycle, frame type/size, ordinal, adapter name, entity identifiers, reconnect, resume, heartbeat, and buffer information.

### Prompt Context

**User prompt (verbatim):** (same as Step 3)

**Assistant interpretation:** Continue implementing the complete design in a second coherent checkpoint and preserve review evidence.

**Inferred user intent:** Establish the public ChatProvider boundary that RAG-TTC can adopt now and CoinVault can reuse later without inheriting Redux internals.

**Commit (code):** `d7df59b060ddb31276a6d547c86f2717d57bf79d` — "feat(chat-provider): unify client lifecycle and request APIs"

### What I did

- Replaced `WsManager` internals with a thin observer over `SessionStreamTransport`.
- Preserved snapshot and live projection through the existing timeline adapter registry.
- Changed debug events to safe metadata-only shapes and updated the classifier, store tests, overlay devtools, and stories.
- Added `SessionPolicy` with `never`, `local-storage`, and URL-with-optional-fallback modes.
- Added injected `fetch`, headers, and `beforeRequest` hooks with named chat operations.
- Changed message submission from `send(prompt)` to `send({ prompt, attachments })`.
- Added `ChatAttachmentRef` plus attachment upload and removal client operations.
- Changed connect/send failures to update Redux and reject to the caller.
- Updated the shared composer and package exports.
- Added tests for session policies, request hooks, authorization headers, attachment serialization, upload/removal, and explicit HTTP failure.

### Why

- The independent transport is only useful if ChatProvider itself consumes it and deletes its competing lifecycle.
- CoinVault needs authorization and endpoint customization without a request-middleware framework.
- Attachments already exist in the backend/CoinVault contract and therefore belong in the shared message request.
- Debug streams must not become an unintentional transcript and credential archive.
- Callers must be able to react to connection or request failure instead of only observing Redux later.

### What worked

- ChatProvider passed 40 tests and typechecking after the API expansion.
- Chat Overlay passed five tests and typechecking after its debug and send API updates.
- Existing live/snapshot timeline adapters required no product-specific rewrite.
- Header injection and pre-request hooks remained small and operation-oriented.

### What didn't work

- The first integration typecheck found stale assumptions in the debug classifier and tests:

  ```text
  Property 'name' does not exist on type '{ type: "frame-received"; ... }'.
  Type '"connected"' is not assignable to type 'TransportStatus'.
  ```

  Frame-received diagnostics intentionally carry no event payload/name, and the lifecycle now calls the usable state `ready`. I updated the classifier and fixtures accordingly.
- A combined `apply_patch` attempt failed because one hunk targeted the wrong file context:

  ```text
  apply_patch verification failed: Failed to find expected lines ...
  ```

  I split the correction across the proper files and reapplied it.
- The next provider typecheck reported an unused helper after removing payload-rich frame classification:

  ```text
  error TS6133: 'familyForUIEventName' is declared but its value is never read.
  ```

  Removing the obsolete helper fixed it.
- Chat Overlay then exposed all remaining raw-debug and mutation-folding dependencies. The errors included:

  ```text
  Type '"raw"' is not assignable to type 'ChatDebugFamily'.
  'mutation' does not exist in type '{ type: "ui-event"; ... }'.
  ```

  I removed the raw filter/category and stopped reconstructing timeline content from safe diagnostics. Snapshot seeding remains, but content-bearing mutation replay is intentionally unavailable.
- The first HTTP test typecheck inferred a zero-argument mock and rejected access to captured request arguments. Explicitly typing the mock as a fetch-compatible two-argument function fixed the fixture.

### What I learned

- Safe diagnostics and timeline reconstruction from raw mutations are conflicting requirements. The safe default must win; a future privileged developer recorder would need an explicit unsafe boundary.
- Session policy is clearer when the URL fallback is represented structurally rather than through independent flags.
- The smallest sufficient auth seam is named pre-request notification plus header and fetch injection.
- Attachment upload responses in current consumers may use camelCase or protobuf-style snake_case, so normalization belongs at the HTTP response boundary.

### What was tricky to build

- `WsManager.connect()` must reuse one connection promise for repeated sends in the same session; otherwise every `send()` would replace the transport because each observer object is new.
- Error delivery must update Redux and rethrow, avoiding either swallowed errors or missing UI state.
- Multipart upload must not set JSON content type; the browser needs to supply its boundary.
- Removing mutation payloads required updating both data types and devtool behavior, not merely suppressing one log statement.

### What warrants a second pair of eyes

- Review the public breaking change from `send(string)` to `send(SendMessageRequest)` and confirm every external package is migrated before release.
- Review whether the default URL-plus-local-storage session policy should remain the package default.
- Review attachment response normalization and endpoint parity with RAG-TTC/Pinocchio.
- Review the deliberate removal of timeline mutation folding from safe debug entries.
- Confirm authorization hooks are called for every relevant HTTP operation and that WebSocket cookie/URL authentication remains sufficient.

### What should be done in the future

- Update RAG-TTC configuration, send call sites, logging, dependency resolution, and tests.
- Add or extend live-versus-hydrated attachment projection coverage once the downstream schema fixture is available.
- Document the breaking public API in the package release notes.

### Code review instructions

- Begin with `core/createChatClient.ts` public types and request helper.
- Follow `react/ChatProvider.tsx` into the new `wsManager.ts` observer adapter.
- Review debug data removal in `debug/classifyDebugEvent.ts` and Chat Overlay devtools.
- Validate with:

  ```bash
  pnpm --filter @go-go-golems/chat-provider typecheck
  pnpm --filter @go-go-golems/chat-provider test
  pnpm --filter @go-go-golems/chat-overlay typecheck
  pnpm --filter @go-go-golems/chat-overlay test
  ```

### Technical details

- ChatProvider result: 8 files, 40 tests passed.
- Chat Overlay result: 1 file, 5 tests passed.
- Safe diagnostic events include lifecycle, frame metadata, heartbeat, reconnect, resume, buffer depth, snapshot mapping metadata, and UI event identity/adapter metadata.
- HTTP operations are named so auth/lease hooks can distinguish session creation, messages, stop, tools, and attachments.

## Step 5: Migrate RAG-TTC and restart the real full-corpus assistant

This step moved the Garden Assistant source onto the new ChatProvider contract, rebuilt its embedded frontend, and restarted the real provider runtime with the full corpus. The runtime is deliberately using the RAG-TTC repository's pinned Go dependencies because the surrounding multi-repository workspace currently contains a newer, incompatible Ragkit checkout.

### Prompt Context

**User prompt (verbatim):** "Ok, implement, commit at appropriate intervals and keep a detailed diary as you work (using the diary format from the skill)"

**Assistant interpretation:** Complete the downstream migration, keep reviewable commits in both repositories, and validate the result against the real indexed Garden Assistant rather than only mock fixtures.

**Inferred user intent:** Leave RAG-TTC ready to consume the converged transport release and provide operational evidence for the heartbeat regression that initiated the work.

**Commits:**

- React Chat follow-up: `970195ff5f68183c0ed6617c6991e0434ab2da07` — "fix(chat-provider): support downstream TypeScript and safe tool metadata"
- RAG-TTC source migration: `65d3f1b0c128e66ac91dbe3caf685b428045b524` — "feat(garden-assistant): adopt shared chat transport APIs"

### What I did

- Changed the Garden composer to call `send({ prompt })` instead of the removed string overload.
- Configured `sessionPolicy: { kind: 'never' }` for the Garden Assistant and removed imperative local-storage cleanup.
- Restricted Garden console diagnostics to safe tool identity/status metadata; prompts, arguments, results, and arbitrary payloads are not logged.
- Updated the Garden provider-shell tests so their mock WebSocket completes the real `hello -> subscribe -> snapshot -> subscribed` readiness handshake.
- Added safe `toolCallId`, `toolName`, and `status` fields to shared UI-event diagnostics so RAG-TTC can retain useful operator logging without content-bearing payloads.
- Rebuilt the production frontend and copied the hashed assets into `cmd/ttc-garden/static` for Go embedding.
- Restarted `rag-ttc-garden-real` in tmux on port 8080 with provider profile `ttc-live-luna-low`, the `rk-2b0b331202f55eadcd1b485720a9cbc2` full-corpus bundle, and durable timeline/turn databases in `~/.cache/rag-ttc/garden`.

### Why

- Keeping session choice declarative prevents consumer code from racing ChatProvider's restoration behavior.
- Safe diagnostics must still identify which tool lifecycle changed, but must not duplicate chat/tool content into browser logs.
- A realistic test double must acknowledge subscription readiness; opening a socket alone is no longer equivalent to a usable chat transport.
- The embedded web build is what the real Go binary serves, so source-only validation would not exercise the deployed local application.

### What worked

- RAG-TTC typechecking passed against the local React Chat source package.
- All 47 Garden frontend tests in 13 files passed.
- The Garden production build completed successfully with 389 transformed modules.
- The real server returned HTTP 200 from `http://127.0.0.1:8080/` and served the newly generated `index-CZLa8BQV.js` bundle.
- The full-corpus manifest reports 3,149 documents, 17,753 chunks, and 35,506 raw/summary representations.

### What didn't work

- `pnpm link` was initially unsuitable for validation: it attempted to edit the tracked root manifest/workspace/lockfile and then retried an unavailable registry request. I restored every tracked link-related change and used a node_modules-only symlink for local verification.
- The first real-server launch inherited the top-level `go.work` and failed against the newer Ragkit checkout:

  ```text
  internal/customer/ragsearch/ragsearch.go:102:83: h.bundle.Chunks undefined
  ```

  Starting with `GOWORK=off` selects the RAG-TTC module's pinned, compatible dependency.
- The next launch used an absolute bundle argument and failed its path-containment contract:

  ```text
  RAG index bundle path must be relative to the RAG repository root
  ```

  The repository-local `.cache/rag-ttc/indexes/...` path is a symlink into `~/.cache/rag-ttc`, so the corrected relative argument satisfies both the application contract and the requested cache location.
- The first headless-browser command could not resolve Playwright from the workspace root. Running through the Garden package resolved it.
- The second browser attempt reached the page but its assumed `textarea` selector never became visible within 15 seconds. Per the repository's two-attempt debugging rule, I stopped this browser-harness path instead of adding speculative selector workarounds.
- I invoked `docmgr status --summary`, but this installed docmgr version has no `--summary` flag. The immediately following ticket-specific doctor command still completed and reported all checks passed.

### What I learned

- This checkout must use `GOWORK=off` for the real Garden server until Ragkit and RAG-TTC are advanced together.
- RAG-TTC intentionally validates that bundle paths are repository-relative; its cache symlink is the supported bridge to the user cache.
- The embedded application can be proven current from its hashed script reference even when a browser automation harness needs separate maintenance.
- A source migration and an npm release are separate checkpoints. RAG-TTC's tracked manifest still names published ChatProvider `0.2.1`; it must be advanced only when the new provider version exists in the registry, otherwise a frozen-lockfile checkout becomes unreproducible.

### What was tricky to build

- The Garden tests previously treated WebSocket `open` as readiness. They now need to parse the subscribe request and emit protocol frames in server order.
- Preserving useful tool lifecycle logs without exposing tool inputs or results required adding narrowly selected metadata at the shared diagnostic boundary.
- Local cross-repository validation needed to exercise uncommitted package source without encoding a machine-specific filesystem link in either repository.

### What warrants a second pair of eyes

- Re-run the browser smoke with a selector derived from the current rendered shell, then leave it connected for at least two heartbeat intervals and force one network reconnect.
- Confirm `GOWORK=off` remains the intended operational mode for this workspace rather than aligning the local Ragkit checkout in a separate task.
- Review the generated embedded JavaScript diff as a build artifact tied to the source migration.
- Decide the ChatProvider release version and publish it before updating RAG-TTC's manifest and lockfile from `0.2.1`.

### What should be done in the future

- Publish the converged ChatProvider package through the repository's guarded `publish-npm` workflow.
- Update the Garden package dependency and frozen lockfile to that published version, reinstall without the local node_modules symlink, and repeat typecheck/test/build.
- Complete the manual/automated real-browser heartbeat, tool-widget, and forced-reconnect scenarios.

### Code review instructions

- In RAG-TTC, review `TtcChatProviderShell.tsx`, `TtcChatComposer.tsx`, their tests, and the newly embedded static asset as one change.
- In React Chat, review the safe tool metadata in `wsManager.ts` and its classifier/test coverage.
- Verify the running server with:

  ```bash
  tmux capture-pane -pt rag-ttc-garden-real -S -160
  curl -fsS -D - http://127.0.0.1:8080/ -o /tmp/rag-ttc-garden-index.html
  ```

### Technical details

- Real runtime URL: `http://127.0.0.1:8080/`.
- Runtime session: `rag-ttc-garden-real`.
- Bundle: `rk-2b0b331202f55eadcd1b485720a9cbc2`, created 2026-08-18T23:09:11Z.
- Durable state: `/home/manuel/.cache/rag-ttc/garden/timeline.db` and `turns.db`.
- Known incomplete acceptance evidence: a browser stayed connected long enough to prove multiple heartbeat cycles only in transport-level fake-clock tests, not yet in the real UI smoke.

## Step 6: Run repository gates and close completed ticket tasks

This step ran the broad validation gates after both codebases were committed and updated the ticket checklist to distinguish completed implementation from release and real-browser acceptance work.

### Prompt Context

**User prompt (verbatim):** (same as Step 5)

**Assistant interpretation:** Validate the completed implementation proportionally, preserve exact failures, and leave task state honest.

**Inferred user intent:** Make each commit reviewable and avoid declaring the transport rollout complete without evidence.

### What I did

- Ran React Chat recursive typechecking, all unit tests, and the full workspace build.
- Ran the entire RAG-TTC Go suite with `GOWORK=off` and a writable temporary Go cache.
- Re-ran Garden frontend typechecking, all tests, and the production build.
- Ran `docmgr doctor` and checked the completed validation, real-server restart, and reusable conformance-fixture tasks. I reopened the package-consumption task after confirming that its durable manifest/lockfile update depends on publishing the new package.
- Left real browser heartbeat/reconnect acceptance and package publication tasks open.

### What worked

- React Chat: recursive typecheck passed, 9 test files/45 tests passed, and all workspace builds passed.
- RAG-TTC: `GOCACHE=/tmp/rag-ttc-go-cache GOWORK=off go test ./...` passed across the repository.
- Garden frontend: typecheck passed, 13 test files/47 tests passed, and the Vite production build passed.
- Ticket doctor reported all checks passed.

### What didn't work

- The first Go suite run was sandbox-limited: the default Go cache was read-only and HTTP tests could not create loopback listeners. Re-running with a temporary cache and the required local permission passed.
- `pnpm pack:smoke` failed twice with `Error: spawn npm ENOENT`, including outside the restricted sandbox, even though `command -v npm` reports `/home/manuel/.nvm/versions/node/v22.22.1/bin/npm`. I stopped after the second attempt under the repository debugging rule.
- `pnpm lint` returned `Command "lint" not found`; this repository does not define a lint script.
- My first task-update invocation passed IDs positionally and produced `Too many arguments`. The documented `--id lscp,yvbu,ed9b,fw69` form succeeded; `yvbu` was subsequently unchecked to keep the published-dependency gap explicit.
- A non-escalated final `curl` could not see port 8080 and initially looked like a server exit. Checking in the same permitted process/network context showed the tmux pane alive (`go`, `pane_dead=0`) and HTTP still serving `index-CZLa8BQV.js`; this was sandbox isolation, not an application failure.

### What I learned

- The code and product build gates are green; remaining failures are package-smoke tooling and incomplete real-browser acceptance, not unit/type/build regressions.
- Ticket task state is most useful when release and operational acceptance remain separate from implementation completion.

### What was tricky to build

- Repository-wide Go validation required separating a sandbox/cache failure from a test failure without changing application code.
- The packaging smoke failure is counterintuitive because npm resolves in the parent shell but not in Node's `execFile`; it deserves a focused tooling task rather than an opportunistic workaround in this transport change.

### What warrants a second pair of eyes

- Diagnose the pack-smoke child-process environment before publishing.
- Complete task `3adu` with a real browser connected for more than three heartbeat intervals plus forced reconnect/resume.
- Complete task `s1hr` only after a consumable ChatProvider version is published and the downstream frozen lockfile is updated.

### Code review instructions

- Compare ticket task state with this diary before treating the branch as release-ready.
- Re-run the green gates with:

  ```bash
  pnpm typecheck && pnpm test && pnpm build
  GOCACHE=/tmp/rag-ttc-go-cache GOWORK=off go test ./...
  pnpm --filter ttc-garden-assistant typecheck
  pnpm --filter ttc-garden-assistant test
  pnpm --filter ttc-garden-assistant build
  ```

### Technical details

- Completed ticket tasks in this step: `lscp`, `ed9b`, and `fw69`.
- Still open: `yvbu` (durable published dependency/lockfile), `3adu` (real browser heartbeat/tool/reconnect acceptance), and `s1hr` (publish/record consumer version and update CoinVault issue).

## Step 7: Make the package smoke failure actionable and verify the tarballs

This step resolved the packaging-validation blocker that had been recorded as an npm executable lookup failure. The apparent `spawn npm ENOENT` was caused by a missing child-process working directory: the earlier validation invoked `pack:smoke` after the ordinary workspace build, but npm packages are assembled only by `build:publish`.

The pack script now validates each package's publish directory before spawning npm and reports the required build command directly. With the publish build present and npm allowed to write its user cache, both package tarballs passed inspection.

### Prompt Context

**User prompt (verbatim):** "ok, do that. commit at appropriate intervals and keep a detailed diary as you work (using the diary format from the skill), as usual"

**Assistant interpretation:** Diagnose and fix the React Chat package-smoke blocker, commit the code separately, validate it, and preserve a detailed chronological record.

**Inferred user intent:** Make the converged ChatProvider release candidate safe to package before versioning and publication.

**Commit (code):** `d17b45093f5ff4bcac4b7071816ce55607d1ef32` — "fix(packaging): diagnose missing publish builds"

### What I did

- Inspected the root package scripts, README publishing sequence, generated directories, npm launcher, shell PATH, and a minimal Node `execFile("npm")` reproduction.
- Added a `stat()` preflight for every package `dist/` directory in `scripts/packages/pack-smoke.mjs`.
- Made the preflight error name the missing directory and instruct the operator to run `npm run build:publish` before `npm run pack:smoke`.
- Exercised the negative path with a nonexistent package directory.
- Ran `pnpm build:publish && pnpm pack:smoke` with writable npm-cache access.
- Re-ran recursive typechecking and all React Chat unit tests.

### Why

- `execFile()` reports a nonexistent `cwd` using the same `ENOENT` shape as a missing executable. Without a preflight, the error directs investigation toward PATH and npm resolution instead of the absent publish build.
- `pack:smoke` is intentionally separate from `build:publish`; preserving that separation allows inspection of an already-built artifact while keeping the documented publishing sequence explicit.
- A release gate must fail with an error that identifies the operator action needed to satisfy its precondition.

### What worked

- The minimal reproduction showed that `packages/chat-provider/dist` and `packages/chat-overlay/dist` were absent and that `execFile("npm", ..., { cwd: missingDist })` returned `ENOENT` even though npm resolved in the parent shell.
- The negative-path probe now returns:

  ```text
  Error: packages/does-not-exist: missing publish directory /home/manuel/workspaces/2026-08-12/deploy-dev-indexer/react-chat/packages/does-not-exist/dist; run "npm run build:publish" before "npm run pack:smoke"
  ```

- `build:publish` generated both distribution directories.
- The successful smoke run produced and inspected:

  ```text
  packages/chat-provider: packed go-go-golems-chat-provider-0.4.2.tgz (82 entries, 32385 bytes)
  packages/chat-overlay: packed go-go-golems-chat-overlay-0.4.1.tgz (39 entries, 17531 bytes)
  ```

- The smoke script removed both temporary tarballs after inspection.
- Recursive typechecking passed, and 45 tests in 9 files passed.

### What didn't work

- Running `pnpm build:publish && pnpm pack:smoke` inside the restricted filesystem initially advanced past the missing-directory failure but npm exited with code 226 and no stderr captured by the parent script:

  ```text
  Error: Command failed: npm pack --json
  code: 226
  stdout: ''
  stderr: ''
  ```

- Running npm directly with verbose logging exposed the actual sandbox failure:

  ```text
  npm error code EROFS
  npm error syscall open
  npm error path /home/manuel/.npm/_cacache/tmp/0989fcc8
  npm error rofs EROFS: read-only file system, open '/home/manuel/.npm/_cacache/tmp/0989fcc8'
  ```

  Re-running the gate with permission for npm's user cache passed.
- The first code commit attempt could not write the linked worktree index:

  ```text
  fatal: Unable to create '/home/manuel/code/wesen/go-go-golems/react-chat/.git/worktrees/react-chat1/index.lock': Read-only file system
  ```

  The same focused staging and commit command succeeded with worktree-index write permission.

### What I learned

- Node's child-process `ENOENT` does not distinguish a missing executable from a missing `cwd`. Both paths must be checked before attributing the failure to command lookup.
- The ordinary `pnpm build` typechecks the packages and builds the demo web app; it does not create the publishable `dist/` trees. `build:publish` is the packaging build contract.
- npm pack writes through the user npm cache even when the input and output package directories are locally writable.

### What was tricky to build

- The original error named `spawn npm`, and `command -v npm` returned a valid NVM path. The misleading symptom persisted because executable resolution was never reached: process creation failed while entering the nonexistent working directory.
- The fix needed to improve diagnosis without combining two intentionally separate release gates or adding a machine-specific npm path.
- Sandbox cache failure produced an empty stderr through the JSON pack invocation, so a direct verbose npm run was required to expose `EROFS`.

### What warrants a second pair of eyes

- Review whether `distStat.isDirectory()` plus the current build scripts is the complete publish-directory precondition, or whether a future manifest-specific check should also verify `dist/package.json`.
- Confirm CI invokes `build:publish` before `pack:smoke`; the preflight now makes drift obvious but does not build implicitly.
- Review package entry counts during version preparation so unexpected exported artifacts are caught before publication.

### What should be done in the future

- Run the guarded publish dry-run after selecting the next ChatProvider version.
- Keep `pack:smoke` independent from `build:publish`; update the documented contract if the release pipeline intentionally changes.
- If npm cache restrictions recur in another sandbox, configure a task-local npm cache rather than weakening tarball inspection.

### Code review instructions

- Start with `scripts/packages/pack-smoke.mjs` and review the `stat(distDir)` preflight immediately before `execFileAsync`.
- Verify the missing-build message with:

  ```bash
  node scripts/packages/pack-smoke.mjs packages/does-not-exist
  ```

- Verify real packages with:

  ```bash
  pnpm build:publish
  pnpm pack:smoke
  pnpm typecheck
  pnpm test
  ```

### Technical details

- npm launcher: `/home/manuel/.nvm/versions/node/v22.22.1/bin/npm`.
- Node version: `v22.22.1`.
- npm version: `10.9.4`.
- The package script uses `npm pack --json` from each generated `dist/` directory and rejects leaked `.test.*` and `.stories.*` artifacts.
