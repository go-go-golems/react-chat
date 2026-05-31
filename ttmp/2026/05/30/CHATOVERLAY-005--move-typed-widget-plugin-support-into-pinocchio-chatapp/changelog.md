# Changelog

## 2026-05-30

- Initial workspace created


## 2026-05-30

Created typed widget plugin migration design package

### Related Files

- /home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/internal/widgets/plugin.go — Primary widget plugin implementation to migrate


## 2026-05-30

Implemented typed widget migration into pinocchio/pkg/chatapp/widgets; migrated chat-overlay; added generic web-chat widget rendering; validated Go tests, web builds, and widget browser smoke (pinocchio commits 7b34858/c0b6fa7/7607dca/eb202bb; chat-overlay commits d8c2eb7/4d973c2/9341029).

### Related Files

- /home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/internal/webchat/server.go — Chat-overlay migration to shared plugin
- /home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/ttmp/2026/05/30/CHATOVERLAY-005--move-typed-widget-plugin-support-into-pinocchio-chatapp/scripts/01-widget-browser-smoke.js — Browser smoke validation script
- /home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/pkg/chatapp/widgets/plugin.go — Shared widget package implementation


## 2026-05-30

Ticket closed


## 2026-05-30

Uploaded final CHATOVERLAY-005 documentation bundle to reMarkable at /ai/2026/05/30/CHATOVERLAY-005.

### Related Files

- /home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/ttmp/2026/05/30/CHATOVERLAY-005--move-typed-widget-plugin-support-into-pinocchio-chatapp/reference/01-investigation-diary.md — Final implementation diary included in uploaded bundle


## 2026-05-30

Added reusable devctl-backed Playwright smoke scripts for chat-overlay, Pinocchio web-chat, and CoinVault; validated all three scripts successfully.

### Related Files

- /home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/ttmp/2026/05/30/CHATOVERLAY-005--move-typed-widget-plugin-support-into-pinocchio-chatapp/scripts/02-chatoverlay-devctl-playwright.js — Starts chat-overlay with devctl and validates widget/tool flow
- /home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/ttmp/2026/05/30/CHATOVERLAY-005--move-typed-widget-plugin-support-into-pinocchio-chatapp/scripts/03-pinocchio-webchat-devctl-playwright.js — Starts Pinocchio web-chat with devctl and validates send/finish flow
- /home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/ttmp/2026/05/30/CHATOVERLAY-005--move-typed-widget-plugin-support-into-pinocchio-chatapp/scripts/04-coinvault-devctl-playwright.js — Starts CoinVault with devctl and validates dashboard/query flow

