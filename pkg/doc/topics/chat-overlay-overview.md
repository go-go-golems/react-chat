---
Title: Chat Overlay Overview
Slug: chat-overlay-overview
Short: Browser chat overlay and provider runtime for Go/TypeScript chat applications.
Topics:
- chat-overlay
- frontend
- chat
Commands:
- chat-overlay
Flags:
- host
- port
IsTopLevel: true
IsTemplate: false
ShowPerDefault: true
SectionType: GeneralTopic
---

`chat-overlay` serves the chat overlay application and wires the Go backend to the browser-based chat UI. The package is published from the `go-go-golems/react-chat` repository, while the Go module and public docs package name are `chat-overlay`.

Use the command help to inspect the currently available server flags:

```bash
chat-overlay --help
```

For release documentation publishing, export the embedded Glazed help database with:

```bash
chat-overlay help export --format sqlite --output-path .docsctl/help.sqlite
```
