---
Title: Publishing Pinocchio chatapp protobuf definitions as a Buf module
Ticket: CHATOVERLAY-014
Status: active
Topics:
    - protobuf
    - websocket
    - chat-provider
    - pinocchio
    - buf
DocType: design-doc
Intent: long-term
Owners: []
RelatedFiles:
    - Path: ../../../../../../../pinocchio/.github/workflows/buf-ci.yaml
      Note: Added Buf CI/BSR publishing workflow (commit 19fda9c)
    - Path: ../../../../../../../pinocchio/buf.chatapp.gen.yaml
      Note: Adjusted Go codegen output for v2 module-root semantics (commit d525dc6)
    - Path: ../../../../../../../pinocchio/buf.chatapp.web.gen.yaml
      Note: |-
        Current TypeScript generation template for chatapp schemas
        Adjusted TS codegen output and generated frontendtools/widgets schemas (commit d525dc6)
    - Path: ../../../../../../../pinocchio/buf.yaml
      Note: |-
        Current Pinocchio Buf workspace config and target for named BSR module migration
        Implemented v2 named Buf module configuration (commit 534322c)
    - Path: ../../../../../../../pinocchio/cmd/web-chat/web/src/generated/chatapp/proto/pinocchio/chatapp/frontendtools/v1/frontend_tool_pb.ts
      Note: New generated TypeScript schema coverage for frontend tools (commit d525dc6)
    - Path: ../../../../../../../pinocchio/cmd/web-chat/web/src/generated/chatapp/proto/pinocchio/chatapp/widgets/v1/widget_pb.ts
      Note: New generated TypeScript schema coverage for widgets (commit d525dc6)
    - Path: ../../../../../../../pinocchio/docs/chatapp-protobuf.md
      Note: Added operator documentation for BSR publishing and compatibility rules (commit 3c66ec9)
    - Path: ../../../../../../../pinocchio/proto/pinocchio/chatapp/rpc/v1/rpc.proto
      Note: RPC and WebSocket frame schemas using protobuf Any
    - Path: ../../../../../../../pinocchio/proto/pinocchio/chatapp/v1/chat.proto
      Note: Core chat runtime protobuf schemas to publish
    - Path: packages/chat-provider/src/ws/protocol.ts
      Note: Current WebSocket normalization and payload unwrapping behavior
    - Path: packages/chat-provider/src/ws/timelineEvents.ts
      Note: Current structural payload adapters that generated schemas should eventually inform
ExternalSources:
    - https://buf.build/docs/bsr/module/publish/
    - https://buf.build/docs/bsr/module/dependency-management/
    - https://buf.build/docs/configuration/v2/buf-yaml/
    - https://buf.build/docs/bsr/ci-cd/github-actions/
Summary: Design and implementation guide for publishing Pinocchio chatapp protobuf definitions as a Buf Schema Registry module so React chat packages can generate authoritative TypeScript schemas without vendoring Pinocchio.
LastUpdated: 2026-06-01T20:35:00-04:00
WhatFor: Use this when implementing BSR publishing for Pinocchio chatapp protos or when wiring chat-provider/chatapp-proto consumers to generated protobuf schemas.
WhenToUse: Use before changing Pinocchio buf configuration, adding Buf CI, publishing the BSR module, or replacing local/generated schema copies in React chat packages.
---



# Publishing Pinocchio chatapp protobuf definitions as a Buf module

## Executive summary

The React chat overlay work needs generated TypeScript protobuf schemas for WebSocket payloads. Those payloads are defined in Pinocchio `.proto` files, but the reusable `@go-go-golems/chat-provider` package should not depend on a full Pinocchio source checkout or a Git submodule. A Buf Schema Registry module gives us a narrow, versioned schema dependency: consumers can generate TypeScript from the published protobuf definitions without copying the Pinocchio repository.

This guide proposes publishing the current Pinocchio chatapp proto tree as a BSR module named `buf.build/go-go-golems/pinocchio-chatapp`. Pinocchio remains the source of truth for the schema files. Buf becomes the distribution mechanism. React packages can then either generate directly from the BSR module or depend on a small generated npm package such as `@go-go-golems/chatapp-proto`.

The implementation has three layers:

1. **Pinocchio schema publication**: migrate or augment `pinocchio/buf.yaml` so it declares a named Buf module and can be pushed to the BSR.
2. **CI enforcement and publishing**: add a Buf GitHub Actions workflow that builds/lints/checks breaking changes on pull requests and pushes named modules to the BSR on accepted pushes.
3. **React consumer integration**: update chat-provider or a generated schema package to consume the published module, generate TypeScript schemas, and use those schemas in WebSocket payload decoders.

The recommended first deliverable is small and concrete: publish the four current `pinocchio/proto/pinocchio/chatapp/**` files as one public module, pin the Buf CLI in CI, add a `buf.lock`, and document the exact generation command for TypeScript consumers.

## Background for a new intern

### What protobuf is doing in this system

Protocol Buffers define typed messages in `.proto` files. Go code uses generated Go structs from those files. TypeScript code can use generated TypeScript descriptors from the same files. When both sides generate from the same schema, field names, enums, optional fields, and nested structures stay consistent.

In this codebase, Pinocchio owns the chat runtime and emits WebSocket payloads. The React chat overlay receives those payloads and renders messages, tools, widgets, and app-specific cards. The problem is not that the data is unstructured on the backend; the problem is that parts of the frontend currently treat payloads structurally, reading fields such as `payload.messageId` or `payload.status` directly instead of decoding against generated schemas.

### What a Buf module is

A Buf module is a package of `.proto` files hosted in the Buf Schema Registry. It is similar in spirit to an npm package, but for protobuf schemas.

A module gives consumers:

- a stable name such as `buf.build/go-go-golems/pinocchio-chatapp`,
- dependency resolution through `buf.yaml` and `buf.lock`,
- reproducible code generation from a module reference,
- registry-side docs and dependency metadata,
- breaking-change checks before schema changes are accepted.

The important distinction is that a Buf module publishes only the schema surface, not all of Pinocchio. This is the clean alternative to adding Pinocchio as a Git submodule inside `chat-provider`.

### What the Buf Schema Registry is

The Buf Schema Registry, abbreviated BSR, stores named protobuf modules. A local repository pushes a named module with `buf push`. Other repositories can depend on that module by declaring it under `deps` or by using it as the input to `buf generate`.

Buf's publish documentation states that a named module is connected to a BSR repository through `modules.name` in `buf.yaml`, then pushed with `buf push`. The same documentation says the files pushed include `buf.yaml`, `buf.lock`, README/license/docs, and all `.proto` files. The dependency documentation says consumers declare external modules in `buf.yaml` under `deps`, while `buf.lock` records exact commits and digests.

## Current-state architecture and evidence

### Repository layout

The workspace currently has the React chat overlay repository and a sibling Pinocchio checkout:

```text
/home/manuel/workspaces/2026-05-29/chatbot-react/
  2026-05-29--chatbot-overlay-glm/   # React chat overlay package repo
  pinocchio/                          # Pinocchio backend/app repo
```

The overlay repository already depends on Pinocchio in Go and uses a local replace directive during development:

- `/home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/go.mod:8` requires `github.com/go-go-golems/pinocchio v0.11.0`.
- `/home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/go.mod:145` replaces that module with `../pinocchio` locally.

That local replacement is useful for Go development, but it is not an appropriate distribution model for an npm package. The frontend packages need a schema artifact that can be consumed independently of a sibling checkout.

### Current Pinocchio proto source

Pinocchio currently has exactly four chatapp proto files:

```text
pinocchio/proto/pinocchio/chatapp/v1/chat.proto
pinocchio/proto/pinocchio/chatapp/rpc/v1/rpc.proto
pinocchio/proto/pinocchio/chatapp/frontendtools/v1/frontend_tool.proto
pinocchio/proto/pinocchio/chatapp/widgets/v1/widget.proto
```

The package declarations are:

- `pinocchio.chatapp.v1` in `chat.proto`.
- `pinocchio.chatapp.rpc.v1` in `rpc.proto`.
- `pinocchio.chatapp.frontendtools.v1` in `frontend_tool.proto`.
- `pinocchio.chatapp.widgets.v1` in `widget.proto`.

The frontend tools and widgets proto files import `google/protobuf/struct.proto`; the RPC proto imports `google/protobuf/any.proto`. These are protobuf Well-Known Types, which Buf can resolve without vendoring the files.

### Current Pinocchio Buf configuration

Pinocchio already uses Buf, but the current config is a v1 local workspace config:

```yaml
# /home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/buf.yaml
version: v1
deps:
  - buf.build/google/protobuf
lint:
  use:
    - STANDARD
  except:
    - PACKAGE_DIRECTORY_MATCH
    - PACKAGE_VERSION_SUFFIX
    - DIRECTORY_SAME_PACKAGE
breaking:
  use:
    - FILE
```

Evidence:

- `pinocchio/buf.yaml:1-3` declares v1 config and `buf.build/google/protobuf` as a dependency.
- `pinocchio/buf.yaml:4-15` enables standard linting with selected exceptions and FILE-level breaking checks.
- `buf build` and `buf lint` both pass in the current Pinocchio checkout with Buf CLI `1.55.1`.

Pinocchio also has separate generation templates:

```yaml
# /home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/buf.chatapp.gen.yaml
version: v1
plugins:
  - plugin: buf.build/protocolbuffers/go
    out: pkg/chatapp/pb
    opt:
      - paths=source_relative
```

```yaml
# /home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/buf.chatapp.web.gen.yaml
version: v1
plugins:
  - plugin: buf.build/bufbuild/es
    out: cmd/web-chat/web/src/generated/chatapp
    opt:
      - target=ts
      - import_extension=none
```

Evidence:

- `pinocchio/buf.chatapp.gen.yaml:1-6` generates Go bindings into `pkg/chatapp/pb`.
- `pinocchio/buf.chatapp.web.gen.yaml:1-7` generates TypeScript descriptors into `cmd/web-chat/web/src/generated/chatapp`.
- The current checked-in generated TypeScript tree contains `rpc_pb.ts` and `chat_pb.ts`, and a search finds 45 exported `*Schema` descriptors under that generated directory.

### Current chat-provider frontend behavior

`@go-go-golems/chat-provider` is currently a reusable React package. Its package manifest has Redux and Zod dependencies, but no protobuf runtime dependency yet:

- `/home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/packages/chat-provider/package.json:25-29` lists runtime dependencies.
- `/home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/packages/chat-provider/package.json:30-33` lists dev dependencies.

The WebSocket protocol layer currently unwraps Any-like payloads by returning `payload.value` when present and otherwise returning the payload object:

- `packages/chat-provider/src/ws/protocol.ts:46-50` defines `unwrapAnyPayload`.
- `packages/chat-provider/src/ws/protocol.ts:73-81` normalizes `uiEvent.payload` by assigning only the unwrapped value to `payload`.

That means useful envelope metadata such as type URLs can be lost before adapters see the frame.

Timeline adapters currently read structural fields directly:

- `packages/chat-provider/src/ws/timelineEvents.ts:38-40` casts `frame.payload` to a record.
- `packages/chat-provider/src/ws/timelineEvents.ts:47-59` handles run events by reading `payload.status`.
- `packages/chat-provider/src/ws/timelineEvents.ts:71-123` handles chat messages by reading fields such as `messageId`, `role`, `content`, `text`, `status`, `mode`, and `final`.
- `packages/chat-provider/src/ws/timelineEvents.ts:153-190` handles widget events by reading `instanceId`, `widgetName`, `parentMessageId`, `props`, and patch fields.
- `packages/chat-provider/src/ws/timelineEvents.ts:216-243` handles frontend tool events by reading `toolCallId`, `toolName`, `messageId`, `mode`, `input`, `result`, and `error`.

This structural decoding works, but it duplicates knowledge already present in the `.proto` files. It also makes schema drift hard to catch.

### Prior ticket context

`CHATOVERLAY-012` already identified generated schema ownership as a blocker for provider-wide decoding:

- `CHATOVERLAY-012` recommends a shared schema package so `chat-provider` and Pinocchio web-chat do not reach into `cmd/web-chat/web/src/generated`.
- It lists `@gogo-golems/chatapp-proto` as a longer-term schema package option.
- It says provider core decoder packs need a packaging decision before importing generated schemas.
- It warns that provider imports of Pinocchio-only schemas can break the headless/generic package boundary.

This ticket narrows that open question: publish the authoritative Pinocchio chatapp proto source through Buf first, then generate consumer-facing packages from the BSR module.

## Problem statement

The team needs a stable way for React frontend packages to obtain protobuf schemas for Pinocchio chatapp WebSocket payloads.

The current choices are not ideal:

- **Copy generated TypeScript from Pinocchio**: easy initially, but the copy can drift and it is unclear which repo owns regeneration.
- **Reach into a sibling `../pinocchio` checkout**: works locally, but breaks package consumers and CI environments that do not have this workspace layout.
- **Add Pinocchio as a Git submodule to chat-provider**: provides source files, but couples a reusable npm package to an entire app/backend repo.
- **Handwrite TypeScript interfaces**: creates a parallel schema that will eventually diverge from Go protobuf definitions.

The desired state is a schema-first distribution path:

1. Pinocchio owns `.proto` definitions.
2. Pinocchio publishes those definitions to a versioned schema registry.
3. Frontend consumers generate code from the registry or from a generated npm package produced from the registry.
4. WebSocket decoders use generated schemas rather than handwritten structural mirrors.

## Scope

### In scope

This ticket covers:

- choosing a BSR module name and module boundary,
- updating Pinocchio Buf configuration to define a named module,
- adding local validation and CI commands,
- adding BSR publishing through GitHub Actions,
- defining how React packages consume the published module,
- defining tests and acceptance criteria,
- documenting the rollout sequence for a new intern.

### Out of scope

This ticket does not implement all chat-provider decoder registry work from `CHATOVERLAY-012`. It enables that work by solving schema distribution.

Out of scope for this ticket:

- converting every `chat-provider` timeline adapter to generated decoding,
- changing WebSocket transport from JSON/protojson to binary protobuf,
- redesigning Pinocchio event names or snapshot semantics,
- publishing a final npm package version of `@go-go-golems/chatapp-proto` unless explicitly added as a follow-up.

## Design goals

The design should satisfy these goals:

1. **Authoritative source**: Pinocchio remains the owner of chatapp `.proto` files.
2. **Narrow dependency**: `chat-provider` should consume schemas, not the entire Pinocchio repository.
3. **Reproducibility**: CI and local developers should be able to regenerate TypeScript from pinned schema inputs.
4. **Breaking-change safety**: pull requests that modify `.proto` files should run Buf breaking checks.
5. **Intern-friendly workflow**: the commands and files should make it obvious where schemas live, how they are published, and how consumers generate code.
6. **Compatibility with existing code**: the rollout should not require immediate changes to live WebSocket behavior.

## Proposed architecture

### Recommended module boundary

Publish one BSR module:

```text
buf.build/go-go-golems/pinocchio-chatapp
```

The local module path should be:

```text
pinocchio/proto
```

The module should include all current chatapp proto files because the current proto tree contains only chatapp APIs. This keeps imports stable as `proto/pinocchio/chatapp/...` and avoids a narrower module path that would rewrite import roots.

Recommended `pinocchio/buf.yaml` shape:

```yaml
version: v2
modules:
  - path: proto
    name: buf.build/go-go-golems/pinocchio-chatapp
lint:
  use:
    - STANDARD
  except:
    - PACKAGE_DIRECTORY_MATCH
    - PACKAGE_VERSION_SUFFIX
    - DIRECTORY_SAME_PACKAGE
breaking:
  use:
    - FILE
```

Why remove `buf.build/google/protobuf` from `deps`? The current imports are protobuf Well-Known Types (`google/protobuf/any.proto` and `google/protobuf/struct.proto`). Buf dependency docs state Well-Known Types are built into Buf and protobuf runtimes, so they should be imported directly without vendoring or declaring a dependency. If future protos import `googleapis` APIs that are not Well-Known Types, add the appropriate BSR dependency then.

A proposed config with this shape was tested with the current checkout:

```bash
cd /home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio
buf build --config ../2026-05-29--chatbot-overlay-glm/ttmp/2026/06/01/CHATOVERLAY-014--publish-chatapp-protobuf-definitions-as-a-buf-module/sources/proposed-pinocchio-buf-v2.yaml
buf lint --config ../2026-05-29--chatbot-overlay-glm/ttmp/2026/06/01/CHATOVERLAY-014--publish-chatapp-protobuf-definitions-as-a-buf-module/sources/proposed-pinocchio-buf-v2.yaml
```

Both commands completed without output, which is Buf's normal success behavior.

### System diagram

```text
                       schema source of truth
                              |
                              v
+-------------------------------------------------------------+
| Pinocchio repo                                               |
|                                                             |
|  proto/pinocchio/chatapp/**/*.proto                         |
|  buf.yaml with module name                                  |
|  buf.lock                                                   |
|  .github/workflows/buf-ci.yaml                              |
+----------------------------+--------------------------------+
                             |
                             | buf push --label main --git-metadata
                             v
+-------------------------------------------------------------+
| Buf Schema Registry                                          |
|                                                             |
|  buf.build/go-go-golems/pinocchio-chatapp                   |
|  - immutable schema commits                                 |
|  - labels such as main and release tags                     |
|  - generated docs and dependency metadata                   |
+----------------------------+--------------------------------+
                             |
          +------------------+------------------+
          |                                     |
          | buf generate from module            | buf generate from module
          v                                     v
+------------------------------+    +------------------------------+
| @go-go-golems/chatapp-proto  |    | Pinocchio web-chat           |
| generated TS schemas         |    | generated TS schemas         |
+---------------+--------------+    +------------------------------+
                |
                | imports descriptors such as ChatTextPatchSchema
                v
+-------------------------------------------------------------+
| @go-go-golems/chat-provider                                |
| decoder registry + generated protobuf JSON decoders         |
+-------------------------------------------------------------+
```

### Runtime data-flow diagram

Publishing the Buf module does not change the WebSocket runtime by itself. It changes how frontend code obtains the schemas used by decoders.

```text
Backend runtime event
  -> Go protobuf message
  -> protojson / Any JSON envelope
  -> WebSocket frame
  -> chat-provider normalizeServerFrame
  -> preserve Any envelope metadata
  -> payload decoder registry lookup
  -> @bufbuild/protobuf fromJson(generatedSchema, rawPayload)
  -> typed message object
  -> timeline adapter projection
  -> Redux timeline entity
  -> React overlay rendering
```

The BSR module affects this step:

```text
@generatedSchema = generated from buf.build/go-go-golems/pinocchio-chatapp
```

## API and command references

### Buf CLI commands for the publisher

Create the BSR module once:

```bash
buf registry module create buf.build/go-go-golems/pinocchio-chatapp \
  --visibility public \
  --default-label-name main
```

Alternative: create on first push:

```bash
buf push --create --create-visibility public --create-default-label main
```

Local validation before pushing:

```bash
cd /home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio
buf dep update
buf format -w
buf lint
buf build
```

Push manually after login:

```bash
buf registry login
buf push --label main --git-metadata
```

For release tags, push with both the default branch label and the release label if needed:

```bash
buf push --label main --label v0.11.0 --git-metadata
```

Check a breaking change locally against the registry after the first publish:

```bash
buf breaking --against-registry
```

If running before the first publish, compare against a Git ref instead:

```bash
buf breaking . --against 'https://github.com/go-go-golems/pinocchio.git#format=git,branch=main'
```

### Buf CLI commands for consumers

Generate directly from the BSR module using a local template:

```bash
buf generate buf.build/go-go-golems/pinocchio-chatapp \
  --template buf.chatapp.web.gen.yaml
```

A consumer generation template for a dedicated npm package could look like this:

```yaml
version: v2
clean: true
plugins:
  - remote: buf.build/bufbuild/es
    out: src/generated
    opt:
      - target=ts
      - import_extension=none
inputs:
  - module: buf.build/go-go-golems/pinocchio-chatapp
```

A consumer can also declare a dependency if its own protos import Pinocchio protos:

```yaml
version: v2
modules:
  - path: proto
    name: buf.build/go-go-golems/some-consumer
deps:
  - buf.build/go-go-golems/pinocchio-chatapp:main
```

Then resolve and pin exact digests:

```bash
buf dep update
```

### Generated TypeScript decoder API sketch

The frontend decoder registry from `CHATOVERLAY-012` can consume generated descriptors after the schema package exists.

```ts
import { fromJson, type GenMessage, type MessageShape } from '@bufbuild/protobuf';
import { ChatTextPatchSchema } from '@go-go-golems/chatapp-proto/pinocchio/chatapp/v1/chat_pb';

export type PayloadDecoder<T = unknown> = {
  name: string;
  schemaName: string;
  eventNames?: string[];
  entityKinds?: string[];
  typeUrls?: string[];
  decode(raw: unknown): T;
};

export function protobufJsonDecoder<Desc extends GenMessage>(args: {
  name: string;
  schema: Desc;
  eventNames?: string[];
  entityKinds?: string[];
  typeUrls?: string[];
}): PayloadDecoder<MessageShape<Desc>> {
  return {
    name: args.name,
    schemaName: args.schema.typeName,
    eventNames: args.eventNames,
    entityKinds: args.entityKinds,
    typeUrls: args.typeUrls,
    decode(raw) {
      return fromJson(args.schema, raw as any, { ignoreUnknownFields: true });
    },
  };
}

export const coreChatPayloadDecoders = [
  protobufJsonDecoder({
    name: 'chat-provider.chat-text-patch',
    schema: ChatTextPatchSchema,
    eventNames: ['ChatTextPatch'],
    typeUrls: ['type.googleapis.com/pinocchio.chatapp.v1.ChatTextPatch'],
  }),
];
```

The key idea for the intern: Buf does not directly generate the decoder registry. Buf generates the schema descriptors. The project writes small decoder registrations that map WebSocket event names, snapshot entity kinds, and Any type URLs to those generated descriptors.

## Detailed implementation guide

### Phase 0: Confirm access and naming

Ask the project owner to confirm:

- BSR organization: `go-go-golems`.
- Module name: `pinocchio-chatapp`.
- Visibility: public or private.
- Default label: `main`.
- GitHub secret name for BSR token: `BUF_TOKEN`.

Recommended decision:

```text
Module:     buf.build/go-go-golems/pinocchio-chatapp
Visibility: public, unless chat schemas are intentionally private
Default:    main
Tags:       mirror Git release tags such as v0.11.0
```

Use a separate `pinocchio-chatapp` module instead of a generic `pinocchio` module because consumers are specifically depending on chatapp schemas. If Pinocchio later gains unrelated proto surfaces, those can become separate modules.

### Phase 1: Update Pinocchio Buf config

Edit:

```text
/home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/buf.yaml
```

Replace v1 config with v2 named module config:

```yaml
version: v2
modules:
  - path: proto
    name: buf.build/go-go-golems/pinocchio-chatapp
lint:
  use:
    - STANDARD
  except:
    - PACKAGE_DIRECTORY_MATCH
    - PACKAGE_VERSION_SUFFIX
    - DIRECTORY_SAME_PACKAGE
breaking:
  use:
    - FILE
```

Then run:

```bash
cd /home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio
buf dep update
buf format -w
buf lint
buf build
```

Expected results:

- `buf lint` exits zero.
- `buf build` exits zero.
- `buf.lock` exists and is checked in if Buf creates or updates it.

If `buf dep update` removes the old `google/protobuf` dependency, that is expected for the current imports because they are Well-Known Types. If future imports require `googleapis`, add the exact module under `deps`.

### Phase 2: Ensure generation templates still work locally

Run existing generation commands in Pinocchio:

```bash
cd /home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio
buf generate --template buf.chatapp.gen.yaml
buf generate --template buf.chatapp.web.gen.yaml
```

Then inspect generated files:

```bash
git status --short
find pkg/chatapp/pb -type f | sort
find cmd/web-chat/web/src/generated/chatapp -type f | sort
```

If frontend tools and widgets are still absent from the generated TypeScript tree, investigate whether generation was run with path restrictions in scripts or whether generated files are intentionally ignored. For typed provider decoders, the desired generated TypeScript set includes:

```text
proto/pinocchio/chatapp/v1/chat_pb.ts
proto/pinocchio/chatapp/rpc/v1/rpc_pb.ts
proto/pinocchio/chatapp/frontendtools/v1/frontend_tool_pb.ts
proto/pinocchio/chatapp/widgets/v1/widget_pb.ts
```

Do not silently accept missing generated files if provider decoders need those schemas. Either generate them or document that the first decoder slice is limited to schemas already generated from `chat.proto` and `rpc.proto`.

### Phase 3: Create and push the BSR module

Login once from a local developer machine:

```bash
buf registry login
```

Create the module:

```bash
buf registry module create buf.build/go-go-golems/pinocchio-chatapp \
  --visibility public \
  --default-label-name main
```

Push the current schemas:

```bash
cd /home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio
buf push --label main --git-metadata
```

Expected output shape:

```text
buf.build/go-go-golems/pinocchio-chatapp:<bsr-commit-id>
```

Record the BSR commit ID in the ticket changelog and, if useful, in Pinocchio release notes.

### Phase 4: Add CI publishing

Add a workflow in Pinocchio:

```text
/home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/.github/workflows/buf-ci.yaml
```

Recommended first workflow:

```yaml
name: Buf CI

on:
  push:
    paths:
      - '**.proto'
      - '**/buf.yaml'
      - '**/buf.lock'
      - '**/buf.md'
      - '**/README.md'
      - '**/LICENSE'
      - '.github/workflows/buf-ci.yaml'
  pull_request:
    types: [opened, synchronize, reopened, labeled, unlabeled]
    paths:
      - '**.proto'
      - '**/buf.yaml'
      - '**/buf.lock'
      - '**/buf.md'
      - '**/README.md'
      - '**/LICENSE'
      - '.github/workflows/buf-ci.yaml'
  delete:

permissions:
  contents: read
  pull-requests: write

jobs:
  buf:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: bufbuild/buf-action@v1
        with:
          version: '1.55.1'
          token: ${{ secrets.BUF_TOKEN }}
```

Why use `bufbuild/buf-action@v1`? Buf's GitHub Actions documentation says this single action runs build, lint, format, and breaking checks on pull requests, runs `buf push` for named modules on pushes, and archives BSR labels when Git branches/tags are deleted.

Why pin the Buf version? The local environment used Buf `1.55.1`. Pinning prevents CI behavior from changing unexpectedly. Later, update the pin deliberately.

### Phase 5: Add documentation in Pinocchio

Add a short schema-publishing section to Pinocchio docs, for example:

```text
/home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/docs/chatapp-protobuf.md
```

The document should include:

- where proto files live,
- the BSR module name,
- local validation commands,
- manual push command,
- how to generate Go and TypeScript bindings,
- compatibility rules for schema changes.

Suggested compatibility rules:

- adding a field with a new tag is normally safe,
- never reuse or repurpose field numbers,
- never rename enum values unless all consumers are updated,
- reserve removed field numbers and names,
- prefer additive changes for WebSocket payloads,
- run `buf breaking --against-registry` before merging.

### Phase 6: Create or update consumer generation

There are two consumer models.

#### Model A: generate directly in each consumer

`chat-provider` or Pinocchio web-chat can run:

```bash
buf generate buf.build/go-go-golems/pinocchio-chatapp \
  --template path/to/buf.chatapp.web.gen.yaml
```

This is simple, but it can duplicate generated output across repos.

#### Model B: publish a generated npm package

Create a small package, recommended name:

```text
@go-go-golems/chatapp-proto
```

Package shape:

```text
packages/chatapp-proto/
  package.json
  tsconfig.json
  buf.gen.yaml
  src/generated/proto/pinocchio/chatapp/v1/chat_pb.ts
  src/generated/proto/pinocchio/chatapp/rpc/v1/rpc_pb.ts
  src/generated/proto/pinocchio/chatapp/frontendtools/v1/frontend_tool_pb.ts
  src/generated/proto/pinocchio/chatapp/widgets/v1/widget_pb.ts
  src/index.ts
```

Package `package.json` sketch:

```json
{
  "name": "@go-go-golems/chatapp-proto",
  "version": "0.1.0",
  "type": "module",
  "sideEffects": false,
  "exports": {
    ".": "./src/index.ts",
    "./generated/*": "./src/generated/*"
  },
  "dependencies": {
    "@bufbuild/protobuf": "^2.0.0"
  },
  "devDependencies": {
    "typescript": "~6.0.2"
  },
  "scripts": {
    "generate": "buf generate",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  }
}
```

Consumer generation template:

```yaml
version: v2
clean: true
plugins:
  - remote: buf.build/bufbuild/es
    out: src/generated
    opt:
      - target=ts
      - import_extension=none
inputs:
  - module: buf.build/go-go-golems/pinocchio-chatapp
```

This package is the best long-term fit for `@go-go-golems/chat-provider`. `chat-provider` can depend on a small schema package without importing from Pinocchio web-chat internals.

### Phase 7: Wire into CHATOVERLAY-012 decoder work

After the BSR module exists, the decoder work can proceed without submodules.

Implementation sequence:

1. Add `@bufbuild/protobuf` and `@go-go-golems/chatapp-proto` as dependencies where generated decoding is needed.
2. Add the generic payload decoder registry in `chat-provider`.
3. Preserve `payloadEnvelope` metadata in normalized frames.
4. Register core decoders for provider-standard payloads.
5. Register Pinocchio-specific decoders from Pinocchio app extensions.
6. Convert one adapter at a time from structural reads to typed decoded payloads.
7. Keep structural fallback behavior for unknown payloads and forward compatibility.

Pseudocode:

```ts
const payloadDecoderRegistry = createPayloadDecoderRegistry();

for (const decoder of coreChatPayloadDecoders) {
  payloadDecoderRegistry.register(decoder);
}

for (const extension of normalizeChatExtensions(config)) {
  for (const decoder of extension.payloadDecoders ?? []) {
    payloadDecoderRegistry.register(decoder);
  }
}

ws.onmessage = (raw) => {
  const frame = normalizeServerFrame(JSON.parse(raw.data));
  const decodedFrame = decodeFramePayload(frame, payloadDecoderRegistry);
  applyUIEvent(decodedFrame, dispatch, sessionId, toolRuntime, adapterRegistry);
};
```

## Testing and validation strategy

### Pinocchio schema tests

Run locally:

```bash
cd /home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio
buf format --diff --exit-code
buf lint
buf build
buf breaking --against-registry
```

Before the first publish, replace `--against-registry` with a Git comparison.

Acceptance criteria:

- `buf build` succeeds.
- `buf lint` succeeds.
- `buf format --diff --exit-code` succeeds.
- `buf breaking --against-registry` succeeds after first publish.
- CI runs the same checks on pull requests.

### BSR publishing tests

Manual publish acceptance criteria:

- `buf registry module create ...` succeeds or the module already exists.
- `buf push --label main --git-metadata` outputs a BSR commit ID.
- The BSR page renders module docs for the four chatapp proto files.
- The BSR module has the expected visibility.

CI publishing acceptance criteria:

- Push to `main` after a proto change publishes a new BSR commit or squashes into the existing one if content is unchanged.
- Git tags create usable BSR labels if label publishing is enabled.
- Deleted branch labels are archived by the Buf action if delete events are enabled.

### Consumer generation tests

Run in a throwaway directory or new package:

```bash
buf generate buf.build/go-go-golems/pinocchio-chatapp \
  --template packages/chatapp-proto/buf.gen.yaml
pnpm --filter @go-go-golems/chatapp-proto typecheck
```

Acceptance criteria:

- generated files include chat, RPC, frontend tools, and widgets schemas,
- TypeScript compiles,
- generated descriptors expose expected names such as `ChatTextPatchSchema`, `ChatMessageEntitySchema`, `UiEventFrameSchema`, `FrontendToolCallRequestedSchema`, and widget schemas,
- no consumer reaches into `pinocchio/cmd/web-chat/web/src/generated`.

### Decoder integration tests

These belong to `CHATOVERLAY-012`, but this module enables them.

Unit test sketch:

```ts
import { fromJson } from '@bufbuild/protobuf';
import { ChatTextPatchSchema } from '@go-go-golems/chatapp-proto/generated/proto/pinocchio/chatapp/v1/chat_pb';

it('decodes ChatTextPatch protojson payload', () => {
  const payload = {
    messageId: 'm1:text:main',
    role: 'assistant',
    text: 'hello',
    mode: 'CHAT_STREAM_PATCH_MODE_APPEND',
    status: 'streaming',
    final: false,
  };

  const decoded = fromJson(ChatTextPatchSchema, payload, { ignoreUnknownFields: true });

  expect(decoded.messageId).toBe('m1:text:main');
  expect(decoded.text).toBe('hello');
});
```

## Rollout plan

### Milestone 1: BSR module exists

Deliverables:

- Pinocchio `buf.yaml` names `buf.build/go-go-golems/pinocchio-chatapp`.
- Local `buf build` and `buf lint` pass.
- BSR module created.
- Initial `buf push` completed.
- Ticket changelog records BSR commit ID.

### Milestone 2: CI publishes schemas

Deliverables:

- `.github/workflows/buf-ci.yaml` exists in Pinocchio.
- `BUF_TOKEN` secret is configured.
- Pull requests run Buf checks.
- Pushes publish named modules.

### Milestone 3: Generated TypeScript consumer works

Deliverables:

- `@go-go-golems/chatapp-proto` package or equivalent generation path exists.
- TypeScript generation from the BSR module is documented and tested.
- Generated files include all four chatapp proto packages.

### Milestone 4: chat-provider decoder work consumes generated schemas

Deliverables:

- `chat-provider` no longer needs a Pinocchio submodule for schemas.
- Core payload decoders import generated schemas from a package or BSR-generated output.
- At least one adapter uses typed decoding and has parity tests.

## Alternatives considered

### Alternative A: Add Pinocchio as a Git submodule

This would place a Pinocchio checkout inside the overlay or provider repository.

Pros:

- easy access to authoritative `.proto` files,
- works without BSR account setup,
- can pin exact Git commits.

Cons:

- couples a reusable npm package to an entire Go app repository,
- increases checkout complexity,
- makes npm package publishing and CI more fragile,
- does not provide protobuf-specific lint/breaking registry workflows,
- does not solve schema distribution for other consumers.

Recommendation: do not use this as the primary design. Only use it as a temporary emergency fallback if BSR publishing is blocked.

### Alternative B: Copy `.proto` files into chat-provider

Pros:

- very simple local generation,
- no external registry.

Cons:

- creates two schema sources of truth,
- requires manual synchronization,
- hides breaking changes until runtime or tests fail.

Recommendation: reject.

### Alternative C: Commit generated TypeScript only

Pros:

- consumers need no Buf CLI,
- easy import path.

Cons:

- generated code can drift from `.proto` files,
- regeneration source may be unclear,
- does not help Go/TS consistency unless generation is automated.

Recommendation: acceptable only if generated code is produced by a documented package pipeline from the BSR module.

### Alternative D: Publish a generated npm package without BSR

Pros:

- good TypeScript developer experience,
- easy for `chat-provider` to consume.

Cons:

- does not provide registry-level protobuf checks,
- other protobuf consumers cannot use schema deps directly,
- package publication becomes the only schema distribution mechanism.

Recommendation: useful as a second layer, not a replacement for BSR.

## Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| BSR organization or permissions are not ready | Cannot publish module | Create module manually with an owner account; configure `BUF_TOKEN` later |
| Module visibility is wrong | Consumers cannot access schemas or private schemas leak | Confirm public/private decision before first push |
| Existing lint exceptions hide useful problems | Poor API hygiene persists | Keep current exceptions for first publish; tighten in follow-up PRs |
| Removing `buf.build/google/protobuf` breaks unexpected imports | Build failure | Run `buf build`; add dependency back only if needed |
| Generated TS lacks frontendtools/widgets schemas | Provider cannot type those decoders | Verify generation output and update templates/scripts before decoder rollout |
| BSR labels drift from npm package versions | Consumers may generate mismatched schemas | Align release tags and document which schema label each npm version uses |
| Breaking changes are intentionally needed | CI blocks PRs | Use reviewable skip label/workflow override and document migration plan |
| chat-provider imports Pinocchio-specific schemas directly | Package boundary becomes unclear | Prefer `@go-go-golems/chatapp-proto` or extension-owned decoders |

## Open questions

1. Should the BSR module be public? The frontend packages appear public, but confirm with the owner before publishing.
2. Should the module be named `pinocchio-chatapp` or `pinocchio`? This guide recommends `pinocchio-chatapp` for narrow dependency boundaries.
3. Should release labels mirror Go module tags exactly, or should schemas use independent labels such as `chatapp-v0.1.0`?
4. Should `@go-go-golems/chatapp-proto` be published from the Pinocchio repo, the React chat repo, or a separate schema repo?
5. How strict should breaking checks be for pre-1.0 schemas? The default should still be strict unless a migration is explicitly planned.

## File reference map

### Pinocchio schema and generation files

- `/home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/buf.yaml` — current Buf workspace config.
- `/home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/buf.chatapp.gen.yaml` — current Go generation template.
- `/home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/buf.chatapp.web.gen.yaml` — current TypeScript generation template.
- `/home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/proto/pinocchio/chatapp/v1/chat.proto` — core chat runtime event/entity schemas.
- `/home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/proto/pinocchio/chatapp/rpc/v1/rpc.proto` — RPC/WebSocket frame schemas using `google.protobuf.Any`.
- `/home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/proto/pinocchio/chatapp/frontendtools/v1/frontend_tool.proto` — frontend tool schemas.
- `/home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/proto/pinocchio/chatapp/widgets/v1/widget.proto` — widget schemas.
- `/home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/web/src/generated/chatapp/proto/pinocchio/chatapp/v1/chat_pb.ts` — existing generated TypeScript descriptors for core chat schemas.
- `/home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/web/src/generated/chatapp/proto/pinocchio/chatapp/rpc/v1/rpc_pb.ts` — existing generated TypeScript descriptors for RPC schemas.

### React chat files affected by schema distribution

- `/home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/go.mod` — current Go dependency on Pinocchio and local replace directive.
- `/home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/packages/chat-provider/package.json` — provider package dependencies; currently no protobuf runtime dependency.
- `/home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/packages/chat-provider/src/ws/protocol.ts` — currently unwraps payloads and should eventually preserve Any envelope metadata.
- `/home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/packages/chat-provider/src/ws/timelineEvents.ts` — currently structural payload projections; future generated decoders should feed these adapters typed payloads.
- `/home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/ttmp/2026/06/01/CHATOVERLAY-012--standardize-websocket-payload-decoding-around-protobuf-schemas/design-doc/01-protobuf-backed-websocket-payload-decoding-analysis-and-implementation-guide.md` — upstream design context for generated decoder ownership.

### Ticket evidence files

- `/home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/ttmp/2026/06/01/CHATOVERLAY-014--publish-chatapp-protobuf-definitions-as-a-buf-module/sources/proposed-pinocchio-buf-v2.yaml` — tested proposed v2 Buf config.
- `/home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/ttmp/2026/06/01/CHATOVERLAY-014--publish-chatapp-protobuf-definitions-as-a-buf-module/sources/buf-docs/01-publish-modules.md` — captured Buf docs for publishing modules.
- `/home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/ttmp/2026/06/01/CHATOVERLAY-014--publish-chatapp-protobuf-definitions-as-a-buf-module/sources/buf-docs/02-dependency-management.md` — captured Buf docs for dependency management.
- `/home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/ttmp/2026/06/01/CHATOVERLAY-014--publish-chatapp-protobuf-definitions-as-a-buf-module/sources/buf-docs/03-buf-yaml-v2.md` — captured Buf docs for v2 `buf.yaml`.
- `/home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/ttmp/2026/06/01/CHATOVERLAY-014--publish-chatapp-protobuf-definitions-as-a-buf-module/sources/buf-docs/04-github-actions.md` — captured Buf docs for GitHub Actions CI/CD.


## Implementation update: 2026-06-01

The first implementation pass completed all local repository work that does not require Buf Registry credentials. Pinocchio now has a named Buf module configuration, a Buf CI workflow, operator documentation, and regenerated chatapp TypeScript coverage for frontendtools and widgets.

### Pinocchio commits produced

| Commit | Summary | Why it matters |
|---|---|---|
| `534322c` | `Configure chatapp protos as Buf module` | Converts `buf.yaml` to v2 and names `buf.build/go-go-golems/pinocchio-chatapp`. |
| `19fda9c` | `Add Buf CI publishing workflow` | Adds `bufbuild/buf-action@v1` with `BUF_TOKEN`-based push support. |
| `3c66ec9` | `Document chatapp Buf module publishing` | Adds operator docs for validation, creation, push, release labels, and compatibility rules. |
| `d525dc6` | `Align chatapp codegen with Buf module root` | Preserves existing generated output layout after v2 module-root semantics and adds frontendtools/widgets TS schemas. |

### Files changed in Pinocchio

- `/home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/buf.yaml`
- `/home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/buf.chatapp.gen.yaml`
- `/home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/buf.chatapp.web.gen.yaml`
- `/home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/.github/workflows/buf-ci.yaml`
- `/home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/docs/chatapp-protobuf.md`
- `/home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/proto/pinocchio/chatapp/frontendtools/v1/frontend_tool.proto`
- `/home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/proto/pinocchio/chatapp/widgets/v1/widget.proto`
- `/home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/pkg/chatapp/pb/proto/pinocchio/chatapp/**/*.pb.go`
- `/home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio/cmd/web-chat/web/src/generated/chatapp/proto/pinocchio/chatapp/**/*_pb.ts`

### Validation performed

The following validation passed during implementation:

```bash
cd /home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio
buf dep update
buf format -w
buf format --diff --exit-code
buf lint
buf build
go test ./pkg/chatapp/... ./cmd/web-chat/...
cd cmd/web-chat/web && npm run typecheck
```

The final codegen commit also passed Pinocchio's pre-commit hooks, which ran:

```text
go generate ./...
cmd/web-chat/web npm build
make lint / golangci-lint / go vet custom analyzers
go test ./...
cmd/web-chat/web npm run typecheck
cmd/web-chat/web npm run lint
```

Two expected warnings/limitations were observed:

- `buf dep update` emitted `WARN No configured dependencies were found to update in "."` because the v2 config has no external deps after removing the old Well-Known Types dependency.
- Vite emitted `<script src="./app-config.js"> in "/index.html" can't be bundled without type="module" attribute`; the build still succeeded, and this warning predates the Buf work.

### BSR publication status

BSR publication itself is blocked on operator authentication and/or module creation. Local checks showed:

```bash
buf registry whoami
# Failure: Not currently logged in for buf.build.

buf registry module info buf.build/go-go-golems/pinocchio-chatapp
# Failure: a module named "buf.build/go-go-golems/pinocchio-chatapp" does not exist, use "buf registry module create" to create one

buf breaking --against-registry
# Failure: resource with name "go-go-golems/pinocchio-chatapp" was not found
```

The remaining operator commands are therefore:

```bash
cd /home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio
buf registry login
buf registry module create buf.build/go-go-golems/pinocchio-chatapp   --visibility public   --default-label-name main
buf push --label main --git-metadata
```

After this succeeds, record the BSR commit ID in this ticket and in any frontend schema package release notes.

### Implementation deviation from original guide

The v2 Buf module root changes generated descriptor source paths from `proto/pinocchio/...` to `pinocchio/...`. To avoid moving generated output directories in the repository, the generation templates now write to `pkg/chatapp/pb/proto` and `cmd/web-chat/web/src/generated/chatapp/proto`. This preserves existing import path layout while allowing Buf v2 to treat `proto` as the module root.

## Final recommendation

Publish Pinocchio chatapp schemas as `buf.build/go-go-golems/pinocchio-chatapp`, not as a Git submodule. Use the BSR module as the authoritative protobuf schema dependency. Then generate TypeScript either directly in consumers or, preferably, into a small `@go-go-golems/chatapp-proto` npm package. This keeps `chat-provider` reusable, preserves Pinocchio as schema owner, and gives the team a clear path from protobuf source files to typed frontend WebSocket decoders.
