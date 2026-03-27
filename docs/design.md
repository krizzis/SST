# design.md

**Version:** 1.2  
**Last updated:** 2026-03-27  
**Status:** Living document - updated as architecture evolves  
**Authority:** Technical decisions source of truth; must align with `scope.md`

---

## Purpose

This document defines the technical architecture, module boundaries, and implementation rules for SceneStateTracker. It should be used during feature planning, implementation, and review to answer how the extension is built, where responsibilities live, and which tradeoffs have already been chosen.

---

## 1. Architecture Overview

### 1.1 System Context

- SceneStateTracker is a client-side SillyTavern extension that derives structured scene state from the newest user + character turn pair.
- It serves chat-session users who want current scene context, dynamic backgrounds, and prompt-ready image state for one active character.
- It integrates with SillyTavern extension APIs, chat context/state access, background controls, active-character card metadata, and the native image-generation pipeline.
- It may rely on configured LLM-backed extraction prompts or host-provided generation helpers to turn chat text into structured attributes.
- It does not perform multi-character orchestration, remote backend hosting, or direct ownership of external image-generation infrastructure.

---

### 1.2 High-Level Architecture

Architecture style: Layered client-side extension with event-driven updates

Diagram:
```text
+---------------------------+
| SillyTavern Chat Events   |
+-------------+-------------+
              |
              v
+---------------------------+
| Turn Pair Collector       |
| - latest user message     |
| - latest character reply  |
+-------------+-------------+
              |
              v
+---------------------------+
| Extraction Engine         |
| - schema prompt/input     |
| - parse/validate          |
| - normalize values        |
+-------------+-------------+
              |
              v
+---------------------------+
| Scene State Store         |
| - current valid state     |
| - recent history          |
| - session persistence     |
+------+------+-------------+
       |      |
       |      +-------------------+
       |                          |
       v                          v
+--------------------+   +------------------------------+
| Background Adapter |   | Image Payload Adapter        |
| - location mapping |   | - merge appearance + LoRA    |
| - background sync  |   | - Danbooru tag normalization |
+--------------------+   | - deterministic prompt order |
              |          +------------------------------+
              v
+---------------------------+
| Settings + Debug UI       |
| - active character        |
| - mappings and toggles    |
| - inspection panel        |
+---------------------------+
```

Component responsibilities:
- **Turn Pair Collector**: Watches chat lifecycle and emits the newest analyzable user/character pair for the tracked character.
- **Extraction Engine**: Produces validated structured scene data from text inputs.
- **Scene State Store**: Owns the canonical current scene state and protects against invalid overwrites.
- **Background Adapter**: Maps normalized locations to backgrounds and applies changes only when state meaningfully changes.
- **Image Payload Adapter**: Combines scene state with stable character-card appearance facts and optional LoRA tags, then emits deterministic Danbooru-style prompt payloads.
- **Settings + Debug UI**: Lets the user configure behavior and inspect the current state.

---

### 1.3 Technology Stack

| Layer | Technology | Version | Rationale |
|-------|-----------|---------|-----------|
| Runtime | SillyTavern extension runtime | Host-defined | The extension must run inside the existing host environment |
| Language | JavaScript (ES modules) | Host-compatible | Matches typical SillyTavern extension patterns and avoids extra build requirements initially |
| UI | HTML/CSS + jQuery lifecycle hooks | Host-compatible | Aligns with documented SillyTavern extension conventions |
| State serialization | JSON | Stable | Deterministic structured interchange for storage and image payloads |
| Validation | Lightweight schema validation helpers | Project-defined | Prevents malformed extraction output from corrupting state |
| Testing | Node built-in test runner | Host-compatible | Gives the repo a zero-dependency unit-test baseline while the extension remains dependency-light |

Constraints:
- Use documented SillyTavern extension lifecycle, settings, and event patterns.
- Keep the initial implementation dependency-light and understandable.
- Avoid introducing a standalone backend service for first release.
- Avoid opaque state mutations outside the scene-state store.

---

## 2. Design Principles

### 2.1 Core Principles

**1. Deterministic Structured Output**
- What it means: The same analyzed turn pair should produce the same normalized scene representation whenever possible.
- How we apply it: Use a fixed schema, canonical field order, normalization tables, and explicit fallback handling.
- Example: Location `"bed room"`, `"bedroom"`, and `"the bedroom"` normalize to the same canonical `location.key`.

**2. Preserve Last Known Good State**
- What it means: Bad extraction output must not destroy valid scene context.
- How we apply it: Parse and validate proposed updates before committing them; on failure, keep the previous state and emit diagnostics.
- Example: If emotion extraction returns malformed JSON, the current outfit/location remain unchanged.

**3. Single Source of Truth**
- What it means: Only one module owns the canonical current scene state.
- How we apply it: UI, background updates, and image payload generation all read from the scene-state store rather than recomputing from chat text.
- Example: The background adapter never parses messages directly; it subscribes to validated store updates.

**4. Separate Stable Character Identity from Mutable Scene State**
- What it means: Stable appearance facts and optional LoRA metadata should not be rewritten every turn.
- How we apply it: Treat appearance and LoRA tags as card-sourced prompt inputs, while scene state stores only turn-variant fields such as location, pose, action, interaction, and outfit state.
- Example: `long_hair` from the card remains stable even if the scene changes from `bedroom` to `forest_path`.

**5. Explainable Automation**
- What it means: Users should be able to inspect why the extension changed state.
- How we apply it: Keep a recent history of extracted updates, normalized values, and failure reasons in debug UI/logs.
- Example: A debug panel shows the last analyzed turn pair, proposed state diff, and final committed state.

---

### 2.2 Error Handling Strategy

**Error types:**
- **Operational**: Host API unavailable, image pipeline hook missing, parse failure from extraction output -> Strategy: log warning/error, keep prior valid scene state, surface status in debug UI, continue session.
- **Validation**: Required fields missing, invalid enum/value shape, non-deterministic payload shape -> Strategy: reject update, record structured reason, preserve last known good state.
- **Programmer**: Undefined module contract, impossible branch, unexpected null access -> Strategy: fail fast in development, log rich diagnostics, add regression tests before release.

**Error response format:**
```json
{
  "ok": false,
  "stage": "extraction|validation|background|image-payload",
  "reason": "human-readable summary",
  "details": {
    "chatId": "optional",
    "characterId": "optional",
    "turnId": "optional"
  }
}
```

**Never expose:**
- Raw secrets, API tokens, or local file paths that do not help the user.
- Unfiltered stack traces in user-facing UI.
- Full prompt internals in normal-mode UI if they may reveal sensitive configuration.

---

### 2.3 Logging Strategy

**Format:** Structured plain objects written through a single logger helper, with console output in development and optional debug UI surfacing.

**Log levels:**
- **ERROR**: A committed workflow failed and user-visible behavior was skipped. Example: background adapter threw while applying a mapped background.
- **WARN**: Recoverable problem or rejected update. Example: extraction output failed validation, prior state retained.
- **INFO**: Significant state transition. Example: location changed from `tavern` to `forest_path`.
- **DEBUG**: Detailed extraction inputs, normalization decisions, card-metadata resolution, and adapter payloads when debug mode is enabled.

**Always log:**
- Successful state commits with a concise diff summary.
- Rejected scene updates with stage and reason.
- Background-change decisions, including `no-op` skips when location is unchanged.
- Image payload generation events with the emitted field set, not the full sensitive prompt text unless debug is enabled.

**Never log:**
- Secrets or credentials, per methodology.md Section 8.
- Entire chat transcripts by default.
- Full image prompts in standard mode if they may expose user-private context.

**Correlation:** Each processed turn pair should carry a generated `updateId` plus chat and character identifiers where available.

---

## 3. Module Design

### 3.1 Directory Structure

```text
project-root/
|-- manifest.json              # Extension manifest
|-- index.js                   # Extension entrypoint and lifecycle wiring
|-- style.css                  # Extension styles
|-- settings.html              # Settings and debug panel template
|-- src/
|   |-- core/
|   |   |-- scene-state-store.js      # Canonical state owner
|   |   |-- turn-pair-collector.js    # Collects analyzable turn pairs
|   |   |-- extraction-engine.js      # Orchestrates extraction flow
|   |   |-- normalizers.js            # Canonicalization helpers
|   |   |-- appearance-profile.js     # Character-card appearance / LoRA normalization
|   |   `-- schema.js                 # Scene-state schema definitions
|   |-- adapters/
|   |   |-- sillytavern-chat.js       # Host chat/context wrapper
|   |   |-- background-adapter.js     # Host background sync wrapper
|   |   `-- image-payload-adapter.js  # Native image pipeline wrapper
|   |-- ui/
|   |   |-- settings-controller.js    # Settings bindings
|   |   `-- debug-panel.js            # State inspection UI
|   `-- utils/
|       |-- logger.js                 # Logging helper
|       `-- diff.js                   # State diff helpers
|-- tests/
|   |-- unit/                         # Pure logic tests
|   `-- integration/                  # Host adapter and workflow tests
`-- docs/
    |-- scope.md
    `-- design.md
```

**Conventions:**
- Source files use kebab-case to match extension-style modules.
- One module owns one responsibility; cross-cutting helpers stay in `utils/`.
- Tests mirror source module names and focus on deterministic behavior.
- Public integration points are imported through `index.js` and adapter modules, not deep-linked ad hoc.

---

### 3.2 Layer Responsibilities

**Host Adapter Layer:**

Purpose: Isolate SillyTavern-specific APIs from core logic.
Reference boundary: The local SillyTavern code at `E:\AI_Tools\SillyTavern` is an external read-only reference for integration research. Do not modify files under that path without direct human approval.

Verified integration baseline for T-003:
- Listen for `event_types.CHARACTER_MESSAGE_RENDERED` as the primary "character reply is ready" signal.
- Use `event_types.CHAT_CHANGED` to reset per-chat collector state when the active chat changes.
- Read current runtime state from exported SillyTavern values: `chat`, `this_chid`, `characters`, `chat_metadata`, and `getCurrentChatId()`.
- Prefer deriving the latest valid user + character pair from the current `chat` snapshot rather than trusting event payloads alone.
- Treat message array index / `mesid` as the practical message identifier for pairing and deduplication.
- Group chats remain out of scope for MVP. For T-003, use a soft fallback: prefer the configured active character name when available, otherwise fall back to the selected SillyTavern character context, and skip processing when the latest pair is ambiguous.

Responsibilities:
- [v] Read current chat/session context, message data, and active-character card metadata.
- [v] Apply background updates and emit image payloads through host interfaces.
- [v] Translate host-specific events and payloads into project-internal shapes.
- [x] Contain business rules for scene inference.
- [x] Mutate canonical scene state directly.

**Core Logic Layer:**

Purpose: Convert turn pairs into validated scene-state updates.

Responsibilities:
- [v] Build extraction input from turn pairs.
- [v] Validate and normalize extracted data.
- [v] Decide whether to commit, reject, or partially merge state changes.
- [x] Call DOM APIs directly.
- [x] Depend on raw host event payload shapes outside adapter contracts.

Extraction-engine boundary for T-004:
- The extraction engine should keep a pluggable draft-extraction seam ahead of parse, normalize, and validate stages.
- The current default draft extractor is deterministic and local.
- A future assistive-hybrid path may add weak-field detection plus optional prompt-backed field completion behind the same seam.
- Any future prompt-backed assistance must remain non-authoritative until the merged draft passes normalization and schema validation.
- Store commits, rejection handling, and downstream side effects must stay outside the extractor boundary.

**State Store Layer:**

Purpose: Own the current valid scene state and notify dependents.

Responsibilities:
- [v] Store current state, metadata, and recent update history.
- [v] Guard writes behind validation/commit rules.
- [v] Notify subscribers on committed changes.
- [x] Parse chat text itself.
- [x] Decide host-specific side effects.

**Prompt Composition Layer:**

Purpose: Build deterministic generation payloads from scene state plus stable card metadata.

Responsibilities:
- [v] Read normalized scene state from the store.
- [v] Read stable appearance facts and optional LoRA tags from the active character card.
- [v] Normalize output into deterministic Danbooru-style tags, including NSFW outfit/action/interaction tags when present.
- [x] Rewrite scene state or treat stable appearance as per-turn mutable data.

**UI Layer:**

Purpose: Render settings and explain current extension behavior to the user.

Responsibilities:
- [v] Bind settings to `extension_settings`.
- [v] Show current state, recent updates, and failure reasons.
- [v] Let the user configure active character, debug mode, and location mappings.
- [x] Reimplement extraction logic.
- [x] Store authoritative state outside the state store.

---

### 3.3 Testing Strategy

**Unit Tests:**
- Purpose: Prove deterministic normalization, state merging, schema validation, and diff generation.
- Scope: One pure module or function at a time.
- Mocking: Mock host adapters and timestamps where needed.
- Coverage target: >= 80% on changed lines per methodology.md Section 7, with higher focus on extraction/normalization paths.
- Run: `node --test` and `node --test --experimental-test-coverage`

**Integration Tests:**
- Purpose: Prove end-to-end flow from turn-pair detection through committed state and adapter side effects.
- Scope: Multiple modules together with mocked SillyTavern host APIs.
- Environment: Headless or lightweight simulated host environment.
- When to run: Before merge and for any adapter contract change.
- Run: `[TBD after host adapter fixtures exist]`

**E2E / Manual Validation:**
- Purpose: Confirm the extension updates live chat state, backgrounds, and image payloads correctly in SillyTavern.
- Scope: Real extension load in a dev instance.
- Environment: Local SillyTavern session with known sample conversations, character cards, and background mappings.
- When to run: Milestone checkpoints and release candidates.
- Run: Manual scripted checklist until automation exists.

---

## 4. Security Guidelines

### 4.1 Authentication & Authorization

**Authentication:**
- Mechanism: None owned by this extension; authentication is delegated to the host environment and any external tools configured by the user.
- Token lifetime: Host-defined or external-tool-defined.
- Storage: Secrets, if any, stay in local user configuration and must never be committed.
- Invalidation: Delegated to host/external systems.

**Authorization:**
- Model: Local user-controlled extension settings.
- Permission checks: The extension should only operate within the current local SillyTavern user context and should not bypass host controls.

**Implementation:** Security-sensitive integrations must be isolated in adapter modules and documented as they are added.

---

### 4.2 Input Validation

**Validation library:** Lightweight project-defined schema validation initially; can be upgraded to a dedicated validator if needed.

**Where:** Both at extraction boundaries and before state-store commits.

**Validate:**
- Turn-pair presence and role ordering.
- Structured extraction output shape and required fields.
- Enum-like normalized values such as pose, emotion, location, action, and interaction categories where applicable.
- User settings such as active character selection and location-background mappings.
- Character-card appearance / LoRA metadata before prompt serialization.

**Sanitize:**
- Trim and normalize user-configured string values.
- Canonicalize whitespace, casing, synonyms, and tag aliases before comparing or storing.
- Reject unsafe or malformed background mapping values before host application.

---

### 4.3 Data Protection

**Secrets:**
- Storage: Local environment or host-managed settings only.
- Access: Through environment variables or host configuration if future integrations require them.
- Rotation: User-managed, dependent on integrated external tools.
- Per methodology.md Section 8: Never commit secrets.

**Sensitive data:**
- Chat content: Treat as potentially private; do not log full transcripts by default.
- Logs: Redact or omit sensitive text unless explicit debug mode is enabled by the user.
- Persisted state: Store only what is needed for current scene continuity and integrations.
- NSFW prompt payloads: Treat as user-private output and avoid logging full prompts outside explicit debug mode.

**Local storage:**
- Use the minimum necessary persisted fields.
- Avoid writing raw extraction prompts/responses unless the user explicitly enables debug retention.

---

## 5. Performance Guidelines

### 5.1 Processing Optimization

**Patterns:**
- [v] Process only the newest complete user + character turn pair.
- [v] Skip no-op updates when normalized state has not materially changed.
- [v] Cache normalized mapping lookups for backgrounds where useful.
- [v] Cache stable character-card appearance / LoRA normalization while the active character is unchanged.
- [x] Re-scan the entire chat history for every new message.
- [x] Trigger repeated background/image updates if the committed state is unchanged.

**Guideline:** Most work should be incremental and bounded to one fresh interaction cycle.

---

### 5.2 Caching Strategy

**What to cache:**
- [v] The current committed scene state.
- [v] Recent scene-update history for debug inspection.
- [v] Normalized location-to-background mappings derived from settings.
- [v] Stable normalized appearance / LoRA metadata for the active character.
- [x] Entire chat history snapshots unless specifically required for a future feature.
- [x] Invalid extraction outputs beyond short-lived debug history.

**Cache layers:**
1. In-memory store: Primary runtime state for current session.
2. Session/local persistence: Optional recovery of latest valid state and settings across reloads.
3. Character-card metadata cache: Rebuilt when the active character changes or card content changes.

**TTL strategy:**
- Current scene state: Valid until superseded by a newer committed update or session reset.
- Debug history: Bounded list, not time-based, to avoid unbounded growth.
- Character-card metadata cache: Valid until active character or card metadata changes.

**Invalidation:**
- Clear or rebuild derived caches when settings change.
- Reset state when the active chat or tracked character changes.

---

### 5.3 Rate Limiting

**Limits:**
- Extraction processing: At most one active processing job per chat update cycle.
- Expensive side effects: Background and image-payload updates should occur only after a committed state change.

**Algorithm:** Event coalescing with single-flight processing rather than network-style rate limiting.

**Response when exceeded:**
```json
{
  "ok": false,
  "reason": "processing-already-in-flight"
}
```

**Implementation:** The extraction engine should guard against overlapping runs and drop or coalesce stale work.

---

## 6. Observability

### 6.1 Monitoring Metrics

**Key metrics:**
- Turn pairs processed per session.
- Extraction success vs. rejection count.
- State commit count and no-op count.
- Background update success/failure count.
- Image payload generation success/failure count.
- End-to-end processing latency per update.
- Prompt normalization fallback count for appearance, LoRA, and Danbooru tag serialization.

**Tools:** Local debug counters and logs initially; richer telemetry can be added later if needed.

**Dashboards:** Debug panel should expose a human-readable snapshot of these counters during development.

---

### 6.2 Alerting

**Alert on:**
- Repeated extraction failures for the same chat session.
- Repeated adapter failures that block background or image updates.
- Unhandled exceptions during extension lifecycle hooks.

**Channels:** In-app warning banner or debug panel indication initially.

**Escalation:**
- Step 1: Surface failure in debug UI and log output.
- Step 2: Suggest user action such as disabling a failing integration or reviewing settings.
- Step 3: Record the issue in tracker/handoff once project workflow docs exist.

**Don't alert on:**
- Single recoverable parse failures.
- No-op state updates where nothing changed.

---

## 7. Deployment & Operations

### 7.1 Environment Strategy

| Environment | Purpose | Deploy Trigger | Data |
|-------------|---------|----------------|------|
| **Local dev** | Build and iterate on extension behavior | Manual reload during development | Local user chats, character cards, and test fixtures |
| **Local validation** | Manual acceptance testing in SillyTavern | Before merge/release | Controlled sample chats, mappings, and representative cards |
| **Release package** | Distributed extension artifact | Tagged release/manual packaging | No bundled user data |

**Config differences:**
- Local dev: Debug logging enabled, mock/sample mappings allowed.
- Local validation: Production-like settings with representative chat scenarios.

---

### 7.2 Deployment Process

**Pipeline steps (per methodology.md Section 9):**
1. Lint/format
2. Unit tests with coverage
3. Integration tests with mocked host APIs
4. Secret/SCA scan
5. Package extension runtime files
6. Install into a SillyTavern extensions directory for manual smoke testing
7. Validate settings load, state updates, background sync, and image payload output

**Rollback:** Reinstall the prior known-good extension package and clear incompatible persisted state if schema changes require it.

**Artifacts:** Release package should contain only required runtime files, docs, and installation guidance.

---

## 8. Decision Log (ADRs)

### 8.1 ADR-001: Track a Single Active Character per Chat

**Date:** 2026-03-26  
**Status:** Accepted

**Context:**
The product concept could expand toward multi-character tracking, but the current problem statement emphasizes one active character. Multi-entity scene inference introduces ambiguity around whose outfit, pose, and emotion should be canonical.

**Decision:**
The initial architecture tracks exactly one active character per chat session and makes that selection explicit in settings/state.

### 8.2 ADR-002: Use a Validated Scene-State Store as the Single Source of Truth

**Date:** 2026-03-26  
**Status:** Accepted

**Context:**
Background updates and image payload generation both need the same authoritative state. Recomputing independently from chat text would create drift and duplicated logic.

**Decision:**
All downstream behaviors read from a single validated scene-state store that only updates after extraction, validation, and normalization succeed.

### 8.3 ADR-003: Drive Side Effects from Turn-Pair Deltas, Not Full Chat Reanalysis

**Date:** 2026-03-26  
**Status:** Accepted

**Context:**
The extension needs to feel responsive during live chats. Reprocessing the full transcript on every new message is slow and increases the chance of drift.

**Decision:**
The system analyzes only the newest user message plus the responding character message, then merges the resulting patch into the current scene state.

### 8.4 ADR-004: Keep Appearance and LoRA Metadata Outside Mutable Scene State

**Date:** 2026-03-27  
**Status:** Accepted

**Context:**
Stable character-card appearance and optional LoRA tags are needed for image prompts, but they are not scene facts that should churn with every turn.

**Decision:**
Store only mutable scene facts in scene state. Resolve stable appearance facts and optional LoRA tags from the active SillyTavern character card during prompt generation.

**Consequences:**
- [v] Clearer boundary between scene continuity and character identity.
- [v] Less risk of overwriting stable card data with noisy extraction output.
- [!] Prompt generation now depends on card metadata access being available.

### 8.5 ADR-005: Normalize Prompt Output to Danbooru-Style Tags

**Date:** 2026-03-27  
**Status:** Accepted

**Context:**
Native image workflows consume tags more reliably than prose, and NSFW scenes require explicit canonical handling for outfit state, action, and interaction.

**Decision:**
Prompt generation should emit deterministic Danbooru-style tags in stable order, merging card appearance, optional LoRA tags, and normalized scene-state tags.

**Consequences:**
- [v] More deterministic payloads for image workflows.
- [v] Cleaner support for NSFW prompts through explicit canonical tags.
- [!] Requires careful tag normalization and card-field parsing.

---

## 9. Coding Standards

### 9.1 Language-Specific Conventions

**Naming:**
- Modules/files: `kebab-case`
- Functions: `camelCase`
- Constants: `UPPER_SNAKE_CASE`
- Settings keys: stable lowercase identifiers under the extension namespace

**Language features:**
- Use `const`/`let`, async/await, and small pure functions where possible.
- Keep host interaction behind adapters.
- Avoid hidden global state outside the extension settings/store.
- Avoid mixing DOM manipulation with extraction/state logic in the same module.

**Formatting:**
- Follow the repo's eventual formatter/linter once added.
- Until tooling exists, prefer readable, dependency-light JavaScript with consistent semicolons and modest function size.

---

### 9.2 Comments & Documentation

**Comment when:**
- [v] Explaining why a normalization or merge rule exists.
- [v] Warning about host API quirks or lifecycle timing.
- [v] Documenting schema fields or side-effect sequencing.
- [x] Restating obvious code behavior.

**Documentation format:**
- Public module entrypoints: brief JSDoc where the contract is not obvious.
- Inline comments: short rationale-focused notes.

---

### 9.3 Git Commit Messages

**Format:** Conventional Commits

```text
<type>(<scope>): <subject>
```

**Types:**
- `feat`: user-visible extension behavior
- `fix`: bug fix
- `docs`: documentation change
- `test`: test additions or fixes
- `refactor`: internal restructuring with no user-visible behavior change

---

## 10. Extensibility & Future Work

### 10.1 Extension Points

**Designed for extension:**
- Extraction schema fields can expand to include lighting, weather, or props.
- Background mapping can evolve from exact key matching to richer rule-based matching.
- Image payload generation can support multiple output adapters for different native workflows.
- Character selection can be extended to multi-character tracking in a later milestone.

**How to extend:**
- Add new scene fields in `schema.js`, normalization rules in `normalizers.js`, and adapter serialization support in `image-payload-adapter.js`.
- Add or refine card-metadata normalization in `appearance-profile.js` rather than bloating the mutable scene schema.
- New host integrations should be added as adapter modules rather than mixed into core logic.

**Planned extensions:**
- Manual scene-state overrides from UI.
- Field-level confidence scores or `unknown` handling.
- Multi-character support after the single-character path is stable.

---

### 10.2 Tech Debt Tracking

**Document debt:**
- In code: `TODO(T-XXX): description` once tracker tasks exist.
- In tracker.md: add tech-debt tasks tied to specific modules.
- In handoff.md: record debt that blocks next-session progress.

**Review cadence:** At each milestone and before any release package.

**Priority criteria:**
- Prioritize debt that affects deterministic output, host compatibility, security, or debugging.

---

## 11. Changelog

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2026-03-27 | 1.1 | Added appearance/LoRA prompt-source rules, Danbooru-tag prompt design, NSFW action/interaction guidance, and initial Node test-runner selection | Codex |
| 2026-03-27 | 1.2 | Clarified T-004 extraction-engine boundary to stay pluggable for a later assistive-hybrid extractor without changing current deterministic behavior | Codex |
| 2026-03-26 | 1.0 | Initial technical design for SceneStateTracker | Codex |

---

## Appendix A: Useful References

**Internal:**
- `docs/scope.md`
- `docs/methodology.md`
- `docs/ai_patterns.md`
- `.agents/skills/sillytavern-extension-builder/references/writing-extensions-reference.md`

