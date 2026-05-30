# Tasks

## Documentation and package planning

- [x] T1.1 Create ticket workspace.
- [x] T1.2 Write frontend tools migration design.
- [x] T1.3 Write initial investigation diary.
- [x] T1.4 Relate source files and upload design bundle to reMarkable.

## Phase 1: Pinocchio protobuf contract

- [ ] T2.1 Create Pinocchio frontend-tools proto package.
- [ ] T2.2 Move/rename `FrontendToolDescriptor`, manifest, call request, result, and entity messages.
- [ ] T2.3 Generate Go code.
- [ ] T2.4 Decide whether to generate TypeScript for web-chat or keep JSON decoding.

## Phase 2: Pinocchio Go package

- [ ] T3.1 Create `pinocchio/pkg/chatapp/frontendtools`.
- [ ] T3.2 Move manager manifest/result state handling.
- [ ] T3.3 Move ChatPlugin schema/UI/timeline projection.
- [ ] T3.4 Move BridgeExecutor and bridge context helpers.
- [ ] T3.5 Add provider-safe alias collision detection.
- [ ] T3.6 Add HTTP handlers for manifest/result routes.

## Phase 3: Tests

- [ ] T4.1 Test manifest replacement and descriptor lookup.
- [ ] T4.2 Test bridge request/result round trip.
- [ ] T4.3 Test provider-safe aliasing and collisions.
- [ ] T4.4 Test failed/denied result propagation.
- [ ] T4.5 Test plugin timeline projection.

## Phase 4: App migrations

- [ ] T5.1 Wire frontendtools into `pinocchio/cmd/web-chat` behind an option or default route registration.
- [ ] T5.2 Replace chat-overlay `internal/frontendtools` imports with Pinocchio package imports.
- [ ] T5.3 Update chat-overlay frontend protocol decoders if proto names change.
- [ ] T5.4 Run chat-overlay real/browser smoke tests.

## Delivery

- [ ] T6.1 Update diary after each implementation slice.
- [ ] T6.2 Update changelog/file relations.
- [ ] T6.3 Run doctor and upload final updated bundle if requested.
