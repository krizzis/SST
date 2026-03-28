# todo.md

**Session Date:** 2026-03-28
**Time Budget:** 2-3 hours
**Session Goal:** Start T-004 by implementing a host-first LLM-backed extraction path with safe parsing, validation, and normalization

---

## Active Tasks for This Session

### T-004 - Implement LLM-backed extraction engine and validated scene patch flow

**From tracker.md:**
- Acceptance criteria:
  - The extraction engine accepts a turn pair, routes it through an LLM extraction provider, and returns a scene patch constrained to the project schema
  - Malformed or unusable model output becomes a structured rejection without corrupting the last known good scene state
  - Schema-valid model output is normalized and committed safely
  - Logs distinguish model-call, parse, validation, and commit-stage failures
  - Tests cover valid extraction, malformed output handling, missing-field validation failures, rejected patch behavior, and NSFW-relevant normalized fields

**Session-specific notes:**
- Keep the latest turn pair as the only extraction input window for MVP
- The first extraction backend should be pluggable but host-first, preferring SillyTavern or native generation helpers when available
- Raw model output must be treated as untrusted input and should only be retained in debug mode when explicitly enabled
- Deterministic guarantees apply to normalization, validation, state protection, and downstream prompt serialization rather than to raw extractor output
- Confirm the first SillyTavern-native generation entry point before wiring the provider adapter

**Expected progress this session:**
- Implement the extraction provider boundary in `src/core/extraction-engine.js` or adjacent modules
- Add safe model-output parsing plus schema validation and normalization before store commit
- Add unit tests for valid output, malformed JSON, and validation rejection behavior
- Add or extend integration coverage for collector -> extraction -> store flow with rejection preservation

### T-010 - Establish automated test harness and coverage baseline

**Session-specific notes:**
- `node --test` is already selected and current unit coverage exists for pure modules
- This session should add prompt-to-parse orchestration tests and collector-to-store integration coverage for LLM-backed extraction

**Expected progress this session:**
- Keep validation commands current and capture expected pass/fail evidence for the new extraction flow

---

## Session Priorities

**Must complete (P0):**
- T-004 extraction engine implementation slice

**Should complete (P1):**
- T-010 extraction-focused test expansion

**Could complete if time (P2):**
- Add debug diagnostics shape for provider, parse, and validation failures without retaining raw prompts by default

---

## Context for This Session

**What happened last session:**
- T-003 completed and validated the turn-pair collection path
- Project docs were aligned so T-004 is now explicitly LLM-backed and probabilistic at extraction time, with deterministic post-processing
- The provider boundary, failure stages, and acceptance criteria for T-004 are now documented

**Current blockers/dependencies:**
- The exact host-native generation helper or API entry point still needs confirmation before the provider adapter can be finalized
- T-004 depends on preserving the existing scene-state-store safety guarantees while adding the new extraction stages

**Environment notes:**
- Test runner: `node --test`
- External read-only reference repo: `E:\AI_Tools\SillyTavern`
- Do not modify files under `E:\AI_Tools\SillyTavern` without direct human approval

---

## Success Criteria for This Session

By end of session, we should have:
- [ ] Host-first extraction provider shape implemented or scaffolded
- [ ] Model output parsed, validated, and normalized before commit
- [ ] Unit tests covering success, parse failure, and validation failure
- [ ] Integration coverage proving rejected extraction does not corrupt prior scene state
- [ ] Validation commands identified for local verification

If everything does not complete:
- Minimum viable progress is a scaffolded provider boundary plus tests for parse and validation rejection handling
- Host-specific adapter wiring can carry into the following session if the native generation entry point takes longer to verify

---

## Time Boxing

- Host helper research and provider wiring: 45-60 minutes
- Parse/validate/normalize implementation: 45-60 minutes
- Unit and integration tests: 30-45 minutes
- Handoff/tracker updates: 15-20 minutes
- Buffer: 15-20 minutes

---

## Changelog

| Date | Changes | Author |
|------|---------|--------|
| 2026-03-28 | Repointed the session todo from docs alignment to T-004 implementation kickoff | Codex |
| 2026-03-28 | Reframed the next session around LLM-backed extraction docs alignment and deterministic post-processing rules | Codex |
| 2026-03-27 | Reframed next session around verified SillyTavern host hooks for T-003 implementation | Codex |
| 2026-03-27 | Initial session-scoped todo file for T-003 work | Codex |
