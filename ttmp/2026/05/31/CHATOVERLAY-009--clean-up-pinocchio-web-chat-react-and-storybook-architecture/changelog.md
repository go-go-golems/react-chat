# Changelog

## 2026-05-31

- Initial workspace created


## 2026-05-31

Created intern-facing Pinocchio web-chat React/Storybook cleanup assessment, diary, and baseline validation notes.

### Related Files

- /home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/ttmp/2026/05/31/CHATOVERLAY-009--clean-up-pinocchio-web-chat-react-and-storybook-architecture/design-doc/01-web-chat-react-and-storybook-cleanup-assessment.md — Primary assessment
- /home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/ttmp/2026/05/31/CHATOVERLAY-009--clean-up-pinocchio-web-chat-react-and-storybook-architecture/reference/01-investigation-diary.md — Chronological investigation diary


## 2026-05-31

Validated CHATOVERLAY-009 and uploaded the cleanup assessment bundle to reMarkable at /ai/2026/05/31/CHATOVERLAY-009.

### Related Files

- /home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/ttmp/2026/05/31/CHATOVERLAY-009--clean-up-pinocchio-web-chat-react-and-storybook-architecture/design-doc/01-web-chat-react-and-storybook-cleanup-assessment.md — Uploaded primary assessment
- /home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/ttmp/2026/05/31/CHATOVERLAY-009--clean-up-pinocchio-web-chat-react-and-storybook-architecture/reference/01-investigation-diary.md — Uploaded diary


## 2026-05-31

Expanded cleanup plan into detailed phases/tasks and made capability-demo deletion plus legacy deletion-after-parity explicit.

### Related Files

- /home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/ttmp/2026/05/31/CHATOVERLAY-009--clean-up-pinocchio-web-chat-react-and-storybook-architecture/design-doc/01-web-chat-react-and-storybook-cleanup-assessment.md — Updated roadmap and accepted deletion decisions
- /home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/ttmp/2026/05/31/CHATOVERLAY-009--clean-up-pinocchio-web-chat-react-and-storybook-architecture/reference/01-investigation-diary.md — Diary step for phase expansion
- /home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/ttmp/2026/05/31/CHATOVERLAY-009--clean-up-pinocchio-web-chat-react-and-storybook-architecture/tasks.md — Detailed phased implementation backlog


## 2026-05-31

Re-uploaded updated CHATOVERLAY-009 bundle after adding detailed phases/tasks and accepted deletion decisions.

### Related Files

- /home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/ttmp/2026/05/31/CHATOVERLAY-009--clean-up-pinocchio-web-chat-react-and-storybook-architecture/tasks.md — Updated task backlog included in reMarkable bundle


## 2026-05-31

Implemented Phase 0 guardrails and Phase 1 route-mode split for Pinocchio web-chat (commits fe5b00f, bf3a98b).

### Related Files

- /home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/web/src/README.md — Architecture guardrails
- /home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/web/src/app/App.tsx — Named root route composition
- /home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/web/src/app/routeMode.ts — Typed route-mode parser


## 2026-05-31

Implemented Phase 2 by moving provider-backed web-chat files into src/features/web-chat with compatibility exports (commit 833fa7c).

### Related Files

- /home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/web/src/features/web-chat/README.md — Feature boundary documentation
- /home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/web/src/features/web-chat/WebChatApp/WebChatApp.tsx — Provider-backed app body
- /home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/web/src/features/web-chat/WebChatProviderShell/WebChatProviderShell.tsx — Provider shell


## 2026-05-31

Implemented Phase 3 component folders and focused Storybook stories for header, statusbar, composer, and timeline (commit 0c897b1).

### Related Files

- /home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/web/src/features/web-chat/ChatComposer/ChatComposer.stories.tsx — Focused composer stories
- /home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/web/src/features/web-chat/ChatHeader/ChatHeader.stories.tsx — Focused header stories
- /home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/web/src/features/web-chat/ChatStatusbar/ChatStatusbar.stories.tsx — Focused statusbar stories
- /home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/web/src/features/web-chat/ChatTimeline/ChatTimeline.stories.tsx — Focused timeline stories


## 2026-05-31

Implemented Phase 4 by splitting web-chat card renderers and Markdown into focused feature folders with stories and fixtures (commit cb52e41).

### Related Files

- /home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/web/src/features/web-chat/cards/index.ts — Card feature barrel
- /home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/web/src/webchat/cards.tsx — Compatibility barrel for old card imports
- /home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/web/src/webchat/rendererRegistry.ts — Renderer registry now imports cards from feature folders


## 2026-05-31

Implemented Phase 5 by deleting web-chat capability demo routes, demo tools/widgets, and backend showcase prompt handling (commit 1a76cbe).

### Related Files

- /home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/app/server_test.go — Frontend tool endpoint tests now use neutral app.confirm_action
- /home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/web/src/app/routeMode.ts — Demo flags removed from production routing
- /home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/pkg/chatapp/demo.go — Generic demo inference no longer emits capability showcase

