---
Title: Buf docs - buf.yaml v2
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

## buf.yaml v2 config file

The `buf.yaml` file defines a [workspace](https://buf.build/docs/cli/modules-workspaces/), which represents a directory or directories of Protobuf files that you want to treat as a unit. The set consists of one or more packages; see [Files and packages](https://buf.build/docs/reference/protobuf-files-and-packages/) for more details about these relationships and how to structure your files.

The `buf.yaml` config file and field definitions below explain usage for each field. See the [lint](https://buf.build/docs/lint/usage/#defaults-and-configuration) and [breaking change detection](https://buf.build/docs/breaking/usage/#defaults-and-configuration) overviews for default configurations for those features.

The annotated `buf.yaml` file below assumes a directory structure like this:

```
workspace_root
├── buf.yaml
└── proto
    ├── foo
    │   └── foo.proto
    └── bar
        ├── a
        │   └── d.proto
        ├── b
        │   ├── e.proto
        │   └── f.proto
        └── c
            ├── g.proto
            └── h.proto
```
```
Annotated buf.yaml configurationversion: v2
# The v2 buf.yaml file specifies a local workspace, which consists of at least one module.
# The buf.yaml file should be placed at the root directory of the workspace, which
# should generally be the root of your source control repository.
modules:
  # Each module entry defines a path, which must be relative to the directory where the
  # buf.yaml is located. You can also specify directories to exclude from a module.
  - path: proto/foo
    # Modules can also optionally specify their Buf Schema Registry module name, if it exists.
    name: buf.build/acme/foo
    # Subdirectories to exclude can be listed using relative paths. Paths are relative
    # to the buf.yaml file.
  - path: proto/bar
    name: buf.build/acme/bar
    excludes:
      - proto/bar/a
      - proto/bar/b/c
    # A module can have its own lint and breaking configuration, which overrides the default
    # lint and breaking configuration in its entirety for that module. All values from the
    # default configuration are overridden and no rules are merged.
    lint:
      use:
        - STANDARD
      except:
        - IMPORT_USED
      ignore:
        - proto/bar/c
      ignore_only:
        ENUM_ZERO_VALUE_SUFFIX:
          - proto/bar/a
          - proto/bar/b/f.proto
      # v1 configurations had an allow_comment_ignores option to opt-in to comment ignores.
      #
      # In v2, we allow comment ignores by default, and allow opt-out from comment ignores
      # with the disallow_comment_ignores option.
      disallow_comment_ignores: false
      enum_zero_value_suffix: _UNSPECIFIED
      rpc_allow_same_request_response: false
      rpc_allow_google_protobuf_empty_requests: false
      rpc_allow_google_protobuf_empty_responses: false
      service_suffix: Service
      disable_builtin: false
    # Breaking configuration for this module only. Behaves the same as a module-level
    # lint configuration.
    breaking:
      use:
        - FILE
      except:
        - EXTENSION_MESSAGE_NO_DELETE
      ignore_unstable_packages: true
      disable_builtin: false
  # Multiple modules are allowed to have the same path, as long as they don't share '.proto' files.
  - path: proto/common
    name: buf.build/acme/weather
    includes:
      - proto/common/weather
  - path: proto/common
    name: buf.build/acme/location
    includes:
      - proto/common/location
    excludes:
      # Excludes and includes can be specified at the same time, but if they are, each directory
      # in excludes must be contained in a directory in includes.
      - proto/common/location/test
  - path: proto/common
    name: buf.build/acme/other
    excludes:
      - proto/common/location
      - proto/common/weather
# Dependencies shared by all modules in the workspace. Must be modules hosted in the Buf Schema Registry.
# The resolution of these dependencies is stored in the buf.lock file.
deps:
  - buf.build/acme/paymentapis # The latest accepted commit.
  - buf.build/acme/pkg:47b927cbb41c4fdea1292bafadb8976f # The '47b927cbb41c4fdea1292bafadb8976f' commit.
  - buf.build/googleapis/googleapis:v1beta1.1.0 # The 'v1beta1.1.0' label.
# The default lint configuration for any modules that don't have a specific lint configuration.
#
# If this section isn't present, AND a module doesn't have a specific lint configuration, the default
# lint configuration is used for the module.
lint:
  use:
    - STANDARD
    - TIMESTAMP_SUFFIX # This rule comes from the plugin example below.
# Default breaking configuration. It behaves the same as the default lint configuration.
breaking:
  use:
    - FILE
# Optional Buf plugins. Can use to require custom lint or breaking change rules specified in a locally
# installed plugin. Each Buf plugin is listed separately, and can include options if the plugin allows
# for them. If a rule has its \`default\` value set to true, the rule will be checked against even if
# the 'lint' and 'breaking' fields aren't set.
#
# See the example at https://github.com/bufbuild/bufplugin-go/blob/main/check/internal/example/cmd/buf-plugin-timestamp-suffix/main.go
# for more detail about the sample below.
plugins:
  - plugin: plugin-timestamp-suffix # Specifies the installed plugin to use
    options:
      # The TIMESTAMP_SUFFIX rule specified above allows the user to change the suffix by providing a
      # new value here.
      timestamp_suffix: _time
# Optional policies. Policies are YAML files defining sets of lint and breaking change
# rules you can share across workspaces.
policies:
  - policy: buf.policy.yaml
  # Enterprise users can enforce policies uploaded to their BSR instance. This example enforces
  # a policy Buf provides, configuring breaking change detection to use the WIRE_JSON
  # category.
  - policy: buf.build
/bufbuild/breaking-wire-json
    # Ignore specific files or entire directories when enforcing policies.
    ignore:
      - proto/bar/b/e.proto
      - proto/foo
    # Ignore specific rules within certain files. Rules may come from plugins
    # specified in policy files.
    ignore_only:
      TIMESTAMP_SUFFIX:
        - proto/foo/foo.proto
```

## version

**Required.** Defines the current configuration version. The only accepted values are `v2`, `v1`, or `v1beta1`. To use the configuration as specified below, it must be set to `v2`. See the `buf.yaml` specifications for [v1](https://buf.build/docs/configuration/v1/buf-yaml/) or [v1beta1](https://buf.build/docs/configuration/v1beta1/buf-yaml/) configurations if you haven’t yet migrated to `v2`.

## modules

**Required.** Defines the list of modules that are built together in this workspace. Any dependencies that the files have on each other are automatically taken into account when building and shouldn’t be declared in the `deps` section.

### path

**Required.** The path to a directory containing Protobuf files, which must be defined relative to the workspace root (the directory that contains the `buf.yaml` file). All `path` values must point to directories within the workspace.

### name

**Optional.** A Buf Schema Registry (BSR) path that uniquely identifies this directory. The `name` **must** be a valid [module name](https://buf.build/docs/cli/modules-workspaces/#module-names) and it defines the BSR repository that contains the commit and label history and generated artifacts for the Protobuf files in the directory.

### includes

**Optional.** Lists directories within this directory to include in Protobuf file discovery. Only directories added to this list are included in Buf operations.

### excludes

**Optional.** Lists directories within this directory to exclude from Protobuf file discovery. Any directories added to this list are completely skipped and excluded from Buf operations. This can be specified together with `includes`, in which case each directory in `excludes` must be contained in a directory in `includes`.

**We don’t recommend using this option**, but in some situations it’s unavoidable.

## deps

**Optional.** Declares one or more modules that your workspace depends on. Dependencies are shared between all modules in the workspace. Buf tooling already accounts for dependencies between the modules that are part of the set, so they shouldn’t be declared here.

The value must be a valid path to a BSR module (either the public BSR at `buf.build` or a private BSR instance). It can’t be a local Git reference to a `buf.yaml` file or a URL path to a Git repo. This means that if you have a module you want to use as a dependency, it must also be pushed to the BSR.

The path can also include a specific reference, which is either a [commit or a label](https://buf.build/docs/bsr/commits-labels/).

Depending on specific module references is an advanced feature; you should depend on the latest commit whenever possible. Your `deps` don’t need to include the `:<reference>` suffix in most cases.

## lint

**Optional.** The lint settings you specify in this section are the default for all modules in the workspace, but can be replaced for individual modules by specifying different settings at the module level. Module-level settings have all of the same fields and behavior as workspace-level settings. If no lint settings are specified for the workspace, it uses the [default settings](https://buf.build/docs/lint/rules/#standard).

### use

**Optional.** Lists the categories and/or specific rules to use. For example, this config selects the `BASIC` lint category and the `FILE_LOWER_SNAKE_CASE` rule:

```
buf.yaml – Lint basic usageversion: v2
lint:
  use:
    - BASIC
    - FILE_LOWER_SNAKE_CASE
```

The `STANDARD` category is used if `lint` is unset.

### except

**Optional.** Removes rules or categories from the `use` list. For example, this config selects all lint rules in the `STANDARD` lint category except for `ENUM_NO_ALLOW_ALIAS` and the rules in the `BASIC` category:

```
buf.yaml – Exclude rules or categories from the initial lint settingversion: v2
lint:
  use:
    - STANDARD
  except:
    - ENUM_NO_ALLOW_ALIAS
    - BASIC
```

Note that since `STANDARD` is the default value for `use`, this is equivalent to the above:

```
buf.yamlversion: v2
lint:
  except:
    - ENUM_NO_ALLOW_ALIAS
    - BASIC
```

### ignore

**Optional.** Excludes specific directories or files from all lint rules. If a directory is ignored, then all files and subfolders of the directory are also ignored. The specified paths **must** be relative to the `buf.yaml` file. For example, `foo/bar.proto` is ignored with this config:

```
buf.yaml – Exclude directories or files from lintingversion: v2
lint:
  ignore:
    - foo/bar.proto
```

### ignore\_only

**Optional.** Allows directories or files to be excluded from specific lint categories or rules. As with `ignore`, the paths **must** be relative to `buf.yaml`. For example, this config sets up specific ignores for the `ENUM_PASCAL_CASE` rule and the `BASIC` category:

```
buf.yaml – Exclude directories or files from specific categories or rulesversion: v2
lint:
  ignore_only:
    ENUM_PASCAL_CASE:
      - foo/foo.proto
      - bar
    BASIC:
      - foo
```

### disallow\_comment\_ignores

**Optional.** Default is `false` if unset, meaning that you can ignore lint rules for specific components in your Protobuf files by adding a comment to them:

```
syntax = "proto3";

// Skip these rules for this package name. Changing name creates a breaking change.
// buf:lint:ignore PACKAGE_LOWER_SNAKE_CASE
// buf:lint:ignore PACKAGE_VERSION_SUFFIX
package A;
```

If this option is unset, the linter ignores the specified rule for any comment that starts with `// buf:lint:ignore RULE_ID`.

If this option is set to `true`, any such comments are ignored. See the [lint usage guide](https://buf.build/docs/lint/usage/#comment-ignores) to learn how and when to use comment ignores.

In `v1` configurations, this key was called `allow_comment_ignores` and defaulted to `false`. The default behavior in `v2` configurations is to allow comment ignores.

### enum\_zero\_value\_suffix

**Optional.** Controls the behavior of the `ENUM_ZERO_VALUE_SUFFIX` lint rule. By default, this rule verifies that the zero value of all enums ends in `_UNSPECIFIED`, as recommended by the [Google Protobuf Style Guide](https://protobuf.dev/programming-guides/style/#enums). However, organizations can choose a different preferred suffix; for example, `_NONE`. To set it, provide the desired value:

```
buf.yaml – Change default suffixversion: v2
lint:
    enum_zero_value_suffix: _NONE
```

That config allows this:

```
enum Foo {
  FOO_NONE = 0;
}
```

### rpc\_allow\_same\_request\_response

**Optional.** Allows the same message type to be used for a single RPC’s request and response type. **We don’t recommend using this option**.

### rpc\_allow\_google\_protobuf\_empty\_requests

**Optional.** Allows RPC requests to be [`google.protobuf.Empty`](https://github.com/protocolbuffers/protobuf/blob/master/src/google/protobuf/empty.proto) messages. You can set this if you want to allow messages to be void forever and never take any parameters. **We don’t recommend using this option**.

### rpc\_allow\_google\_protobuf\_empty\_responses

**Optional.** Allows RPC responses to be [`google.protobuf.Empty`](https://github.com/protocolbuffers/protobuf/blob/master/src/google/protobuf/empty.proto) messages. You can set this if you want to allow messages to never return any parameters. **We don’t recommend using this option**.

### service\_suffix

**Optional.** Controls the behavior of the `SERVICE_SUFFIX` lint rule. By default, this rule verifies that all service names are suffixed with `Service`. However, organizations can choose a different preferred suffix; for example, `API`. To set that:

```
buf.yaml – Change suffix to 'API'version: v2
lint:
  service_suffix: API
```

That config allows this:

```
service FooAPI {}
```

### disable\_builtin

**Optional.** Default is `false` if unset. If this option is set to `true`, Buf’s built-in lint rules are disabled.

## breaking

**Optional.** Specifies the [breaking change detection rules](https://buf.build/docs/breaking/rules/) enforced on the Protobuf files in the directory.

### use

**Optional.** Lists the rules or categories to use for breaking change detection. For example, this config selects the `WIRE` category and the `FILE_NO_DELETE` rule:

```
buf.yaml - Breaking changes detection basic usageversion: v2
breaking:
  use:
    - WIRE
    - FILE_NO_DELETE
```

The `FILE` category is used if `breaking` is unset, which is conservative and appropriate for most teams.

### except

**Optional.** Removes rules or categories from the `use` list. For example, this config results in all breaking rules in the `FILE` category being used except for `FILE_NO_DELETE`:

```
buf.yaml – Exclude rules or categories from the initial breaking change detection settingversion: v2
breaking:
  use:
    - FILE
  except:
    - FILE_NO_DELETE
```

**We don’t recommend using this option.**

### ignore

**Optional.** Excludes specific directories or files from all breaking change detection rules. If a directory is ignored, then all files and subfolders of the directory are also ignored. The specified paths **must** be relative to the `buf.yaml` file. For example, `foo/bar.proto` is ignored with this config:

```
buf.yaml – Exclude directories or files from breaking change detectionversion: v2
breaking:
  ignore:
    - foo/bar.proto
```

This option can be useful for ignoring packages that are in active development but not deployed in production, especially alpha or beta packages. For example:

```
buf.yaml – Example of excluding alpha and beta packagesversion: v2
breaking:
  use:
    - FILE
  ignore:
    - foo/bar/v1beta1
    - foo/bar/v1beta2
    - foo/baz/v1alpha1
```

If you want to ignore all alpha, beta, or test packages, we recommend using the [`ignore_unstable_packages`](https://buf.build/docs/configuration/v2/buf-yaml/#ignore_unstable_packages) setting instead.

### ignore\_only

**Optional.** Allows directories or files to be excluded from specific breaking change detection categories or rules. As with `ignore`, the paths **must** be relative to `buf.yaml`. For example, this config sets us specific ignores for the `FILE_SAME_TYPE` rule and the `WIRE` category:

```
buf.yamlversion: v2
breaking:
  ignore_only:
    FILE_SAME_TYPE:
      - foo/foo.proto
      - bar
    WIRE:
      - foo
```

**We don’t recommend this option.**

### ignore\_unstable\_packages

**Optional.** Ignores packages with a last component that’s one of the unstable forms recognized by the Buf checker’s [`PACKAGE_VERSION_SUFFIX`](https://buf.build/docs/lint/rules/#package_version_suffix) rule:

- `v\d+test.*`
- `v\d+(alpha|beta)\d*`
- `v\d+p\d+(alpha|beta)\d*`

For example, if this option is set, these packages are ignored:

- `foo.bar.v1alpha1`
- `foo.bar.v1beta1`
- `foo.bar.v1test`

### disable\_builtin

**Optional.** Default is `false` if unset. If this option is set to `true`, Buf’s built-in breaking rules are disabled.

## plugins

**Optional.** Specifies [Buf plugins](https://buf.build/docs/bsr/checks/plugins/) for applying custom lint or breaking change rules and categories, either in place of or in addition to Buf’s. This field lists the plugins to use and their options, and you then specify their rules and categories in the `lint` and/or `breaking` sections where you want them to be checked.

### plugin

**Required.** A string that points to a Buf plugin binary on your `${PATH}`, its relative or absolute location on disk, or a [remote BSR plugin path](https://buf.build/docs/bsr/checks/plugins/publish/#using-the-plugin). Alternatively, you can specify a list of strings, with the remaining strings being arguments passed to the plugin binary.

### options

A list of option definitions if the plugin allows for them. These are key-value pairs, and are usually used to overwrite a default value (for example, a field suffix), and then run the check against the new value instead. See the [timestamp example](https://github.com/bufbuild/bufplugin-go/blob/main/check/internal/example/cmd/buf-plugin-timestamp-suffix/main.go) in the `bufplugin-go` repo for more detail.

## policies

**Optional.** A list of [policies](https://buf.build/docs/bsr/checks/policies/) to apply to the workspace. Policies are applied to the workspace when you run `buf lint` or `buf breaking` and may be enforced by the BSR.

### policy

**Required.** A relative or absolute path to a policy file, such as `buf.policy.yaml`, or a remote BSR policy name. See [policies](https://buf.build/docs/bsr/checks/policies/).

### ignore

**Optional.** Excludes specific directories or files from all policy check rules. If a directory is ignored, then all files and subfolders of the directory are also ignored. The specified paths **must** be relative to the `buf.yaml` file.

### ignore\_only

**Optional.** Allows directories or files to be excluded from specific policy check categories or rules. As with `ignore`, the paths **must** be relative to `buf.yaml`.