# tracker.md

**Version:** 1.2  
**Last updated:** 2026-03-27  
**Status:** Active task tracking - single source of truth for work items

---

## Purpose

This document tracks all implementation tasks for SceneStateTracker, along with their status, acceptance criteria, and dependencies. It is the primary reference for what should be worked on next and what evidence is required before a task can be considered done.

---

## Status Glyphs (Use These)

[ ] **Not started** - Task defined but not yet begun  
[~] **In progress** - Actively being worked on  
[v] **Done** - Completed and meets acceptance criteria  
[!] **Blocked** - Cannot proceed, needs intervention

---

## Active Tasks

## T-004 - [feature] Implement extraction engine and validated scene patch flow
- Owner: Human operator + AI assistant
- Status: [ ] 0% | Dates: planned start 2026-04-01, expected by 2026-04-04
- Scope: scope.md Goals, Success Metrics (SLOs)
- Design: design.md Section 1.2, Section 2.1, Section 2.2, Section 4.2, Section 8.2
- Acceptance criteria:
  - The extraction engine accepts a turn pair and returns a structured scene patch in the project schema, including action and interaction where present
  - Validation failures produce structured error results and retain the last known good scene state
  - Processing latency for representative local test cases meets the `<= 2 seconds p90` target from scope.md
  - Logs distinguish extraction, validation, and commit-stage failures
  - Tests cover happy-path extraction, malformed output handling, rejected patch behavior, and NSFW-tag-relevant scene fields
- Evidence: Not started in this session; queued as the next implementation slice after T-003 validation close-out
- Dependencies: T-002, T-003
- Notes: The implementation may use a prompt-based extractor, but its output contract must remain deterministic

---

## Backlog (Not Started)

## T-005 - [feature] Implement canonical scene-state store with history and persistence
- Owner: Human operator + AI assistant
- Status: [ ] 0% | Dates: planned start 2026-04-03, expected by 2026-04-05
- Scope: scope.md Goals, Success Metrics (SLOs)
- Design: design.md Section 2.1, Section 3.1, Section 3.2, Section 5.2, Section 8.2
- Acceptance criteria:
  - A single module owns the current committed scene state and recent update history
  - State commits occur only after validation succeeds
  - No-op updates are detected and skipped without triggering downstream side effects
  - Session reload behavior restores the latest valid state when persistence is enabled
  - Tests prove that failed updates never overwrite the previous valid state
- Evidence: Will be added when started
- Dependencies: T-002, T-004
- Notes: This is the single source of truth for UI, background changes, and image payload generation

---

## Completed Tasks

## T-003 - [feature] Build turn-pair collector and update trigger flow
- Owner: Human operator + AI assistant
- Status: [v] 100% | Dates: started 2026-03-27, completed 2026-03-27, last touched 2026-03-27
- Scope: scope.md In Scope, Constraints & Assumptions
- Design: design.md Section 1.2, Section 3.1, Section 3.2, Section 8.3
- Acceptance criteria met:
  - The extension detects the latest complete user message plus responding character message as one analyzable turn pair
  - Processing is limited to the active tracked character and current chat session
  - Duplicate or stale chat events do not trigger duplicate processing for the same turn pair
  - Overlapping processing is coalesced or rejected safely per design.md Section 5.3
  - Integration-level validation proves turn-pair capture order is correct for representative chat flows
- Evidence:
  - Status-only session verified real SillyTavern host hooks in `E:\AI_Tools\SillyTavern`; `public/scripts/events.js` defines `CHAT_CHANGED`, `USER_MESSAGE_RENDERED`, and `CHARACTER_MESSAGE_RENDERED`, and `public/script.js` emits `CHARACTER_MESSAGE_RENDERED` after message render while exporting `chat`, `this_chid`, `characters`, `chat_metadata`, and `getCurrentChatId()` for adapter reads
  - `src/adapters/sillytavern-chat.js` derives the latest valid user + character pair from the current `chat` snapshot, keyed by chat/message ids and filtered against the active tracked character name when available
  - `src/core/turn-pair-collector.js` deduplicates processed pairs, coalesces overlapping work into a queued rerun, and resets collector state on chat change
  - `src/core/scene-state-store.js` now resets current scene, history, last error, and metrics on chat switch so chats do not mix state
  - `index.js` wires T-003 to `event_types.CHARACTER_MESSAGE_RENDERED` and `event_types.CHAT_CHANGED` instead of `GENERATION_AFTER_COMMANDS`
  - `node --test` -> 19/19 passing after the chat-reset fix
  - `node --test --experimental-test-coverage` -> 18/18 passing, 94.92% lines / 78.77% branches / 88.89% functions overall during the main T-003 implementation pass
  - Manual SillyTavern validation: collector processed messages correctly, logs were visible in the extension UI and dev console, and chat switch reset behavior passed after the follow-up fix
- Dependencies: T-001
- Notes: Group chats stay out of scope for MVP; the implementation uses a soft fallback that prefers active-character name matching when available, otherwise falls back to the selected SillyTavern character context, and should skip ambiguous cases rather than aggressively rejecting group-chat contexts. Known limitation: when the user switches away from a chat and later returns, prior SceneStateTracker scene/history for that chat is not yet restored. Deleted-message tracking is also not handled yet and is deferred to a later task.

---

## T-006 - [feature] Build settings UI for tracking control and location mapping
- Owner: Human operator + AI assistant
- Status: [ ] 0% | Dates: planned start 2026-04-05, expected by 2026-04-07
- Scope: scope.md In Scope, Risks (initial)
- Design: design.md Section 1.2, Section 3.1, Section 3.2, Section 10.1
- Acceptance criteria:
  - Users can enable or disable scene tracking in the extension settings
  - Users can select or confirm the active tracked character for the current chat
  - Users can create, edit, and remove location-to-background mappings
  - Settings persist using the extension settings namespace across reloads
  - Manual validation confirms the settings UI reflects current stored values after reload
- Evidence: Will be added when started
- Dependencies: T-001, T-005
- Notes: UI wording should make the single-character scope explicit

---

## T-007 - [feature] Implement background adapter and location-driven background sync
- Owner: Human operator + AI assistant
- Status: [ ] 0% | Dates: planned start 2026-04-07, expected by 2026-04-09
- Scope: scope.md Goals, Success Metrics (SLOs), Dependencies
- Design: design.md Section 1.2, Section 2.1, Section 2.3, Section 3.2, Section 8.2
- Acceptance criteria:
  - Committed location changes are mapped through normalized location keys to configured backgrounds
  - Background changes are skipped when the normalized location is unchanged or unmapped
  - Adapter failures are logged without corrupting scene state
  - Manual validation shows the intended background changes for representative mapped locations
  - Acceptance testing demonstrates `>= 90%` correct mapped background application for validated cases
- Evidence: Will be added when started
- Dependencies: T-005, T-006
- Notes: This task should remain host-adapter focused and not duplicate extraction logic

---

## T-008 - [feature] Implement deterministic image payload adapter for native pipeline
- Owner: Human operator + AI assistant
- Status: [ ] 0% | Dates: planned start 2026-04-08, expected by 2026-04-10
- Scope: scope.md Goals, In Scope, Dependencies
- Design: design.md Section 1.2, Section 2.1, Section 2.3, Section 3.2, Section 10.1
- Acceptance criteria:
  - Current committed scene state can be serialized into a deterministic payload for the native SillyTavern image workflow
  - Prompt generation merges scene state with stable appearance facts and optional LoRA tags sourced from the active SillyTavern character card
  - Identical scene-state inputs and card metadata produce identical serialized Danbooru-style output in tests
  - Payload generation handles NSFW-relevant outfit, action, and interaction tags without requiring re-reading chat history
  - Adapter errors are surfaced through structured logs/debug output without breaking chat flow
  - Manual validation confirms the emitted payload can be consumed by the targeted native image pipeline path
- Evidence: Will be added when started
- Dependencies: T-005
- Notes: Initial implementation should target native handoff behavior rather than direct server orchestration

---

## T-009 - [feature] Add debug panel, observability counters, and failure surfacing
- Owner: Human operator + AI assistant
- Status: [ ] 0% | Dates: planned start 2026-04-09, expected by 2026-04-11
- Scope: scope.md Goals, In Scope
- Design: design.md Section 2.3, Section 6.1, Section 6.2
- Acceptance criteria:
  - A debug panel displays current committed scene state and recent update history
  - The extension exposes counters for processed turn pairs, successes, rejections, and adapter failures
  - Structured failure reasons are visible in debug mode without exposing secrets or full transcripts by default
  - Logs include a stable `updateId` or equivalent per processed turn pair
  - Manual validation confirms debug information updates in real time during representative chat activity
- Evidence: Will be added when started
- Dependencies: T-004, T-005
- Notes: This task exists to make inference behavior inspectable and easier to troubleshoot

---

## T-010 - [test] Establish automated test harness and coverage baseline
- Owner: Human operator + AI assistant
- Status: [ ] 0% | Dates: planned start 2026-04-10, expected by 2026-04-13
- Scope: scope.md Success Metrics (SLOs)
- Design: design.md Section 1.3, Section 3.3, Section 7.2
- Acceptance criteria:
  - A project test runner is selected and configured for extension-compatible unit and integration tests
  - Core modules have executable unit tests for normalization, validation, and state-store behavior
  - Integration tests exist for turn-pair processing and at least one host adapter path
  - Coverage reporting is available and demonstrates `>= 80%` changed-lines coverage on merged work
  - Test commands and expected outputs are documented for local validation
- Evidence: Will be added when started
- Dependencies: T-002, T-003, T-004, T-005
- Notes: This task may begin earlier as soon as the first pure modules exist, but should complete before release readiness

---

## T-011 - [docs] Prepare install, configuration, and validation documentation
- Owner: Human operator + AI assistant
- Status: [ ] 0% | Dates: planned start 2026-04-12, expected by 2026-04-14
- Scope: scope.md Goals, Milestones
- Design: design.md Section 7.1, Section 7.2, Section 10.1
- Acceptance criteria:
  - Installation instructions exist for loading the extension into SillyTavern
  - Configuration guidance explains active character selection, background mappings, character-card appearance / LoRA sourcing, and image payload usage
  - A validation checklist exists for scene updates, background sync, and image payload behavior
  - Known limitations and non-goals are documented clearly for users
  - Documentation matches the actual implemented settings and runtime behavior
- Evidence: Will be added when started
- Dependencies: T-006, T-007, T-008, T-009, T-010
- Notes: This task should also capture any host-version assumptions discovered during implementation

---

## T-012 - [infra] Release-readiness and packaging pass
- Owner: Human operator + AI assistant
- Status: [ ] 0% | Dates: planned start 2026-04-14, expected by 2026-04-16
- Scope: scope.md Milestones, Success Metrics (SLOs)
- Design: design.md Section 7.2, Section 10.2
- Acceptance criteria:
  - Runtime package contains only required extension files and user-facing docs
  - Manual smoke test passes in a clean local SillyTavern install
  - Outstanding blockers or known limitations are documented in tracker and handoff
  - Validation evidence includes test results, manual checks, and any release packaging notes
  - The implementation is ready for draft PR or release packaging review
- Evidence: Will be added when started
- Dependencies: T-007, T-008, T-009, T-010, T-011
- Notes: This is the final quality and packaging gate before first release candidate

---

## Blocked Tasks

No blocked tasks at the moment.

---

## T-002 - [feature] Define scene-state schema and normalization rules
- Owner: Human operator + AI assistant
- Status: [v] 100% | Dates: started 2026-03-26, completed 2026-03-27, last touched 2026-03-27
- Scope: scope.md Goals, In Scope, Risks (initial)
- Design: design.md Section 2.1, Section 3.1, Section 4.2, Section 8.1
- Acceptance criteria met:
  - Canonical schema for scene state is defined, including `outfit`, `pose`, `emotion`, `location`, `action`, `interaction`, and `summary`
  - Normalization rules canonicalize semantic equivalents for location keys and other enum-like fields
  - Invalid or partial patches are rejected without corrupting the prior valid state
  - Unit tests prove identical semantic inputs normalize to identical canonical values, including NSFW-relevant action / interaction / outfit states
  - Non-obvious schema and normalization behavior is documented in code comments
- Evidence:
  - `src/core/schema.js` defines the canonical patch contract and explicitly excludes stable appearance / LoRA metadata from mutable scene state
  - `src/core/normalizers.js` normalizes synonym-based semantic equivalents, NSFW-relevant outfit states, and deterministic action / interaction keys
  - `src/core/scene-state-store.js` rejects invalid patches before commit and preserves prior valid scene state
  - `node --test` -> 12/12 passing
  - `node --test --experimental-test-coverage` -> 98.51% lines, 92.04% branches, 100.00% functions overall
- Dependencies: T-001
- Notes: Prompt-generation requirements for card appearance, LoRA tags, and Danbooru output are intentionally deferred to T-008 rather than stored in scene state

---

## T-001 - [feature] Scaffold extension foundation
- Owner: Human operator + AI assistant
- Status: [v] 100% | Dates: started 2026-03-26, completed 2026-03-26, last touched 2026-03-26
- Scope: scope.md In Scope, Constraints & Assumptions
- Design: design.md Section 1.2, Section 1.3, Section 3.1
- Acceptance criteria met:
  - Extension runtime files exist: `manifest.json`, `index.js`, `style.css`, and `settings.html`
  - `src/` module structure exists for `core`, `adapters`, `ui`, and `utils` per design.md Section 3.1
  - Extension loads in SillyTavern without startup errors
  - Base settings initialize under the extension namespace and persist through reload
  - Manual validation confirms the extension can be enabled/disabled cleanly in a local SillyTavern instance
- Evidence:
  - Runtime scaffold added and committed on branch `codex/scene-state-tracker-scaffold`
  - Third-party template path fixed for the SillyTavern user-extension route (`third-party/SST`)
  - Recursive settings reload removed from `index.js`, resolving the post-reload panel disappearance
  - Manual validation in local SillyTavern confirmed settings panel visibility, startup success, and persistence across reload
- Dependencies: None
- Notes: T-002 is complete, and T-003 is now unblocked

---

## Task Numbering

**Current highest number:** T-012  
**Next task:** T-013

---

## Changelog

| Date | Changes | Author |
|------|---------|--------|
| 2026-03-27 | Updated schema/task docs for action + interaction scene fields and card-sourced appearance / LoRA prompt generation | Codex |
| 2026-03-26 | Marked T-002 complete with automated validation evidence and moved T-003 into active focus | Codex |
| 2026-03-26 | Marked T-001 complete with local SillyTavern validation evidence | Codex |
| 2026-03-26 | Updated T-001 with scaffold progress and pending validation evidence | Codex |
| 2026-03-26 | Initial tracker created with implementation backlog for SceneStateTracker | Codex |


