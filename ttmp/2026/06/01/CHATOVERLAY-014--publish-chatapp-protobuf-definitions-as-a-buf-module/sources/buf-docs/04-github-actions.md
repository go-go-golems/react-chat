---
Title: Buf docs - GitHub Actions
Ticket: CHATOVERLAY-014
Status: active
Topics:
    - protobuf
    - buf
DocType: reference
Intent: external-source
Owners: []
RelatedFiles: []
ExternalSources:
    - https://buf.build/docs/
Summary: "Captured external Buf documentation excerpt for CHATOVERLAY-014 research."
LastUpdated: 2026-06-01T20:40:00-04:00
WhatFor: "Source material for the Buf module publication design."
WhenToUse: "Use when validating statements about Buf publishing, dependencies, configuration, or GitHub Actions."
---

## CI/CD integration with the Buf GitHub Action

The [Buf GitHub Action (`bufbuild/buf-action`)](https://github.com/bufbuild/buf-action) runs the [Buf CLI](https://buf.build/) inside a GitHub workflow. On a single workflow file, it covers [build](https://buf.build/docs/reference/cli/buf/build/), [lint](https://buf.build/docs/lint/), [format](https://buf.build/docs/format/), and [breaking change](https://buf.build/docs/breaking/) checks for pull requests, [pushes named modules](https://buf.build/docs/bsr/module/publish/) to the BSR on Git push, and archives BSR labels when a Git branch is deleted.

That last part is what turns CI from a gate into a publishing pipeline: every accepted schema change can update BSR documentation, generated SDKs, Studio, dependency resolution, and registry-side checks without a separate release job.

For non-GitHub CI systems, see [CI/CD setup](https://buf.build/docs/bsr/ci-cd/setup/).

![Annotations on a pull request showing lint and breaking-change findings](https://buf.build/docs/images/integrations/gh-annotations-example.png "Annotations example")

## Quickstart

Add `.github/workflows/buf-ci.yaml` to your repository:

```
.github/workflows/buf-ci.yamlname: Buf CI
on:
  push:
  pull_request:
    types: [opened, synchronize, reopened, labeled, unlabeled]
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
          # BSR token; required for push and label-archive steps.
          token: ${{ secrets.BUF_TOKEN }}
          # Set this to install Buf and stop, leaving subsequent steps to call buf directly.
          # setup_only: true
          # Optional GitHub token to avoid rate limits.
          # github_token: ${{ secrets.GITHUB_TOKEN }}
```

The default configuration:

- Runs `build`, `lint`, `format`, and `breaking` checks on pull requests, with a [summary comment](https://buf.build/docs/bsr/ci-cd/github-actions/#configure-summary-comment) on each.
- Runs `buf push` on pushes to the repository (commits, branches, and tags), publishing every named module to the BSR with the matching Git metadata.
- Archives BSR [labels](https://buf.build/docs/bsr/commits-labels/#labels) when a Git branch or tag is deleted.

## Authentication

### BSR token

The `push` and label-archive steps need a [BSR token](https://buf.build/docs/bsr/authentication/#create-a-token). Pass it via the `token` parameter, sourced from a [GitHub secret](https://docs.github.com/en/actions/security-guides/encrypted-secrets):

```
- uses: bufbuild/buf-action@v1
  with:
    token: ${{ secrets.BUF_TOKEN }}
```

A post-action step runs `buf registry logout` so the token doesn’t linger in `~/.netrc` after the job ends.

### GitHub token

The action calls the GitHub API for PR comments and breaking-change comparison; `github_token` defaults to `${{ github.token }}`, so on standard workflows you don’t need to set anything. Pass it explicitly if you want to use a different token (for example, a PAT with broader permissions):

```
- uses: bufbuild/buf-action@v1
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
```

On GitHub Enterprise Server, `public_github_token` is a separate parameter that supplies a `github.com` token used to resolve and download Buf CLI release artifacts. It isn’t a substitute for `github_token`.

## What runs when

The action’s defaults map events to steps:

| Event | Default steps |
| --- | --- |
| `pull_request` (including from forks) | `build`, `lint`, `format`, `breaking` |
| `pull_request` from a non-fork | Same as above plus a [summary comment](https://buf.build/docs/bsr/ci-cd/github-actions/#configure-summary-comment) |
| `push` | `build` plus `push` (the BSR `buf push` of named modules) |
| `delete` (Git branch or tag) | Archive matching BSR [labels](https://buf.build/docs/bsr/commits-labels/#labels) |
| `pull_request` with the `buf skip breaking` label | Same as `pull_request` but without the `breaking` step |

`build` always runs (it isn’t gated by a parameter); the per-step toggles below override the rest. PR-comment steps are skipped automatically on pull requests from forks so the workflow doesn’t fail on the missing token. Don’t enable `push` or `archive` on fork PRs: doing so requires exposing a BSR token to untrusted contributors, which isn’t supported.

## Customize behavior

The Action exposes a parameter for each capability. The patterns below cover the common cases; for the full surface, see [Parameters](https://buf.build/docs/bsr/ci-cd/github-actions/#parameters).

### Pin the Buf CLI version

For reproducible builds, set `version`:

```
- uses: bufbuild/buf-action@v1
  with:
    version: "1.70.0"
```

If you don’t set `version`, the action resolves in this order: the `BUF_VERSION` environment variable, any `buf` already installed on the runner, then the latest release on GitHub.

### Specify an input directory

For repositories where `buf.yaml` lives in a subdirectory, set `input`:

```
- uses: bufbuild/buf-action@v1
  with:
    input: <path/to/module>
```

By default `breaking` compares against the same subdirectory at the comparison ref. To override, set `breaking_against`:

```
- uses: bufbuild/buf-action@v1
  with:
    input: <path/to/module>
    breaking_against: ${{ github.event.repository.clone_url }}#format=git,commit=${{ github.event.pull_request.base.sha }},subdir=<path/to/module>
```

Or check out the base branch into a separate path and point at it locally:

```
- uses: actions/checkout@v4
  with:
    path: head
- uses: actions/checkout@v4
  with:
    path: base
    ref: ${{ github.event.pull_request.base.sha }}
- uses: bufbuild/buf-action@v1
  with:
    input: head/<path/to/module>
    breaking_against: base/<path/to/module>
```

For the full input grammar, see [Inputs](https://buf.build/docs/reference/inputs/).

### Run setup only

To install the Buf CLI without running any of the action’s checks (so subsequent steps can call `buf` directly), set `setup_only: true`:

```
- uses: bufbuild/buf-action@v1
  with:
    setup_only: true
- run: buf build --error-format github-actions
```

See the [`only-setup` example](https://github.com/bufbuild/buf-action/blob/main/examples/only-setup/buf-ci.yaml) for a full configuration.

### Skip breaking-change detection

The default workflow checks for a `buf skip breaking` label on the pull request and skips the `breaking` step when it’s present. This makes intentional breaks visible and reviewable.

To enable the label-based skip, add a `buf skip breaking` label to the repository (in **Issues** > **Labels**, or directly on a PR via **Edit labels**) and keep the default `pull_request` event types in the workflow:

```
Default pull_request types include labeled and unlabeledon:
  pull_request:
    types: [opened, synchronize, reopened, labeled, unlabeled]
```

![Pull request showing the buf skip breaking label disabling breaking-change detection](https://buf.build/docs/images/integrations/gh-skip-breaking-example.png "Skip breaking changes example")

To opt out of label-based skipping, override `breaking` so it depends only on the event type:

```
- uses: bufbuild/buf-action@v1
  with:
    breaking: ${{ github.event_name == 'pull_request' }}
```

See [`examples/disable-skip/buf-ci.yaml`](https://github.com/bufbuild/buf-action/blob/main/examples/disable-skip/buf-ci.yaml) for the full setup.

For a commit-message-based skip instead of a PR label, condition `breaking` on `head_commit.message`:

```
- uses: bufbuild/buf-action@v1
  with:
    breaking: |
      contains(fromJSON('["push", "pull_request"]'), github.event_name) &&
      !contains(github.event.head_commit.message, 'buf skip breaking')
```

### Disable specific steps

The opt-out steps (`lint`, `format`, `breaking`, `push`, `archive`, and `pr_comment`) each have a boolean parameter. Set it to `false` to disable that step. `build` always runs and isn’t gated by a parameter.

```
- uses: bufbuild/buf-action@v1
  with:
    format: false
```

### Customize per-step triggers

To run a step on additional events, set its parameter to a GitHub Actions expression that evaluates to a boolean. For example, to run `format` on both push and pull request:

```
- uses: bufbuild/buf-action@v1
  with:
    format: ${{ contains(fromJSON('["push", "pull_request"]'), github.event_name) }}
```

### Push only when APIs change

To skip pushes that don’t touch Buf-related files, restrict the `push` event itself with a `paths` filter:

```
paths filter on the push eventpush:
  paths:
    - '**.proto'
    - '**/buf.yaml'
    - '**/buf.lock'
    - '**/buf.md'
    - '**/README.md'
    - '**/LICENSE'
```

See the [`push-on-changes` example](https://github.com/bufbuild/buf-action/blob/main/examples/push-on-changes/buf-ci.yaml) for the full configuration.

### Configure summary comment

The action posts a comment on each pull request summarizing the latest check results:

![Pull request comment summarizing the latest Buf check results](https://buf.build/docs/images/integrations/gh-comment-example.png "Summary comment example")

The comment is keyed by `<workflow>:<job>`. If two workflows share the same workflow-and-job names, one run’s comment will overwrite the other’s; give them distinct workflow or job names if you need both visible.

To disable the comment, set `pr_comment: false` and drop the `pull-requests: write` permission, since the action no longer needs it:

```
Disable the summary comment name: Buf CI
 on:
   push:
   pull_request:
     types: [opened, synchronize, reopened, labeled, unlabeled]
   delete:
 permissions:
   contents: read
-  pull-requests: write
 jobs:
   buf:
     runs-on: ubuntu-latest
     steps:
       - uses: actions/checkout@v4
       - uses: bufbuild/buf-action@v1
         with:
           token: ${{ secrets.BUF_TOKEN }}
+          pr_comment: false
```

## Parameters

Set parameters under the `with:` block of the `bufbuild/buf-action` step.

### Setup

| Parameter | Description | Default |
| --- | --- | --- |
| `version` | Buf CLI version to install. | Latest [release](https://github.com/bufbuild/buf/releases) |
| `setup_only` | Install Buf and stop, without running any check. | `false` |

### Authentication

| Parameter | Description | Default |
| --- | --- | --- |
| `token` | BSR token for `push` and label-archive steps. | *none* |
| `github_actor` | GitHub actor for API requests. | Actor from the GitHub context |
| `github_token` | GitHub token for API requests (avoids rate limits). | Token from the GitHub context |

### Input selection

| Parameter | Description | Default |
| --- | --- | --- |
| `input` | [Input](https://buf.build/docs/reference/inputs/) for the `buf` command. | *none* (repository root) |
| `paths` | Limit to specific files or directories (newline-separated). | *none* |
| `exclude_imports` | Exclude files imported by the target modules. | `false` |
| `exclude_paths` | Exclude specific files or directories (newline-separated). | *none* |

### Step toggles

Each toggle defaults to a sensible event filter; override with `false` to disable, or with a GitHub Actions expression for a custom condition.

| Parameter | Description | Default behavior |
| --- | --- | --- |
| `lint` | Run `buf lint`. | Runs on pull requests |
| `format` | Run `buf format` and report diffs. | Runs on pull requests |
| `breaking` | Run breaking-change detection. | Runs on pull requests, skipped when the `buf skip breaking` label is present |
| `push` | Run `buf push` of named modules. | Runs on pushes from non-fork branches |
| `archive` | Archive BSR labels matching deleted Git refs. | Runs on `delete` events from non-fork branches |
| `pr_comment` | Post a summary comment on the PR. | Posts on non-fork pull requests |

### Breaking comparison

| Parameter | Description | Default |
| --- | --- | --- |
| `breaking_against` | [Input](https://buf.build/docs/reference/inputs/) to compare against. | Base of the PR (or the commit before a push) |
| `breaking_against_registry` | Use the BSR for the comparison instead of `breaking_against`. | `false` |

### Push and archive

| Parameter | Description | Default |
| --- | --- | --- |
| `push_create_visibility` | Visibility of repositories the action creates: `public` or `private`. | `private` |
| `push_disable_create` | Don’t auto-create BSR repositories on push. | `false` |

### Advanced

| Parameter | Description | Default |
| --- | --- | --- |
| `checksum` | sha256 of the Buf CLI binary to verify after download. | *none* |
| `domain` | BSR host for login (set this for private BSR instances). | `buf.build` |
| `public_github_token` | Token for `https://github.com` requests when running on a private GitHub Enterprise instance. | *none* |

## Migrate from the individual actions

If you’re using the previous individual actions (`buf-setup-action`, `buf-lint-action`, `buf-breaking-action`, `buf-push-action`), see [`bufbuild/buf-action/MIGRATION.md`](https://github.com/bufbuild/buf-action/blob/main/MIGRATION.md) for step-by-step instructions. The unified action covers everything those four did and adds PR summary comments, label-based skip-breaking, automatic Git metadata on pushes, and label-archive on branch delete.

The individual actions still work but will be removed in a future release. For an overview of the old action layout and a high-level mapping, see [GitHub Actions (deprecated)](https://buf.build/docs/bsr/ci-cd/gh-actions/).

## Debugging

Re-run the workflow with [debug logging enabled](https://github.blog/changelog/2022-05-24-github-actions-re-run-jobs-with-debug-logging/); the action passes `--debug` to the main `buf` invocations (`lint`, `format`, `breaking`, `push`, `archive`) when GitHub debug logging is on.