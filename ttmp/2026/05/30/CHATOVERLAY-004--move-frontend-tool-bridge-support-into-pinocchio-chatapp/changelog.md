# Changelog

## 2026-05-30

- Initial workspace created


## 2026-05-30

Created frontend tools migration design package

### Related Files

- /home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/internal/frontendtools/bridge.go — Primary bridge implementation to migrate


## 2026-05-30

Moved frontend tool proto, manager, plugin, and Geppetto bridge into Pinocchio; migrated chat-overlay to consume the Pinocchio package; added manager/plugin tests and browser smoke validation (commits 04db8e2, 2c62b12, e7f017b, 347e757).

### Related Files

- /home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/go.mod — temporary local Pinocchio replace until release
- /home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/internal/webchat/real_runtime.go — chat-overlay real runtime uses Pinocchio bridge
- /home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/pkg/chatapp/frontendtools/bridge.go — Pinocchio bridge executor
- /home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/pkg/chatapp/frontendtools/plugin_test.go — timeline projection coverage

