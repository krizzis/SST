# handoff.md

## Context Snapshot
- T-001, T-002, and T-003 are complete, and T-004 is now in progress with the first extraction-engine slice implemented.
- The extension no longer waits for `GENERATION_AFTER_COMMANDS`; it now hooks `CHARACTER_MESSAGE_RENDERED` for reply-ready processing and `CHAT_CHANGED` for collector reset.
- `src/adapters/sillytavern-chat.js` now derives the latest valid turn pair from the live `chat` snapshot using chat/message ids and selected-character context from SillyTavern exports.
- `src/core/turn-pair-collector.js` now guards against duplicate rendered events, coalesces overlapping work into a queued rerun, and works with scene-state resets on chat change.
- `src/core/extraction-engine.js` now builds deterministic scene patches from turn-pair text, parses raw draft outputs, and returns structured extraction/validation results with latency metadata.
- New tests now cover extraction happy path, malformed draft handling, validator rejection handling, NSFW-relevant scene fields, plus integration-style last-known-good-state preservation after a rejected extraction.
- Manual SillyTavern validation passed for collector processing, visible logs, and chat-switch reset behavior after the follow-up fix.
- Group chats remain out of scope for MVP; the current implementation uses a soft fallback that prefers tracked-character name matching and skips ambiguous cases instead of aggressively defending against group-chat contexts.
- Known limitation: switching away from a chat and later returning does not yet restore that chat's prior SceneStateTracker scene/history; that belongs in later per-chat persistence work.

## Active Task(s)
- T-004: Implement extraction engine and validated scene patch flow - Acceptance: the extraction engine accepts a turn pair and returns a structured scene patch in the project schema, including action and interaction where present; validation failures produce structured error results and retain the last known good scene state; processing latency for representative local test cases meets the `<= 2 seconds p90` target; logs distinguish extraction, validation, and commit-stage failures; tests cover happy-path extraction, malformed output handling, rejected patch behavior, and NSFW-tag-relevant scene fields.

## Decisions Made
- The local SillyTavern codebase at `E:\AI_Tools\SillyTavern` is an external read-only integration reference; do not modify files there without direct human approval (link: docs/scope.md Constraints & Assumptions, docs/design.md Section 3.2)
- T-003 should use `CHARACTER_MESSAGE_RENDERED` as the primary reply-ready trigger and `CHAT_CHANGED` to reset per-chat collector state (link: docs/design.md Section 3.2)
- The adapter should re-read current runtime state from `chat`, `this_chid`, `characters`, `chat_metadata`, and `getCurrentChatId()` rather than relying only on event payload arguments (link: docs/design.md Section 3.2)
- The initial T-003 fallback rule should prefer the configured active character name when present, otherwise fall back to the currently selected SillyTavern character context, and skip ambiguous pairs rather than aggressively rejecting group-chat contexts (link: docs/design.md Section 3.2)
- Overlapping `CHARACTER_MESSAGE_RENDERED` events should be single-flight processed with one queued rerun rather than parallel extraction work (link: docs/design.md Section 5.3)
- Resetting scene/history on chat switch is the correct MVP behavior to prevent cross-chat contamination, even though per-chat restore is not implemented yet (link: docs/design.md Section 5.2)
- T-004 should keep a deterministic local extraction engine contract now, while leaving room for a future prompt-backed draft generator behind the same parse/validate/commit boundary (link: docs/design.md Section 1.2, docs/design.md Section 2.1)
- The next T-004 refactor should make the draft-extraction seam explicit and injectable so a later assistive-hybrid extractor can be added without changing current runtime behavior (link: docs/design.md Section 3.2)

## Changes Since Last Session
- src/core/extraction-engine.js (+214/-12): Replaced the summary-only stub with a deterministic extraction pipeline that parses raw draft outputs, heuristically extracts scene fields, normalizes them, validates them, and reports latency-aware extraction/validation failures
- src/core/turn-pair-collector.js (+13/-0): Added explicit extraction-stage and commit-stage warning logs around the existing preserve-last-good-state flow
- tests/unit/extraction-engine.test.js (+106/-0): Added unit coverage for happy-path extraction, malformed draft output handling, validation failure behavior, and NSFW-relevant scene fields
- tests/integration/turn-pair-collector.test.js (+71/-0): Added integration-style coverage proving that rejected later extractions preserve the previous committed scene and skip side effects
- index.js (+updated): Rewired the extension to process on `CHARACTER_MESSAGE_RENDERED`, reset on `CHAT_CHANGED`, pass real SillyTavern runtime exports into the chat adapter, and sync active-character/reset behavior on chat switch
- src/adapters/sillytavern-chat.js (+149/-1): Implemented snapshot-based turn-pair derivation with active-character filtering and deterministic turn-pair ids
- src/core/turn-pair-collector.js (+113/-24): Added duplicate suppression, single-flight overlap handling, queued rerun behavior, and explicit chat-reset collector handling
- src/core/scene-state-store.js (+updated): Added chat-reset state clearing so scene/history/metrics do not bleed between chats
- src/ui/settings-controller.js (+updated): Added UI sync helper so the active-character field reflects chat-switch state updates
- tests/unit/sillytavern-chat.test.js (+82/-0): Added adapter tests for latest-pair derivation, tracked-character filtering, and missing-user fallback behavior
- tests/integration/turn-pair-collector.test.js (+184/-0): Added integration-style tests for duplicate events, overlapping work coalescing, and chat-reset dedupe behavior
- tests/unit/scene-state-store.test.js (+updated): Added coverage for scene-state reset on chat change
- docs/tracker.md (+updated): Recorded implementation and validation evidence for the first T-003 pass
- docs/handoff.md (+updated): Captured the current implementation state, decisions, validation evidence, and remaining risks

## Validation & Evidence
- `node --test` -> 24/24 passing after the T-004 extraction-engine slice
- `node --test --experimental-test-coverage` -> 24/24 passing; overall coverage 92.60% lines, 79.37% branches, 90.91% functions; `src/core/extraction-engine.js` covered at 85.83% lines and 77.78% branches
- Extraction unit coverage now includes happy-path deterministic extraction, malformed raw draft handling, validator rejection behavior, and NSFW-relevant action / interaction / outfit fields
- Integration-style validation now includes preserving the last known good scene when a later extraction fails, without retriggering background/image side effects
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

## Risks & Unknowns
- Representative live-host latency for T-004 is still inferred from local automated runs rather than a dedicated SillyTavern timing pass, so one final manual validation pass is still needed before closing the task - owner: Human operator + AI assistant - review: 2026-03-28
- The current extractor is still mostly implemented as one module, so the future assistive-hybrid path will be harder to add cleanly unless the planned T-004 seam-refactor lands first - owner: Human operator + AI assistant - review: 2026-03-28
- Returning to a previously visited chat does not yet restore that chat's prior SceneStateTracker scene/history, so context is lost until per-chat persistence is implemented - owner: Human operator + AI assistant - review: 2026-03-28
- Deleted messages are not yet tracked in SceneStateTracker history, so removed messages can leave stale history context until a later cleanup task is implemented - owner: Human operator + AI assistant - review: 2026-03-28
- Character-card appearance and optional LoRA field conventions still vary across cards and remain a later T-008 concern - owner: Human operator + AI assistant - review: 2026-04-01

## Next Steps
1. Refactor T-004 so the extraction engine exposes an explicit pluggable draft-extraction seam while preserving current deterministic behavior.
2. Run one focused manual SillyTavern validation pass for T-004 to confirm live extraction logs, stable state commits, and representative latency under real chat activity.
3. Close T-004 by tightening any heuristics revealed in manual validation, then update tracker evidence/status accordingly.

## Status Summary
- [~] 85% - T-004 extraction-engine slice implemented and validated in automated tests; live-host close-out remains
