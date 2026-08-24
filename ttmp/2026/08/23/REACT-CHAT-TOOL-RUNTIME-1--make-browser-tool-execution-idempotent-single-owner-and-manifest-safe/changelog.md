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

