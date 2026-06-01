---
title: "Investigation Diary"
ticket: CHATOVERLAY-012
doc_type: reference
status: active
intent: long-term
topics:
  - chat-provider
  - pinocchio
  - web-chat
  - protobuf
  - typescript
  - architecture
created: 2026-06-01
updated: 2026-06-01
---

# Diary

## Goal

This diary records the setup and analysis work for a later project to standardize frontend WebSocket/snapshot payload decoding around protobuf schemas. The goal for this turn was to create the ticket, preserve the design rationale, and publish the guide to reMarkable without implementing code changes yet.

## Step 1: Create CHATOVERLAY-012 and inventory the protobuf decoding boundary

The work began by turning the discussion about `CanonicalFrame`, `SnapshotEntityFrame`, protobuf-backed server payloads, and structural frontend decoding into a separate future implementation ticket. The ticket is intentionally scoped as a later project: it captures the architecture and plan, but does not modify provider or Pinocchio source code.

The investigation focused on the exact boundary where the backend is typed and the frontend becomes structural. On the backend, Pinocchio registers concrete protobuf messages in the sessionstream schema registry and publishes `proto.Message` payloads. On the frontend, `chat-provider` normalizes the transport envelope into generic frame objects and timeline adapters read `payload` as records. The design guide explains how to add a decoder registry between those two layers.

### Prompt Context

**User prompt (verbatim):** "Let's create a new ticket for later to standardize everything around protobuf for decoding websocket payloads, using all your analysis. Create  a detailed analysis / design / implementation guide that is for a new intern, explaining all the parts of the system needed to understand what it is, with prose paragraphs and bullet point sand pseudocode and diagrams and api references and file references. It should be very clear and technical. Store in the ticket and the nupload to remarkable.


Keep a diary as you work, but we'll tackle that project later."

**Assistant interpretation:** Create a new docmgr ticket for future protobuf-backed frontend payload decoding, write a detailed intern-facing design/implementation guide, keep a diary, and upload the ticket bundle to reMarkable.

**Inferred user intent:** The user wants to preserve the current architectural analysis as a concrete future project without starting implementation now.

**Commit (code):** N/A — documentation/ticket work only.

### What I did
- Created `CHATOVERLAY-012 — Standardize websocket payload decoding around protobuf schemas`.
- Added a design document: `design-doc/01-protobuf-backed-websocket-payload-decoding-analysis-and-implementation-guide.md`.
- Added this diary document.
- Added initial tasks for inventory, decoder-registry design, implementation-guide writing, validation, and upload.
- Read the current provider protocol and projection files:
  - `packages/chat-provider/src/ws/protocol.ts`
  - `packages/chat-provider/src/ws/timelineSnapshot.ts`
  - `packages/chat-provider/src/ws/timelineEvents.ts`
- Read backend protobuf/schema registration and publish paths:
  - `pkg/chatapp/chat.go`
  - `pkg/chatapp/features.go`
  - `pkg/chatapp/runtime_inference.go`
  - `pkg/chatapp/projections.go`
  - `pkg/chatapp/plugins/reasoning.go`
  - `pkg/chatapp/plugins/toolcall.go`
  - `cmd/web-chat/agentmode_chat_feature.go`
- Checked generated frontend schema availability under `cmd/web-chat/web/src/generated/chatapp`.

### Why
- The frontend currently has generated TypeScript protobuf code, but production adapters mostly decode payloads structurally.
- The backend is already schema-backed for chat/sessionstream payloads, so a later cleanup can make the browser payload boundary schema-backed too.
- The design should preserve the provider/app ownership boundary: provider owns envelope and registry mechanics; Pinocchio owns Pinocchio-specific schemas and adapters.

### What worked
- The current backend evidence is clear: schema registration uses concrete protobuf message types and plugin runtime publishing requires `proto.Message`.
- The current frontend evidence is clear: `CanonicalFrame` is `Record<string, unknown>`, `SnapshotEntityFrame.payload` is `unknown`, and adapters use structural helpers such as `asRecord` and `asString`.
- The generated TypeScript `chat_pb.ts` already includes schemas for agent mode, chat messages, reasoning, and backend tool history.
- The design now documents a narrow first implementation slice: capture raw wire fixtures, add envelope preservation and decoder registry primitives, then convert agent-mode adapters first.

### What didn't work
- No command failure occurred during this step.
- One design gap surfaced: generated TypeScript files currently exist for `chatapp/v1` and `rpc/v1`, but not for `frontendtools/v1` or `widgets/v1`, even though those backend proto files exist. The implementation guide documents this as a generation/package ownership decision.

### What I learned
- The phrase "protobuf-backed" needs careful scope. Chat/sessionstream event/entity payloads are protobuf-backed, but profile APIs, create/send HTTP bodies, debug/export routes, browser subscribe frames, and `Struct` fields are not all strict protobuf payloads.
- The most useful decoder insertion point is after `chat-provider` envelope normalization and before timeline adapter projection.
- The future implementation should preserve raw payloads and type URLs so decode failures remain debuggable.

### What was tricky to build
- The tricky part was designing protobuf decoding without breaking the generic provider boundary. If `chat-provider` imports Pinocchio-only schemas directly, it stops being generic. The guide therefore proposes provider-owned decoder registry mechanics, plus app-owned decoder packs installed through extensions.
- Another tricky part was avoiding an overlarge first slice. The guide recommends proving the design on agent-mode payloads first because that payload family already exposed the live/hydration boundary problem.

### What warrants a second pair of eyes
- Whether generated TypeScript schemas should live in `cmd/web-chat/web/src/generated`, in `packages/chat-provider`, or in a separate shared package such as `@go-go-golems/chatapp-proto`.
- Whether backend tool history should become provider-standard or remain Pinocchio app UI.
- Whether reasoning should be considered a generic chat-provider concept or a Pinocchio-specific presentation concept.
- Whether future decoding should remain JSON/protojson or eventually move to binary protobuf frames.

### What should be done in the future
- Implement the first slice described in the design guide.
- Capture raw WebSocket and snapshot fixtures before changing normalization.
- Add decoder registry tests before changing adapters.
- Convert agent-mode live and snapshot adapters to generated protobuf decoding first.

### Code review instructions
- Review the design guide first:
  - `/home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/ttmp/2026/06/01/CHATOVERLAY-012--standardize-websocket-payload-decoding-around-protobuf-schemas/design-doc/01-protobuf-backed-websocket-payload-decoding-analysis-and-implementation-guide.md`
- Then inspect these implementation files before starting code changes:
  - `/home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/packages/chat-provider/src/ws/protocol.ts`
  - `/home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/packages/chat-provider/src/ws/timelineSnapshot.ts`
  - `/home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/web/src/features/web-chat/extensions/pinocchio-timeline-adapters/pinocchioTimelineAdapters.ts`
  - `/home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/agentmode_chat_feature.go`
- Validate documentation with:
  - `docmgr doctor --ticket CHATOVERLAY-012 --stale-after 30`

### Technical details
- Current provider envelope type: `CanonicalFrame = Record<string, unknown>`.
- Current snapshot entity type includes `payload?: unknown`.
- Current generated schemas include `AgentModePreviewUpdateSchema`, `AgentModeCommittedUpdateSchema`, `AgentModePreviewClearedSchema`, and `AgentModeEntitySchema`.
- Proposed new concept: provider-scoped `PayloadDecoderRegistry` installed before WebSocket connect/hydration.

## Step 2: Validate and upload the protobuf decoding guide

After writing the design guide, I validated the ticket and uploaded the document bundle to reMarkable. This finished the requested documentation deliverable while leaving implementation-phase tasks open for the later project.

The upload included the ticket index, design guide, diary, tasks, and changelog. I used a dry-run first to confirm the bundle inputs and remote destination, then uploaded the PDF.

### Prompt Context

**User prompt (verbatim):** (same as Step 1)

**Assistant interpretation:** Validate the CHATOVERLAY-012 documentation package and publish it to reMarkable for later reading.

**Inferred user intent:** The user wants the protobuf decoding design preserved as a durable ticket and available on reMarkable before implementation begins later.

**Commit (code):** N/A — documentation/upload only.

### What I did
- Ran `docmgr doctor --ticket CHATOVERLAY-012 --stale-after 30` successfully.
- Ran a dry-run reMarkable bundle upload for the CHATOVERLAY-012 docs.
- Uploaded the bundle to `/ai/2026/06/01/CHATOVERLAY-012` as `CHATOVERLAY-012 Protobuf Payload Decoding Guide.pdf`.
- Checked the validation/upload task.
- Updated the changelog with the upload result.

### Why
- The ticket-research workflow requires a clean docmgr doctor run before delivery.
- The dry-run confirmed the exact files and destination before producing the PDF.

### What worked
- `docmgr doctor` passed with no warnings.
- The reMarkable upload succeeded with:
  - `OK: uploaded CHATOVERLAY-012 Protobuf Payload Decoding Guide.pdf -> /ai/2026/06/01/CHATOVERLAY-012`

### What didn't work
- N/A.

### What I learned
- The ticket can remain active with implementation tasks open while the analysis/upload deliverable tasks are marked complete.
- The reMarkable bundle flow works cleanly for future-project design tickets.

### What was tricky to build
- The only sequencing issue is that checking the upload task and updating the diary/changelog changes the bundle after the first upload. I re-uploaded with `--force` after the final task/changelog/diary updates so the reMarkable copy matches the final ticket state.

### What warrants a second pair of eyes
- Review whether the implementation tasks are the right granularity before starting the future coding phase.

### What should be done in the future
- Start with fixture capture before changing any decoder code.
- Revisit generated-schema package ownership before converting provider core adapters.

### Code review instructions
- Validate with:
  - `docmgr doctor --ticket CHATOVERLAY-012 --stale-after 30`
- Confirm reMarkable destination:
  - `/ai/2026/06/01/CHATOVERLAY-012`

### Technical details
- Bundle name: `CHATOVERLAY-012 Protobuf Payload Decoding Guide`.
- Remote directory: `/ai/2026/06/01/CHATOVERLAY-012`.
- Upload command used `remarquee upload bundle ... --toc-depth 2 --non-interactive`.
