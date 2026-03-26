# scope.md

**Version:** 1.1  
**Last updated:** 2026-03-27  
**Status:** Active - defines project boundaries and success criteria

---

## Purpose

This document defines what SceneStateTracker is intended to do, what outcomes count as success, and which boundaries we will keep during implementation. It gives the human operator and AI assistant a shared contract for deciding whether a feature belongs in the project.

---

## Vision

SceneStateTracker is a SillyTavern extension that keeps an up-to-date, structured representation of the current scene for one active character within an ongoing chat. It turns the latest chat turn pair into deterministic scene metadata that downstream features can trust instead of relying on loosely inferred free text.

The extension should make scene continuity easier to maintain during roleplay, automatically adapt the chat background to the inferred location, and provide stable structured input for native SillyTavern image-generation workflows such as ComfyUI. The goal is not to replace chat creativity, but to create a reliable scene-state layer that other tools and UI behaviors can build on.

---

## Goals (what success looks like)

- Extract structured scene attributes from each latest user + character turn pair for one active character.
- Maintain a current scene state object that can be read by extension UI, background logic, and image-generation integrations.
- Update the visible chat background when the tracked location changes and a mapped background is available.
- Produce deterministic prompt-ready scene data for native SillyTavern image-generation pipelines without requiring manual rewriting each turn.
- Merge mutable scene state with stable appearance metadata and optional LoRA tags sourced from the active SillyTavern character card during prompt generation.
- Normalize generated prompt output into Danbooru-style tags, including NSFW-safe tagging for outfit state, action, and interaction when the scene calls for it.
- Keep the extension scoped to a single active tracked character per chat session so behavior stays understandable and debuggable.
- Expose enough transparency in logs/UI that users can understand why the extension inferred a given scene state.

---

## Success Metrics (SLOs)

- Scene extraction latency: <= 2 seconds p90 from receipt of the responding character message to persisted scene-state update on a typical local setup.
- State freshness: 100% of processed turn pairs update the in-memory scene state or emit a structured failure reason.
- Deterministic output consistency: identical turn-pair inputs produce identical structured scene output in >= 99% of test runs.
- Prompt determinism: identical character-card appearance, LoRA metadata, and scene-state inputs produce identical Danbooru-tag prompt output in >= 99% of test runs.
- Background update accuracy: >= 90% of validated location changes trigger the intended mapped background in acceptance testing.
- Recovery behavior: after invalid extraction output or pipeline error, the previous valid scene state remains intact in 100% of tested cases.
- Changed-lines test coverage: >= 80% on merged work, per methodology.md §7.

---

## In Scope

- A SillyTavern extension that runs in the client extension environment.
- Turn-pair analysis based on the latest user message and the immediately following active character response.
- Structured scene-state extraction for attributes such as outfit, pose, emotion, location, action, interaction, and similar present-state descriptors.
- State storage and retrieval for the current chat session and active tracked character.
- Background-selection logic driven by normalized location values and user-configured mappings.
- Deterministic scene payload generation for native SillyTavern image workflows, including ComfyUI-oriented prompt input.
- Prompt composition that merges scene state with stable character-card appearance facts and optional LoRA tags from the active SillyTavern character card.
- Danbooru-style prompt normalization for safe-for-work and NSFW scenes, including tags for outfit state, action, and interaction.
- User settings for enabling/disabling tracking, selecting the active tracked character, configuring extraction behavior, and mapping locations to backgrounds.
- Debug/inspection surfaces that let the operator review the latest extracted scene state and recent update history.

---

## Out of Scope (for now)

- Multi-character concurrent scene tracking within the same chat.
- Full story summarization, long-term memory management, or lorebook replacement.
- Autonomous generation of brand-new scene facts that are not grounded in the current turn pair or stable character-card metadata.
- Direct management of external image-generation servers beyond providing deterministic input into SillyTavern's native pipeline.
- Video, animation, or multi-frame scene continuity features.
- Cross-chat synchronization or cloud-hosted persistence.

---

## Constraints & Assumptions

- The project must operate as a SillyTavern extension and follow existing extension lifecycle and settings conventions.
- The extension should prefer native SillyTavern hooks, events, and image-generation interfaces over custom side channels.
- The initial release targets one active tracked character per chat session to reduce ambiguity in extraction and UI behavior.
- The mutable scene-state schema intentionally excludes stable appearance and LoRA metadata; those come from the active SillyTavern character card at prompt-generation time.
- The extracted scene state must be resilient to malformed or incomplete model output; the extension cannot assume perfect LLM formatting.
- Secrets for third-party tools must remain outside committed code per methodology.md §8.
- The extension should fail safely: if extraction fails, it should preserve the previous valid state and surface a reason rather than writing corrupt state.
- Host runtime details and exact supported SillyTavern version are not yet pinned in the repository and will need confirmation during implementation.

---

## Stakeholders

| Stakeholder | Role | Responsibility |
|-------------|------|----------------|
| Human operator / project owner | Sponsor | Defines product direction, reviews scope, validates UX |
| Extension users | Users | Use the extension during chat sessions and provide feedback |
| AI assistant | Actor | Designs docs, proposes code, and supports implementation |
| SillyTavern host environment | Platform dependency | Provides extension APIs, chat context, background controls, character-card metadata, and image pipeline hooks |
| Image workflow integrations (for example ComfyUI via SillyTavern) | External dependency | Consume deterministic scene data for image generation |

---

## Risks (initial)

- **Ambiguous turn content may produce unstable extraction results** -> Mitigation: constrain output schema, normalize values, and preserve prior valid state on parse failure.
- **Location names may not map cleanly to backgrounds** -> Mitigation: add normalization rules plus explicit user-managed location-to-background mappings.
- **SillyTavern API variation across versions may break hooks** -> Mitigation: isolate host integration behind adapters and document minimum supported behavior in design.md.
- **Users may expect multi-character tracking immediately** -> Mitigation: make the single-character constraint explicit in UI and documentation.
- **Prompt determinism may drift if extraction relies on free-form text** -> Mitigation: define canonical structured fields, separate stable card metadata from scene state, and enforce deterministic tag serialization order.
- **NSFW scenes may require different prompt tags than SFW scenes** -> Mitigation: normalize outfit state, action, and interaction into explicit canonical tags and validate them before image payload generation.

---

## Milestones (target dates, adjust as needed)

- **M1**: Scope and design baseline approved - Target: 2026-03-28
- **M2**: Extension scaffold with settings, lifecycle hooks, and state store - Target: 2026-04-02
- **M3**: Turn-pair extraction pipeline updates scene state end-to-end - Target: 2026-04-07
- **M4**: Background mapping and image-payload output integrated and validated - Target: 2026-04-12
- **M5**: Test coverage, debugging UX, and release-readiness pass completed - Target: 2026-04-16

---

## Dependencies

- SillyTavern extension runtime: Required, owner external/platform, high risk if required APIs differ from assumptions.
- Native SillyTavern background controls: Required, owner external/platform, medium risk if hooks are limited.
- Native SillyTavern image-generation pipeline: Required for prompt handoff, owner external/platform, high risk until integration points are confirmed.
- Active-character card metadata access: Required for stable appearance facts and optional LoRA tags, owner external/platform, high risk until card-field access is confirmed.
- LLM extraction strategy and schema contract: Pending implementation, owner project, high risk if not stabilized early.
- Background asset library or user-provided image mappings: Required for meaningful background updates, owner user/project, medium risk if unavailable.

---

## Non-Goals (what we explicitly won't do)

- This is not a full narrative memory engine for every entity, prop, and timeline event in the story.
- This is not a replacement for SillyTavern's native chat, background, or image-generation systems.
- This is not a general-purpose world-state tracker across all chats and characters.
- This is not a guarantee of semantic correctness for every ambiguous roleplay exchange; the system optimizes for structured usefulness and recoverability.

---

## Changelog

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2026-03-27 | 1.1 | Added prompt-generation requirements for character-card appearance, LoRA tags, Danbooru normalization, and NSFW tagging | Codex |
| 2026-03-26 | 1.0 | Initial scope defined for SceneStateTracker | Codex |
