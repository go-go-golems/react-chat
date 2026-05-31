# Changelog

## 2026-05-30

- Initial workspace created


## 2026-05-30

Created ticket, detailed task list, design/implementation guide, and initial diary for the web-chat capabilities showcase.

### Related Files

- /home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/ttmp/2026/05/30/CHATOVERLAY-007--showcase-web-chat-frontend-tools-and-typed-widgets/design-doc/01-web-chat-capabilities-showcase-design-and-implementation-guide.md — Primary design guide


## 2026-05-31

Implemented Pinocchio web-chat capabilities showcase: frontend tool result endpoint (commit 004ebc5), backend showcase stream (commit 8fe197a), frontend projections/tool UI/custom widget renderer (commit c9640f3), and Playwright smoke validation.

### Related Files

- /home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/ttmp/2026/05/30/CHATOVERLAY-007--showcase-web-chat-frontend-tools-and-typed-widgets/scripts/01-webchat-capabilities-showcase-smoke.js — End-to-end smoke
- /home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/app/showcase_tools.go — Showcase prompt and frontend tool result endpoint
- /home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/web/src/webchat/cards.tsx — Frontend tool UI and custom widget renderer
- /home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/pkg/chatapp/demo.go — Backend showcase stream


## 2026-05-31

Updated the implementation guide and task list to pivot from manual web-chat wiring toward a headless ChatProvider provider-demo page.

### Related Files

- /home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/ttmp/2026/05/30/CHATOVERLAY-007--showcase-web-chat-frontend-tools-and-typed-widgets/design-doc/01-web-chat-capabilities-showcase-design-and-implementation-guide.md — Headless ChatProvider addendum


## 2026-05-31

Added provider-native web-chat demo: ChatProvider request adapters (commit 11263c0), ES2022 toolkit compatibility (commit ed0cf02), web-chat manifest endpoint (commit 4d84971), provider-demo page (commit 3b080c0), and provider-demo Playwright smoke.

### Related Files

- /home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/packages/chat-provider/src/core/createChatClient.ts — Request adapters
- /home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/packages/chat-provider/src/core/toolkit.ts — ES2022 cleanup compatibility
- /home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/ttmp/2026/05/30/CHATOVERLAY-007--showcase-web-chat-frontend-tools-and-typed-widgets/scripts/02-webchat-chatprovider-demo-smoke.js — Provider demo smoke
- /home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/app/showcase_tools.go — Manifest endpoint
- /home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/web/src/webchat/ProviderDemoPage.tsx — Provider demo page


## 2026-05-31

Added Phase 12 tasks and design guidance for porting the main web-chat ChatWidget to ChatProvider.

### Related Files

- /home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/ttmp/2026/05/30/CHATOVERLAY-007--showcase-web-chat-frontend-tools-and-typed-widgets/tasks.md — Main ChatWidget migration tasks


## 2026-05-31

Ported the main Pinocchio web-chat ChatWidget to the headless ChatProvider runtime, including generic session-id configuration and explicit provider connect support (commits 3040510, 3297f46, 61fb547).

### Related Files

- /home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/packages/chat-provider/src/core/createChatClient.ts — Provider API changes
- /home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/web/src/webchat/ProviderBackedChatWidget.tsx — Main widget provider port


## 2026-05-31

Added provider debug observer parity, a provider-safe export menu, and a repeatable two-instance provider smoke (commits 5b4e777, 4ee9ec4, dc97eb1).

### Related Files

- /home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/packages/chat-provider/src/ws/wsManager.ts — Debug observer source
- /home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/ttmp/2026/05/30/CHATOVERLAY-007--showcase-web-chat-frontend-tools-and-typed-widgets/scripts/03-webchat-provider-multi-instance-smoke.js — Smoke script
- /home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/web/src/webchat/ProviderMultiDemoPage.tsx — Multi-instance validation route

