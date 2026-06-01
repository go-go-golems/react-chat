---
Title: Source Pack - npm Trusted Publishing for React Chat
Ticket: CHATOVERLAY-013
Status: active
Topics:
    - npm
    - publishing
    - security
DocType: reference
Intent: long-term
Owners: []
RelatedFiles: []
ExternalSources: []
Summary: "Defuddle-captured source documents for migrating React chat package publishing from Vault npm tokens to npm Trusted Publishing."
LastUpdated: 2026-06-01T15:45:00-04:00
WhatFor: "Use when updating publish-npm.yml and npm package settings to tokenless trusted publishing."
WhenToUse: "Before configuring npm trusted publishers, disallowing package tokens, or removing Vault NODE_AUTH_TOKEN from workflows."
---

# Source Pack: npm Trusted Publishing for React Chat

Captured with `defuddle parse <url> --md` on 2026-06-01.

## Sources

1. `01-npm-trusted-publishers.md`
   - URL: https://docs.npmjs.com/trusted-publishers/
   - Why it matters: canonical setup for GitHub Actions trusted publishing, required workflow permissions, npm CLI/Node requirements, and token lockdown guidance.

2. `02-npm-trust-cli.md`
   - URL: https://docs.npmjs.com/cli/v11/commands/npm-trust/
   - Why it matters: CLI setup for trusted publishers with `npm trust github`, including package existence prerequisite and bulk setup notes.

3. `03-npm-requiring-2fa-and-disallow-tokens.md`
   - URL: https://docs.npmjs.com/requiring-2fa-for-package-publishing-and-settings-modification/
   - Why it matters: explains `Require two-factor authentication and disallow tokens`, and confirms granular tokens cannot publish once token publishing is disallowed.

4. `04-npm-generating-provenance-statements.md`
   - URL: https://docs.npmjs.com/generating-provenance-statements/
   - Why it matters: confirms trusted publishing automatically generates provenance statements.

5. `05-github-changelog-npm-trusted-publishing-ga.md`
   - URL: https://github.blog/changelog/2025-07-31-npm-trusted-publishing-with-oidc-is-generally-available/
   - Why it matters: GitHub/npm announcement with setup fields: owner, repository, workflow filename, environment.

## Practical conclusion

For existing packages, configure trusted publishers first, verify tokenless publish works, then set Publishing access to `Require two-factor authentication and disallow tokens`. For brand-new packages that do not yet exist, `npm trust` cannot configure them by CLI; first create/publish the package interactively or with a temporary valid token, then configure trusted publishing and lock tokens down.
