# Tasks

## Completed research and delivery

- [x] Create ticket workspace for Buf module publication design.
- [x] Gather repository evidence from Pinocchio proto/Buf files and chat-provider WebSocket decoder files.
- [x] Capture relevant Buf documentation into ticket sources.
- [x] Validate a proposed v2 named-module Buf configuration against the current Pinocchio checkout.
- [x] Write intern-facing analysis, design, and implementation guide.
- [x] Write investigation diary.
- [x] Relate key files and update changelog.
- [x] Upload the design bundle to reMarkable.

## Implementation work plan

### Phase 1: Pin down publication decisions

- [x] Record the intended BSR module name as `buf.build/go-go-golems/pinocchio-chatapp` in ticket and Pinocchio docs.
- [x] Record default label policy: use `main` for the moving default label and mirror Git tags for release labels.
- [x] Record visibility policy: default to public if the `go-go-golems` BSR organization permits it; otherwise use private until owner confirms.
- [x] Identify non-automatable operator step: create/configure the BSR module and provide a `BUF_TOKEN` GitHub secret.

### Phase 2: Update Pinocchio schema publishing configuration

- [x] Change `pinocchio/buf.yaml` from v1 local config to v2 workspace config with a named module.
- [x] Remove unnecessary `buf.build/google/protobuf` dependency because only Well-Known Types are imported.
- [x] Run `buf dep update`, `buf format --diff --exit-code`, `buf lint`, and `buf build` in Pinocchio.
- [x] Verify `buf.lock` is intentionally absent after dependency cleanup (`buf dep update` reported no configured dependencies).
- [x] Commit the Pinocchio Buf config change: `534322c Configure chatapp protos as Buf module`.

### Phase 3: Add Pinocchio CI for Buf checks and BSR publishing

- [x] Add `.github/workflows/buf-ci.yaml` using `bufbuild/buf-action@v1`.
- [x] Pin the Buf CLI version to the locally validated version (`1.55.1`).
- [x] Configure PR checks for build/lint/format/breaking checks through the Buf action defaults.
- [x] Configure push publishing for named modules using `${{ secrets.BUF_TOKEN }}`.
- [x] Restrict workflow path filters to proto, Buf config, docs/license, and workflow changes.
- [x] Commit the Pinocchio CI workflow: `19fda9c Add Buf CI publishing workflow`.

### Phase 4: Add Pinocchio operator documentation

- [x] Add a Pinocchio docs page explaining chatapp proto ownership and BSR publishing.
- [x] Include local validation commands.
- [x] Include one-time BSR module creation command.
- [x] Include manual push command and release-label examples.
- [x] Include schema compatibility rules for protobuf evolution.
- [x] Commit the Pinocchio documentation: `3c66ec9 Document chatapp Buf module publishing`.

### Phase 5: Validate generated TypeScript coverage

- [x] Run the existing web generation template against the updated Buf configuration.
- [x] Confirm generated TypeScript includes `chat`, `rpc`, `frontendtools`, and `widgets` schema files.
- [x] Fix generation-template output directories so v2 module-root generation preserves existing `proto/...` output layout.
- [x] Run Go and web validation, including pre-commit hooks.
- [x] Commit the generation-template and generated-output change: `d525dc6 Align chatapp codegen with Buf module root`.

### Phase 6: Attempt/prepare BSR publication

- [x] Check whether local Buf registry authentication is available without exposing secrets.
- [ ] Create or verify `buf.build/go-go-golems/pinocchio-chatapp` in the BSR. Blocked: local Buf CLI is not logged in.
- [ ] Run `buf push --label main --git-metadata`. Blocked: module does not exist and local Buf CLI is not logged in.
- [x] Document exact operator commands for the blocked BSR creation/push step.
- [ ] Record the BSR commit ID after an authorized operator push succeeds.

### Phase 7: Ticket bookkeeping and delivery

- [x] Update the CHATOVERLAY-014 design guide with implementation results and deviations from the original plan.
- [x] Add diary entries for each implementation phase, including commands and failures.
- [x] Relate modified Pinocchio files to the ticket docs.
- [x] Update the changelog after committed implementation slices.
- [x] Run `docmgr doctor --ticket CHATOVERLAY-014 --stale-after 30`.
- [x] Upload the updated ticket bundle to reMarkable after implementation notes are complete.
- [x] Commit ticket documentation updates in the overlay repo.
