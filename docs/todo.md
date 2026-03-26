# todo.md

**Session Date:** 2026-03-27
**Time Budget:** 2-3 hours
**Session Goal:** Start T-003 by defining, implementing, and validating the turn-pair collector/update-trigger slice for SceneStateTracker

---

## Active Tasks for This Session

### T-003 - Build turn-pair collector and update trigger flow

**From tracker.md:**
- Acceptance criteria:
  - The extension detects the latest complete user message plus responding character message as one analyzable turn pair
  - Processing is limited to the active tracked character and current chat session
  - Duplicate or stale chat events do not trigger duplicate processing for the same turn pair
  - Overlapping processing is coalesced or rejected safely per `docs/design.md` §5.3
  - Integration-level validation proves turn-pair capture order is correct for representative chat flows

**Session-specific notes:**
- T-001 and T-002 are complete, so scaffold, schema, and normalization baselines already exist
- Primary modules for this slice are expected to be `src/core/turn-pair-collector.js` and `src/adapters/sillytavern-chat.js`
- The main risk is incomplete confirmation of SillyTavern event ordering and active-character scoping behavior
- This session should stay focused on event-boundary correctness and safe trigger flow, not full extraction behavior

**Expected progress this session:**
- Confirm or mock the host event shape needed for turn-pair collection
- Implement or refine collector behavior for latest-valid user + character turn pairing
- Add integration-oriented validation for duplicate, stale, and overlapping event handling
- Document adapter assumptions if host API confirmation is still incomplete

### T-010 - Establish automated test harness and coverage baseline

**Session-specific notes:**
- `node --test` is already selected and current unit coverage exists for pure modules
- Only the T-003-related integration test expansion is in scope for this session
- Broader harness work stays deferred unless required by T-003 validation

**Expected progress this session:**
- Add the first integration-style validation for turn-pair flow if it directly supports T-003

---

## Session Priorities

**Must complete (P0):**
- T-003: Turn-pair collector and update trigger flow

**Should complete (P1):**
- T-010: Minimal integration-test expansion needed to validate T-003

**Could complete if time (P2):**
- Record newly confirmed or unresolved host API assumptions in `docs/design.md` or `docs/handoff.md`

---

## Context for This Session

**What happened last session:**
- T-002 completed with schema updates adding `action` and `interaction`
- Stable appearance facts and optional LoRA tags were kept outside mutable scene state
- Prompt-generation direction was clarified toward deterministic Danbooru-style tags for later T-008 work

**Current blockers/dependencies:**
- SillyTavern chat event ordering and active-character scoping still need confirmation
- Integration-level validation for host-like event flow is still missing

**Environment notes:**
- Test runner: `node --test`
- Repo remains dependency-light and ESM-based

---

## Success Criteria for This Session

By end of session, we should have:
- [ ] T-003 implementation bounded to event collection and trigger flow
- [ ] Turn-pair collector behavior implemented or refined for latest complete user + character pairing
- [ ] Duplicate, stale, and overlapping processing behavior covered by tests or explicit documented assumptions
- [ ] Validation commands identified for local verification
- [ ] `docs/tracker.md` updated if task status materially changes
- [ ] `docs/handoff.md` updated with results and remaining host-API unknowns

If everything does not complete:
- Minimum viable progress is a tested core turn-pair collector plus documented host adapter assumptions
- Full host-confirmed integration behavior can carry into the next session

---

## Time Boxing

- Host integration assumption check: 20-30 minutes
- Collector/update-trigger implementation: 60-90 minutes
- Tests for stale/duplicate/overlap handling: 30-45 minutes
- Documentation and handoff updates: 15-20 minutes
- Buffer: 20-30 minutes

---

## Changelog

| Date | Changes | Author |
|------|---------|--------|
| 2026-03-27 | Initial session-scoped todo file for T-003 work | Codex |
