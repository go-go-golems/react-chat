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
- [x] Create or verify `buf.build/go-go-golems/pinocchio-chatapp` in the BSR.
- [x] Run `buf push --label main` after `--git-metadata` failed because no branch/tag pointed at HEAD.
- [x] Document exact operator commands and the `--git-metadata` caveat.
- [x] Record the BSR commit ID: `3b26b3452d1446a3872293fedb3b731f`.

### Phase 7: Ticket bookkeeping and delivery

- [x] Update the CHATOVERLAY-014 design guide with implementation results and deviations from the original plan.
- [x] Add diary entries for each implementation phase, including commands and failures.
- [x] Relate modified Pinocchio files to the ticket docs.
- [x] Update the changelog after committed implementation slices.
- [x] Run `docmgr doctor --ticket CHATOVERLAY-014 --stale-after 30`.
- [x] Upload the updated ticket bundle to reMarkable after implementation notes are complete.
- [x] Commit ticket documentation updates in the overlay repo.

### Phase 8: Move Buf token delivery from GitHub Secrets to Vault OIDC

- [x] Store the locally supplied `BUF_TOKEN` in Vault at `kv/ci/buf/pinocchio-chatapp` without printing the token.
- [x] Add Terraform source for a package-specific Vault policy and GitHub Actions JWT role.
- [x] Apply the Vault policy and JWT role directly with the Vault CLI because Terraform plan could not access the S3 backend credentials locally.
- [x] Patch Pinocchio `buf-ci.yaml` to request `id-token: write`, read the Buf token with `hashicorp/vault-action@v3`, and pass `${{ env.BUF_TOKEN }}` to `bufbuild/buf-action@v1`.
- [x] Initially restrict Vault token retrieval and BSR push to `push` events on `refs/heads/main`.
- [x] Disable Buf label archive for now because no delete-event Vault role is configured.
- [x] Update Pinocchio operator docs to describe the Vault-backed Buf token flow.
- [x] Commit Pinocchio workflow/docs changes and Terraform source changes.
- [x] Replace the initial `main`-push publishing policy with release-only proto-diff publishing.

### Phase 9: Gate BSR publishing on schema-changing releases

- [x] Verify `@go-go-golems/chat-provider@0.1.1` and `@go-go-golems/chat-overlay@0.1.1` are already published on npm's `next` dist-tag.
- [x] Update Pinocchio `cmd/web-chat/web/package.json` to consume `@go-go-golems/chat-provider` from npm instead of a local file dependency.
- [x] Validate the npm dependency switch with `npm run typecheck` and `npm run build`.
- [x] Change Pinocchio Buf CI to trigger publishing on `release: published` instead of `main` pushes.
- [x] Add a release-time `proto/**/*.proto` diff gate against the previous non-draft GitHub release.
- [x] Read the Vault Buf token only when the release contains proto changes.
- [x] Set `breaking_against_registry: true` so PR breaking checks compare against the published BSR baseline.
- [x] Update live Vault role and Terraform source to bind the Buf token to release tag events (`refs/tags/v*`).
- [x] Push the Pinocchio branch and confirm the replacement PR Buf run succeeds without secrets and without publishing.
- [x] Push the Terraform source update.
- [ ] Confirm a real release with no proto changes skips Vault and BSR push.
- [ ] Confirm a real release with proto changes authenticates to Vault and publishes to BSR.
