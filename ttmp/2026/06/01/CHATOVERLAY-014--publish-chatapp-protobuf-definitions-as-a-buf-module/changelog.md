# Changelog

## 2026-06-01

- Initial workspace created


## 2026-06-01

Created intern-facing design guide for publishing Pinocchio chatapp protobuf definitions as a Buf Schema Registry module; captured Buf docs and validated proposed v2 named-module config.

### Related Files

- /home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/ttmp/2026/06/01/CHATOVERLAY-014--publish-chatapp-protobuf-definitions-as-a-buf-module/design-doc/01-publishing-pinocchio-chatapp-protobuf-definitions-as-a-buf-module.md — Primary design deliverable
- /home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/buf.yaml — Implementation target for named BSR module configuration


## 2026-06-01

Resolved docmgr hygiene issues by adding buf to vocabulary and wrapping captured Buf docs with frontmatter plus numeric prefixes.

### Related Files

- /home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/ttmp/vocabulary.yaml — Added buf topic used by CHATOVERLAY-014


## 2026-06-01

Validated CHATOVERLAY-014 with docmgr doctor and uploaded the final design+diary bundle to reMarkable at /ai/2026/06/01/CHATOVERLAY-014.

### Related Files

- /home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/ttmp/2026/06/01/CHATOVERLAY-014--publish-chatapp-protobuf-definitions-as-a-buf-module/reference/01-investigation-diary.md — Records validation and reMarkable upload evidence


## 2026-06-01

Implemented local Pinocchio Buf module publishing preparation: v2 named module config (534322c), Buf CI workflow (19fda9c), operator docs (3c66ec9), and codegen alignment with frontendtools/widgets TS schemas (d525dc6). BSR push remains blocked on Buf login/module creation.

### Related Files

- /home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/.github/workflows/buf-ci.yaml — CI publishing workflow
- /home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/buf.yaml — Named BSR module config
- /home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/docs/chatapp-protobuf.md — Operator runbook


## 2026-06-01

Finalized ticket bookkeeping after implementation pass: doctor passed and updated design+diary bundle was re-uploaded to reMarkable at /ai/2026/06/01/CHATOVERLAY-014.

### Related Files

- /home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/ttmp/2026/06/01/CHATOVERLAY-014--publish-chatapp-protobuf-definitions-as-a-buf-module/reference/01-investigation-diary.md — Final implementation diary and upload evidence


## 2026-06-02

Created and pushed BSR module buf.build/go-go-golems/pinocchio-chatapp after Buf login; initial BSR commit is 3b26b3452d1446a3872293fedb3b731f. Noted that local --git-metadata push failed because no branch/tag pointed at HEAD.

### Related Files

- /home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/ttmp/2026/06/01/CHATOVERLAY-014--publish-chatapp-protobuf-definitions-as-a-buf-module/reference/01-investigation-diary.md — Records BSR creation and push evidence

