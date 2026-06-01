# Tasks

## TODO

- [x] Inventory current backend protobuf/event/schema registration and frontend structural decoding paths
- [x] Design protobuf decoder registry and adapter integration for CanonicalFrame and SnapshotEntityFrame payloads
- [x] Write intern-oriented implementation guide with diagrams, pseudocode, APIs, file references, and testing strategy
- [x] Validate docs and upload the ticket bundle to reMarkable
- [ ] Implementation Phase 1: capture raw mock_parity WebSocket and snapshot payload fixtures before changing decoding
- [ ] Implementation Phase 2: add provider Any-envelope preservation and PayloadDecoderRegistry primitives
- [ ] Implementation Phase 3: wire payload decoder registry into ChatProvider, WebSocket manager, and snapshot hydration before adapters run
- [ ] Implementation Phase 4: add Pinocchio agent-mode protobuf decoder extension and convert agent-mode adapter first
- [ ] Implementation Phase 5: decide generated schema package ownership and include frontendtools/widgets schemas if core adapters decode them
- [ ] Implementation Phase 6: migrate provider core and Pinocchio backend-tool/reasoning adapters to typed decoded payload helpers
- [ ] Implementation Phase 7: add unit, fixture, adapter, and browser hydration tests for protobuf-backed decoding
