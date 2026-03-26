# handoff.md

## Context Snapshot
- SceneStateTracker's canonical scene-patch contract now includes `action` and `interaction` in addition to `location`, `emotion`, `pose`, `outfit`, and `summary`.
- Deterministic normalization now covers semantic equivalents for location, emotion, pose, action, and interaction, plus NSFW-relevant outfit states such as `nude` and `topless`.
- Stable character-card appearance facts and optional LoRA tags are now explicitly excluded from mutable scene state and reserved for later prompt-generation work sourced from the active SillyTavern character card.
- The prompt-generation direction is now explicit: emit deterministic Danbooru-style tags for native image workflows, including NSFW-safe outfit/action/interaction tagging when present.
- The scene-state store still validates patches before commit and preserves the previous valid scene on rejection.
- T-002 remains complete after the schema correction; T-003 is still the next implementation slice.

## Active Task(s)
- T-003: Build turn-pair collector and update trigger flow - Acceptance: latest complete user + character turn pair is captured correctly; processing stays scoped to the active tracked character and chat; duplicate/stale events do not double-process; overlapping work is coalesced or rejected safely; integration-level validation proves representative chat-order correctness.

## Decisions Made
- Keep stable appearance facts and optional LoRA tags outside mutable scene state; source them from the active SillyTavern character card during prompt generation (link: docs/design.md Section 2.1, Section 8.4)
- Normalize image payload output to deterministic Danbooru-style tags rather than prose, including explicit NSFW-relevant outfit/action/interaction tags when present (link: docs/design.md Section 1.2, Section 8.5)
- Extend the mutable scene-state contract with `action` and `interaction` because those are turn-variant scene facts needed for prompt generation (link: docs/design.md Section 2.1, Section 4.2)

## Changes Since Last Session
- src/core/schema.js (+updated): Added canonical `action` and `interaction` fields and clarified that appearance / LoRA metadata are excluded from mutable scene state
- src/core/normalizers.js (+updated): Added deterministic normalization for `action`, `interaction`, and NSFW-relevant outfit states
- src/core/extraction-engine.js (+updated): Kept placeholder extraction aligned with the expanded canonical scene-patch contract
- tests/unit/schema.test.js (+updated): Added validation coverage for `action` and `interaction`
- tests/unit/normalizers.test.js (+updated): Added canonicalization coverage for `action`, `interaction`, and NSFW outfit normalization
- docs/scope.md (+updated): Added character-card appearance / LoRA prompt sourcing, Danbooru normalization, and NSFW prompt requirements
- docs/design.md (+updated): Added architectural boundaries for mutable scene state vs. card metadata and documented deterministic Danbooru-tag payload generation
- docs/tracker.md (+updated): Refined T-002/T-004/T-008/T-011 acceptance criteria to reflect the corrected prompt-model boundary
- docs/handoff.md (+updated): Recorded the schema correction and next-session starting point

## Validation & Evidence
- Unit: 12/12 passing via `node --test`
- Coverage: 98.51% lines, 92.04% branches, 100.00% functions via `node --test --experimental-test-coverage`
- Module coverage highlights: `src/core/schema.js` 98.44% lines / 97.73% branches; `src/core/normalizers.js` 97.34% lines / 80.56% branches; `src/core/scene-state-store.js` 100% lines / 100% branches

## Risks & Unknowns
- SillyTavern extension APIs for chat event capture, character-card metadata access, background control, and native image-pipeline handoff are still only partially confirmed - owner: Human operator + AI assistant - review: 2026-03-29
- The current automated harness covers pure modules only; integration coverage for real host event/order behavior and real card metadata access is still pending T-003/T-008/T-010 - owner: Human operator + AI assistant - review: 2026-03-30
- Card-level appearance and LoRA field conventions may vary across SillyTavern cards, so T-008 will need a conservative parsing strategy with fallbacks - owner: Human operator + AI assistant - review: 2026-04-01

## Next Steps
1. Rerun unit tests and coverage after the schema correction to refresh T-002 evidence.
2. Implement T-003 by wiring the turn-pair collector to real or realistically mocked SillyTavern chat-event inputs and stale-event guards.
3. During T-008 planning, confirm where appearance and optional LoRA tags live in the active character card and define the Danbooru-tag serialization order.

## Status Summary
- [v] 100% - T-002 complete with corrected schema boundaries; T-003 is next

