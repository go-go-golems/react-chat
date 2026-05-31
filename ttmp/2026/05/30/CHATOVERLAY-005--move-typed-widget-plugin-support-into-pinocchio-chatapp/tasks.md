# Tasks

## Documentation and package planning

- [x] T1.1 Create ticket workspace.
- [x] T1.2 Write typed widget migration design.
- [x] T1.3 Write initial investigation diary.
- [x] T1.4 Relate source files and upload design bundle to reMarkable.

## Phase 1: Pinocchio widget protobuf contract

- [x] T2.1 Create Pinocchio widget proto package.
- [x] T2.2 Move/rename widget lifecycle messages and status enum.
- [x] T2.3 Preserve event names or add compatibility aliases.
- [x] T2.4 Generate Go code.

## Phase 2: Pinocchio widget Go package

- [x] T3.1 Create `pinocchio/pkg/chatapp/widgets`.
- [x] T3.2 Move WidgetPlugin schema registration.
- [x] T3.3 Move UI projection for widget lifecycle events.
- [x] T3.4 Move timeline projection and patch merge logic.
- [x] T3.5 Add optional publish helper functions for start/patch/complete/remove.

## Phase 3: Tests

- [x] T4.1 Test started event creates widget entity.
- [x] T4.2 Test patched event merges props.
- [x] T4.3 Test completed event updates status.
- [x] T4.4 Test removed event tombstones entity.
- [x] T4.5 Test unknown event is not handled.

## Phase 4: App/frontend migrations

- [x] T5.1 Replace chat-overlay `internal/widgets` imports with Pinocchio widget package.
- [x] T5.2 Update chat-overlay generated protobuf imports.
- [x] T5.3 Add generic widget-instance renderer support to Pinocchio web-chat.
- [x] T5.4 Keep app-specific agent-mode and ecommerce widgets outside Pinocchio core.
- [x] T5.5 Run chat-overlay widget smoke and web-chat frontend tests.

## Delivery

- [x] T6.1 Update diary after each implementation slice.
- [x] T6.2 Update changelog/file relations.
- [x] T6.3 Run doctor and upload final updated bundle if requested.
