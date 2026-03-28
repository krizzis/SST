# handoff.md

## Context Snapshot
- T-001, T-002, and T-003 are complete, and T-004 is now in progress on branch `codex/t-004-llm-extraction-engine`.
- The extension still processes reply-ready updates from `CHARACTER_MESSAGE_RENDERED` and resets collector/store state on `CHAT_CHANGED`.
- `src/adapters/sillytavern-chat.js` continues to derive the latest valid turn pair from the live `chat` snapshot using chat/message ids and selected-character context from SillyTavern exports.
- T-004 replaced the stub summary extractor with a host-first LLM path built around SillyTavern's exported `generateQuietPrompt(...)`, while keeping parsing, validation, normalization, and state protection deterministic.
- `src/core/turn-pair-collector.js` now passes trigger context into extraction and logs commit-stage failures separately from extraction-stage rejections.
- New automated tests cover extraction success, malformed JSON, missing-field validation rejection, provider model-call failure handling, and rejected-update preservation in the collector/store flow.
- Automated validation passes locally with `node --test` and `node --test --experimental-test-coverage`; live host validation for the new provider path is still pending.

## Active Task(s)
- T-004: Implement LLM-backed extraction engine and validated scene patch flow - Acceptance: the extraction engine accepts a turn pair, routes it through an LLM extraction provider, and returns a scene patch constrained to the project schema, including action and interaction where present; malformed or unusable model output becomes a structured rejection at the `model-call`, `parse`, or `validation` stage without corrupting the last known good scene state; schema-valid model output is normalized and can be committed safely; processing latency for representative local test cases meets the `<= 2 seconds p90` target; logs distinguish model-call, parse, validation, and commit-stage failures; tests cover valid extraction, malformed JSON or shape handling, missing-field validation failures, rejected patch behavior, and NSFW-tag-relevant normalized scene fields.

## Decisions Made
- The local SillyTavern codebase at `E:\AI_Tools\SillyTavern` is an external read-only integration reference; do not modify files there without direct human approval (link: docs/scope.md Constraints & Assumptions, docs/design.md Section 3.2)
- T-003 should use `CHARACTER_MESSAGE_RENDERED` as the primary reply-ready trigger and `CHAT_CHANGED` to reset per-chat collector state (link: docs/design.md Section 3.2)
- The adapter should re-read current runtime state from `chat`, `this_chid`, `characters`, `chat_metadata`, and `getCurrentChatId()` rather than relying only on event payload arguments (link: docs/design.md Section 3.2)
- T-004 should use LLM-backed extraction behind a pluggable provider boundary; extraction is probabilistic, but normalization, validation, state protection, and prompt serialization remain deterministic (link: docs/design.md Section 2.1, docs/design.md Section 8.6)
- The first T-004 provider should be host-first and use SillyTavern's exported `generateQuietPrompt(...)` behind an adapter boundary rather than calling host generation inline from the extraction engine (link: docs/design.md Section 3.2)

## Changes Since Last Session
- index.js (+updated): Wired a host-first extraction provider around SillyTavern's exported `generateQuietPrompt(...)`
- src/adapters/sillytavern-extraction-provider.js (+new): Added the host adapter that wraps `generateQuietPrompt(...)` and returns structured `model-call` failures
- src/core/extraction-engine.js (+updated): Replaced the stub extractor with prompt building, raw-response parsing, payload validation, normalization, and staged failure handling
- src/core/schema.js (+updated): Added flexible extraction-payload validation separate from the canonical normalized patch validator
- src/core/turn-pair-collector.js (+updated): Passed trigger context into extraction and logged explicit commit-stage failures
- tests/unit/extraction-engine.test.js (+new): Added coverage for valid extraction, malformed JSON, missing-field validation rejection, and provider-call failure
- tests/unit/sillytavern-extraction-provider.test.js (+new): Added adapter tests for unavailable, successful, and throwing host helper behavior
- tests/integration/turn-pair-collector.test.js (+updated): Added coverage proving rejected extraction preserves the last committed scene and avoids downstream publishes
- docs/tracker.md (+updated): Recorded T-004 implementation kickoff progress and automated validation evidence
- docs/handoff.md (+updated): Captured the new provider choice, implementation state, validation evidence, and remaining live-host work

## Validation & Evidence
- `node --test` -> 27/27 passing
- `node --test --experimental-test-coverage` -> 27/27 passing, 90.82% lines, 73.73% branches, 88.16% functions overall
- Unit validation now covers `src/core/extraction-engine.js` success, malformed JSON, missing-field validation rejection, and propagated provider `model-call` failures
- Unit validation now covers `src/adapters/sillytavern-extraction-provider.js` unavailable-helper, successful-call, and thrown-error behavior
- Integration validation now covers rejected extraction preserving the last committed scene in `src/core/turn-pair-collector.js` and `src/core/scene-state-store.js`
- Read-only inspection of `E:\AI_Tools\SillyTavern\public\script.js` confirms `generateQuietPrompt(...)` is exported and available as the first host-native extraction entry point candidate
- Automated local test durations are well under the `<= 2 seconds p90` target for mocked test cases; representative live-host latency for the real `generateQuietPrompt(...)` path still needs manual measurement

## Risks & Unknowns
- Returning to a previously visited chat does not yet restore that chat's prior SceneStateTracker scene/history, so context is lost until per-chat persistence is implemented - owner: Human operator + AI assistant - review: 2026-03-28
- Deleted messages are not yet tracked in SceneStateTracker history, so removed messages can leave stale history context until a later cleanup task is implemented - owner: Human operator + AI assistant - review: 2026-03-28
- Character-card appearance and optional LoRA field conventions still vary across cards and remain a later T-008 concern - owner: Human operator + AI assistant - review: 2026-04-01
- The live SillyTavern behavior of `generateQuietPrompt(...)`, including its `jsonSchema` handling and representative latency in the extension runtime, still needs manual validation before T-004 can be marked complete - owner: Human operator + AI assistant - review: 2026-03-29

## Next Steps
1. Manually validate the live `generateQuietPrompt(...)` extraction path in SillyTavern and capture logs for success plus staged `model-call`/`parse`/`validation` failures where feasible.
2. Measure representative host-path extraction latency against the `<= 2 seconds p90` target and record the evidence in `docs/tracker.md`.
3. Once live validation is captured, finish any prompt/provider adjustments needed to close T-004 and then plan per-chat scene/history restore under T-005.

## Status Summary
- [~] 70% - T-004 implementation is in progress with automated coverage green; live host validation remains
