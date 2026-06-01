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

Generated: 2026-06-01 14:02:25 UTC

## Roots
- Pinocchio: `/home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio`
- Frontend: `/home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/web`
- Go command: `/home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat`
- Ticket sources: `/home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/ttmp/2026/05/31/CHATOVERLAY-011--make-pinocchio-web-chat-a-stellar-go-and-typescript-example-application/sources`

## Summary
| Area | Count |
| --- | --- |
| TypeScript/TSX files under cmd/web-chat/web/src | 105 |
| Go files under cmd/web-chat | 30 |
| Go packages from go list ./cmd/web-chat/... | 4 |
| npm audit:unused script present | yes |
| knip exit code | 1 |

## Frontend file inventory
### By extension
| Extension | Count |
| --- | --- |
| .ts | 68 |
| .tsx | 37 |

### By category
| Category | Count |
| --- | --- |
| generated | 2 |
| source | 85 |
| stories | 11 |
| tests | 7 |

### Top directories
| Directory | Files |
| --- | --- |
| features/web-chat | 69 |
| webchat | 12 |
| store | 5 |
| utils | 5 |
| (root) | 3 |
| app | 3 |
| ws | 3 |
| generated/chatapp | 2 |
| components | 1 |
| config | 1 |
| webchat/components | 1 |

### Largest TypeScript/TSX files
| File | Lines |
| --- | --- |
| src/generated/chatapp/proto/pinocchio/chatapp/v1/chat_pb.ts | 1373 |
| src/generated/chatapp/proto/pinocchio/chatapp/rpc/v1/rpc_pb.ts | 422 |
| src/features/web-chat/extensions/pinocchio-timeline-adapters/pinocchioTimelineAdapters.ts | 291 |
| src/features/web-chat/ChatTimeline/useStickyScrollFollow.ts | 236 |
| src/webchat/types.ts | 198 |
| src/features/web-chat/WebChatApp/WebChatApp.tsx | 182 |
| src/store/profileApi.test.ts | 131 |
| src/store/profileApi.ts | 121 |
| src/features/web-chat/ChatTimeline/ChatTimeline.tsx | 116 |
| src/ws/protocol.test.ts | 106 |
| src/features/web-chat/ChatTimeline/ChatTimeline.stories.tsx | 103 |
| src/webchat/components/ExportMenu.tsx | 101 |
| src/features/web-chat/WebChatProviderShell/WebChatProviderShell.tsx | 95 |
| src/features/web-chat/cards/ToolCallCard/ToolCallCard.tsx | 84 |
| src/features/web-chat/extensions/pinocchio-timeline-adapters/pinocchioTimelineAdapters.test.ts | 84 |
| src/features/web-chat/ChatHeader/ChatHeader.stories.tsx | 81 |
| src/utils/basePrefix.test.ts | 80 |
| src/features/web-chat/cards/Markdown/Markdown.tsx | 77 |
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
- `src/features/web-chat/ChatComposer/ChatComposer.tsx:1: import { getPartProps, mergeClassName, mergeStyle } from '../../../webchat/parts';`
- `src/features/web-chat/ChatComposer/types.ts:1: import type { ComposerSlotProps } from '../../../webchat/types';`
- `src/features/web-chat/ChatHeader/ChatHeader.stories.tsx:2: import type { StatusbarSlotProps } from '../../../webchat/types';`
- `src/features/web-chat/ChatHeader/ChatHeader.tsx:1: import { getPartProps, mergeClassName, mergeStyle } from '../../../webchat/parts';`
- `src/features/web-chat/ChatHeader/types.ts:2: import type { HeaderSlotProps, StatusbarSlotProps } from '../../../webchat/types';`
- `src/features/web-chat/ChatStatusbar/ChatStatusbar.tsx:1: import { ExportMenu } from '../../../webchat/components/ExportMenu';`
- `src/features/web-chat/ChatStatusbar/ChatStatusbar.tsx:2: import { getPartProps, mergeClassName, mergeStyle } from '../../../webchat/parts';`
- `src/features/web-chat/ChatStatusbar/ChatStatusbar.tsx:3: import { fmtShort } from '../../../webchat/utils';`
- `src/features/web-chat/ChatStatusbar/types.ts:1: import type { StatusbarSlotProps } from '../../../webchat/types';`
- `src/features/web-chat/ChatTimeline/ChatTimeline.stories.tsx:3: import type { ChatWidgetRenderers, RenderEntity } from '../../../webchat/types';`
- `src/features/web-chat/ChatTimeline/ChatTimeline.tsx:1: import { getPartProps, mergeClassName, mergeStyle } from '../../../webchat/parts';`
- `src/features/web-chat/ChatTimeline/ChatTimeline.tsx:2: import type { RenderEntity } from '../../../webchat/types';`
- `src/features/web-chat/ChatTimeline/types.ts:2: import type { ChatWidgetRenderers, PartProps, RenderEntity } from '../../../webchat/types';`
- `src/features/web-chat/WebChatApp/ProviderStatusbar.tsx:2: import { ExportMenuForSession } from '../../../webchat/components/ExportMenu';`
- `src/features/web-chat/WebChatApp/ProviderStatusbar.tsx:3: import { getPartProps, mergeClassName, mergeStyle } from '../../../webchat/parts';`
- `src/features/web-chat/WebChatApp/ProviderStatusbar.tsx:4: import type { StatusbarSlotProps } from '../../../webchat/types';`
- `src/features/web-chat/WebChatApp/ProviderStatusbar.tsx:5: import { fmtShort } from '../../../webchat/utils';`
- `src/features/web-chat/WebChatApp/ProviderToolCallRenderer.tsx:2: import type { RenderEntity } from '../../../webchat/types';`
- `src/features/web-chat/WebChatApp/ProviderWidgetRenderer.tsx:2: import type { RenderEntity } from '../../../webchat/types';`
- `src/features/web-chat/WebChatApp/WebChatApp.tsx:9: import { getPartProps, mergeClassName, mergeStyle } from '../../../webchat/parts';`
- `src/features/web-chat/WebChatApp/WebChatApp.tsx:10: import { createWebChatRenderers } from '../../../webchat/renderers';`
- `src/features/web-chat/WebChatApp/WebChatApp.tsx:11: import type { ChatWidgetComponents, ChatWidgetRenderers } from '../../../webchat/types';`
- `src/features/web-chat/WebChatApp/types.ts:2: import type { ChatWidgetProps } from '../../../webchat/types';`
- `src/features/web-chat/WebChatProviderShell/WebChatProviderShell.tsx:8: import { resolveSelectedProfile } from '../../../webchat/profileSelection';`
- `src/features/web-chat/WebChatProviderShell/types.ts:1: import type { ChatWidgetProps } from '../../../webchat/types';`
- `src/features/web-chat/cards/AgentModeCard/AgentModeCard.tsx:1: import { normalizeAgentModeAnalysis } from '../../../../webchat/agentModeMarkdown';`
- `src/features/web-chat/cards/AgentModeCard/AgentModeCard.tsx:2: import { fmtSentAt } from '../../../../webchat/utils';`
- `src/features/web-chat/cards/GenericCard/GenericCard.tsx:1: import { fmtSentAt } from '../../../../webchat/utils';`
- `src/features/web-chat/cards/LogCard/LogCard.tsx:1: import { fmtSentAt } from '../../../../webchat/utils';`
- `src/features/web-chat/cards/MessageCard/MessageCard.tsx:1: import { fmtSentAt } from '../../../../webchat/utils';`

### explicit any casts
- `src/features/web-chat/WebChatApp/WebChatApp.tsx:144: Statusbar={StatusbarComponent as any}`
- `src/features/web-chat/cards/Markdown/Markdown.tsx:40: pre({ children }: any) {`
- `src/features/web-chat/cards/Markdown/Markdown.tsx:51: code({ inline, children }: any) {`
- `src/features/web-chat/cards/Markdown/Markdown.tsx:55: a({ href, children }: any) {`
- `src/features/web-chat/cards/Markdown/Markdown.tsx:72: <ReactMarkdown remarkPlugins={[remarkGfm]} components={components as any}>`

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

Unused files (8)
public/mockServiceWorker.js: public/mockServiceWorker.js
src/generated/chatapp/proto/pinocchio/chatapp/rpc/v1/rpc_pb.ts: src/generated/chatapp/proto/pinocchio/chatapp/rpc/v1/rpc_pb.ts
src/generated/chatapp/proto/pinocchio/chatapp/v1/chat_pb.ts: src/generated/chatapp/proto/pinocchio/chatapp/v1/chat_pb.ts
src/utils/guards.ts: src/utils/guards.ts
src/utils/number.ts: src/utils/number.ts
src/webchat/Markdown.tsx: src/webchat/Markdown.tsx
src/webchat/cards.tsx: src/webchat/cards.tsx
src/webchat/index.ts: src/webchat/index.ts
Unused exports (8)
src/features/web-chat/ChatStatusbar/index.ts: DefaultStatusbar
src/features/web-chat/cards/index.ts: Markdown
src/features/web-chat/cards/utils.ts: formatJson
src/features/web-chat/extensions/pinocchio-timeline-adapters/index.ts: pinocchioAgentModeAdapter, pinocchioBackendToolAdapter, pinocchioReasoningAdapter
src/features/web-chat/extensions/pinocchio-timeline-adapters/pinocchioTimelineAdapters.ts: pinocchioReasoningAdapter
src/features/web-chat/index.ts: DefaultComposer, DefaultHeader, DefaultStatusbar, ChatTimeline, useStickyScrollFollow, pinocchioWebChatTimelineAdapters, WebChatApp
src/utils/logger.ts: logInfo, errorToString
src/ws/protocol.ts: asRecord, asString, normalizeServerFrame, unwrapAnyPayload
```

## Go inventory
### Packages
Raw output: `sources/web-chat-go-list.txt`
| Package |
| --- |
| github.com/go-go-golems/pinocchio/cmd/web-chat |
| github.com/go-go-golems/pinocchio/cmd/web-chat/app |
| github.com/go-go-golems/pinocchio/cmd/web-chat/mockruntime |
| github.com/go-go-golems/pinocchio/cmd/web-chat/profiles |

### Files by cmd/web-chat subdirectory
| Directory | Files |
| --- | --- |
| (root) | 15 |
| app | 7 |
| profiles | 5 |
| mockruntime | 3 |

### Largest Go files
| File | Lines |
| --- | --- |
| profiles/api.go | 576 |
| app/server_test.go | 566 |
| profiles/resolver.go | 440 |
| app/server.go | 396 |
| main.go | 385 |
| runtime_composer_test.go | 352 |
| runtime_composer.go | 350 |
| reasoning_chat_feature_test.go | 265 |
| main_profile_registries_test.go | 217 |
| main_runtime_test.go | 169 |
| app/server_export.go | 168 |
| app/showcase_tools.go | 167 |
| middleware_definitions.go | 159 |
| mockruntime/engine.go | 142 |
| agentmode_chat_feature.go | 134 |
| profiles/types.go | 116 |
| agentmode_chat_feature_test.go | 93 |
| turn_persistence.go | 90 |
| middleware_definitions_test.go | 75 |
| canonical_runtime_resolver.go | 71 |
| mockruntime/engine_test.go | 48 |
| agentmode_sink.go | 43 |
| profile_runtime_test_helpers_test.go | 19 |
| app/runtime.go | 15 |
| app/contracts.go | 11 |

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
