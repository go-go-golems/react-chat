# Changelog

## 2026-05-31

- Initial workspace created


## 2026-05-31

Created web-chat Go/TypeScript cleanup ticket, inventoried current frontend/backend code, wrote intern-oriented design and implementation guide, and recorded validation evidence.

### Related Files

- /home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/app/server.go — Backend app server evidence
- /home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/main.go — Backend command wiring evidence
- /home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/web/src/features/web-chat/WebChatProviderShell/WebChatProviderShell.tsx — Frontend provider shell evidence


## 2026-05-31

Validated CHATOVERLAY-011 with docmgr doctor and uploaded the ticket bundle to reMarkable at /ai/2026/06/01/CHATOVERLAY-011.

### Related Files

- /home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/ttmp/2026/05/31/CHATOVERLAY-011--make-pinocchio-web-chat-a-stellar-go-and-typescript-example-application/design-doc/01-pinocchio-web-chat-go-and-typescript-cleanup-analysis-and-implementation-guide.md — Uploaded design guide


## 2026-05-31

Added open implementation-phase tasks so CHATOVERLAY-011 tracks the actual cleanup work after the analysis/upload deliverable.

### Related Files

- /home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/ttmp/2026/05/31/CHATOVERLAY-011--make-pinocchio-web-chat-a-stellar-go-and-typescript-example-application/tasks.md — Implementation phase task list


## 2026-06-01

Added ruthless debug-ui removal tasks before resuming Pinocchio web-chat cleanup implementation.

### Related Files

- /home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/web/src/debug-ui — Debug UI subtree targeted for removal


## 2026-06-01

Removed Pinocchio web-chat debug app on both frontend and Go backend: deleted debug-ui route/files/stories/styles/store, stream-debug upload panel, debug-only npm deps, --debug-api CLI/devctl plumbing, debug recorder/reconcile endpoints, and related tests (commit e829689).

### Related Files

- /home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/main.go — Removed debug-api CLI/runtime config and backend observer wiring
- /home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/web/src/app/App.tsx — Chat-only application entry

