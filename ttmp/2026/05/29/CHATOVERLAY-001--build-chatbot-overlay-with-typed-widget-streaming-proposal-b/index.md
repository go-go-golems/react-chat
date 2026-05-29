---
Title: Build chatbot overlay with typed widget streaming (Proposal B)
Ticket: CHATOVERLAY-001
Status: active
Topics:
    - chat-overlay
    - sessionstream
    - geppetto
    - pinocchio
    - react
    - widgets
    - protobuf
    - ecommerce
DocType: index
Intent: long-term
Owners: []
RelatedFiles:
    - Path: 2026-03-16--gec-rag/internal/webchat/sessionstream/sessionstream_server.go
      Note: CoinVault server initialization pattern
    - Path: go-go-os-frontend/packages/os-chat/src/chat/renderers/rendererRegistry.ts
      Note: Pluggable renderer registry pattern
    - Path: go-go-os-frontend/packages/os-chat/src/chat/ws/wsManager.ts
      Note: WebSocket lifecycle management for frontend transport
    - Path: pinocchio/pkg/chatapp/chat.go
      Note: Chat engine that manages runs and publishes events
    - Path: sessionstream/README.md
      Note: Core framework reference for the backend substrate
    - Path: sessionstream/examples/chatdemo/chat.go
      Note: Minimal working example of sessionstream handlers and projections
ExternalSources: []
Summary: ""
LastUpdated: 2026-05-29T11:18:37.407525882-04:00
WhatFor: ""
WhenToUse: ""
---


# Build chatbot overlay with typed widget streaming (Proposal B)

## Overview

<!-- Provide a brief overview of the ticket, its goals, and current status -->

## Key Links

- **Related Files**: See frontmatter RelatedFiles field
- **External Sources**: See frontmatter ExternalSources field

## Status

Current status: **active**

## Topics

- chat-overlay
- sessionstream
- geppetto
- pinocchio
- react
- widgets
- protobuf
- ecommerce

## Tasks

See [tasks.md](./tasks.md) for the current task list.

## Changelog

See [changelog.md](./changelog.md) for recent changes and decisions.

## Structure

- design/ - Architecture and design documents
- reference/ - Prompt packs, API contracts, context summaries
- playbooks/ - Command sequences and test procedures
- scripts/ - Temporary code and tooling
- various/ - Working notes and research
- archive/ - Deprecated or reference-only artifacts
