---
Title: GitHub Changelog npm Trusted Publishing GA
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
ExternalSources:
    - https://github.blog/changelog/2025-07-31-npm-trusted-publishing-with-oidc-is-generally-available/
Summary: "Defuddle capture of GitHub Changelog npm Trusted Publishing GA."
LastUpdated: 2026-06-01T15:45:00-04:00
WhatFor: "Source material for migrating React chat publishing to npm Trusted Publishing."
WhenToUse: "Use when configuring trusted publishers, tokenless workflows, or package publishing access."
---

As of today, **npm trusted publishing with OpenID Connect (OIDC)** is now generally available. This feature enables you to securely publish npm packages directly from CI/CD workflows using OpenID Connect (OIDC) for authentication, reducing the need to manage long-lived tokens.

## What’s new

With trusted publishing, you can now:

- **Publish packages without npm tokens**: Configure your packages to accept publishes from specific [GitHub Actions](https://github.com/features/actions) or [GitLab CI/CD](https://docs.gitlab.com/ci/pipelines/) workflows using [OIDC](https://openid.net/developers/how-connect-works/) authentication.
- **Eliminate token security risks**: No more storing, rotating, or accidentally exposing npm tokens in your CI/CD environments.
- **Establish cryptographic trust**: Each publish is authenticated using short-lived, workflow-specific credentials that cannot be exfiltrated or reused.
- **Get automatic provenance**: When using trusted publishing, npm CLI publishes provenance attestations by default. The `--provenance` flag is no longer needed.

Trusted publishing brings enterprise-grade security to your npm publishing workflow and is available today for:

- All npm private and public packages, both scoped and unscoped.
- GitHub Actions (GitHub-hosted runners).
- GitLab CI/CD (gitlab.com shared runners).

This feature requires npm CLI v11.5.1 or later. Note that [provenance remains unavailable when publishing from private source repositories](https://github.blog/changelog/2023-07-25-publishing-with-npm-provenance-from-private-source-repositories-is-no-longer-supported/).

## How it works

Trusted publishing creates a [trust relationship](https://docs.github.com/actions/concepts/security/about-security-hardening-with-openid-connect) between npm and your CI/CD provider. When you configure a trusted publisher for your package, npm will only accept publishes from the specific workflow you’ve authorized.

### Setting up trusted publishing

1. **Configure on npmjs.com**: Navigate to your package settings and add a trusted publisher by specifying:
	- For GitHub Actions: organization/user, repository, workflow filename, and environment name.
		- For GitLab CI/CD: namespace, project, the top-level CI file path, and environment name.
2. **Update your workflow**: Add the required permissions / ID tokens to your workflow file. No need to generate npm write tokens!
3. **Publish securely**: Your workflow can now publish directly to npm using OIDC authentication.

Make sure you follow the [detailed steps from our documentation](https://docs.npmjs.com/trusted-publishers).

## Automatic provenance with trusted publishing

When you publish using trusted publishing, the npm CLI automatically generates and publishes provenance attestations for your package. This means you don’t need to add the `--provenance` flag to your publish command.

Every package published via trusted publishing includes cryptographic proof of its source and build environment. Your users can verify where and how your package was built, increasing trust in your supply chain.

If needed, you can explicitly [opt out of provenance](https://docs.npmjs.com/generating-provenance-statements#using-third-party-package-publishing-tools) by setting `NPM_CONFIG_PROVENANCE=false` or specific parameters in the `package.json` or `.npmrc` files.

## Getting started

Check out [our documentation](https://docs.npmjs.com/trusted-publishers) for detailed setup instructions and examples for both GitHub Actions and GitLab CI/CD.

For packages that were part of the private preview, your trusted publisher configurations remain active and will continue working.

## What’s next

We’re committed to expanding trusted publishing support. Stay tuned for updates on additional CI/CD providers and self-hosted runner support.

---

We’d like to thank all the participants in our private preview program whose feedback was invaluable in shaping this feature. Trusted publishing represents a significant step forward in npm’s security posture, and we’re excited to see how the community adopts this new capability.

Happy (and secure) publishing! 🚀

Join the discussion in [GitHub Community](https://github.com/orgs/community/discussions/categories/announcements).

[

Back to top

](https://github.blog/changelog/2025-07-31-npm-trusted-publishing-with-oidc-is-generally-available/#start-of-content)