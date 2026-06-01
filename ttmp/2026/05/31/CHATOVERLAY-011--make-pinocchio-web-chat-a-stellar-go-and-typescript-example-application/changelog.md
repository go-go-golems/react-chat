# Changelog

## 2026-05-31

- Initial workspace created


## 2026-05-31

Created web-chat Go/TypeScript cleanup ticket, inventoried current frontend/backend code, wrote intern-oriented design and implementation guide, and recorded validation evidence.

### Related Files

- /home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/app/server.go — Backend app server evidence
- /home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/main.go — Backend command wiring evidence
- /home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/web/src/features/web-chat/WebChatProviderShell/WebChatProviderShell.tsx — Frontend provider shell evidence


## 2026-05-31

Validated CHATOVERLAY-011 with docmgr doctor and uploaded the ticket bundle to reMarkable at /ai/2026/06/01/CHATOVERLAY-011.

### Related Files

- /home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/ttmp/2026/05/31/CHATOVERLAY-011--make-pinocchio-web-chat-a-stellar-go-and-typescript-example-application/design-doc/01-pinocchio-web-chat-go-and-typescript-cleanup-analysis-and-implementation-guide.md — Uploaded design guide


## 2026-05-31

Added open implementation-phase tasks so CHATOVERLAY-011 tracks the actual cleanup work after the analysis/upload deliverable.

### Related Files

- /home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/ttmp/2026/05/31/CHATOVERLAY-011--make-pinocchio-web-chat-a-stellar-go-and-typescript-example-application/tasks.md — Implementation phase task list


## 2026-06-01

Added ruthless debug-ui removal tasks before resuming Pinocchio web-chat cleanup implementation.

### Related Files

- /home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/web/src/debug-ui — Debug UI subtree targeted for removal


## 2026-06-01

Removed Pinocchio web-chat debug app on both frontend and Go backend: deleted debug-ui route/files/stories/styles/store, stream-debug upload panel, debug-only npm deps, --debug-api CLI/devctl plumbing, debug recorder/reconcile endpoints, and related tests (commit e829689).

### Related Files

- /home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/main.go — Removed debug-api CLI/runtime config and backend observer wiring
- /home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/web/src/app/App.tsx — Chat-only application entry


## 2026-06-01

Implemented Phase 1 inventory tooling: added web-chat npm audit:unused, checked-in ticket inventory script, and generated frontend/Go/knip baseline reports (Pinocchio commit e15e234).

### Related Files

- /home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/ttmp/2026/05/31/CHATOVERLAY-011--make-pinocchio-web-chat-a-stellar-go-and-typescript-example-application/scripts/01-web-chat-inventory.py — Repeatable inventory generator
- /home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/web/package.json — Added audit:unused script


## 2026-06-01

Implemented frontend cleanup Phases 2-4: removed confirmed unused TS/public files, deleted MSW storybook leftovers, folded src/app into top-level App.tsx, moved src/webchat support modules into features/web-chat, documented generated protobuf bindings, and removed active any casts (Pinocchio commit fd438a1).

### Related Files

- /home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/web/src/App.tsx — Direct app root after wrapper deletion
- /home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/web/src/features/web-chat/cards/Markdown/Markdown.tsx — Typed Markdown renderer
- /home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/web/src/features/web-chat/types.ts — Feature-local public contracts


## 2026-06-01

Added a Go internal-package refactor guide for cmd/web-chat, including current-state architecture, target internal package tree, main.go shrink plan, phased implementation checklist, and validation strategy.

### Related Files

- /home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/ttmp/2026/05/31/CHATOVERLAY-011--make-pinocchio-web-chat-a-stellar-go-and-typescript-example-application/design-doc/02-pinocchio-web-chat-go-internal-package-refactor-analysis-and-implementation-guide.md — New intern-facing Go refactor guide
- /home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/main.go — Primary refactor target


## 2026-06-01

Uploaded CHATOVERLAY-011 Go Internal Refactor Guide bundle to reMarkable at /ai/2026/06/01/CHATOVERLAY-011 after dry-run.

### Related Files

- /home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/ttmp/2026/05/31/CHATOVERLAY-011--make-pinocchio-web-chat-a-stellar-go-and-typescript-example-application/design-doc/02-pinocchio-web-chat-go-internal-package-refactor-analysis-and-implementation-guide.md — Uploaded guide source


## 2026-06-01

Phase 5 started: internalized web-chat Go subpackages with behavior-preserving package moves (Pinocchio commit 986350b77dd6c7a6379b20bfc91961730a062e24).

### Related Files

- /home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/internal/appserver/server.go — New internal appserver package
- /home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/internal/mockruntime/engine.go — New internal mockruntime package
- /home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/internal/profiles/api.go — New internal profiles package


## 2026-06-01

Phase 5 continued: extracted web-chat HTTP shell helpers from main.go into internal/webapp, with one documented pre-commit logger-name conflict fixed before commit (Pinocchio commit 9b4caa42be1b74954f8fb424bae5e736f7255aa0).

### Related Files

- /home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/internal/webapp/routes.go — New mux composition package
- /home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/main.go — Delegates runtime config


## 2026-06-01

Phase 5 continued: extracted runtime composition, middleware definitions, turn persistence, canonical resolver, and agent-mode chat plugin into internal packages (Pinocchio commit d1e1032c2d07dc18fff25fd42d9ff1775fa2054d).

### Related Files

- /home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/internal/middlewaredefs/registry.go — New internal middleware definition package
- /home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/internal/plugins/agentmode/plugin.go — New internal agent-mode plugin package
- /home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/internal/runtime/composer.go — New internal runtime composer package


## 2026-06-01

Phase 5 complete: moved web-chat app assembly into internal/webchatcmd so main.go now contains Glazed/Cobra command wiring and execution delegation (Pinocchio commit cf040ad435ff4968383af3157d269c666c53d1e5).

### Related Files

- /home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/internal/webchatcmd/run.go — New app assembly runner
- /home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/main.go — Thin command entrypoint

