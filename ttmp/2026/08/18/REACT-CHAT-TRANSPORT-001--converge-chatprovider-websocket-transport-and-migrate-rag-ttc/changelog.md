# Changelog

## 2026-08-18

- Initial workspace created


## 2026-08-18

Documented heartbeat root cause, shared lifecycle design, RAG-TTC integration proof, and CoinVault downstream handoff in issue #9

## 2026-08-18

Expanded the project into a complete intern implementation guide covering typed protocol, independent transport, lifecycle and resume correctness, HTTP/auth hooks, session policy, attachments, safe diagnostics, conformance tests, RAG-TTC adoption, and future CoinVault integration

## 2026-08-19

Step 3: implemented typed uint64-safe protocol and independent heartbeat/reconnect/resume transport (commit a8152b3)


## 2026-08-19

Step 4: integrated the shared transport and added explicit client errors, session policy, HTTP/auth hooks, attachments, and safe diagnostics (commit d7df59b)


## 2026-08-19

Step 7: diagnosed missing publish directories, added actionable pack preflight, and verified both package tarballs (commit d17b450)

### Related Files

- /home/manuel/workspaces/2026-08-12/deploy-dev-indexer/react-chat/scripts/packages/pack-smoke.mjs — Packaging validation fix and successful smoke gate


## 2026-08-19

Completed real full-corpus Garden Assistant heartbeat, widget, forced-reconnect, and committed-ordinal resume acceptance

### Related Files

- packages/chat-provider/src/ws/protocol.ts — Decode omitted protobuf uint64 ordinals as zero while retaining strict malformed-value rejection

