# Changelog

## 2026-05-29

- Initial workspace created


## 2026-05-29

Created research/design package for elegant embedding API and client-side tool calling; downloaded Defuddle sources and wrote intern-ready implementation guide.

### Related Files

- /home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/ttmp/2026/05/29/CHATOVERLAY-002--elegant-chatbot-embedding-api-with-client-side-tool-calling/design-doc/01-elegant-chatbot-embedding-api-and-client-side-tool-calling-design.md — Primary design and implementation guide
- /home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/ttmp/2026/05/29/CHATOVERLAY-002--elegant-chatbot-embedding-api-with-client-side-tool-calling/reference/01-research-diary.md — Research diary and source collection notes


## 2026-05-29

Uploaded CHATOVERLAY-002 design bundle to reMarkable at /ai/2026/05/29/CHATOVERLAY-002.

### Related Files

- /home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/ttmp/2026/05/29/CHATOVERLAY-002--elegant-chatbot-embedding-api-with-client-side-tool-calling/design-doc/01-elegant-chatbot-embedding-api-and-client-side-tool-calling-design.md — Uploaded primary design guide
- /home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/ttmp/2026/05/29/CHATOVERLAY-002--elegant-chatbot-embedding-api-with-client-side-tool-calling/tasks.md — Marked reMarkable upload task complete


## 2026-05-29

Implemented frontend tool calling smoke path: sessionstream protocol, mock-engine cart.add wait/resume, React tool registry/runtime, demo cart, and Playwright smoke test (commits 80af964, 8803c2d).

### Related Files

- /home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/internal/frontendtools/manager.go — Backend frontend tool command/result manager
- /home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/ttmp/2026/05/29/CHATOVERLAY-002--elegant-chatbot-embedding-api-with-client-side-tool-calling/scripts/03-client-tool-browser-smoke.js — Smoke validation script
- /home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/web/src/tools/toolRuntime.ts — Frontend browser tool executor


## 2026-05-29

Added human-in-the-loop frontend tools with checkout.confirm approval UI and browser smoke validation (commit e7c1dba).

### Related Files

- /home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/ttmp/2026/05/29/CHATOVERLAY-002--elegant-chatbot-embedding-api-with-client-side-tool-calling/scripts/04-human-tool-browser-smoke.js — Human tool browser smoke
- /home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/web/src/tools/ToolCallOutlet.tsx — Approval UI rendering and respond/reject callbacks
- /home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/web/src/tools/useHumanTool.ts — Human tool registration API


## 2026-05-29

Added Zod validation for frontend tool inputs/results and JSON Schema manifest export (commit f00368c).

### Related Files

- /home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/web/src/tools/toolRegistry.ts — Schema API and manifest export
- /home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/web/src/tools/toolRuntime.ts — Runtime input/result validation


## 2026-05-29

Added backend tool UI registration with defineToolUI/useToolUI and ToolCallOutlet rendering support (commit f57e6ed).

### Related Files

- /home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/web/src/stories/ToolCallOutlet.stories.tsx — Tool UI stories
- /home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/web/src/tools/toolRegistry.ts — defineToolUI API
- /home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/web/src/tools/useToolUI.ts — React registration hook


## 2026-05-29

Added toolkit bundling with defineToolkit/installToolkit/useToolkit and overlay.use (commit cb3470a).

### Related Files

- /home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/web/src/core/createChatOverlay.ts — overlay.use integration
- /home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/web/src/core/toolkit.ts — Toolkit API


## 2026-05-29

Added first Geppetto/Pinocchio frontend-tool bridge hooks: Pinocchio runtime registry/executor/context support and chat-overlay BridgeExecutor (commits pinocchio 6865784, chat-overlay afda13e).

### Related Files

- /home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/internal/frontendtools/bridge.go — Bridge executor implementation
- /home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/pkg/chatapp/runtime_inference.go — Pinocchio runtime bridge wiring


## 2026-05-29

Converted chat-overlay serve to Glazed command wiring with Pinocchio profile settings and debug/caller logging

### Related Files

- /home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/cmd/chat-overlay/cmds/serve.go — Glazed serve command
- /home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/cmd/chat-overlay/main.go — Glazed root logging setup
- /home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/internal/webchat/real_runtime.go — Pinocchio profile resolution

