# handoff.md

## Context Snapshot
- T-001, T-002, and T-003 are now complete, and T-004 is the next implementation slice.
- The extension no longer waits for `GENERATION_AFTER_COMMANDS`; it now hooks `CHARACTER_MESSAGE_RENDERED` for reply-ready processing and `CHAT_CHANGED` for collector reset.
- `src/adapters/sillytavern-chat.js` now derives the latest valid turn pair from the live `chat` snapshot using chat/message ids and selected-character context from SillyTavern exports.
- `src/core/turn-pair-collector.js` now guards against duplicate rendered events, coalesces overlapping work into a queued rerun, and works with scene-state resets on chat change.
- New tests cover adapter pairing plus integration-style duplicate, overlap, chat-reset collector behavior, and scene-store chat-reset behavior using the Node test runner.
- Manual SillyTavern validation passed for collector processing, visible logs, and chat-switch reset behavior after the follow-up fix.
- Project requirements are now being realigned so extraction is explicitly LLM-backed and probabilistic, while normalization, validation, commit safety, and downstream prompt serialization remain deterministic.
- Group chats remain out of scope for MVP; the current implementation uses a soft fallback that prefers tracked-character name matching and skips ambiguous cases instead of aggressively defending against group-chat contexts.
- Known limitation: switching away from a chat and later returning does not yet restore that chat's prior SceneStateTracker scene/history; that belongs in later per-chat persistence work.

## Active Task(s)
- T-004: Implement LLM-backed extraction engine and validated scene patch flow - Acceptance: the extraction engine accepts a turn pair, routes it through an LLM extraction provider, and returns a scene patch constrained to the project schema, including action and interaction where present; malformed or unusable model output becomes a structured rejection at the `model-call`, `parse`, or `validation` stage without corrupting the last known good scene state; schema-valid model output is normalized and can be committed safely; processing latency for representative local test cases meets the `<= 2 seconds p90` target; logs distinguish model-call, parse, validation, and commit-stage failures; tests cover valid extraction, malformed JSON or shape handling, missing-field validation failures, rejected patch behavior, and NSFW-tag-relevant normalized scene fields.

## Decisions Made
- The local SillyTavern codebase at `E:\AI_Tools\SillyTavern` is an external read-only integration reference; do not modify files there without direct human approval (link: docs/scope.md Constraints & Assumptions, docs/design.md Section 3.2)
- T-003 should use `CHARACTER_MESSAGE_RENDERED` as the primary reply-ready trigger and `CHAT_CHANGED` to reset per-chat collector state (link: docs/design.md Section 3.2)
- The adapter should re-read current runtime state from `chat`, `this_chid`, `characters`, `chat_metadata`, and `getCurrentChatId()` rather than relying only on event payload arguments (link: docs/design.md Section 3.2)
- The initial T-003 fallback rule should prefer the configured active character name when present, otherwise fall back to the currently selected SillyTavern character context, and skip ambiguous pairs rather than aggressively rejecting group-chat contexts (link: docs/design.md Section 3.2)
- Overlapping `CHARACTER_MESSAGE_RENDERED` events should be single-flight processed with one queued rerun rather than parallel extraction work (link: docs/design.md Section 5.3)
- Resetting scene/history on chat switch is the correct MVP behavior to prevent cross-chat contamination, even though per-chat restore is not implemented yet (link: docs/design.md Section 5.2)
- T-004 should use LLM-backed extraction behind a pluggable provider boundary; extraction is probabilistic, but normalization, validation, state protection, and prompt serialization remain deterministic (link: docs/design.md Section 2.1, docs/design.md Section 8.6)

## Changes Since Last Session
- index.js (+updated): Rewired the extension to process on `CHARACTER_MESSAGE_RENDERED`, reset on `CHAT_CHANGED`, pass real SillyTavern runtime exports into the chat adapter, and sync active-character/reset behavior on chat switch
- src/adapters/sillytavern-chat.js (+149/-1): Implemented snapshot-based turn-pair derivation with active-character filtering and deterministic turn-pair ids
- src/core/turn-pair-collector.js (+113/-24): Added duplicate suppression, single-flight overlap handling, queued rerun behavior, and explicit chat-reset collector handling
- src/core/scene-state-store.js (+updated): Added chat-reset state clearing so scene/history/metrics do not bleed between chats
- src/ui/settings-controller.js (+updated): Added UI sync helper so the active-character field reflects chat-switch state updates
- tests/unit/sillytavern-chat.test.js (+82/-0): Added adapter tests for latest-pair derivation, tracked-character filtering, and missing-user fallback behavior
- tests/integration/turn-pair-collector.test.js (+184/-0): Added integration-style tests for duplicate events, overlapping work coalescing, and chat-reset dedupe behavior
- tests/unit/scene-state-store.test.js (+updated): Added coverage for scene-state reset on chat change
- docs/tracker.md (+updated): Recorded implementation and validation evidence for the first T-003 pass
- docs/handoff.md (+updated): Captured the current implementation state, decisions, validation evidence, remaining risks, and the extraction-strategy requirement shift
- docs/scope.md (+updated): Reframed scene extraction as LLM-backed with deterministic post-validation guarantees
- docs/design.md (+updated): Added the extraction provider contract, parse/model-call failure stages, and ADR-006 for probabilistic extraction with deterministic post-processing
- docs/todo.md (+updated): Re-scoped the next session around T-004 doc alignment and host-first LLM extraction planning

## Validation & Evidence
- `node --test` -> 19/19 passing after the chat-reset follow-up fix
- `node --test --experimental-test-coverage` -> 18/18 passing; overall coverage 94.92% lines, 78.77% branches, 88.89% functions during the main T-003 implementation pass
- Unit validation now covers `src/adapters/sillytavern-chat.js` pairing behavior, including tracked-character filtering and missing preceding-user handling
- Integration-style validation covers duplicate event suppression, overlap coalescing, collector reset behavior in `src/core/turn-pair-collector.js`, and scene-state reset behavior in `src/core/scene-state-store.js`
- Read-only inspection of `E:\AI_Tools\SillyTavern\public\scripts\events.js` still confirms `CHAT_CHANGED`, `USER_MESSAGE_RENDERED`, and `CHARACTER_MESSAGE_RENDERED`
- Read-only inspection of `E:\AI_Tools\SillyTavern\public\script.js` still confirms `chat`, `this_chid`, `characters`, `chat_metadata`, and `getCurrentChatId()` are exported for adapter reads, and that `CHARACTER_MESSAGE_RENDERED` fires after character message render
- Manual validation results:
  - Collector processed messages: PASS
  - Logs visible in extension UI and dev console: PASS
  - Chat switch reset behavior: PASS after follow-up fix to clear state/history and sync active character
- Documentation alignment review:
  - `docs/scope.md`, `docs/design.md`, `docs/tracker.md`, `docs/handoff.md`, and `docs/todo.md` now agree that extraction is LLM-backed and probabilistic while normalization and downstream serialization remain deterministic

## Risks & Unknowns
- Returning to a previously visited chat does not yet restore that chat's prior SceneStateTracker scene/history, so context is lost until per-chat persistence is implemented - owner: Human operator + AI assistant - review: 2026-03-28
- Deleted messages are not yet tracked in SceneStateTracker history, so removed messages can leave stale history context until a later cleanup task is implemented - owner: Human operator + AI assistant - review: 2026-03-28
- Character-card appearance and optional LoRA field conventions still vary across cards and remain a later T-008 concern - owner: Human operator + AI assistant - review: 2026-04-01
- The exact SillyTavern-native generation helper or host API to use for the first extraction provider is not yet confirmed and must be verified at T-004 start - owner: Human operator + AI assistant - review: 2026-03-29

## Next Steps
1. Start T-004 by replacing the stub extraction engine with a host-first LLM-backed extractor and adding targeted tests for valid extraction, malformed model output, parse failure, validation failure, and NSFW-relevant normalization behavior.
2. Confirm the first SillyTavern-native generation entry point or helper to use behind the extraction provider boundary before writing adapter code.
3. Plan per-chat scene/history restore under T-005 so returning to a previously visited chat can recover prior SceneStateTracker state without cross-chat mixing.

## Status Summary
- [v] 100% - T-003 complete; T-004 is next
