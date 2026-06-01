---
title: "Pinocchio web-chat inventory"
ticket: CHATOVERLAY-011
doc_type: reference
status: active
intent: short-term
topics:
  - pinocchio
  - web-chat
  - typescript
  - go
  - architecture
created: 2026-06-01
updated: 2026-06-01
---

# Pinocchio web-chat inventory

Generated: 2026-06-01 16:26:03 UTC

## Roots
- Pinocchio: `/home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio`
- Frontend: `/home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/web`
- Go command: `/home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat`
- Ticket sources: `/home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/ttmp/2026/05/31/CHATOVERLAY-011--make-pinocchio-web-chat-a-stellar-go-and-typescript-example-application/sources`

## Summary
| Area | Count |
| --- | --- |
| TypeScript/TSX files under cmd/web-chat/web/src | 97 |
| Go files under cmd/web-chat | 53 |
| Go packages from go list ./cmd/web-chat/... | 9 |
| npm audit:unused script present | yes |
| knip exit code | 1 |

## Frontend file inventory
### By extension
| Extension | Count |
| --- | --- |
| .ts | 64 |
| .tsx | 33 |

### By category
| Category | Count |
| --- | --- |
| generated | 2 |
| source | 77 |
| stories | 11 |
| tests | 7 |

### Top directories
| Directory | Files |
| --- | --- |
| features/web-chat | 79 |
| store | 5 |
| (root) | 3 |
| utils | 3 |
| ws | 3 |
| generated/chatapp | 2 |
| components | 1 |
| config | 1 |

### Largest TypeScript/TSX files
| File | Lines |
| --- | --- |
| src/generated/chatapp/proto/pinocchio/chatapp/v1/chat_pb.ts | 1373 |
| src/generated/chatapp/proto/pinocchio/chatapp/rpc/v1/rpc_pb.ts | 422 |
| src/features/web-chat/extensions/pinocchio-timeline-adapters/pinocchioTimelineAdapters.ts | 291 |
| src/features/web-chat/ChatTimeline/useStickyScrollFollow.ts | 236 |
| src/features/web-chat/types.ts | 198 |
| src/features/web-chat/WebChatApp/WebChatApp.tsx | 182 |
| src/store/profileApi.test.ts | 131 |
| src/store/profileApi.ts | 121 |
| src/features/web-chat/ChatTimeline/ChatTimeline.tsx | 116 |
| src/ws/protocol.test.ts | 106 |
| src/features/web-chat/ChatTimeline/ChatTimeline.stories.tsx | 103 |
| src/features/web-chat/ChatStatusbar/ExportMenu.tsx | 101 |
| src/features/web-chat/WebChatProviderShell/WebChatProviderShell.tsx | 95 |
| src/features/web-chat/cards/Markdown/Markdown.tsx | 84 |
| src/features/web-chat/cards/ToolCallCard/ToolCallCard.tsx | 84 |
| src/features/web-chat/extensions/pinocchio-timeline-adapters/pinocchioTimelineAdapters.test.ts | 84 |
| src/features/web-chat/ChatHeader/ChatHeader.stories.tsx | 81 |
| src/utils/basePrefix.test.ts | 80 |
| src/features/web-chat/ChatStatusbar/ChatStatusbar.stories.tsx | 74 |
| src/features/web-chat/ChatStatusbar/ChatStatusbar.tsx | 67 |
| src/features/web-chat/ChatComposer/ChatComposer.tsx | 66 |
| src/features/web-chat/WebChatApp/ProviderStatusbar.tsx | 58 |
| src/features/web-chat/cards/AgentModeCard/AgentModeCard.tsx | 51 |
| src/features/web-chat/ChatComposer/ChatComposer.stories.tsx | 49 |
| src/features/web-chat/cards/ToolResultCard/ToolResultCard.tsx | 48 |

## Frontend cleanup probes
### debug app leftovers
- No matches.

### src/webchat namespace imports
- No matches.

### explicit any casts
- No matches.

### eslint/biome suppressions
- `src/generated/chatapp/proto/pinocchio/chatapp/rpc/v1/rpc_pb.ts:3: /* eslint-disable */`
- `src/generated/chatapp/proto/pinocchio/chatapp/v1/chat_pb.ts:3: /* eslint-disable */`

## Frontend npm scripts
| Script | Command |
| --- | --- |
| audit:unused | npx --yes knip --include files,exports --reporter compact |
| build | vite build --outDir ../static/dist |
| build-storybook | storybook build |
| check | npm run typecheck && npm run lint |
| check:storybook | npm run build-storybook |
| dev | vite |
| dev:url | node scripts/print-dev-url.mjs |
| lint | npx --yes @biomejs/biome@2.3.8 ci . |
| lint:fix | npx --yes @biomejs/biome@2.3.8 check --write . |
| preview | vite preview |
| storybook | storybook dev -p 6006 |
| test | vitest run |
| typecheck | tsc -p tsconfig.json --noEmit |

## knip unused files/exports report
Raw output: `sources/web-chat-knip.txt`
Exit code: `1`. Non-zero is expected while cleanup candidates remain.

```text
> web-chat-frontend@0.1.0 audit:unused
> npx --yes knip --include files,exports --reporter compact

Unused exports (8)
src/features/web-chat/ChatStatusbar/index.ts: DefaultStatusbar
src/features/web-chat/cards/index.ts: Markdown
src/features/web-chat/cards/utils.ts: formatJson
src/features/web-chat/extensions/pinocchio-timeline-adapters/index.ts: pinocchioAgentModeAdapter, pinocchioBackendToolAdapter, pinocchioReasoningAdapter
src/features/web-chat/extensions/pinocchio-timeline-adapters/pinocchioTimelineAdapters.ts: pinocchioReasoningAdapter
src/features/web-chat/index.ts: DefaultComposer, DefaultHeader, DefaultStatusbar, ChatTimeline, useStickyScrollFollow, pinocchioWebChatTimelineAdapters, createWebChatRenderers, WebChatApp
src/utils/logger.ts: logInfo, errorToString
src/ws/protocol.ts: asRecord, asString, normalizeServerFrame, unwrapAnyPayload
```

## Go inventory
### Packages
Raw output: `sources/web-chat-go-list.txt`
| Package |
| --- |
| github.com/go-go-golems/pinocchio/cmd/web-chat |
| github.com/go-go-golems/pinocchio/cmd/web-chat/internal/appserver |
| github.com/go-go-golems/pinocchio/cmd/web-chat/internal/middlewaredefs |
| github.com/go-go-golems/pinocchio/cmd/web-chat/internal/mockruntime |
| github.com/go-go-golems/pinocchio/cmd/web-chat/internal/plugins/agentmode |
| github.com/go-go-golems/pinocchio/cmd/web-chat/internal/profiles |
| github.com/go-go-golems/pinocchio/cmd/web-chat/internal/runtime |
| github.com/go-go-golems/pinocchio/cmd/web-chat/internal/webapp |
| github.com/go-go-golems/pinocchio/cmd/web-chat/internal/webchatcmd |

### Files by cmd/web-chat subdirectory
| Directory | Files |
| --- | --- |
| internal | 47 |
| (root) | 6 |

### Largest Go files
| File | Lines |
| --- | --- |
| internal/appserver/server_test.go | 566 |
| internal/profiles/resolver.go | 440 |
| internal/runtime/composer_test.go | 352 |
| internal/runtime/composer.go | 350 |
| reasoning_chat_feature_test.go | 265 |
| main_profile_registries_test.go | 217 |
| internal/profiles/api_profiles.go | 205 |
| main_runtime_test.go | 171 |
| internal/appserver/routes_exports.go | 168 |
| internal/middlewaredefs/registry.go | 159 |
| internal/profiles/api_schemas.go | 157 |
| internal/webchatcmd/run.go | 154 |
| internal/appserver/routes_frontend_tools.go | 148 |
| internal/mockruntime/engine.go | 142 |
| internal/plugins/agentmode/plugin.go | 134 |
| internal/appserver/routes_sessions.go | 129 |
| internal/profiles/types.go | 116 |
| internal/profiles/api_current_profile.go | 105 |
| internal/profiles/api_models.go | 104 |
| main.go | 98 |
| internal/appserver/options.go | 94 |
| internal/plugins/agentmode/plugin_test.go | 93 |
| internal/runtime/turn_persistence.go | 90 |
| internal/profiles/api_current_profile_test.go | 89 |
| internal/appserver/server.go | 86 |

### CLI flags discovered in main.go
`--addr`, `--evict-idle-seconds`, `--evict-interval-seconds`, `--idle-timeout-seconds`, `--root`, `--timeline-db`, `--timeline-dsn`, `--turns-db`, `--turns-dsn`

### Server handler methods
`HandleCreateSession`, `HandleSessionRoutes`, `HandleWS`

## Go cleanup probes
### debug app leftovers
- No matches.

## Suggested review loop
1. Read this inventory and the raw `web-chat-knip.txt` output.
2. Pick one deletion or move candidate.
3. Validate with `npm run typecheck && npm test && npm run lint && npm run build && npm run check:storybook` from `cmd/web-chat/web`.
4. Validate Go changes with `go test ./cmd/web-chat/... -count=1` from the Pinocchio root.
5. Re-run this script and compare the counts/probes before committing.
