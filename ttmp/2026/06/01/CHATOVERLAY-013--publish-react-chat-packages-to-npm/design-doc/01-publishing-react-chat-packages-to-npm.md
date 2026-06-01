---
Title: Publishing React Chat Packages to npm
Ticket: CHATOVERLAY-013
Status: active
Topics:
    - chat-overlay
    - react
    - npm
    - publishing
    - cicd
DocType: design-doc
Intent: long-term
Owners: []
RelatedFiles:
    - Path: 2026-05-29--chatbot-overlay-glm/packages/chat-overlay/package.json
      Note: Current overlay package metadata and workspace dependency to rewrite for npm
    - Path: 2026-05-29--chatbot-overlay-glm/packages/chat-overlay/src/overlay/ChatPanel.tsx
      Note: Default overlay UI that consumes provider APIs
    - Path: 2026-05-29--chatbot-overlay-glm/packages/chat-provider/package.json
      Note: Current provider package metadata to make npm-public
    - Path: 2026-05-29--chatbot-overlay-glm/packages/chat-provider/src/core/createChatClient.ts
      Note: Public runtime API and backend endpoint contract
    - Path: 2026-05-29--chatbot-overlay-glm/packages/chat-provider/src/react/ChatProvider.tsx
      Note: Provider composition of store registries client and websocket runtime
    - Path: docs/npm-publishing-playbook.md
      Note: Current repository-local trusted publishing playbook
    - Path: go-go-os-frontend/.github/workflows/publish-npm.yml
      Note: Reference npm publish workflow to adapt
    - Path: go-go-os-frontend/scripts/packages/build-dist.mjs
      Note: Reference dist package builder with export and workspace dependency rewrites
    - Path: go-go-os-frontend/scripts/packages/publish-npm-package-set.mjs
      Note: Reference npm publication driver with skip-existing and latest safeguards
ExternalSources: []
Summary: Design and implementation guide for publishing the chat-provider and chat-overlay React packages to npm after moving the repository to go-go-golems/react-chat.
LastUpdated: 2026-06-01T13:19:39.606747318-04:00
WhatFor: Use this when implementing npm publishing, CI/CD, package metadata, and repository migration for the React chat packages.
WhenToUse: Before renaming the repository, editing package metadata, copying publish scripts from go-go-os-frontend, creating npm tokens, or running the first public publish.
---



# Publishing React Chat Packages to npm

## Executive summary

> **Current-state note (2026-06-01):** The original design below started from the older `go-go-os-frontend` Vault-backed npm token model. The implemented and verified final state uses npm Trusted Publishing instead: `.github/workflows/publish-npm.yml` no longer reads `NODE_AUTH_TOKEN` from Vault, both React chat packages have npm trusted publishers configured for `go-go-golems/react-chat`, and package token publishing has been disabled. Treat Vault-token sections in this design as historical investigation context, not the current operating model. The current operator guide is `docs/npm-publishing-playbook.md`.

This ticket prepares the packages under `2026-05-29--chatbot-overlay-glm/packages/` for public npm publication. The current workspace already has two publishable package candidates, `@go-go-golems/chat-provider` and `@go-go-golems/chat-overlay`, but both are still marked `private: true`, export TypeScript source files directly, and only run `tsc --noEmit` builds. The target state is a repository renamed and transferred to `go-go-golems/react-chat`, with stable package metadata, generated `dist/` publish artifacts, a pack smoke test, and a GitHub Actions workflow based on the already-proven `go-go-os-frontend` npm publishing pipeline.

The core recommendation is to copy the publishing shape from `go-go-os-frontend`: package manifests should keep source-oriented development exports, a `build:dist` script should create a sanitized `dist/` package with JavaScript, declaration files, copied CSS assets, rewritten exports, and rewritten `workspace:*` dependencies, and the workflow should publish only from `dist/` after typecheck, tests, build, and `npm pack` verification. The repository rename should happen before the first real publish so the public npm metadata points at `https://github.com/go-go-golems/react-chat` from day one.

## Problem statement and scope

The requested work has two connected parts. First, the React chat packages need to become public packages that an external app can install through npm. Second, the source repository should move from the dated prototype name `wesen/2026-05-29--chatbot-overlay-glm` to the cleaner organization repository `go-go-golems/react-chat`, which also produces cleaner npm metadata, issue URLs, and package homepages.

This guide is intentionally written for a new intern. It explains what each package is, why publication requires generated artifacts rather than raw workspace source, how the existing `go-go-os-frontend` pipeline works, and how to adapt that pipeline safely. It does not implement the change directly; it is the detailed design and implementation plan for a later code change.

In scope:

- Rename and transfer the git repository to `go-go-golems/react-chat`.
- Publish `@go-go-golems/chat-provider` and `@go-go-golems/chat-overlay` to npm.
- Add package metadata required for public npm packages.
- Add build scripts that generate publishable `dist/` artifacts.
- Add CI and manual npm publish workflows.
- Preserve the workspace developer experience where packages import source during local development.

Out of scope for this ticket:

- Rewriting the runtime APIs or chat protocol.
- Publishing backend Go modules.
- Moving the packages into `go-go-os-frontend`.
- Replacing pnpm/npm workspace mechanics with Changesets or semantic-release. Those can be future improvements, but the proven baseline already exists in `go-go-os-frontend`.

## Current-state architecture

### Repository and workspace layout

The current repository is still named like a date-stamped prototype. Its git remote points at `git@github.com:wesen/2026-05-29--chatbot-overlay-glm.git`, while the desired target is `git@github.com:go-go-golems/react-chat.git`.

The workspace root is private and uses pnpm. The root package is named `chat-overlay-workspace`, marks the workspace as private, and exposes three high-level scripts: recursive build, recursive typecheck, and Vitest (`2026-05-29--chatbot-overlay-glm/package.json:1-15`). The pnpm workspace includes every package under `packages/*` plus the demo web app under `web` (`2026-05-29--chatbot-overlay-glm/pnpm-workspace.yaml:1-3`).

```text
react-chat repository (target name)
├── package.json                 # private workspace root
├── pnpm-workspace.yaml          # packages/* and web
├── packages/
│   ├── chat-provider/           # runtime, state, websocket, tools, widgets
│   └── chat-overlay/            # visible overlay UI and theme
└── web/                         # demo/integration app, not published
```

### Package: `@go-go-golems/chat-provider`

`chat-provider` is the lower-level runtime package. Its package manifest currently declares the npm name `@go-go-golems/chat-provider`, version `0.1.0`, `private: true`, ESM module type, source exports for the root module plus `./core`, `./store`, `./tools`, `./widgets`, and `./ws`, and typecheck/build scripts that only run `tsc -p tsconfig.json --noEmit` (`packages/chat-provider/package.json:1-18`). It depends on Redux Toolkit, React Redux, and Zod, and it currently lists React and React DOM as peer dependencies (`packages/chat-provider/package.json:19-32`).

Conceptually, this package owns the embeddable runtime:

- `ChatProvider` creates the Redux store, registries, websocket manager, tool runtime, and chat client inside React context (`packages/chat-provider/src/react/ChatProvider.tsx:19-59`).
- `createChatClient` exposes the public imperative API: `connect`, `send`, `stop`, `open`, `close`, `toggle`, `reset`, `getStore`, and `tools` (`packages/chat-provider/src/core/createChatClient.ts:36-46`).
- `ChatProviderConfig` lets embedding applications configure API base paths, session persistence, debug hooks, and request body customization (`packages/chat-provider/src/core/createChatClient.ts:12-21`).
- The client creates sessions via `POST /api/chat/sessions`, subscribes over websocket, syncs tool manifests, sends messages to `/api/chat/sessions/{sessionId}/messages`, and can stop a run with `/stop` (`packages/chat-provider/src/core/createChatClient.ts:100-191`).
- Tool runtime support validates frontend tool requests, executes browser-side tools, tracks human-in-the-loop pending calls, and submits tool results back to the backend (`packages/chat-provider/src/tools/toolRuntime.ts:25-129`).
- Widget support is registry-based. A `WidgetDefinition` names a React component, `ChatWidgetRegistry` stores definitions by name, increments a revision on change, and `defineWidget` is the small helper for registration (`packages/chat-provider/src/widgets/widgetRegistry.ts:10-60`).
- Websocket support owns connection lifecycle, status updates, server frame parsing, snapshot hydration, event buffering before hydration, and UI event projection (`packages/chat-provider/src/ws/wsManager.ts:34-197`).

The important publishing implication is that `chat-provider` is not just React components. It is a runtime contract between browser UI, Redux state, tool/widget extension registries, HTTP endpoints, and websocket timeline events. Its README and package metadata must describe that contract clearly.

### Package: `@go-go-golems/chat-overlay`

`chat-overlay` is the visible UI package built on top of `chat-provider`. Its manifest currently declares `@go-go-golems/chat-overlay`, version `0.1.0`, `private: true`, ESM module type, CSS side effects, source exports for the root entry and `./theme/retro-mac.css`, and `tsc --noEmit` scripts (`packages/chat-overlay/package.json:1-14`). It peer-depends on React and React DOM and uses `@go-go-golems/chat-provider` through the workspace protocol (`packages/chat-overlay/package.json:15-27`).

The overlay package owns the floating chat panel and theme assets:

- `ChatPanel` reads overlay state and timeline entities from the provider store, obtains the client through `useChatClient`, and renders the panel header, websocket status, messages, error bar, streaming indicator, and composer (`packages/chat-overlay/src/overlay/ChatPanel.tsx:1-75`).
- It imports provider selectors and hooks from `@go-go-golems/chat-provider`, so `chat-overlay` must publish after or alongside `chat-provider`.
- Its CSS theme export must survive the publish build. A consumer should be able to import `@go-go-golems/chat-overlay/theme/retro-mac.css` without reaching into package internals.

### Existing publish reference: `go-go-os-frontend`

The `go-go-os-frontend` repository already solved the package publication problem for the `@go-go-golems/*` scope. Its `publish-npm` workflow is manually dispatched, accepts a package set or single package, supports npm tags, dry runs, skip-existing behavior, and a typed confirmation string before a real `latest` publish (`go-go-os-frontend/.github/workflows/publish-npm.yml:1-42`).

The workflow then:

1. Checks out source, installs pnpm 10, and sets up Node with the npmjs registry (`publish-npm.yml:55-69`).
2. Validates dangerous inputs, especially real `latest` publishes (`publish-npm.yml:76-87`).
3. Runs `pnpm install --frozen-lockfile` (`publish-npm.yml:89-90`).
4. Resolves package directories from either a single name/path or a package set (`publish-npm.yml:95-125`).
5. Typechecks each selected package (`publish-npm.yml:127-136`).
6. Runs package tests when a package has a test script (`publish-npm.yml:138-151`).
7. Runs `npm run build:dist -w <package>` for each selected package (`publish-npm.yml:153-162`).
8. Runs `pack-smoke.mjs` to verify the tarball does not leak test/story artifacts (`publish-npm.yml:164-169`).
9. Reads the npm token from Vault using GitHub OIDC (`publish-npm.yml:171-182`).
10. Publishes with `publish-npm-package-set.mjs`, passing tag, skip-existing, and dry-run flags (`publish-npm.yml:184-202`).

That workflow is intentionally conservative and is a good baseline for `react-chat`.

The reusable scripts are also directly relevant:

- `build-dist.mjs` runs per package from the package directory, derives the workspace root, deletes and recreates `dist`, runs TypeScript against a temporary build config, copies CSS and `.vm.js` assets, writes a sanitized `dist/package.json`, writes `.npmignore`, and copies README (`go-go-os-frontend/scripts/packages/build-dist.mjs:8-21`, `220-430`).
- The build script rewrites source exports like `./src/index.ts` into runtime exports like `./index.js` and type exports like `./index.d.ts` in the publish package (`build-dist.mjs:283-390`).
- It rewrites `workspace:*` dependencies to concrete versions before publication (`build-dist.mjs:328-364`, `391-392`). This is crucial for `chat-overlay`, because it currently depends on `@go-go-golems/chat-provider` via `workspace:*`.
- `pack-smoke.mjs` runs `npm pack --json` from each package `dist` directory and fails if test or Storybook artifacts leak into the tarball (`go-go-os-frontend/scripts/packages/pack-smoke.mjs:1-50`).
- `publish-npm-package-set.mjs` refuses real `latest` publication unless `CONFIRM_LATEST_PUBLISH=true`, checks whether a package version already exists on npm, optionally skips existing versions, and publishes from `dist` with public access and provenance when not in dry-run mode (`go-go-os-frontend/scripts/packages/publish-npm-package-set.mjs:12-183`).
- `package-sets.mjs` declares ordered sets of packages (`go-go-os-frontend/scripts/packages/package-sets.mjs:1-54`). `react-chat` only needs a small equivalent with `chat-provider`, `chat-overlay`, and `all`.

## Target architecture

### High-level package publishing flow

```text
Developer changes source
        │
        ▼
pnpm install --frozen-lockfile
        │
        ▼
typecheck + tests
        │
        ▼
for each selected package:
  npm run build:dist -w packages/<name>
        │
        ▼
packages/<name>/dist/
  ├── *.js
  ├── *.d.ts
  ├── copied CSS assets
  ├── README.md
  ├── .npmignore
  └── package.json with rewritten exports and deps
        │
        ▼
npm pack --json from dist and inspect tarball
        │
        ▼
npm publish packages/<name>/dist --access public --tag <tag> --provenance
```

The source package remains optimized for local development. The generated `dist/package.json` is optimized for npm consumers. This split avoids asking consumers to compile TypeScript source from `node_modules`, and it prevents `workspace:*` dependency specifiers from leaking into public packages.

### Package dependency graph

```text
External React app
  ├── react / react-dom                         # peer deps
  ├── @reduxjs/toolkit + react-redux + zod      # installed deps or peer/deps per final manifest
  ├── @go-go-golems/chat-provider               # runtime and extension APIs
  └── @go-go-golems/chat-overlay                # panel UI + retro CSS theme
          └── depends on @go-go-golems/chat-provider
```

`chat-provider` must be publishable on its own because advanced consumers may build their own UI around the runtime. `chat-overlay` should be a convenience package that provides the default floating UI and theme.

### Runtime mental model for interns

When an application embeds the chat system, it typically wraps its UI in `ChatProvider`, renders the overlay UI, and optionally registers tools/widgets.

```tsx
import { ChatProvider } from '@go-go-golems/chat-provider';
import { ChatOverlayProvider } from '@go-go-golems/chat-overlay';
import '@go-go-golems/chat-overlay/theme/retro-mac.css';

export function App() {
  return (
    <ChatProvider config={{ basePrefix: '/chat' }}>
      <PageContent />
      <ChatOverlayProvider />
    </ChatProvider>
  );
}
```

The provider creates a session, connects to websocket, projects backend timeline events into Redux state, and exposes a client API to the UI. The overlay reads that state and calls client methods like `send`, `close`, and `toggle`.

```text
User types message
  │
  ▼
ChatComposer calls client.send(prompt)
  │
  ├─ ensure session via POST /api/chat/sessions
  ├─ ensure websocket subscription
  ├─ sync frontend tool manifest
  └─ POST /api/chat/sessions/{id}/messages
          │
          ▼
Backend streams timeline events over websocket
          │
          ▼
WsManager parses frames and applies adapters
          │
          ▼
Redux timeline updates
          │
          ▼
ChatMessages / WidgetOutlet / ToolCallOutlet render UI
```

This runtime model affects publishing because public API surface needs to include both React components and non-visual extension APIs. The package exports should remain deliberate and documented.

## Required package manifest changes

### Common metadata for both packages

Each publishable package should move from prototype metadata to npm-ready metadata:

```jsonc
{
  "private": false,
  "description": "...",
  "license": "MIT",
  "author": "Manuel Odendahl",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/go-go-golems/react-chat.git",
    "directory": "packages/chat-provider"
  },
  "homepage": "https://github.com/go-go-golems/react-chat/tree/main/packages/chat-provider#readme",
  "bugs": {
    "url": "https://github.com/go-go-golems/react-chat/issues"
  },
  "files": [
    "**/*.js",
    "**/*.d.ts",
    "**/*.css",
    "**/*.json",
    "README.md"
  ],
  "publishConfig": {
    "access": "public"
  },
  "main": "src/index.ts",
  "types": "src/index.ts",
  "scripts": {
    "build": "tsc -b",
    "build:dist": "node ../../scripts/packages/build-dist.mjs",
    "typecheck": "tsc -b",
    "test": "vitest run src"
  }
}
```

Use `go-go-os-frontend/packages/os-chat/package.json` as the concrete precedent: it has public package metadata, repository directory, homepage, bugs URL, package file allow-list, `publishConfig.access`, source `main`/`types`, and `build:dist` script (`go-go-os-frontend/packages/os-chat/package.json:1-81`).

### `chat-provider` manifest decisions

Recommended metadata:

- `name`: keep `@go-go-golems/chat-provider` unless the team wants a more product-like pair such as `@go-go-golems/react-chat` and `@go-go-golems/react-chat-overlay`. The current names are technically clear.
- `description`: `Provider runtime, state, websocket, tool, and widget primitives for embeddable React chat.`
- `keywords`: `react`, `chat`, `websocket`, `tools`, `widgets`, `go-go-golems`.
- `private`: set to `false`.
- `exports`: keep deliberate subpath exports for `./core`, `./store`, `./tools`, `./widgets`, and `./ws`, but confirm these are truly public API. If not, restrict before the first publish.
- `peerDependencies`: use React-compatible ranges like `^18 || ^19`, matching the public packages in `go-go-os-frontend` (`os-chat/package.json:56-60`).
- `dependencies`: keep `@reduxjs/toolkit`, `react-redux`, and `zod` if provider owns its store implementation and needs them at runtime. Consider moving `react-redux` to peer dependency only if consumers must share one instance. Since `ChatProvider` imports `Provider` from `react-redux`, either dependency or peerDependency must guarantee availability.

### `chat-overlay` manifest decisions

Recommended metadata:

- `description`: `Floating React chat overlay UI and retro theme for @go-go-golems/chat-provider.`
- `keywords`: `react`, `chat`, `overlay`, `assistant`, `theme`, `go-go-golems`.
- `private`: set to `false`.
- `dependencies`: keep `@go-go-golems/chat-provider: workspace:*`; the publish build must rewrite it to the concrete provider version.
- `peerDependencies`: React and React DOM should use `^18 || ^19`.
- `sideEffects`: keep `['**/*.css']`, because CSS imports are intentional side effects and bundlers must not tree-shake them away.
- `exports`: keep `./theme/retro-mac.css`, and add any future stable theme aliases deliberately.

## Build and publish scripts to add

Create `scripts/packages/` in `react-chat` by copying a reduced subset from `go-go-os-frontend`:

```text
scripts/packages/
├── build-dist.mjs
├── pack-smoke.mjs
├── package-sets.mjs
└── publish-npm-package-set.mjs
```

### `build-dist.mjs`

Use the `go-go-os-frontend` implementation as the starting point because it already handles the hard parts:

- Temporary TypeScript build config.
- Rewriting `paths` for workspace packages.
- Copying `.css` assets.
- Removing compiled tests and Storybook artifacts.
- Rewriting package exports from source paths to publish paths.
- Rewriting `workspace:*` dependency versions.
- Copying README into `dist`.

For `react-chat`, verify these package-specific details:

- The script's `workspaceRoot = path.resolve(packageDir, '..', '..')` is correct for `packages/chat-provider` and `packages/chat-overlay`.
- The asset suffix list must include `.css`; `.vm.js` is harmless even if unused.
- Storybook files under `src/stories` should not be shipped. The existing ignore pattern removes compiled `.stories.js` and `.stories.d.ts` (`build-dist.mjs:20-21`, `276-280`, `407-408`).
- The generated publish manifest must include `sideEffects`, `files`, `exports`, `main`, `types`, `dependencies`, `peerDependencies`, and `publishConfig` (`build-dist.mjs:374-401`).

### `package-sets.mjs`

The package set file can be much smaller than `go-go-os-frontend`:

```js
export const packageSets = {
  provider: ['packages/chat-provider'],
  overlay: ['packages/chat-provider', 'packages/chat-overlay'],
  all: ['packages/chat-provider', 'packages/chat-overlay'],
};

export function listPackageSetNames() {
  return Object.keys(packageSets);
}

export function getPackageSet(packageSetName) {
  const packageSet = packageSets[packageSetName];
  if (!packageSet) {
    throw new Error(
      `Unknown package set "${packageSetName}". Expected one of: ${listPackageSetNames().join(', ')}`,
    );
  }
  return [...packageSet];
}
```

The order matters. `chat-provider` must come before `chat-overlay` because the overlay depends on the provider.

### `pack-smoke.mjs`

Copy the existing script nearly unchanged. It should run after `build:dist` and before publish. Its job is not to prove the package works at runtime; its job is to catch packaging mistakes early, especially leaked stories/tests and malformed tarballs.

### `publish-npm-package-set.mjs`

Copy the existing script and adjust only the known package sets. Keep the safety properties:

- Default to no real publish unless the workflow says so.
- Support `--dry-run`.
- Support `--skip-existing`.
- Refuse real `latest` publishes without `CONFIRM_LATEST_PUBLISH=true`.
- Check npm for an existing exact version before publishing.
- Publish from `dist`, not from package source directories.
- Use `--access public` and provenance for real publishes.

## GitHub Actions design

Add `.github/workflows/publish-npm.yml` to the target repository after transfer. It should be derived from `go-go-os-frontend/.github/workflows/publish-npm.yml` but simplified.

Recommended workflow inputs:

```yaml
on:
  workflow_dispatch:
    inputs:
      package_set:
        description: Package set to publish to npmjs
        required: true
        default: all
        type: choice
        options:
          - single
          - provider
          - overlay
          - all
      package_name:
        description: Package name or dir when package_set=single
        required: false
        default: ''
        type: string
      npm_tag:
        required: true
        default: latest
        type: string
      dry_run:
        required: true
        default: true
        type: boolean
      skip_existing:
        required: true
        default: true
        type: boolean
      confirm_latest_publish:
        required: false
        default: ''
        type: string
```

Recommended job permissions and environment:

```yaml
jobs:
  publish-npm:
    runs-on: ubuntu-latest
    environment: npm-production
    permissions:
      contents: read
      id-token: write
    concurrency:
      group: react-chat-npm-publish-production
      cancel-in-progress: false
```

Use the same validation pattern as `go-go-os-frontend`:

```bash
if [ "${{ inputs.package_set }}" = "single" ] && [ -z "${{ inputs.package_name }}" ]; then
  echo "package_name is required when package_set=single" >&2
  exit 1
fi
if [ "${{ inputs.dry_run }}" = "false" ] && [ "${{ inputs.npm_tag }}" = "latest" ] && [ "${{ inputs.confirm_latest_publish }}" != "CONFIRM_LATEST" ]; then
  echo "Real latest publishes require confirm_latest_publish=CONFIRM_LATEST" >&2
  exit 1
fi
```

Then run:

```bash
pnpm install --frozen-lockfile
npm run typecheck -w packages/chat-provider
npm run typecheck -w packages/chat-overlay
npm run test -w <package> # only when the package has a test script
npm run build:dist -w <package>
node scripts/packages/pack-smoke.mjs <package-dirs>
node scripts/packages/publish-npm-package-set.mjs <set-or-package> --tag "$NPM_TAG" --skip-existing --dry-run
```

### Token and provenance setup

The `go-go-os-frontend` workflow reads `NODE_AUTH_TOKEN` from Vault using a repository-specific role (`go-go-os-frontend-npm-publish`) and secret path (`kv/data/ci/github/go-go-os-frontend/npm-token`) (`publish-npm.yml:171-182`). For `react-chat`, create equivalent infrastructure:

- GitHub environment: `npm-production`.
- Vault JWT role: `react-chat-npm-publish` or another agreed name.
- Vault secret path: `kv/data/ci/github/react-chat/npm-token`.
- npm automation token with publish rights for the `@go-go-golems` scope.
- GitHub Actions OIDC trust bound to the `go-go-golems/react-chat` repository.

If Vault setup is not ready at first, a temporary GitHub environment secret named `NODE_AUTH_TOKEN` can unblock the first publish, but the long-term design should stay aligned with the OIDC/Vault pattern.

## Repository rename and ownership transfer plan

Do the repository move before the first real npm publish.

### Why rename first?

npm package metadata is copied into every package version. If version `0.1.0` points at `wesen/2026-05-29--chatbot-overlay-glm`, that historical metadata remains in the first public version forever. Renaming first means all package pages, README links, bug links, provenance records, and source links point to the clean home from the beginning.

### Recommended steps

1. Ensure the current working tree is clean and pushed.
2. In GitHub, transfer or recreate the repository under `go-go-golems/react-chat`.
3. Update local remotes:

   ```bash
   git remote set-url origin git@github.com:go-go-golems/react-chat.git
   git remote -v
   ```

4. Update package metadata for both packages:

   ```json
   "repository": {
     "type": "git",
     "url": "git+https://github.com/go-go-golems/react-chat.git",
     "directory": "packages/chat-provider"
   },
   "homepage": "https://github.com/go-go-golems/react-chat/tree/main/packages/chat-provider#readme",
   "bugs": {
     "url": "https://github.com/go-go-golems/react-chat/issues"
   }
   ```

5. Update root README and package READMEs to use `react-chat` URLs.
6. Add `.github/workflows/publish-npm.yml` after the repo is under `go-go-golems`, because the workflow's Vault/OIDC binding should match the final repository.
7. Configure npm token access for the final repository.
8. Run workflow dry-run.
9. Run first real publish under `next` or `canary` if you want a public smoke test before `latest`.
10. Promote or republish as `latest` only after the package installs cleanly in a separate consumer app.

## Implementation phases

### Phase 1: Package metadata and README readiness

Files to edit:

- `packages/chat-provider/package.json`
- `packages/chat-provider/README.md` (new if absent)
- `packages/chat-overlay/package.json`
- `packages/chat-overlay/README.md` (new if absent)
- root `README.md` (new or update)

Checklist:

- Set `private: false` on publishable packages.
- Add description, license, author, repository, homepage, bugs, files, publishConfig, main, and types.
- Add `build:dist` script.
- Decide whether package tests exist now or should be skipped by the workflow until added.
- Document the minimal install path:

  ```bash
  pnpm add @go-go-golems/chat-provider @go-go-golems/chat-overlay
  ```

- Document required backend endpoints:
  - `POST /api/chat/sessions`
  - `POST /api/chat/sessions/{sessionId}/messages`
  - `POST /api/chat/sessions/{sessionId}/stop`
  - `POST /api/chat/sessions/{sessionId}/tools/manifest`
  - `POST /api/chat/sessions/{sessionId}/tools/results`
  - websocket endpoint derived by `buildWebSocketURL({ basePrefix })`

### Phase 2: Build artifact generation

Files to add:

- `scripts/packages/build-dist.mjs`
- `scripts/packages/pack-smoke.mjs`
- `scripts/packages/package-sets.mjs`
- `scripts/packages/publish-npm-package-set.mjs`

Validation commands:

```bash
pnpm install --frozen-lockfile
pnpm -r typecheck
npm run build:dist -w packages/chat-provider
npm run build:dist -w packages/chat-overlay
node scripts/packages/pack-smoke.mjs packages/chat-provider packages/chat-overlay
```

Expected artifacts:

```text
packages/chat-provider/dist/
├── index.js
├── index.d.ts
├── core/*.js
├── tools/*.js
├── widgets/*.js
├── ws/*.js
├── package.json
└── README.md

packages/chat-overlay/dist/
├── index.js
├── index.d.ts
├── overlay/*.js
├── theme/retro-mac.css
├── package.json
└── README.md
```

Inspect generated `dist/package.json` manually. Confirm:

- `private` is absent or false.
- `exports` point to `.js` runtime files.
- Type paths point to `.d.ts` files.
- `@go-go-golems/chat-provider` inside the overlay package is a concrete semver version, not `workspace:*`.
- CSS export points at copied CSS.

### Phase 3: CI and publish workflow

Files to add:

- `.github/workflows/ci.yml` or equivalent.
- `.github/workflows/publish-npm.yml`.

Minimum CI should run on pull requests and pushes:

```bash
pnpm install --frozen-lockfile
pnpm -r typecheck
pnpm test
npm run build:dist -w packages/chat-provider
npm run build:dist -w packages/chat-overlay
node scripts/packages/pack-smoke.mjs packages/chat-provider packages/chat-overlay
```

The publish workflow should be manual-only at first. Automatic publication on tags can be added later once versioning policy is settled.

### Phase 4: Repository transfer and secrets

Infrastructure tasks:

- Transfer or create `go-go-golems/react-chat`.
- Set `origin` to the final repository.
- Create/verify npm organization access for `@go-go-golems` packages.
- Create npm automation token.
- Store token in Vault or GitHub environment secret.
- Configure GitHub `npm-production` environment protections.
- Verify OIDC/Vault role names in the workflow.

### Phase 5: First publish rehearsal

Run a dry-run from GitHub Actions:

```text
package_set: all
npm_tag: next
dry_run: true
skip_existing: true
confirm_latest_publish: ""
```

Then run a local install smoke test from generated tarballs:

```bash
cd /tmp
mkdir react-chat-consumer-smoke && cd react-chat-consumer-smoke
pnpm init
pnpm add react react-dom @reduxjs/toolkit react-redux zod
pnpm add /path/to/react-chat/packages/chat-provider/dist/*.tgz
pnpm add /path/to/react-chat/packages/chat-overlay/dist/*.tgz
```

If using `npm pack` directly, keep the tarballs temporarily rather than deleting them in `pack-smoke.mjs`.

### Phase 6: First real publish

Recommended sequence:

1. Publish `all` with `npm_tag=next`, `dry_run=false`, `skip_existing=true`.
2. Create a clean consumer app and install with `@next`.
3. Verify imports, CSS import, and basic rendering.
4. Publish or retag as `latest` after confirmation:

   ```text
   package_set: all
   npm_tag: latest
   dry_run: false
   skip_existing: true
   confirm_latest_publish: CONFIRM_LATEST
   ```

## Testing and validation strategy

### Static validation

- `pnpm -r typecheck` must pass for both packages and the demo app.
- Package-specific `build:dist` must pass for both packages.
- Generated `dist/package.json` files must contain no `workspace:*` specifiers.
- Generated declarations must exist for every exported subpath.

### Packaging validation

- `node scripts/packages/pack-smoke.mjs packages/chat-provider packages/chat-overlay` must pass.
- `npm pack --json` should show only expected files.
- The overlay tarball must include `theme/retro-mac.css`.
- The overlay tarball must not include `src/stories/*.stories.*`.

### Consumer validation

Create a temporary Vite or plain TypeScript consumer and verify:

```ts
import { ChatProvider, useChatClient } from '@go-go-golems/chat-provider';
import { ChatPanel } from '@go-go-golems/chat-overlay';
import '@go-go-golems/chat-overlay/theme/retro-mac.css';
```

Then run:

```bash
pnpm install
pnpm typecheck
pnpm build
```

If the consumer cannot resolve subpath exports or CSS, fix the generated package manifest before publishing.

### Workflow validation

- Run GitHub workflow with `dry_run=true` first.
- Confirm the workflow resolves `provider`, `overlay`, `all`, and `single` package selection correctly.
- Confirm `latest` publish without `CONFIRM_LATEST` fails intentionally.
- Confirm `skip_existing=true` skips an already-published version rather than failing the whole package set.

## Risks, tradeoffs, and mitigations

### Risk: exporting too much internal API

`chat-provider` currently exports `./store`, `./tools`, `./widgets`, and `./ws` from source (`packages/chat-provider/package.json:7-14`). Once published, these become public API. Removing or changing them later is a breaking change.

Mitigation: review every exported subpath before the first publish. Keep only stable APIs in `exports`; move unstable internals behind explicit `./experimental/*` names if needed.

### Risk: raw TypeScript leaks to npm consumers

Current manifests point exports directly at `./src/*.ts`. That can work in a monorepo with Vite but is not a reliable public npm contract.

Mitigation: publish from generated `dist/` only, with `.js` runtime files and `.d.ts` declarations.

### Risk: `workspace:*` dependency leaks

`chat-overlay` depends on `@go-go-golems/chat-provider` using `workspace:*` (`packages/chat-overlay/package.json:19-21`). npm consumers cannot install that specifier from the registry.

Mitigation: use the copied `build-dist.mjs` workspace-version rewrite (`build-dist.mjs:328-364`, `391-392`) and inspect generated `dist/package.json` before publishing.

### Risk: CSS tree-shaking or missing theme export

The overlay relies on theme CSS. If CSS is omitted from `files`, not copied to `dist`, or not preserved by `sideEffects`, consumers may see unstyled UI.

Mitigation: keep `sideEffects: ['**/*.css']`, include CSS in `files`, copy CSS assets during `build:dist`, and test importing `@go-go-golems/chat-overlay/theme/retro-mac.css` from a clean consumer app.

### Risk: repository metadata changes after first publish

If the repo is renamed after publishing, initial package versions will permanently point to the old prototype URL.

Mitigation: move to `go-go-golems/react-chat` before first publication.

### Risk: publishing token is too broad

A long-lived npm token in GitHub secrets can be overpowered.

Mitigation: follow the `go-go-os-frontend` OIDC/Vault pattern and use npm provenance. If a temporary secret is used, replace it with Vault before making publishing routine.

## Alternatives considered

### Publish raw source directly

This would require fewer scripts, because the current package exports already point at TypeScript source. It is not recommended. Consumers should not need to compile TypeScript from `node_modules`, and public npm packages should provide JavaScript and declarations.

### Use Changesets immediately

Changesets would provide a nicer versioning and changelog workflow, especially as the package family grows. It is not required for the first publish. The existing `go-go-os-frontend` workflow already supports manual package sets, dry-run, skip-existing, and provenance.

### Publish only `@go-go-golems/chat-overlay`

This would hide the provider package from users, but the overlay depends on provider APIs and advanced users may want runtime-only embedding. Publishing both packages is clearer and matches the actual architecture.

### Rename npm package to `@go-go-golems/react-chat`

A single package name is cleaner, especially given the target repo name. The tradeoff is that the current architecture is already split into runtime provider and UI overlay packages. Recommended compromise: keep `@go-go-golems/chat-provider` and `@go-go-golems/chat-overlay` for the first publish, and reserve `@go-go-golems/react-chat` for a future meta-package if needed.

## Intern-oriented implementation checklist

Use this checklist exactly when implementing.

1. Confirm repository state.
   - `git status --short`
   - `git remote -v`
2. Transfer or rename repository to `go-go-golems/react-chat`.
3. Update local `origin`.
4. Add package READMEs.
5. Edit both package manifests for public metadata.
6. Copy package scripts from `go-go-os-frontend/scripts/packages/`.
7. Reduce `package-sets.mjs` to provider/overlay/all.
8. Add `build:dist` scripts to both packages.
9. Add root helper scripts if desired:
   - `build:publish`: build both packages.
   - `pack:smoke`: pack-smoke both packages.
10. Add GitHub CI.
11. Add manual publish workflow.
12. Configure npm token through Vault or environment secret.
13. Run local validation.
14. Run GitHub workflow dry-run.
15. Publish `next`.
16. Test in a clean consumer app.
17. Publish `latest` only after sign-off.

## API reference snapshot

### `ChatProviderConfig`

Observed in `packages/chat-provider/src/core/createChatClient.ts:12-21`:

```ts
type ChatProviderConfig = ChatExtensionConfig & {
  basePrefix?: string;
  apiBase?: string;
  sessionIdParam?: string;
  sessionStorageKey?: string;
  onSessionIdChange?: (sessionId: string | null) => void;
  onDebugEvent?: ChatDebugHandler;
  createSessionBody?: () => ChatRequestBody | Promise<ChatRequestBody>;
  sendMessageBody?: (args: { prompt: string }) => ChatRequestBody | Promise<ChatRequestBody>;
};
```

### `ChatClient`

Observed in `packages/chat-provider/src/core/createChatClient.ts:36-46`:

```ts
type ChatClient = {
  connect: () => Promise<void>;
  send: (prompt: string) => Promise<void>;
  stop: () => Promise<void>;
  open: () => void;
  close: () => void;
  toggle: () => void;
  reset: () => void;
  getStore: () => ChatStore;
  tools: ChatClientTools;
};
```

### `WidgetDefinition`

Observed in `packages/chat-provider/src/widgets/widgetRegistry.ts:10-18`:

```ts
type WidgetDefinition = {
  name: string;
  component: React.ComponentType<WidgetProps>;
};
```

### `ToolRuntime`

Observed in `packages/chat-provider/src/tools/toolRuntime.ts:12-23`:

```ts
type ToolRuntime = {
  cancelActiveFrontendTools: () => void;
  handleFrontendToolUIEvent: (frame: CanonicalFrame) => void;
  isPendingHumanTool: (toolCallId: string) => boolean;
  respondToHumanTool: (args: {
    toolCallId: string;
    toolName: string;
    result?: Record<string, unknown>;
    status?: 'success' | 'denied' | 'failed' | 'cancelled';
    error?: string;
  }) => Promise<void>;
};
```

## File references

Primary target files:

- `2026-05-29--chatbot-overlay-glm/package.json`
- `2026-05-29--chatbot-overlay-glm/pnpm-workspace.yaml`
- `2026-05-29--chatbot-overlay-glm/packages/chat-provider/package.json`
- `2026-05-29--chatbot-overlay-glm/packages/chat-provider/src/core/createChatClient.ts`
- `2026-05-29--chatbot-overlay-glm/packages/chat-provider/src/react/ChatProvider.tsx`
- `2026-05-29--chatbot-overlay-glm/packages/chat-provider/src/tools/toolRuntime.ts`
- `2026-05-29--chatbot-overlay-glm/packages/chat-provider/src/widgets/widgetRegistry.ts`
- `2026-05-29--chatbot-overlay-glm/packages/chat-provider/src/ws/wsManager.ts`
- `2026-05-29--chatbot-overlay-glm/packages/chat-overlay/package.json`
- `2026-05-29--chatbot-overlay-glm/packages/chat-overlay/src/overlay/ChatPanel.tsx`
- `2026-05-29--chatbot-overlay-glm/packages/chat-overlay/src/theme/retro-mac.css`

Reference implementation files:

- `go-go-os-frontend/.github/workflows/publish-npm.yml`
- `go-go-os-frontend/scripts/packages/build-dist.mjs`
- `go-go-os-frontend/scripts/packages/pack-smoke.mjs`
- `go-go-os-frontend/scripts/packages/package-sets.mjs`
- `go-go-os-frontend/scripts/packages/publish-npm-package-set.mjs`
- `go-go-os-frontend/packages/os-chat/package.json`

## Open questions

1. Should `@go-go-golems/chat-provider` keep `./store` and `./ws` as public exports, or should those be treated as internal before `0.1.0` is published?
2. Should `react-redux` be a dependency, peer dependency, or both for `chat-provider`? The current package imports it directly, but duplicate React Redux instances can be confusing in some app setups.
3. Should the first public publish use `0.1.0` or bump to `0.1.1` after metadata/publishing changes?
4. Will the npm token be provisioned through Vault before the first publish, or should the first dry-run use a GitHub environment secret?
5. Should `@go-go-golems/react-chat` be reserved as a future meta-package name?
