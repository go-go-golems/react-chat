# Tasks

## Design and implementation

- [x] Create CHATOVERLAY-015 ticket workspace.
- [x] Write design and implementation guide for private Redux context and chat-scoped hook names.
- [x] Replace chat-provider `useAppSelector` / `useAppDispatch` exports with `useChatSelector` / `useChatDispatch` / `useChatStore`.
- [x] Add private `ChatReduxContext` and render React-Redux Provider with `context={ChatReduxContext}`.
- [x] Update chat-overlay package call sites to `useChatSelector`.
- [x] Update Pinocchio web-chat call sites to `useChatSelector`.
- [x] Update TTC Garden Assistant call sites to `useChatSelector`.
- [x] Rebuild chat-provider dist for linked consumers.
- [x] Update Pinocchio package dependency/lockfile to local provider dist for this unpublished breaking API.

## Validation

- [x] Run chat-provider typecheck.
- [x] Run chat-provider tests.
- [x] Run chat-overlay typecheck.
- [x] Run Pinocchio web-chat typecheck.
- [x] Run Pinocchio web-chat focused unit tests.
- [x] Run TTC Garden Assistant typecheck.
- [x] Run TTC Garden Assistant focused unit tests.
- [x] Run Pinocchio hydration browser smoke.
- [x] Run Pinocchio web-chat browser smoke.
- [x] Run TTC Garden Assistant simple browser smoke.
- [x] Record attempted TTC failure-path smoke and reason it did not pass.
- [x] Prepare PR to publish `@go-go-golems/chat-provider@0.2.0` and `@go-go-golems/chat-overlay@0.2.0`.
- [ ] Merge PR and let the publish process release the new package versions.
- [ ] Switch Pinocchio back from local dist dependency to the new published semver after publish.
