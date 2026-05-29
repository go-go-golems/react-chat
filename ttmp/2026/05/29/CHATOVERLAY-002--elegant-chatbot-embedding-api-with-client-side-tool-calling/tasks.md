# Tasks

## Phase 1: Research and design

- [x] T1: Create CHATOVERLAY-002 ticket workspace.
- [x] T2: Search CopilotKit, Vercel AI SDK, assistant-ui, AG-UI, and generative UI prior art.
- [x] T3: Save downloaded source material with Defuddle under `sources/`.
- [x] T4: Attempt to export the last ChatGPT transcript with `surf chatgpt transcript` and store the result under `sources/`.
- [x] T5: Analyze the current chat overlay API and backend/frontend file structure.
- [x] T6: Write the design document for an elegant embedding API and client-side tool calling.
- [x] T7: Upload the design package to reMarkable.

## Phase 2: Frontend API foundation

- [ ] T8: Refactor `createChatOverlay()` into a runtime with `session`, `transport`, `widgets`, `tools`, and `context` namespaces.
- [ ] T9: Add object-form `defineWidget({ name, props, render })` with Zod prop validation.
- [ ] T10: Add `defineToolkit()` for bundling widgets, tools, context providers, and presets.
- [ ] T11: Add `mountChatOverlay(target, config)` for non-React host pages.
- [ ] T12: Add unit tests for widget registry, toolkit registration, and runtime cleanup.

## Phase 3: Frontend tool registry and UI

- [ ] T13: Implement `ToolRegistry` with scoped registration, availability, and manifest generation.
- [ ] T14: Implement `useFrontendTool()` for browser-executed tools.
- [ ] T15: Implement `useHumanTool()` for approval/form tools that pause until `respond()`.
- [ ] T16: Implement `defineToolUI()` for backend tool visualization.
- [ ] T17: Implement `ToolCallOutlet` and fallback tool renderer.
- [ ] T18: Add Storybook stories for running, complete, failed, cancelled, and human approval tools.

## Phase 4: Protocol schemas and sessionstream plugin

- [ ] T19: Add `proto/chatoverlay/tools/v1/frontend_tool.proto`.
- [ ] T20: Generate Go and TypeScript protobuf types.
- [ ] T21: Add manifest command and result command handlers.
- [ ] T22: Add frontend tool call events and timeline entity projections.
- [ ] T23: Add backend tests for manifest update, requested tool call, result submission, failure, and cancellation.

## Phase 5: Pinocchio/Geppetto bridge

- [ ] T24: Design and implement a Pinocchio-level frontend tool executor.
- [ ] T25: Connect frontend tool descriptors to model tool definitions.
- [ ] T26: Publish `FrontendToolCallRequested` when the model calls a browser tool.
- [ ] T27: Wait for `FrontendToolResultCommand` and feed the result back into the Geppetto tool loop.
- [ ] T28: Propagate run stop/cancel to pending frontend tool calls and frontend AbortSignals.
- [ ] T29: Add integration tests covering model -> frontend tool -> backend resume -> final answer.

## Phase 6: End-to-end validation and polish

- [ ] T30: Add browser test for automatic frontend tool execution.
- [ ] T31: Add browser test for human approval tool execution.
- [ ] T32: Test refresh/reconnect while a human tool is pending.
- [ ] T33: Add documentation examples for ecommerce (`cart.add`, `checkout.confirm`, `navigate.product`).
- [ ] T34: Upload final implementation guide and API reference to reMarkable.
