# todo.md

**Session Date:** 2026-03-27
**Time Budget:** 2-3 hours
**Session Goal:** Implement the first T-003 slice using verified SillyTavern host events and state exports

---

## Active Tasks for This Session

### T-003 - Build turn-pair collector and update trigger flow

**From tracker.md:**
- Acceptance criteria:
  - The extension detects the latest complete user message plus responding character message as one analyzable turn pair
  - Processing is limited to the active tracked character and current chat session
  - Duplicate or stale chat events do not trigger duplicate processing for the same turn pair
  - Overlapping processing is coalesced or rejected safely per `docs/design.md` Section 5.3
  - Integration-level validation proves turn-pair capture order is correct for representative chat flows

**Session-specific notes:**
- Real SillyTavern host research is now complete enough to stop guessing the event boundary
- Verified host hooks from `E:\AI_Tools\SillyTavern`:
  - `event_types.CHARACTER_MESSAGE_RENDERED` is emitted after a character message is added/rendered
  - `event_types.USER_MESSAGE_RENDERED` is emitted after a user message is added/rendered
  - `event_types.CHAT_CHANGED` is emitted on chat load/switch and should reset collector state
- Verified host state available to the adapter:
  - `chat`
  - `this_chid`
  - `characters`
  - `chat_metadata`
  - `getCurrentChatId()`
- The collector should derive the latest valid pair from the current `chat` snapshot instead of trusting event args alone
- Group chats remain out of scope for MVP, so ambiguous contexts should soft-skip rather than trigger aggressive blocking logic

**Expected progress this session:**
- Implement the normalized SillyTavern chat adapter contract in `src/adapters/sillytavern-chat.js`
- Implement latest-valid-pair selection and dedupe/coalescing behavior in `src/core/turn-pair-collector.js`
- Add unit/integration-style tests for duplicate, stale, and overlapping event handling
- Leave extraction out of scope unless needed to exercise the trigger flow

### T-010 - Establish automated test harness and coverage baseline

**Session-specific notes:**
- `node --test` is already selected and current unit coverage exists for pure modules
- Only the T-003-related integration test expansion is in scope for this session

**Expected progress this session:**
- Add the first integration-style validation for turn-pair flow if it directly supports T-003

---

## Session Priorities

**Must complete (P0):**
- T-003: Turn-pair collector and update trigger flow

**Should complete (P1):**
- T-010: Minimal integration-test expansion needed to validate T-003

**Could complete if time (P2):**
- Document the final soft-fallback behavior once manual validation confirms how ambiguity is surfaced in the host

---

## Context for This Session

**What happened last session:**
- Status-only research confirmed the real SillyTavern event and state surfaces relevant to T-003
- The repo now documents the local host path `E:\AI_Tools\SillyTavern` as read-only integration reference code
- The uncertainty around the primary reply-ready event is reduced: `CHARACTER_MESSAGE_RENDERED` is the main trigger candidate

**Current blockers/dependencies:**
- Manual validation still needs to confirm that ambiguous host contexts soft-skip cleanly
- Integration-level validation for stale/duplicate/coalesced processing still needs to be written

**Environment notes:**
- Test runner: `node --test`
- External read-only reference repo: `E:\AI_Tools\SillyTavern`
- Do not modify files under `E:\AI_Tools\SillyTavern` without direct human approval

---

## Success Criteria for This Session

By end of session, we should have:
- [ ] Adapter contract implemented against verified SillyTavern runtime exports
- [ ] Collector logic deriving latest valid user + character pairs from `chat`
- [ ] Dedupe/coalescing behavior covered by tests or documented guard behavior
- [ ] Validation commands identified for local verification
- [ ] `docs/tracker.md` updated with progress/evidence
- [ ] `docs/handoff.md` updated with implementation results and remaining unknowns

If everything does not complete:
- Minimum viable progress is implemented adapter + collector logic with documented remaining soft-fallback caveats
- Full integration coverage can carry into the following session

---

## Time Boxing

- Adapter contract and event wiring: 45-60 minutes
- Collector pair selection and dedupe logic: 45-60 minutes
- Tests for stale/duplicate/overlap handling: 30-45 minutes
- Documentation and handoff updates: 15-20 minutes
- Buffer: 20-30 minutes

---

## Changelog

| Date | Changes | Author |
|------|---------|--------|
| 2026-03-27 | Reframed next session around verified SillyTavern host hooks for T-003 implementation | Codex |
| 2026-03-27 | Initial session-scoped todo file for T-003 work | Codex |
