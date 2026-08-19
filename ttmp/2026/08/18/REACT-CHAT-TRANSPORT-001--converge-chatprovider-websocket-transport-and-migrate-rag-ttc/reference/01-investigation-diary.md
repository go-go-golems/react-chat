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
RelatedFiles: []
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
