# Changelog

## 2026-06-01

- Initial workspace created


## 2026-06-01

Created npm publishing analysis and intern implementation guide for React chat packages, including repo rename plan to go-go-golems/react-chat.

### Related Files

- /home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/ttmp/2026/06/01/CHATOVERLAY-013--publish-react-chat-packages-to-npm/design-doc/01-publishing-react-chat-packages-to-npm.md — Primary design deliverable
- /home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/ttmp/2026/06/01/CHATOVERLAY-013--publish-react-chat-packages-to-npm/reference/01-investigation-diary.md — Chronological investigation record


## 2026-06-01

Validated CHATOVERLAY-013 with docmgr doctor and uploaded the design/diary bundle to reMarkable at /ai/2026/06/01/CHATOVERLAY-013.

### Related Files

- /home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/ttmp/2026/06/01/CHATOVERLAY-013--publish-react-chat-packages-to-npm/design-doc/01-publishing-react-chat-packages-to-npm.md — Uploaded design guide
- /home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/ttmp/2026/06/01/CHATOVERLAY-013--publish-react-chat-packages-to-npm/reference/01-investigation-diary.md — Uploaded investigation diary


## 2026-06-01

Renamed and transferred GitHub repository from wesen/2026-05-29--chatbot-overlay-glm to go-go-golems/react-chat, then updated local origin.

### Related Files

- /home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/.git/config — Local origin now points at git@github.com:go-go-golems/react-chat.git
- /home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/ttmp/2026/06/01/CHATOVERLAY-013--publish-react-chat-packages-to-npm/reference/01-investigation-diary.md — Recorded repository transfer commands and validation


## 2026-06-01

Implemented npm package metadata, dist builds, CI, publish workflow, pushed to main, and reached npm token permission blocker during real publish.

### Related Files

- /home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/.github/workflows/publish-npm.yml — Manual npm publish workflow
- /home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/packages/chat-overlay/package.json — Public overlay package metadata
- /home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/packages/chat-overlay/src/theme/retro-mac.css — Made exported CSS standalone for consumers
- /home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/packages/chat-provider/package.json — Public provider package metadata
- /home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/scripts/packages/build-dist.mjs — Publish artifact builder


## 2026-06-01

Captured npm Trusted Publishing sources and updated React chat publish workflow to use tokenless npm OIDC instead of Vault NODE_AUTH_TOKEN.

### Related Files

- /home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/.github/workflows/publish-npm.yml — Removed Vault npm token step and upgraded npm for trusted publishing
- /home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/ttmp/2026/06/01/CHATOVERLAY-013--publish-react-chat-packages-to-npm/sources/00-source-pack-readme.md — Source pack index for trusted publishing migration


## 2026-06-01

Verified chat-provider and chat-overlay are published, trusted publishers are configured, tokenless publish workflow succeeds, and npm consumer smoke passes.

### Related Files

- /home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/.github/workflows/publish-npm.yml — Tokenless trusted publishing workflow verified by run 26778523201
- /home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/ttmp/2026/06/01/CHATOVERLAY-013--publish-react-chat-packages-to-npm/reference/01-investigation-diary.md — Recorded npm publish verification and remaining token lockdown step


## 2026-06-01

Published new React chat 0.1.1 packages and go-go-os os-core 0.1.3 through tokenless GitHub Actions trusted publishing under the next dist-tag.

### Related Files

- /home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/packages/chat-overlay/package.json — Version bumped to 0.1.1 and published via run 26778779490
- /home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/packages/chat-provider/package.json — Version bumped to 0.1.1 and published via run 26778779490
- /home/manuel/workspaces/2026-05-29/chatbot-react/go-go-os-frontend/packages/os-core/package.json — Version bumped to 0.1.3 and published via run 26778852213


## 2026-06-01

Removed obsolete Vault npm token material for react-chat and go-go-os-frontend, added npm publishing playbooks, and marked Vault-token design sections as historical.

### Related Files

- /home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/docs/npm-publishing-playbook.md — React chat trusted publishing operator playbook
- /home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/ttmp/2026/06/01/CHATOVERLAY-013--publish-react-chat-packages-to-npm/design-doc/01-publishing-react-chat-packages-to-npm.md — Marked Vault-token sections as historical
- /home/manuel/workspaces/2026-05-29/chatbot-react/go-go-os-frontend/docs/npm-publishing-playbook.md — go-go-os-frontend trusted publishing operator playbook

