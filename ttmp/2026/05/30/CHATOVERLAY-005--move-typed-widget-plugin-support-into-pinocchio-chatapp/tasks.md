# Tasks

## Documentation and package planning

- [x] T1.1 Create ticket workspace.
- [x] T1.2 Write typed widget migration design.
- [x] T1.3 Write initial investigation diary.
- [x] T1.4 Relate source files and upload design bundle to reMarkable.

## Phase 1: Pinocchio widget protobuf contract

- [ ] T2.1 Create Pinocchio widget proto package.
- [ ] T2.2 Move/rename widget lifecycle messages and status enum.
- [ ] T2.3 Preserve event names or add compatibility aliases.
- [ ] T2.4 Generate Go code.

## Phase 2: Pinocchio widget Go package

- [ ] T3.1 Create `pinocchio/pkg/chatapp/widgets`.
- [ ] T3.2 Move WidgetPlugin schema registration.
- [ ] T3.3 Move UI projection for widget lifecycle events.
- [ ] T3.4 Move timeline projection and patch merge logic.
- [ ] T3.5 Add optional publish helper functions for start/patch/complete/remove.

## Phase 3: Tests

- [ ] T4.1 Test started event creates widget entity.
- [ ] T4.2 Test patched event merges props.
- [ ] T4.3 Test completed event updates status.
- [ ] T4.4 Test removed event tombstones entity.
- [ ] T4.5 Test unknown event is not handled.

## Phase 4: App/frontend migrations

- [ ] T5.1 Replace chat-overlay `internal/widgets` imports with Pinocchio widget package.
- [ ] T5.2 Update chat-overlay generated protobuf imports.
- [ ] T5.3 Add generic widget-instance renderer support to Pinocchio web-chat.
- [ ] T5.4 Keep app-specific agent-mode and ecommerce widgets outside Pinocchio core.
- [ ] T5.5 Run chat-overlay widget smoke and web-chat frontend tests.

## Delivery

- [ ] T6.1 Update diary after each implementation slice.
- [ ] T6.2 Update changelog/file relations.
- [ ] T6.3 Run doctor and upload final updated bundle if requested.
