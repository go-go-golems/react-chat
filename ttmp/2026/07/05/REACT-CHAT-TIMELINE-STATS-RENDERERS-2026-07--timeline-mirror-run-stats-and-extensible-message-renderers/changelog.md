# Changelog

## 2026-07-05

- Initial workspace created


## 2026-07-05

Created Tier 1 upstreaming design for timeline mirror, run stats, and ChatMessages renderer extension

### Related Files

- /home/manuel/code/wesen/go-go-golems/react-chat/ttmp/2026/07/05/REACT-CHAT-TIMELINE-STATS-RENDERERS-2026-07--timeline-mirror-run-stats-and-extensible-message-renderers/design-doc/01-timeline-mirror-run-stats-and-renderer-extension-intern-guide.md — Intern-facing design and implementation guide
- /home/manuel/code/wesen/go-go-golems/react-chat/ttmp/2026/07/05/REACT-CHAT-TIMELINE-STATS-RENDERERS-2026-07--timeline-mirror-run-stats-and-extensible-message-renderers/reference/01-investigation-diary.md — Chronological investigation diary


## 2026-07-05

Phase 1: extracted provider-owned timeline merge semantics and added mirror API (commit 0c934ee)

### Related Files

- /home/manuel/code/wesen/go-go-golems/react-chat/packages/chat-provider/src/store/timelineMerge.ts — Shared merge helpers
- /home/manuel/code/wesen/go-go-golems/react-chat/packages/chat-provider/src/store/timelineMirror.test.ts — Reducer/mirror parity coverage
- /home/manuel/code/wesen/go-go-golems/react-chat/packages/chat-provider/src/store/timelineMirror.ts — External timeline mirror API


## 2026-07-05

Phase 2: added provider run stats slice/selectors fed by provider-call UI events (commit 87e1601)

### Related Files

- /home/manuel/code/wesen/go-go-golems/react-chat/packages/chat-provider/src/store/runStatsSlice.test.ts — Stats behavior tests
- /home/manuel/code/wesen/go-go-golems/react-chat/packages/chat-provider/src/store/runStatsSlice.ts — Run stats reducer and public types
- /home/manuel/code/wesen/go-go-golems/react-chat/packages/chat-provider/src/ws/runStatsEvents.ts — Stats event ingestion


## 2026-07-05

Phase 3: made ChatMessages extensible with renderer maps and unknown-kind fallback (commit 42e0517)

### Related Files

- /home/manuel/code/wesen/go-go-golems/react-chat/packages/chat-overlay/src/index.ts — Renderer API exports
- /home/manuel/code/wesen/go-go-golems/react-chat/packages/chat-overlay/src/overlay/ChatMessages.tsx — Renderer extension implementation

