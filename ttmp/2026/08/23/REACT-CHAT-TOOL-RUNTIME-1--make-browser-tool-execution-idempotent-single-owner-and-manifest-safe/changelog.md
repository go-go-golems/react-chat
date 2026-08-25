# Changelog

## 2026-08-23

- Initial workspace created


## 2026-08-23

Wrote and validated the chat-provider browser tool runtime guide; frontmatter/doctor, typecheck, 53 tests, dist build, and 3 Mermaid renders pass

### Related Files

- /home/manuel/workspaces/2026-08-20/add-pbui-agent/react-chat/ttmp/2026/08/23/REACT-CHAT-TOOL-RUNTIME-1--make-browser-tool-execution-idempotent-single-owner-and-manifest-safe/design-doc/01-chat-provider-browser-tool-runtime-hardening-idempotency-executor-ownership-manifests-implementation-guide.md — Primary intern implementation guide
- /home/manuel/workspaces/2026-08-20/add-pbui-agent/react-chat/ttmp/2026/08/23/REACT-CHAT-TOOL-RUNTIME-1--make-browser-tool-execution-idempotent-single-owner-and-manifest-safe/reference/01-diary.md — Investigation and validation record


## 2026-08-23

Dry-ran, uploaded, and verified the chat-provider guide at /ai/2026/08/23-deliveries/REACT-CHAT-TOOL-RUNTIME-1; recorded rmapi duplicate-parent recovery

### Related Files

- /home/manuel/workspaces/2026-08-20/add-pbui-agent/react-chat/ttmp/2026/08/23/REACT-CHAT-TOOL-RUNTIME-1--make-browser-tool-execution-idempotent-single-owner-and-manifest-safe/reference/01-diary.md — Delivery failure/recovery record
- /home/manuel/workspaces/2026-08-20/add-pbui-agent/react-chat/ttmp/2026/08/23/REACT-CHAT-TOOL-RUNTIME-1--make-browser-tool-execution-idempotent-single-owner-and-manifest-safe/various/02-remarkable-delivery.md — Canonical upload and listing evidence


## 2026-08-24

Phase 0: added terminal invocation state, no-effect-replay result retries, human completion CAS, cancellation terminalization, session-namespaced hydration, and debug events (commit e341aae)

### Related Files

- /home/manuel/workspaces/2026-08-20/add-pbui-agent/react-chat/packages/chat-provider/src/tools/toolRuntime.test.ts — Deterministic regression matrix
- /home/manuel/workspaces/2026-08-20/add-pbui-agent/react-chat/packages/chat-provider/src/tools/toolRuntime.ts — Browser runtime safety state machine


## 2026-08-24

Phase 1: added owner-aware registration, immutable semantic manifest snapshots, monotonic revisions, and serialized/deduplicated recoverable sync (commit 7aa6b94)

### Related Files

- /home/manuel/workspaces/2026-08-20/add-pbui-agent/react-chat/packages/chat-provider/src/core/createChatClient.ts — Manifest synchronization queue and acknowledgement
- /home/manuel/workspaces/2026-08-20/add-pbui-agent/react-chat/packages/chat-provider/src/tools/toolRegistry.ts — Registry ownership and snapshot contract


## 2026-08-24

Completed package and PBUI consumer validation; kept manifest acknowledgements internal to preserve the honest Promise<void> public contract (commit 8d555a8)

### Related Files

- /home/manuel/workspaces/2026-08-20/add-pbui-agent/react-chat/packages/chat-provider/src/core/createChatClient.ts — Internal manifest acknowledgement and public sync contract
- /home/manuel/workspaces/2026-08-20/add-pbui-agent/react-chat/ttmp/2026/08/23/REACT-CHAT-TOOL-RUNTIME-1--make-browser-tool-execution-idempotent-single-owner-and-manifest-safe/reference/01-diary.md — Built-package PBUI validation and harness recovery


## 2026-08-24

Migrated chat-overlay persistence adapters to published Pinocchio v0.11.14 StoreSpec APIs and validated with GOWORK=off (commit 0b1fffd)

### Related Files

- /home/manuel/workspaces/2026-08-20/add-pbui-agent/react-chat/internal/webchat/hydration_store_options.go — Preserve in-memory timeline default
- /home/manuel/workspaces/2026-08-20/add-pbui-agent/react-chat/internal/webchat/turn_store_options.go — Preserve in-memory turn-history default


## 2026-08-24

Made the new make lint gate pass by checking server cleanup errors and ignoring local lint binaries (commits 888ab2a, 39659d6)

### Related Files

- /home/manuel/workspaces/2026-08-20/add-pbui-agent/react-chat/cmd/chat-overlay/cmds/serve.go — Log deferred cleanup failure
- /home/manuel/workspaces/2026-08-20/add-pbui-agent/react-chat/internal/webchat/server_test.go — Fail tests on cleanup errors


## 2026-08-25

Addressed PR 12 P1 findings by binding manifest acks to ready generations and result retries to invocation sessions (commit 88d6255)

### Related Files

- /home/manuel/workspaces/2026-08-20/add-pbui-agent/react-chat/packages/chat-provider/src/core/createChatClient.ts — Reconnect-safe manifest and session routing
- /home/manuel/workspaces/2026-08-20/add-pbui-agent/react-chat/packages/chat-provider/src/tools/toolRuntime.ts — Session-bound completion retry


## 2026-08-25

Cleared PR 12 push security gate by preserving unsigned snapshot ordinals (commit 03d733a)

### Related Files

- /home/manuel/workspaces/2026-08-20/add-pbui-agent/react-chat/internal/webchat/helpers.go — Remove overflowing uint64-to-int64 conversion


## 2026-08-25

Authored the authoritative concise cross-tab executor protocol using client, connection, and server assignment identities; narrowed the prior timed-lease proposal and defined strict rollout/testing.

### Related Files

- /home/manuel/workspaces/2026-08-20/add-pbui-agent/react-chat/ttmp/2026/08/23/REACT-CHAT-TOOL-RUNTIME-1--make-browser-tool-execution-idempotent-single-owner-and-manifest-safe/design-doc/02-concise-frontend-tool-executor-ownership-protocol.md — Primary design deliverable


## 2026-08-25

Validated all three companion tickets and uploaded the four-document concise executor protocol bundle to /ai/2026/08/25-deliveries/REACT-CHAT-TOOL-RUNTIME-1.

### Related Files

- /home/manuel/workspaces/2026-08-20/add-pbui-agent/react-chat/ttmp/2026/08/23/REACT-CHAT-TOOL-RUNTIME-1--make-browser-tool-execution-idempotent-single-owner-and-manifest-safe/various/02-remarkable-delivery.md — Dry-run and successful upload evidence


## 2026-08-25

Implemented browser executor identity lifecycle, strict manifest acknowledgement, pre-claim filtering, immutable retry provenance, and hydration reconciliation in a281080; npm release waits for maintainer-merged Pinocchio hotfix.

### Related Files

- /home/manuel/workspaces/2026-08-20/add-pbui-agent/react-chat/packages/chat-provider/src/core/createChatClient.ts — Connection and acknowledgement ordering
- /home/manuel/workspaces/2026-08-20/add-pbui-agent/react-chat/packages/chat-provider/src/tools/toolRuntime.ts — Browser ownership state machine


## 2026-08-25

PR 210 review exposed a duplicate renderer authority. The concise design now requires read-only timeline projections and makes ToolRuntime/ToolCallOutlet the sole browser execution and human-completion authority.

### Related Files

- /home/manuel/workspaces/2026-08-20/add-pbui-agent/react-chat/ttmp/2026/08/23/REACT-CHAT-TOOL-RUNTIME-1--make-browser-tool-execution-idempotent-single-owner-and-manifest-safe/design-doc/02-concise-frontend-tool-executor-ownership-protocol.md — Accepted single-authority decision record


## 2026-08-25

Maintainer merged Pinocchio PR 210. Published and proxy-verified immutable v0.11.16, upgraded react-chat with GOWORK=off, and migrated chat-overlay to exact executor acknowledgements and executor-bound results (c97ca57).

### Related Files

- /home/manuel/workspaces/2026-08-20/add-pbui-agent/react-chat/go.mod — Consumes corrected Pinocchio v0.11.16
- /home/manuel/workspaces/2026-08-20/add-pbui-agent/react-chat/internal/webchat/handlers.go — Strict first-party executor HTTP adapter


## 2026-08-25

PR 15 reconnect review: sends now wait for actual ready authority; stale queued manifests fail before POST; in-flight manifests abort when transport authority is lost (b0bd1d8).

### Related Files

- /home/manuel/workspaces/2026-08-20/add-pbui-agent/react-chat/packages/chat-provider/src/core/createChatClient.test.ts — Backoff-send and cancellation regressions
- /home/manuel/workspaces/2026-08-20/add-pbui-agent/react-chat/packages/chat-provider/src/core/createChatClient.ts — Reconnect readiness and manifest cancellation


## 2026-08-25

PR 15 readiness follow-up: pre-connect sync now waits without spinning; terminal/reset transitions reject waiters and invalidate operations before they can cross into a future connection (c750caf).

### Related Files

- /home/manuel/workspaces/2026-08-20/add-pbui-agent/react-chat/packages/chat-provider/src/core/createChatClient.test.ts — Pre-connect, failure, and reset regressions
- /home/manuel/workspaces/2026-08-20/add-pbui-agent/react-chat/packages/chat-provider/src/core/createChatClient.ts — Terminal/reset-safe readiness lifecycle


## 2026-08-25

PR 15 ownership-cache review: every send now obtains a fresh assignment acknowledgement; design distinguishes capability-content caching from authority and records turn-scoped atomic executor capture as the stronger architecture (7104f9a).

### Related Files

- /home/manuel/workspaces/2026-08-20/add-pbui-agent/react-chat/packages/chat-provider/src/core/createChatClient.ts — Fresh authority acknowledgement before send
- /home/manuel/workspaces/2026-08-20/add-pbui-agent/react-chat/ttmp/2026/08/23/REACT-CHAT-TOOL-RUNTIME-1--make-browser-tool-execution-idempotent-single-owner-and-manifest-safe/design-doc/02-concise-frontend-tool-executor-ownership-protocol.md — Accepted send-revalidation decision and turn-binding limitation

