# Changelog

## 2026-06-02

- Initial workspace created


## 2026-06-02

Implemented chat-provider private Redux context and chat-scoped hook rename with no compatibility aliases; updated chat-overlay, Pinocchio web-chat, and TTC Garden Assistant consumers; rebuilt provider dist; validated with typechecks, unit tests, and browser smokes.

### Related Files

- /home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-27--ttc-design-system/web/packages/ttc-garden-assistant/src/features/chat/TtcGardenChatOverlay.tsx — TTC consumer update
- /home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/packages/chat-provider/src/react/ChatProvider.tsx — Private context provider wiring
- /home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/packages/chat-provider/src/store/store.ts — Private context and hook rename
- /home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/ttmp/2026/06/02/CHATOVERLAY-015--give-chat-provider-a-private-redux-context-and-chat-named-hooks/design-doc/01-private-redux-context-and-chat-hook-rename-implementation-guide.md — Implementation guide
- /home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/ttmp/2026/06/02/CHATOVERLAY-015--give-chat-provider-a-private-redux-context-and-chat-named-hooks/reference/01-investigation-diary.md — Diary and validation notes
- /home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/web/src/features/web-chat/WebChatApp/WebChatApp.tsx — Pinocchio consumer update


## 2026-06-02

Prepared publish PR by bumping chat-provider and chat-overlay to 0.2.0 and validating npm publish dry run.

### Related Files

- /home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/packages/chat-overlay/package.json — Overlay release version
- /home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/packages/chat-provider/package.json — Provider release version
- /home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/ttmp/2026/06/02/CHATOVERLAY-015--give-chat-provider-a-private-redux-context-and-chat-named-hooks/reference/01-investigation-diary.md — Publish PR dry-run notes

