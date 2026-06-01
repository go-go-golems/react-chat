---
Title: npm Requiring 2FA and Disallow Tokens
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
    - https://docs.npmjs.com/requiring-2fa-for-package-publishing-and-settings-modification/
Summary: "Defuddle capture of npm Requiring 2FA and Disallow Tokens."
LastUpdated: 2026-06-01T15:45:00-04:00
WhatFor: "Source material for migrating React chat publishing to npm Trusted Publishing."
WhenToUse: "Use when configuring trusted publishers, tokenless workflows, or package publishing access."
---

[Skip to search](https://docs.npmjs.com/requiring-2fa-for-package-publishing-and-settings-modification/#search-box-input) [Skip to content](https://docs.npmjs.com/requiring-2fa-for-package-publishing-and-settings-modification/#skip-to-content)

## Requiring 2FA for package publishing and settings modification

Table of contents

All packages now require two-factor authentication (2FA) or a [granular access tokens with bypass 2FA enabled](https://docs.npmjs.com/creating-and-viewing-access-tokens#creating-granular-access-tokens-on-the-website) for creating and publishing packages.

Modifying a package's settings also requires two-factor authentication (2FA).

For CI/CD workflows, consider using [trusted publishing](https://docs.npmjs.com/trusted-publishers), which provides secure, token-free publishing that automatically enforces strong authentication without requiring manual token management.

**Important notes about granular access tokens:**

- Bypass 2FA configuration is set at token creation
- When **bypass 2FA is disabled**: The system will check account-level and package-level settings to determine if 2FA is required
- When **bypass 2FA is enabled**: The token will bypass all 2FA requirements at all times, regardless of account-level or package-level 2FA settings
- When **Require two-factor authentication and disallow tokens** is selected at the package level, granular access tokens cannot be used regardless of their bypass 2FA setting

## Configuring two-factor authentication on package settings

1. On the npm " [Sign In](https://www.npmjs.com/login) " page, enter your account details and click **Sign In**. ![Screenshot of npm login dialog](https://docs.npmjs.com/shared/user-login.png)
2. Navigate to the package on which you want to require a second factor to publish or modify settings.
3. Click **Settings**.
	![Screenshot showing the admin tab on a package page](https://docs.npmjs.com/packages-and-modules/securing-your-code/2fa-package-admin.png)
4. Under "Publishing access", select the requirements to publish a package.
	1. **Require two-factor authentication or a granular access token with bypass 2fa enabled** (Default)  
		This is the default option for all new packages. With this option, maintainers must have two-factor authentication enabled for their account. If they publish a package interactively, using the `npm publish` command, they will be required to respond to a 2FA prompt when they perform the publish. However, maintainers may also create a [granular access token with bypass 2FA enabled](https://docs.npmjs.com/creating-and-viewing-access-tokens#creating-granular-access-tokens-on-the-website) and use that for a non-interactive publish.
		2. **Require two-factor authentication and disallow tokens** (Recommended) With this option, a maintainer must have two-factor authentication enabled for their account, and they must publish interactively. Maintainers will be required to respond to a 2FA prompt when they perform the publish. Granular access tokens cannot be used to publish packages, regardless of their bypass 2FA setting.
	![Screenshot showing the require two-factor option for a package](https://docs.npmjs.com/packages-and-modules/securing-your-code/2fa-package-setting.png)

5\. Click **Update Package Settings**.

[Edit this page on GitHub](https://github.com/npm/documentation/edit/main/content/packages-and-modules/securing-your-code/requiring-2fa-for-package-publishing-and-settings-modification.mdx)

10 contributors

Last edited by [shmam](https://github.com/shmam) on [December 10, 2025](https://github.com/npm/documentation/commit/b8298f9f1c98719e66cd3cf8c18fd1fcf04ff47a)