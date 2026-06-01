# Changelog

## 2026-05-31

- Initial workspace created


## 2026-05-31

Created timeline adapter API design package with strict no-backwards-compatibility migration plan and phased tasks.

### Related Files

- /home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/ttmp/2026/05/31/CHATOVERLAY-010--create-unified-timeline-adapter-api/design-doc/01-timeline-adapter-api-design-and-implementation-guide.md — Primary design guide
- /home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/ttmp/2026/05/31/CHATOVERLAY-010--create-unified-timeline-adapter-api/tasks.md — Detailed implementation phases


## 2026-05-31

Implemented strict timeline adapter API and migrated Pinocchio web-chat adapters (overlay commit d810976, Pinocchio commit 322fa70). Added hydration Playwright smoke proving mock_parity AgentMode/tool snapshots render as app cards.

### Related Files

- /home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/packages/chat-provider/src/ws/timelineAdapterRegistry.ts — New provider adapter registry and validation API
- /home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/packages/chat-provider/src/ws/timelineEvents.ts — Core timeline adapters for live and hydration projection
- /home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/ttmp/2026/05/31/CHATOVERLAY-010--create-unified-timeline-adapter-api/scripts/01-mock-profile-hydration-smoke.js — Repeatable hydration parity smoke
- /home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/web/src/features/web-chat/extensions/pinocchio-timeline-adapters/pinocchioTimelineAdapters.ts — Pinocchio app timeline adapters for reasoning

