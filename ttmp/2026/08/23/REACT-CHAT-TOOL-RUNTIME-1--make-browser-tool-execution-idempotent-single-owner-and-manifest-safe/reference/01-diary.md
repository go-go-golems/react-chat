---
Title: Diary
Ticket: REACT-CHAT-TOOL-RUNTIME-1
Status: active
Topics: [frontend-tools, chat-provider, typescript, frontend]
DocType: reference
Intent: long-term
Owners: [manuel]
RelatedFiles: []
ExternalSources: []
Summary: 'Chronological investigation, design, validation, and delivery record for chat-provider browser frontend-tool runtime hardening.'
LastUpdated: 2026-08-23T17:25:00-04:00
WhatFor: 'Let implementers retrace replay, human completion, multi-tab ownership, manifest, and timeout design decisions.'
WhenToUse: 'When implementing, reviewing, resuming, or releasing REACT-CHAT-TOOL-RUNTIME-1.'
---

# Diary

## Goal

Record the evidence and decisions behind the chat-provider browser runtime hardening guide and its validation/delivery.

## Step 1: Model browser execution as a durable invocation state machine

I mapped chat-provider from `ChatProvider` runtime construction through tool registration/manifests, live and hydrated request delivery, automatic execution, human outlets, result POST, transport reconnect, and debug events. The guide begins with that ownership map so a new intern does not confuse React rendering with tool-execution correctness.

The design responds to executable evidence from the PBUI consumer: after an automatic call completed, reconciling the same requested call id executed it again; calling the human response API twice submitted twice. A second independent issue is that two tabs have separate local maps and can both execute one broadcast request.

### Prompt Context

**User prompt (verbatim):** "Create a new docmgr ticket for each repo and write a detailed design doc for each.\n\nFor each repo:\nCreate  a detailed analysis / design / implementation guide that is for a new intern, explaining all the parts of the system needed to understand what it is, with prose paragraphs and bullet point sand pseudocode and diagrams and api references and file references. It should be very clear and technical. Store in the ticket and the nupload to remarkable.\n\n[REMINDER] Output a <summary>...</summary> block at the VERY END of your response. This is mandatory."

**Assistant interpretation:** Create a new react-chat ticket with a standalone design/implementation guide for chat-provider idempotency, ownership, and manifest fixes, then validate and deliver it.

**Inferred user intent:** Give a new frontend engineer enough architecture and failure semantics to implement the browser half safely and publish a consumer-ready package.

### What I did

- Created `REACT-CHAT-TOOL-RUNTIME-1` with writing, validation, and delivery tasks.
- Inventoried `packages/chat-provider/src`, package scripts/version, runtime, registry, client, outlet, snapshot, event, manager, and transport tests.
- Wrote a state-machine design for running/waiting-human/completing/terminal invocations.
- Specified terminal retention, result-delivery retry without effect replay, human compare-and-set, executor client identity, manifest snapshots, timeouts, debug events, tests, and release sequencing.

### Why

- At-least-once request delivery is normal under reconnect/hydration; it must not become at-least-once UI effects.
- Server first-result-wins does not prevent two tabs from mutating their own browser UI.
- Manifest revision has meaning only relative to a client instance/generation.

### What worked

- The package already separates the tool runtime from React components and transport.
- Input/result parsing and availability checks are central and reusable in the new claim/complete flow.
- Existing transport/snapshot tests provide deterministic fake-platform patterns.

### What didn't work

N/A during document authoring. No package implementation was changed.

### What I learned

- Failed result delivery must retain a `completing` state; returning to runnable state would replay effects.
- React button state is only UX; runtime compare-and-set provides correctness across duplicate outlets.
- Broadcast may remain at transport level if server assignment and client filtering identify one executor.

### What was tricky to build

The design must survive both duplicate delivery and browser reload. An in-memory terminal LRU closes same-runtime replay but not crash/reload after effect and before result acknowledgement. The guide stages compact durable terminal identity and a server recovery handshake instead of persisting arbitrary sensitive results blindly.

### What warrants a second pair of eyes

- Terminal retention/TTL and what minimal completion data may be persisted.
- Executor lease movement for human calls in inactive tabs.
- Public API migration from call-id selectors to full invocation keys.

### What should be done in the future

- Implement in-runtime terminal state and human CAS before protocol v2.
- Add manifest snapshot/ack queue.
- Coordinate full invocation/executor fields with Pinocchio and PBUI, then publish a new package version.

### Code review instructions

- Start at `packages/chat-provider/src/tools/toolRuntime.ts` and its focused tests.
- Verify there is no `await` between duplicate check and state claim.
- Run focused typecheck/test/build-dist, then PBUI consumer tests against the built package.

### Technical details

The central state union is:

```ts
type InvocationState =
  | { phase: 'running'; controller: AbortController }
  | { phase: 'waiting-human' }
  | { phase: 'completing'; completion: ToolCompletion }
  | { phase: 'terminal'; completion: ToolCompletion; completedAt: number };
```

## Step 2: Restore dependencies and validate the package/design baseline

The finished guide is 782 lines and 3,953 words. Frontmatter and doctor pass, all three Mermaid diagrams render, and chat-provider typecheck, 53 tests, and distribution build pass after restoring the repository's missing dependencies from its frozen lockfile.

### Prompt Context

**User prompt (verbatim):** (same as Step 1)

**Assistant interpretation:** Validate the design artifact and establish a reproducible current package baseline before implementation.

**Inferred user intent:** Ensure the intern guide corresponds to a buildable/tested source checkout and produces a readable PDF.

### What I did

- Validated frontmatter and ran `docmgr doctor --ticket REACT-CHAT-TOOL-RUNTIME-1`.
- Attempted focused typecheck/test/build.
- Restored dependencies with `pnpm install --frozen-lockfile` after the first attempt exposed missing `node_modules`.
- Reran typecheck, 53 tests, and `build:dist` successfully.
- Rendered all three Mermaid blocks and related seven key package source files.

### Why

- The design changes public runtime/registry/client types, so typecheck and dist generation are required baselines.
- Snapshot/transport correctness depends on the existing focused test harness.

### What worked

```text
Test Files 11 passed (11)
Tests 53 passed (53)
typecheck: passed
build:dist: passed
Doctor: all checks passed
Mermaid: 3/3 PASS
```

### What didn't work

The first validation attempt failed because the repo had no installed dependencies:

```text
spawn ENOENT
Local package.json exists, but node_modules missing
tsc: not found
```

`pnpm install --frozen-lockfile` restored exactly the lockfile set, after which every focused command passed. The first Mermaid call also failed with `mmdc: command not found`; the rerun used its absolute Node v22 path.

### What I learned

- `build:dist` strips ignored publish artifacts and rewrites ESM imports; consumer validation must use the generated package, not assume source aliases.
- The current 53-test baseline does not cover terminal replay or duplicate human completion after terminal state.

### What was tricky to build

Dependency installation had to avoid lockfile mutation. The frozen install succeeded and git status remained limited to the new ticket. Mermaid required the same no-sandbox Chromium configuration as the other guides.

### What warrants a second pair of eyes

- Review ignored-build-script warning for `esbuild`; focused checks did not require its install script.
- Run PBUI consumer tests after the implementation package is actually published/bumped.

### What should be done in the future

- Implement runtime Phase 0, then manifest snapshots, protocol v2, and durable recovery in order.

### Code review instructions

- Re-run focused typecheck/test/build-dist and inspect generated dist diff during implementation.
- Add deterministic deferred-promise tests rather than sleep-based replay tests.

### Technical details

Validation evidence is summarized in `various/01-mermaid-render.txt`; the initial dependency failure and recovery are recorded above.

## Step 3: Deliver the guide to a canonical reMarkable path

The first upload returned success but exact-path verification failed because concurrent rmapi directory creation made duplicate `23` collections. The guide was dry-run and uploaded again sequentially under `23-deliveries`, where the exact listing now resolves.

### Prompt Context

**User prompt (verbatim):** (same as Step 1)

**Assistant interpretation:** Deliver and verify the chat-provider guide on reMarkable.

**Inferred user intent:** Make the browser-runtime design reliably accessible to the implementer.

### What I did

- Ran dry runs for initial and canonical paths.
- Performed final sequential upload.
- Verified the exact remote directory listing.
- Added `various/02-remarkable-delivery.md`.

### Why

- A remote success line did not prove that a human-resolvable path selected the same duplicate parent.

### What worked

```text
OK: uploaded REACT-CHAT-TOOL-RUNTIME-1 Browser Tool Runtime Guide.pdf -> /ai/2026/08/23-deliveries/REACT-CHAT-TOOL-RUNTIME-1
[f] REACT-CHAT-TOOL-RUNTIME-1 Browser Tool Runtime Guide
```

### What didn't work

Initial verification returned:

```text
Error: no matches for 'REACT-CHAT-TOOL-RUNTIME-1'
```

The shared parent contained three duplicate `23` collections after concurrent creation warnings.

### What I learned

- Serialize uploads that create shared parents.
- Keep delivery evidence next to the design ticket.

### What was tricky to build

The files existed remotely but name-based path traversal was ambiguous. A unique parent solved verification without destructive remote cleanup.

### What warrants a second pair of eyes

- Optional duplicate cleanup should be a separate operator-confirmed task using remote object IDs.

### What should be done in the future

- Use the canonical `23-deliveries` path for this PDF.

### Code review instructions

- Inspect all three rendered diagrams and the state-machine/API sections on device.

### Technical details

Canonical path: `/ai/2026/08/23-deliveries/REACT-CHAT-TOOL-RUNTIME-1`.
