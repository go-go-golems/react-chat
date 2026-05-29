# Tasks

## Phase 0: Recovery review and development hygiene

- [x] T1: Create Go module and wire into `go.work`.
- [x] T2: Create backend implementation review and recovery plan.
- [x] T3: Upload backend implementation review and recovery plan to reMarkable.
- [x] T4: Add a `web/go.mod` nested module or equivalent guard so `go test ./...` does not scan `web/node_modules`.
- [x] T5: Ensure `.gitignore` excludes frontend build artifacts and dependency directories (`web/node_modules/`, `web/dist/`, debug logs).

## Phase 1: Backend skeleton and canonical wiring

- [x] T6: Mount HTTP routes for create session, submit message, snapshot, stop, and WebSocket.
- [x] T7: Create sessionstream Hub, schema registry, hydration store, and WebSocket transport.
- [x] T8: Register Pinocchio chatapp schemas and install chatapp projections.
- [ ] T9: Decide whether `--timeline-db` is in scope; either wire a file-backed SQLite hydration store or remove/document the flag as in-memory-only.
- [x] T10: Split `internal/webchat/server.go` into server wiring, handlers, helpers, and mock engine packages.

## Phase 2: Widget schemas and projections

- [x] T11: Create protobuf schema for widget lifecycle events, widget action command, and widget timeline entity.
- [x] T12: Generate Go protobuf types under `internal/pb`.
- [x] T13: Implement widget `ChatPlugin` schema registration.
- [x] T14: Implement widget UI projection for live WebSocket delivery.
- [x] T15: Fix widget timeline projection patch semantics so durable snapshots match live streamed widget state.
- [ ] T16: Add projection tests for started, patched, completed, and removed widget events.

## Phase 3: Mock engine command path

- [x] T17: Create `internal/mockengine` package with `Engine`, `Run`, active run map, response catalog, and event publisher helpers.
- [x] T18: Register custom mock start and stop commands with both the schema registry and Hub command registry.
- [x] T19: Use `context.WithoutCancel` for asynchronous event publishing so runs outlive the HTTP request context.
- [x] T20: Implement active run replacement and cancellation semantics equivalent to Pinocchio's `chatapp.Engine`.
- [x] T21: Add `WaitIdle(ctx, sid)` to the mock engine for tests and smoke scripts.
- [x] T22: Log asynchronous publish failures with session id, message id, event name, and prompt.

## Phase 4: Mock response coverage

- [x] T23: Implement plain text mock response.
- [x] T24: Implement single widget mock response (`show me boots` -> `ProductCarousel`).
- [x] T25: Implement cart review mock response (`review my cart` -> `CartReview`).
- [x] T26: Implement checkout nudge mock response (`checkout` -> `CheckoutNudge`).
- [x] T27: Implement streaming widget response where product cards appear incrementally and hydrate correctly.
- [x] T28: Implement error scenario (`error test`) that publishes `ChatRunFailed`.
- [x] T29: Implement cancellation scenario (`long response` + stop) that publishes `ChatRunStopped`.

## Phase 5: Backend tests and validation

- [x] T30: Add server or Hub-level tests for create session + submit prompt + snapshot.
- [x] T31: Add test that `show me boots` produces user message, assistant message, and `ChatWidgetInstance` snapshot entity.
- [ ] T32: Add test that WebSocket subscribe receives snapshot first and live events after submit.
- [x] T33: Add test that stop cancels the custom mock run, not only Pinocchio's default engine run.
- [x] T34: Add smoke script or Makefile target for backend validation.
- [x] T35: Run `go test ./...` cleanly from the project root.

## Phase 6: Frontend foundation already created, backend integration pending

- [x] T36: Create React/Vite project under `web/`.
- [x] T37: Add Tailwind and retro Mac OS 1 monochrome theme.
- [x] T38: Implement Redux Toolkit store for overlay state and timeline entities.
- [x] T39: Implement sessionstream WebSocket protocol and hydration handling based on Pinocchio `web-chat`.
- [x] T40: Implement chat overlay API (`createChatOverlay`, provider, hook).
- [x] T41: Implement `ChatBubble`, `ChatPanel`, `ChatMessages`, and `ChatComposer`.
- [x] T42: Implement widget registry, `WidgetOutlet`, and unknown widget fallback.
- [x] T43: Implement ecommerce widget renderers (`ProductCarousel`, `CartReview`, `CheckoutNudge`).
- [x] T44: Add Storybook stories for overlay and widget states.
- [x] T45: Re-test live frontend flow after backend mock engine is fixed.
- [ ] T46: Embed frontend build in Go binary with `go:embed`.
