# Tasks

## Documentation and package planning

- [x] T1.1 Create ticket workspace.
- [x] T1.2 Write frontend tools migration design.
- [x] T1.3 Write initial investigation diary.
- [x] T1.4 Relate source files and upload design bundle to reMarkable.

## Phase 1: Pinocchio protobuf contract

- [x] T2.1 Create Pinocchio frontend-tools proto package.
- [x] T2.2 Move/rename `FrontendToolDescriptor`, manifest, call request, result, and entity messages.
- [x] T2.3 Generate Go code.
- [x] T2.4 Decide whether to generate TypeScript for web-chat or keep JSON decoding: keep JSON decoding for now; chat-overlay frontend consumes stable event names/protojson payloads.

## Phase 2: Pinocchio Go package

- [x] T3.1 Create `pinocchio/pkg/chatapp/frontendtools`.
- [x] T3.2 Move manager manifest/result state handling.
- [x] T3.3 Move ChatPlugin schema/UI/timeline projection.
- [x] T3.4 Move BridgeExecutor and bridge context helpers.
- [x] T3.5 Add provider-safe alias collision detection.
- [x] T3.6 Decide HTTP handler ownership: keep app-local for now; shared route extraction was deferred in CHATOVERLAY-003.

## Phase 3: Tests

- [x] T4.1 Test manifest replacement and descriptor lookup.
- [x] T4.2 Test bridge request/result round trip.
- [x] T4.3 Test provider-safe aliasing and collisions.
- [x] T4.4 Test failed/denied result propagation.
- [x] T4.5 Test plugin timeline projection.

## Phase 4: App migrations

- [x] T5.1 Wire frontendtools for reusable Pinocchio consumers via `frontendtools.NewPlugin()` and `frontendtools.Manager`; no `cmd/web-chat` browser UI route is enabled yet because web-chat has no frontend tool runtime.
- [x] T5.2 Replace chat-overlay `internal/frontendtools` imports with Pinocchio package imports.
- [x] T5.3 Update chat-overlay frontend protocol decoders if proto names change: no TS decoder change required because event names and protojson field shapes stayed stable.
- [x] T5.4 Run chat-overlay browser smoke tests.

## Delivery

- [x] T6.1 Update diary after each implementation slice.
- [x] T6.2 Update changelog/file relations.
- [x] T6.3 Run doctor and upload final updated bundle if requested.
