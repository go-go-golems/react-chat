# Changelog

## 2026-05-29

- Initial workspace created


## 2026-05-29

Created CHATOVERLAY-001 ticket with intern implementation guide (47KB, 1125 lines). Covers sessionstream, Geppetto, Pinocchio, os-chat dependencies, protobuf schema design, Go backend architecture, React frontend implementation, widget registry, and phased implementation plan (6 phases, 24 tasks).

### Related Files

- /home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/ttmp/2026/05/29/CHATOVERLAY-001--build-chatbot-overlay-with-typed-widget-streaming-proposal-b/design-doc/01-intern-implementation-guide-chat-overlay-with-typed-widget-streaming.md — Intern implementation guide


## 2026-05-29

v2: Switched frontend basis from os-chat to pinocchio/cmd/web-chat/web/. Added current command model section (only ChatStartInference + ChatStopInference exist). Added client-side actions future design section (CopilotKit-style frontend tools, out of scope for v1). Updated all file references.

### Related Files

- /home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/web/src/ws/chatappPayloads.ts — Typed protobuf decoding of 23 UI events
- /home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/web/src/ws/protocol.ts — Sessionstream-native frame parsing
- /home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/web/src/ws/wsManager.ts — WebSocket lifecycle with in-band snapshot


## 2026-05-29

Added backend implementation review and recovery plan; identified custom command registration, request-context goroutine cancellation, widget patch semantics, and Go/node_modules test isolation issues.

### Related Files

- /home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/ttmp/2026/05/29/CHATOVERLAY-001--build-chatbot-overlay-with-typed-widget-streaming-proposal-b/analysis/01-backend-implementation-review-and-recovery-plan.md — Detailed backend review and recovery plan

