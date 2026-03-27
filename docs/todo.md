# todo.md

**Session Date:** 2026-03-27
**Time Budget:** 1-2 hours
**Session Goal:** Refactor T-004 so the extraction engine stays deterministic today but exposes a clean draft-extraction seam for later assistive-hybrid work

---

## Active Tasks for This Session

### T-004 - Implement extraction engine and validated scene patch flow

**From tracker.md:**
- Acceptance criteria still in force:
  - The extraction engine accepts a turn pair and returns a structured scene patch in the project schema, including action and interaction where present
  - Validation failures produce structured error results and retain the last known good scene state
  - Processing latency for representative local test cases meets the `<= 2 seconds p90` target from scope.md
  - Logs distinguish extraction, validation, and commit-stage failures
  - Tests cover happy-path extraction, malformed output handling, rejected patch behavior, and NSFW-tag-relevant scene fields

**Session-specific focus:**
- Preserve current deterministic extraction behavior
- Make the draft-extraction boundary explicit and injectable inside `src/core/extraction-engine.js`
- Keep parse, normalize, validate, and structured-result stages clearly separated
- Do not add prompt calls or enable hybrid mode yet

**Expected progress this session:**
- Extract the default deterministic draft extractor into a clearer named boundary
- Keep `createExtractionEngine()` injectable for future assistive extraction
- Preserve all current test behavior and structured failure handling
- Update docs to record that this is an architectural refactor only

---

## Session Priorities

**Must complete (P0):**
- T-004 seam refactor with no runtime behavior change

**Should complete (P1):**
- Re-run automated validation after the refactor

**Could complete if time (P2):**
- Note likely weak-field candidates for a future assistive-hybrid spike without implementing them

---

## Context for This Session

**What happened last session:**
- T-004 landed a deterministic extraction-engine slice with automated tests for happy path, malformed output, validation rejection, and NSFW-relevant fields
- The branch discussion concluded that a future assistive-hybrid extractor is desirable, but not for the current runtime change set

**Current blockers/dependencies:**
- Manual SillyTavern latency validation still remains for closing T-004
- The extraction-engine seam should be cleaned up before later assistive-hybrid work to avoid mixing heuristic-specific behavior into the pipeline boundary

**Environment notes:**
- Test runner: `node --test`
- Coverage command: `node --test --experimental-test-coverage`
- External read-only reference repo: `E:\AI_Tools\SillyTavern`
- Do not modify files under `E:\AI_Tools\SillyTavern` without direct human approval

---

## Success Criteria for This Session

By end of session, we should have:
- [ ] Current deterministic extraction behavior preserved
- [ ] Extraction engine pipeline stages made explicit
- [ ] Draft extraction made injectable for later assistive-hybrid work
- [ ] No store/collector/UI behavior regressions introduced
- [ ] Validation commands identified and ready to run
- [ ] `docs/design.md`, `docs/tracker.md`, and `docs/handoff.md` aligned with the refactor intent

If everything does not complete:
- Minimum viable progress is a no-behavior-change extraction-engine refactor plus updated docs
- Live-host latency close-out can remain as the final T-004 validation step afterward

---

## Time Boxing

- Extraction-engine seam refactor: 45-60 minutes
- Tests and quick regression review: 20-30 minutes
- Doc and handoff alignment: 10-15 minutes

---

## Changelog

| Date | Changes | Author |
|------|---------|--------|
| 2026-03-27 | Reframed session todo around a no-behavior-change T-004 extraction-engine seam refactor for later assistive-hybrid work | Codex |
| 2026-03-27 | Reframed next session around verified SillyTavern host hooks for T-003 implementation | Codex |
| 2026-03-27 | Initial session-scoped todo file for T-003 work | Codex |
