# Tasks

## TODO

- [x] Confirm the deployed sessionstream heartbeat and resume wire contracts with fixtures <!-- t:ukyc -->
- [x] Add fake-WebSocket tests for exact one-pong-per-ping behavior <!-- t:3pyv -->
- [x] Define explicit ChatProvider lifecycle states and intentional shutdown semantics <!-- t:ipvn -->
- [x] Add injectable timers and randomness for deterministic reconnect tests <!-- t:f27g -->
- [x] Implement heartbeat pong handling in the shared WebSocket manager <!-- t:iyfo -->
- [x] Implement generation-safe bounded reconnect with jitter and cancellation <!-- t:r6ng -->
- [x] Implement committed-ordinal resume and ordered deduplication behavior <!-- t:v4e4 -->
- [x] Add sanitized lifecycle diagnostics without credentials or conversation payloads <!-- t:50p0 -->
- [x] Run React Chat unit tests, typecheck, lint, and production build <!-- t:lscp -->
- [ ] Update RAG-TTC Garden Assistant to consume the fixed ChatProvider package <!-- t:yvbu -->
- [x] Rebuild and restart the real full-corpus Garden Assistant using ~/.cache/rag-ttc caches <!-- t:ed9b -->
- [x] Verify more than three heartbeat intervals, a tool/widget run, and forced reconnect/resume <!-- t:3adu -->
- [ ] Publish or record the consumable ChatProvider version and update CoinVault issue #9 <!-- t:s1hr -->
- [x] Replace generic canonical frames with a typed codec and bigint-safe decimal ordinals <!-- t:38ji -->
- [x] Extract a React and Redux independent SessionStreamTransport with deterministic platform seams <!-- t:fxeg -->
- [x] Introduce explicit connection readiness typed failures and deterministic disposal <!-- t:kfrt -->
- [x] Add injectable HTTP request authentication and WebSocket URL hooks <!-- t:1f1d -->
- [x] Replace ad hoc persistence flags with a declarative session policy and update known consumers <!-- t:sfr7 -->
- [x] Add first-class message attachment references and upload removal client operations <!-- t:79mr -->
- [x] Make diagnostics metadata-only by default and gate unsafe raw frames explicitly <!-- t:sakh -->
- [x] Add reusable protocol lifecycle resume hydration and projection conformance fixtures <!-- t:fw69 -->
