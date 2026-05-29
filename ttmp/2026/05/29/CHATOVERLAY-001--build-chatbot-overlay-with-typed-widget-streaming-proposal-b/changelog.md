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


## 2026-05-29

Completed backend hygiene tasks T4-T5: added web/go.mod module boundary and explicit frontend ignores so go test ./... no longer scans web/node_modules.

### Related Files

- /home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/.gitignore — Explicit frontend dependency/build ignores
- /home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/web/go.mod — Nested module boundary for frontend dependencies


## 2026-05-29

Recovered backend mock engine path: split mock engine from webchat server, added custom start/stop commands with active run tracking and context.WithoutCancel publishing, and verified show-me-boots snapshot includes assistant text plus ChatWidgetInstance.

### Related Files

- /home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/internal/mockengine/engine.go — Dedicated mock run lifecycle and event publishing
- /home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/internal/webchat/handlers.go — HTTP submit/stop now target mockengine commands
- /home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/internal/webchat/server.go — Server wiring now installs mock engine separately


## 2026-05-29

Added backend tests for create+submit+snapshot, boots widget projection, and stop cancellation; go test ./... passes.

### Related Files

- /home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/internal/webchat/server_test.go — Backend integration tests for mock engine and snapshot behavior


## 2026-05-29

Committed frontend overlay and Storybook implementation separately from backend recovery (commit 4a71eb3); frontend build passes, live integration remains T45.

### Related Files

- /home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/web/src/core/createChatOverlay.ts — Overlay API implementation
- /home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/web/src/stories/ChatPanel.stories.tsx — Storybook overlay state coverage

