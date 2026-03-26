# handoff.md

## Context Snapshot
- SceneStateTracker still has T-001 and T-002 complete, and T-003 remains the active next implementation slice.
- This session was status-only and focused on reducing host-integration uncertainty rather than writing extension code.
- Real SillyTavern host research is now grounded in the local reference repo at `E:\AI_Tools\SillyTavern`, which is documented as read-only unless directly approved otherwise.
- Verified host hooks for T-003 now include `CHAT_CHANGED`, `USER_MESSAGE_RENDERED`, and `CHARACTER_MESSAGE_RENDERED` from `public/scripts/events.js`.
- Verified runtime state available to the adapter includes `chat`, `this_chid`, `characters`, `chat_metadata`, and `getCurrentChatId()` from `public/script.js`.
- The current recommended T-003 approach is to trigger on `CHARACTER_MESSAGE_RENDERED`, then derive the latest valid user + character pair from the current `chat` snapshot instead of trusting event payloads alone.
- Group-chat scoping is the main remaining host-behavior uncertainty and should be validated conservatively during implementation.

## Active Task(s)
- T-003: Build turn-pair collector and update trigger flow - Acceptance: latest complete user + character turn pair is captured correctly; processing stays scoped to the active tracked character and chat; duplicate/stale events do not double-process; overlapping work is coalesced or rejected safely; integration-level validation proves representative chat-order correctness.

## Decisions Made
- The local SillyTavern codebase at `E:\AI_Tools\SillyTavern` is an external read-only integration reference; do not modify files there without direct human approval (link: docs/scope.md Constraints & Assumptions, docs/design.md Section 3.2)
- T-003 should use `CHARACTER_MESSAGE_RENDERED` as the primary reply-ready trigger and `CHAT_CHANGED` to reset per-chat collector state (link: docs/design.md Section 3.2)
- The adapter should re-read current runtime state from `chat`, `this_chid`, `characters`, `chat_metadata`, and `getCurrentChatId()` rather than relying only on event payload arguments (link: docs/design.md Section 3.2)

## Changes Since Last Session
- docs/scope.md (+updated): Documented the local SillyTavern host path and explicit no-modification rule without direct approval
- docs/design.md (+updated): Added verified SillyTavern host-hook and runtime-state guidance for the host adapter layer
- docs/tracker.md (+updated): Recorded pre-implementation T-003 host research evidence and moved task progress to investigation-in-progress
- docs/todo.md (+updated): Reframed the next session around implementing T-003 from verified host behavior
- docs/handoff.md (+updated): Captured this session's confirmed host findings and next-step implementation direction

## Validation & Evidence
- No repository tests were run in this status-only session
- Read-only inspection of `E:\AI_Tools\SillyTavern\public\scripts\events.js` confirmed `CHAT_CHANGED`, `USER_MESSAGE_RENDERED`, and `CHARACTER_MESSAGE_RENDERED`
- Read-only inspection of `E:\AI_Tools\SillyTavern\public\script.js` confirmed `chat`, `this_chid`, `characters`, `chat_metadata`, and `getCurrentChatId()` are exported for adapter reads
- Read-only inspection of `E:\AI_Tools\SillyTavern\public\script.js` confirmed `CHARACTER_MESSAGE_RENDERED` is emitted after character messages are added/rendered, and `USER_MESSAGE_RENDERED` is emitted after user messages are added/rendered
- Read-only inspection of `E:\AI_Tools\SillyTavern\public\scripts\extensions\quick-reply\index.js` confirmed built-in extensions already use `CHARACTER_MESSAGE_RENDERED` and `CHAT_CHANGED` as practical lifecycle hooks

## Risks & Unknowns
- Group-chat message identity and tracked-character scoping still need a conservative implementation rule validated against real message fields - owner: Human operator + AI assistant - review: 2026-03-28
- Integration coverage for duplicate/stale/coalesced event handling is still pending T-003 implementation - owner: Human operator + AI assistant - review: 2026-03-28
- Character-card appearance and optional LoRA field conventions still vary across cards and remain a later T-008 concern - owner: Human operator + AI assistant - review: 2026-04-01

## Next Steps
1. Implement `src/adapters/sillytavern-chat.js` around the verified SillyTavern exports and event hooks.
2. Implement `src/core/turn-pair-collector.js` to derive the latest valid pair from `chat` and guard against duplicate/stale/overlapping processing.
3. Add tests for T-003 event-order correctness and conservative group-chat scoping.

## Status Summary
- [~] 15% - T-003 is now investigation-backed and ready for the first implementation pass
