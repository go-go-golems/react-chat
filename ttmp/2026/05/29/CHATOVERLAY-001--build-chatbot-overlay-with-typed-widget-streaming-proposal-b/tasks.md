# Tasks

## TODO

- [ ] T1: Create Go module and wire into go.work
- [ ] T2: Create protobuf schemas for widget events, entities, and commands
- [ ] T3: Run buf generate to produce Go and TypeScript types
- [ ] T4: Implement MockEngine with plain text, single widget, multi-widget, error, and cancellation responses
- [ ] T5: Implement server initialization (Hub, Engine, Service, WS transport)
- [ ] T6: Mount HTTP routes (create session, submit message, snapshot, stop, WS)
- [ ] T7: Register widget schemas and implement widget UI projection
- [ ] T8: Implement widget timeline projection (upsert, merge patch, tombstone)
- [ ] T9: Add widget-producing responses to MockEngine with streaming delta patches
- [ ] T10: Add widget.action command handler
- [ ] T11: Create React/Vite project under web/
- [ ] T12: Implement sessionstreamTransport() wrapping os-chat WsManager
- [ ] T13: Implement event normalization (eventMapper.ts)
- [ ] T14: Configure Redux store reusing os-chat slices
- [ ] T15: Implement ChatMessages and ChatComposer components
- [ ] T16: Implement defineWidget() and WidgetRegistry
- [ ] T17: Implement WidgetOutlet, UnknownWidget, LoadingWidget
- [ ] T18: Create ecommerce widget definitions and renderers
- [ ] T19: Implement ecommercePreset() factory
- [ ] T20: Implement ChatBubble, ChatPanel, ChatOverlayProvider
- [ ] T21: Implement useChatOverlay() and useOverlayWidget() hooks
- [ ] T22: Add theme support and behavior configuration
- [ ] T23: Embed frontend in Go binary with go:embed
- [ ] T24: Test reconnection, error handling, cancellation edge cases

