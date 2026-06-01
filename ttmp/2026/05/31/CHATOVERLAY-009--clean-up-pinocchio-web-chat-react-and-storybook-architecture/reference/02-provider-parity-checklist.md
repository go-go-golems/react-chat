---
Title: "Provider-backed web-chat parity checklist"
Ticket: "CHATOVERLAY-009"
Status: "active"
Topics: [web-chat,chat-provider,parity]
DocType: "reference"
Intent: "Moved from Pinocchio web-chat source so migration/checklist Markdown lives in the docmgr ticket."
Owners: []
RelatedFiles: []
---

# Provider-backed web-chat parity checklist

This checklist is the Phase 6 gate before deleting the legacy Redux/WebSocket `ChatWidget` implementation.

## Result

Status: pass for production web-chat parity as of Phase 6.

The provider-backed app is the production route. The legacy widget may be deleted in the next cleanup phase if reviewers accept the evidence below.

## Evidence summary

- Production route uses `MainWebChatRoot` -> `ChatWidget` -> provider-backed export.
- Provider shell owns session id sync through `sessionIdParam`, `sessionStorageKey`, and `onSessionIdChange`.
- Provider shell owns profile-aware request bodies through `createSessionBody` and `sendMessageBody`.
- Provider projectors cover Pinocchio-specific reasoning, agent-mode, and backend-tool events.
- Provider statusbar uses provider session id for export.
- Provider debug observer feeds the existing stream debug panel.
- Capability demo routes/tools/widgets were removed; frontend tool endpoint support remains generic and backend-tested.
- Deterministic `mock_parity` profile now exercises provider-backed reasoning, backend tool-call, agent-mode, and assistant text rendering without a live LLM.

## Parity areas

| Area | Status | Evidence |
| --- | --- | --- |
| Session creation | Pass | `WebChatProviderShell` configures `createSessionBody`, `sessionIdParam`, and `sessionStorageKey`. Main web-chat smoke creates a session and sends a prompt. |
| Session id persistence | Pass | `setSessionIdInLocation` writes `sessionId` into the URL; provider storage key is `pinocchio.web-chat.sessionId`. |
| Profile loading | Pass | `WebChatProviderShell` uses `useGetProfileQuery` and `useGetProfilesQuery`, deduplicates profile options, and falls back to `default`. |
| Profile switching | Pass | `onProfileChange` calls `useSetProfileMutation`, refreshes on failure, and updates `appSlice.profile`. |
| WebSocket connect | Pass | `WebChatApp` calls `client.connect()` on mount; main smoke waits for connected UI. |
| Snapshot hydration and buffered events | Pass | Owned by `@go-go-golems/chat-provider`; app installs `pinocchioWebChatProjectors` before connect. |
| Message sending | Pass | Composer calls `client.send(prompt)` and clears local text. Main smoke sends `show me boots`. |
| Run status transitions | Pass | `selectOverlay.runStatus` drives app status and timeline state. |
| Reasoning/thinking rendering | Pass | `pinocchioReasoningProjector` maps reasoning events to `message` entities with `role: thinking`; `MessageCard` renders them. |
| Backend tool calls/results | Pass | `pinocchioBackendToolProjector` maps tool call/result events; renderer registry maps `tool_call` and `tool_result`; provider path overrides `tool_call` with `ProviderToolCallRenderer`. |
| Typed widgets | Pass | Provider path overrides `widget` with `ProviderWidgetRenderer`, which renders `WidgetOutlet`; backend widget plugin tests run in Go validation. |
| Frontend tools | Pass, generic only | Demo tools were deleted. Generic manifest/result endpoints remain covered by `cmd/web-chat/app` tests using `app.confirm_action`; `ToolCallCard` can submit a human result when a real app supplies confirm metadata. |
| Export menu | Pass | `ProviderStatusbar` renders `ExportMenuForSession` using provider `overlay.sessionId`. |
| Stream debug panel | Pass | `onDebugEvent: recordProviderDebugEvent` records provider debug events into the existing stream debug store; `WebChatApp` renders `StreamDebugPanel`. |
| Deterministic mock profile | Pass, partial | `mock_parity` short-circuits normal runtime resolution to a mock Geppetto engine. It currently covers reasoning, backend tool calls/results, agent-mode special events, and assistant chat streaming. Widget/frontend-tool browser round-trip coverage remains a Phase 6A follow-up. |

## Validation commands

Run from `pinocchio/cmd/web-chat/web` unless noted:

```bash
npm run typecheck
npm run lint
npm run build
npm run build-storybook
npx vitest run src/app/routeMode.test.ts
```

Run from `pinocchio`:

```bash
go test ./cmd/web-chat/mockruntime ./cmd/web-chat ./cmd/web-chat/app ./cmd/web-chat/profiles ./pkg/chatapp -count=1
go test ./...
```

Run from the overlay repo:

```bash
node ttmp/2026/05/30/CHATOVERLAY-005--move-typed-widget-plugin-support-into-pinocchio-chatapp/scripts/03-pinocchio-webchat-devctl-playwright.js
node ttmp/2026/05/31/CHATOVERLAY-009--clean-up-pinocchio-web-chat-react-and-storybook-architecture/scripts/04-phase6-mock-profile-parity-smoke.js
```

## Review gate for Phase 7

Before deleting legacy files, reviewers should confirm:

1. No production route imports `LegacyChatWidget`.
2. Main smoke remains green after demo-route deletion.
3. The provider-backed statusbar/export path uses provider session id.
4. Any remaining legacy `src/ws/*` tests are either obsolete implementation tests or have provider/projector equivalents planned.
