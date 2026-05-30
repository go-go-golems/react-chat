# Changelog

## 2026-05-30

- Initial workspace created


## 2026-05-30

Created common backend extraction design package

### Related Files

- /home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/internal/webchat/server.go — Source for chat-overlay common server shape
- /home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/app/server.go — Source for web-chat common server shape


## 2026-05-30

Implemented first CHATOVERLAY-003 store extraction slice: added Pinocchio serverkit stores, migrated Pinocchio web-chat, chat-overlay, and CoinVault wrappers (commits 7235bd8, ee42217, ea01179, 2c399ed).

### Related Files

- /home/manuel/workspaces/2026-05-29/chatbot-react/2026-03-16--gec-rag/internal/webchat/turn_store.go — CoinVault uses shared turn store opening
- /home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/internal/webchat/turn_store_options.go — chat-overlay uses shared turn store opening
- /home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/pkg/chatapp/serverkit/stores.go — Shared store helper implementation

