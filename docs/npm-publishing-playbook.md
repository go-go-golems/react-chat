# npm Publishing Playbook

This repository publishes `@go-go-golems/chat-provider` and `@go-go-golems/chat-overlay` to npm through npm Trusted Publishing. The publish workflow does not use `NODE_AUTH_TOKEN`, `NPM_TOKEN`, GitHub secrets, or Vault npm tokens.

## Current publishing model

- GitHub repository: `go-go-golems/react-chat`
- Workflow file: `.github/workflows/publish-npm.yml`
- GitHub environment: `npm-production`
- npm packages:
  - `@go-go-golems/chat-provider`
  - `@go-go-golems/chat-overlay`
- npm trusted publisher for each package:
  - provider: GitHub Actions
  - repository: `go-go-golems/react-chat`
  - workflow filename: `publish-npm.yml`
  - environment: `npm-production`
- package publishing access: `Require two-factor authentication and disallow tokens`

The workflow publishes from generated `dist/` directories. It builds JavaScript and TypeScript declarations, copies CSS assets, rewrites source exports to runtime exports, and rewrites `workspace:*` dependencies to concrete package versions.

## Before publishing

1. Choose the target package set.
   - Use `all` when provider and overlay versions should move together.
   - Use `single` only for a package-specific patch.
2. Bump package versions in `packages/*/package.json`.
   - If `chat-overlay` depends on `chat-provider`, publish the provider version first or publish `all` so the ordered package set handles it.
3. Run local validation:

   ```bash
   pnpm install --frozen-lockfile
   pnpm -r typecheck
   pnpm test
   npm run build:publish
   npm run pack:smoke
   ```

4. Inspect generated package metadata when changing exports or dependencies:

   ```bash
   cat packages/chat-provider/dist/package.json
   cat packages/chat-overlay/dist/package.json
   ```

   Confirm there are no `workspace:*` dependencies and that CSS exports point to copied files.

5. Commit and push to `main`.

## Publish under `next`

Use `next` for proof publishes and release candidates. This creates immutable npm versions without moving the default install target.

```bash
gh workflow run publish-npm.yml \
  --repo go-go-golems/react-chat \
  --ref main \
  -f package_set=all \
  -f npm_tag=next \
  -f dry_run=false \
  -f skip_existing=true \
  -f confirm_latest_publish=''
```

Watch the run:

```bash
gh run watch <run-id> --repo go-go-golems/react-chat --exit-status
```

Verify dist-tags:

```bash
npm view @go-go-golems/chat-provider dist-tags --json
npm view @go-go-golems/chat-overlay dist-tags --json
```

## Consumer smoke test

Create a clean project outside the repo and install from npm:

```bash
mkdir -p /tmp/react-chat-npm-smoke/src
cd /tmp/react-chat-npm-smoke
pnpm init
pnpm add @go-go-golems/chat-provider@next @go-go-golems/chat-overlay@next react react-dom
pnpm add -D typescript vite @vitejs/plugin-react @types/react @types/react-dom
```

Use a minimal app that imports the provider, overlay, and CSS subpath:

```tsx
import { ChatProvider } from '@go-go-golems/chat-provider';
import { ChatPanel } from '@go-go-golems/chat-overlay';
import '@go-go-golems/chat-overlay/theme/retro-mac.css';

export function App() {
  return (
    <ChatProvider config={{ basePrefix: '' }}>
      <ChatPanel />
    </ChatProvider>
  );
}
```

Run the consumer checks:

```bash
pnpm typecheck
pnpm build
```

This catches package export, declaration, dependency, and CSS portability problems that monorepo tests can miss.

## Publish or promote `latest`

A real `latest` publish requires explicit confirmation:

```bash
gh workflow run publish-npm.yml \
  --repo go-go-golems/react-chat \
  --ref main \
  -f package_set=all \
  -f npm_tag=latest \
  -f dry_run=false \
  -f skip_existing=true \
  -f confirm_latest_publish=CONFIRM_LATEST
```

If the version is already published under `next`, prefer using npm dist-tags to promote after validation:

```bash
npm dist-tag add @go-go-golems/chat-provider@<version> latest
npm dist-tag add @go-go-golems/chat-overlay@<version> latest
```

## Adding a new package

For a new package, npm Trusted Publishing has one bootstrap constraint: the package must exist before `npm trust github` can configure the trusted publisher from the CLI.

The sequence is:

1. Build and validate the package locally.
2. Perform one interactive first publish with an npm account that has package creation rights:

   ```bash
   npm publish packages/<name>/dist --access public --tag next --otp=<OTP>
   ```

3. Configure the trusted publisher:

   ```bash
   npx -y npm@latest trust github @go-go-golems/<name> \
     --repo go-go-golems/react-chat \
     --file publish-npm.yml \
     --env npm-production \
     --allow-publish
   ```

4. Set package publishing access to disallow tokens:

   ```bash
   npx -y npm@latest access set mfa=publish @go-go-golems/<name>
   ```

5. Publish the next version through GitHub Actions to prove the trusted path.

## Failure modes

- `npm trust ... E404`: the package probably does not exist yet, or the npm account lacks package access.
- `npm publish E404`: npm could not authorize the publish for that scoped package. Check package existence, trusted publisher settings, and package access.
- `npm publish EOTP`: the command is using interactive account authentication and needs a current 2FA code.
- Consumer build fails on CSS imports: exported CSS probably depends on a processor or package that the consumer has not configured.
- `workspace:*` appears in `dist/package.json`: the publish artifact was not rewritten correctly and must not be published.

## Security rules

- Do not add `NODE_AUTH_TOKEN` or `NPM_TOKEN` to this publish workflow.
- Do not restore Vault npm token reads for public package publication.
- Keep `permissions.id-token: write` in the publish workflow.
- Keep the npm trusted publisher environment aligned with GitHub's `npm-production` environment.
- Keep package publishing access set to `Require two-factor authentication and disallow tokens`.
