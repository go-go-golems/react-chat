# Tasks

## Documentation and package planning

- [x] T1.1 Create ticket workspace.
- [x] T1.2 Write common backend extraction design.
- [x] T1.3 Write initial investigation diary.
- [x] T1.4 Relate source files and upload design bundle to reMarkable.

## Phase 1: Shared store and cleanup primitives

- [x] T2.1 Create `pinocchio/pkg/chatapp/serverkit` package.
- [x] T2.2 Add `StoreOptions` with timeline and turn-store settings.
- [x] T2.3 Add `OpenHydrationStore(...)` for in-memory or SQLite sessionstream hydration.
- [x] T2.4 Add `OpenTurnStore(...)` for disabled, in-memory, or SQLite final-turn storage.
- [x] T2.5 Add `OpenStores(...)` and `CloseAll(...)` cleanup helpers.
- [x] T2.6 Add `MemoryTurnStore` for apps that want process-local history without SQLite.
- [x] T2.7 Add unit tests for memory turns, SQLite turns reopen, and SQLite hydration creation.

## Phase 2: Migrate chat-overlay onto serverkit stores

- [x] T3.1 Replace chat-overlay local memory turn store with `serverkit.MemoryTurnStore`.
- [x] T3.2 Replace chat-overlay local turn-store open helper with `serverkit.OpenTurnStore`.
- [x] T3.3 Replace chat-overlay local hydration-store open helper with `serverkit.OpenHydrationStore`.
- [x] T3.4 Preserve `--timeline-db`, `--turns-db`, and `--turns-dsn` CLI behavior.
- [x] T3.5 Run chat-overlay `go test ./...` (frontend unchanged in this slice).

## Phase 3: Migrate Pinocchio web-chat onto serverkit stores

- [x] T4.1 Replace `openWebChatTurnStore(...)` with `serverkit.OpenTurnStore`.
- [x] T4.2 Use `serverkit.StoreOptions` in web-chat startup for durable turns.
- [x] T4.3 Preserve current web-chat behavior when no turn DB/DSN is configured.
- [x] T4.4 Run focused web-chat tests.

## Phase 4: Migrate CoinVault / 2026-03-16--gec-rag onto serverkit stores

- [x] T5.1 Replace `internal/webchat/sessionstream.NewHydrationStore(...)` implementation with a wrapper around `serverkit.OpenHydrationStore`.
- [x] T5.2 Replace `internal/webchat.NewTurnStore(...)` implementation with a wrapper around `serverkit.OpenTurnStore`.
- [x] T5.3 Preserve existing CLI flags and defaults.
- [x] T5.4 Run focused CoinVault tests.

## Phase 5: Shared contracts and future route extraction

- [ ] T6.1 Add `serverkit` HTTP contract structs for create/submit/snapshot/stop.
- [ ] T6.2 Add a route-handler extraction plan based on the results of store migration.
- [ ] T6.3 Decide whether full core route extraction should happen in this ticket or a follow-up.

## Delivery

- [ ] T7.1 Update diary after each implementation slice.
- [ ] T7.2 Update changelog and file relations.
- [ ] T7.3 Run `docmgr doctor --ticket CHATOVERLAY-003 --stale-after 30`.
- [ ] T7.4 Commit each coherent slice.
