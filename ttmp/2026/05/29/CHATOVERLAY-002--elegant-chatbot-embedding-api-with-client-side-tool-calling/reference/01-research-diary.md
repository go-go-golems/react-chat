---
Title: Research diary
Ticket: CHATOVERLAY-002
Status: active
Topics:
    - chat-overlay
    - react
    - sessionstream
    - pinocchio
    - geppetto
    - widgets
    - protobuf
    - ecommerce
DocType: reference
Intent: long-term
Owners: []
RelatedFiles:
    - Path: ttmp/2026/05/29/CHATOVERLAY-002--elegant-chatbot-embedding-api-with-client-side-tool-calling/scripts/01-fetch-research-sources.sh
      Note: Defuddle source download script for prior-art docs
    - Path: ttmp/2026/05/29/CHATOVERLAY-002--elegant-chatbot-embedding-api-with-client-side-tool-calling/sources/05-ai-sdk-chatbot-tool-usage.md
      Note: Downloaded Vercel AI SDK client-side tool round-trip reference
    - Path: ttmp/2026/05/29/CHATOVERLAY-002--elegant-chatbot-embedding-api-with-client-side-tool-calling/sources/08-assistant-ui-tools.md
      Note: Downloaded assistant-ui toolkit/tool typing reference
    - Path: ttmp/2026/05/29/CHATOVERLAY-002--elegant-chatbot-embedding-api-with-client-side-tool-calling/sources/01-copilotkit-use-frontend-tool.md
      Note: Downloaded CopilotKit frontend tool reference
ExternalSources: []
Summary: Chronological research diary for CHATOVERLAY-002.
LastUpdated: 2026-05-29T14:40:31.095706533-04:00
WhatFor: Record research commands, source downloads, design decisions, and validation steps for client-side tool calling design.
WhenToUse: Read before implementing the client-side tool calling API or updating the CHATOVERLAY-002 design.
---


# Research Diary

## Goal

Record the research and design work for an elegant chatbot embedding API with typed widgets and client-side tool calling.

## Step 1: Create ticket and collect prior art

This step created the design workspace and downloaded source material for CopilotKit, Vercel AI SDK, assistant-ui, and AG-UI. The goal was to avoid designing from memory. Client-side tool calling already has strong patterns in the React ecosystem, and the design should keep the best developer-experience ideas while preserving the Go/sessionstream architecture.

### Prompt Context

**User prompt (verbatim):** "alright, this works. Analyze the API we provide now for adding chatbots to existing pages, and the original designs / the obsidian vault articles, and copilot kit / ai sdk by vercel and assistant-ui / generative ui ideas (use kagi_search, defuddle, and look at my last chatgpt session with `surf chatgpt --help`, do properly take this to the next step.

Create a new ticket for that, and Create  a detailed analysis / design / implementation guide that is for a new intern, explaining all the parts of the system needed to understand what it is, with prose paragraphs and bullet point sand pseudocode and diagrams and api references and file references. It should be very clear and technical. Store in the ticket and the nupload to remarkable.


Use defuddle to download interesting resources so that we can refer to them and use the best of all these APIs.

I'm particularly interested in adding client-side tool calling, where a tool call is passed through from geppetto/pinocchio backend all the way to the frontend, something that might even need some sessionstream/ or geppetto/pinocchio updates as well. Think hard, dig deep, do the best you can, we want to be elegant, opinionated, "powerful""

**Assistant interpretation:** Create a new research/design ticket that studies the current overlay API, prior proposal/design material, and external client-side tool/generative UI APIs, then produce an intern-ready design guide for client-side tool calling across React, sessionstream, Pinocchio, and Geppetto.

**Inferred user intent:** Move from a working prototype to a principled API design that can support production embedding and browser-executed tools.

**Commit (code):** N/A — research/documentation step.

### What I did
- Created ticket `CHATOVERLAY-002`.
- Created design doc `design-doc/01-elegant-chatbot-embedding-api-and-client-side-tool-calling-design.md`.
- Created this research diary.
- Used Kagi search for CopilotKit, Vercel AI SDK, assistant-ui, and generative UI references.
- Wrote and ran `scripts/01-fetch-research-sources.sh` to save Defuddle Markdown extracts under `sources/`.
- Ran `surf chatgpt --help` and `surf chatgpt transcript --help`.
- Attempted `surf chatgpt transcript --export-file sources/10-last-chatgpt-session.md`; the active browser page was the local overlay, not ChatGPT, so the export is not useful as a ChatGPT design source.

### Why
Client-side tool calling touches API design, transport design, backend run control, frontend registration lifecycle, and human approval UI. It needs a dedicated design ticket instead of being appended to the implementation ticket.

### What worked
- Defuddle successfully saved clean Markdown sources for the major external APIs.
- The current overlay implementation provided concrete file references and a working baseline.
- The research clarified a strong API direction: `useFrontendTool`, `useHumanTool`, `defineToolUI`, and `defineToolkit` layered on top of sessionstream.

### What didn't work
- The ChatGPT transcript export did not capture a ChatGPT session because the active page was `http://localhost:5173/`.

### What I learned
- CopilotKit has the strongest component-scoped frontend tool registration API.
- Vercel AI SDK has the clearest client result round-trip model: tool call forwarded to client, client calls `addToolOutput`, model continues.
- assistant-ui has the cleanest split between frontend, human, and backend tools plus custom tool UI.
- AG-UI reinforces that tool calls, state, and UI should travel through one protocol; for this project, that protocol should be sessionstream.

### What was tricky to build
- The main design tension is where to put the browser-tool pause/resume mechanism. Geppetto owns the tool loop, Pinocchio owns session/message/run context, and sessionstream owns command/event ordering. The design recommends implementing the first bridge at the Pinocchio integration layer rather than changing Geppetto first.

### What warrants a second pair of eyes
- Review whether blocking a Geppetto tool executor while waiting for frontend result is acceptable for the first implementation, or whether a larger pause/resume API is needed immediately.
- Review whether frontend tool manifests should be in-memory only or persisted in session metadata.

### What should be done in the future
- Add schema files for frontend tool manifests and results.
- Prototype `useFrontendTool` with a synthetic backend event before changing Geppetto.
- Add backend integration tests for pending frontend tool calls.

### Code review instructions
- Read the design doc first.
- Then inspect `sources/01-copilotkit-use-frontend-tool.md`, `sources/05-ai-sdk-chatbot-tool-usage.md`, and `sources/08-assistant-ui-tools.md`.
- Compare proposed API sketches with current files: `web/src/core/createChatOverlay.ts`, `web/src/widgets/widgetRegistry.ts`, and `web/src/ws/timelineEvents.ts`.

### Technical details
- Script: `scripts/01-fetch-research-sources.sh`
- Sources directory: `sources/`
- Main design doc: `design-doc/01-elegant-chatbot-embedding-api-and-client-side-tool-calling-design.md`
