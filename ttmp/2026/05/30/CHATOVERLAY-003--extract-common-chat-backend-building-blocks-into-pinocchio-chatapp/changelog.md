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


## 2026-05-30

Added shared serverkit HTTP contracts and migrated web-chat, chat-overlay, and CoinVault aliases (commits 7ab73f1, 993fd6d, 3fd0372).

### Related Files

- /home/manuel/workspaces/2026-05-29/chatbot-react/2026-03-16--gec-rag/internal/webchat/sessionstream/sessionstream_contracts.go — CoinVault contract aliases
- /home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/internal/webchat/helpers.go — chat-overlay contract aliases
- /home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/pkg/chatapp/serverkit/contracts.go — Shared HTTP contracts


## 2026-05-30

Added small serverkit HTTP helpers and migrated web-chat, chat-overlay, and CoinVault callers without extracting full route handlers (commits 67993d1, 4f7300b, 0b1ba42).

### Related Files

- /home/manuel/workspaces/2026-05-29/chatbot-react/2026-03-16--gec-rag/internal/webchat/sessionstream/sessionstream_encoding.go — CoinVault snapshot/helper migration
- /home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/app/server.go — web-chat helper migration
- /home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/pkg/chatapp/serverkit/http.go — Shared small HTTP helpers

