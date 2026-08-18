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
