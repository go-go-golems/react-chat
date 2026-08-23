---
Title: 'Make browser tool execution idempotent, single-owner, and manifest-safe'
Ticket: REACT-CHAT-TOOL-RUNTIME-1
Status: active
Topics: [frontend-tools, chat-provider, typescript, frontend]
DocType: index
Intent: long-term
Owners: []
RelatedFiles: []
ExternalSources: []
Summary: 'Implementation ticket for chat-provider terminal invocation state, human completion CAS, browser executor ownership, monotonic manifests, deadlines, and runtime observability.'
LastUpdated: 2026-08-23T17:30:00-04:00
WhatFor: 'Landing page for the chat-provider browser tool runtime hardening guide, diary, tasks, and delivery.'
WhenToUse: 'Before changing or releasing packages/chat-provider frontend-tool runtime behavior.'
---

# Make browser tool execution idempotent, single-owner, and manifest-safe

## Start here

1. [Browser tool runtime hardening design and implementation guide](./design-doc/01-chat-provider-browser-tool-runtime-hardening-idempotency-executor-ownership-manifests-implementation-guide.md)
2. [Diary](./reference/01-diary.md)
3. [Tasks](./tasks.md)
4. [Changelog](./changelog.md)

## Scope

This ticket owns the browser half of frontend tools: full invocation keys, running/waiting/completing/terminal state, no effect replay, one-shot human completion, result delivery retry, executor client identity, manifest snapshots, timeouts, debug events, tests, and package release.

Server pending-call identity belongs to `PINOCCHIO-TOOLCALL-1`. PBUI policy/effect/server integration belongs to `PBUI-TOOLCALL-1`.
