---
Title: Converge ChatProvider WebSocket transport and migrate RAG-TTC
Ticket: REACT-CHAT-TRANSPORT-001
Status: active
Topics:
    - chat
    - websocket
    - chat-provider
    - sessionstream
    - react
    - architecture
DocType: index
Intent: long-term
Owners: []
RelatedFiles: []
ExternalSources: []
Summary: Shared, heartbeat-correct WebSocket lifecycle for ChatProvider, proven by migrating the real RAG-TTC Garden Assistant and handed off for later CoinVault adoption.
LastUpdated: 2026-08-18T19:33:51.129588493-04:00
WhatFor: Coordinate transport implementation, RAG-TTC integration proof, and the downstream CoinVault handoff.
WhenToUse: When implementing or reviewing browser WebSocket lifecycle behavior shared by React Chat consumers.
---

# Converge ChatProvider WebSocket transport and migrate RAG-TTC

## Overview

Make ChatProvider the canonical owner of sessionstream WebSocket heartbeat, reconnect, resume, shutdown, and lifecycle diagnostics. The first downstream proof is the real full-corpus RAG-TTC Garden Assistant. CoinVault adoption is intentionally separate in [issue #9](https://github.com/goldeneagle/coinvault/issues/9).

## Key Links

- [Implementation design](./design-doc/01-chatprovider-transport-convergence-and-downstream-migration-guide.md)
- [Investigation diary](./reference/01-investigation-diary.md)
- [CoinVault downstream issue](https://github.com/goldeneagle/coinvault/issues/9)

## Status

Current status: **active**

## Topics

- chat
- websocket
- chat-provider
- sessionstream
- react
- architecture

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
