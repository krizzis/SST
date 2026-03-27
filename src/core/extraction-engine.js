import { normalizeScenePatch } from './normalizers.js';
import { createEmptyScenePatch, validateScenePatch } from './schema.js';
import {
    ACTION_PATTERNS,
    EMOTION_PATTERNS,
    GARMENT_PATTERNS,
    INTERACTION_PATTERNS,
    LOCATION_PATTERNS,
    OUTFIT_PATTERNS,
    POSE_PATTERNS,
} from './extraction-patterns.js';

function normalizeText(value) {
    return String(value ?? '').trim().replace(/\s+/g, ' ');
}

function buildSummary(characterMessage) {
    return normalizeText(characterMessage).slice(0, 200);
}

function findPatternValue(text, matchers, fallback = '') {
    for (const matcher of matchers) {
        if (matcher.patterns.some((pattern) => pattern.test(text))) {
            return matcher.value;
        }
    }

    return fallback;
}

function extractOutfit(text) {
    const values = [];

    for (const matcher of OUTFIT_PATTERNS) {
        if (matcher.patterns.some((pattern) => pattern.test(text))) {
            values.push(matcher.value);
        }
    }

    for (const matcher of GARMENT_PATTERNS) {
        if (matcher.patterns.some((pattern) => pattern.test(text))) {
            values.push(matcher.value);
        }
    }

    return [...new Set(values)].join(', ');
}

function isPlainObject(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function createExtractionFailure({ turnPairId, startedAt, now, stage, reason, details = {} }) {
    const nextDetails = { ...details };

    if (turnPairId) {
        nextDetails.turnPairId = turnPairId;
    }

    if (typeof startedAt === 'number') {
        nextDetails.latencyMs = now() - startedAt;
    }

    return {
        ok: false,
        stage,
        reason,
        details: nextDetails,
    };
}

function createExtractionSuccess({ patch, startedAt, now }) {
    return {
        ok: true,
        patch,
        latencyMs: now() - startedAt,
    };
}

function parseDraftPatch(rawDraftPatch) {
    if (typeof rawDraftPatch === 'string') {
        try {
            const parsed = JSON.parse(rawDraftPatch);
            if (!isPlainObject(parsed)) {
                return {
                    ok: false,
                    stage: 'extraction',
                    reason: 'draft-output-must-be-an-object',
                };
            }

            return { ok: true, value: parsed };
        } catch {
            return {
                ok: false,
                stage: 'extraction',
                reason: 'malformed-draft-output',
            };
        }
    }

    if (!isPlainObject(rawDraftPatch)) {
        return {
            ok: false,
            stage: 'extraction',
            reason: 'draft-output-must-be-an-object',
        };
    }

    return { ok: true, value: rawDraftPatch };
}

export function extractDeterministicDraftScenePatch(turnPair) {
    const userMessage = normalizeText(turnPair?.userMessage);
    const characterMessage = normalizeText(turnPair?.characterMessage);
    const combinedText = `${userMessage}\n${characterMessage}`.trim();

    return {
        location: findPatternValue(combinedText, LOCATION_PATTERNS, 'unknown'),
        emotion: findPatternValue(characterMessage || combinedText, EMOTION_PATTERNS, 'neutral'),
        pose: findPatternValue(characterMessage || combinedText, POSE_PATTERNS, 'unspecified'),
        action: findPatternValue(combinedText, ACTION_PATTERNS, 'idle'),
        interaction: findPatternValue(combinedText, INTERACTION_PATTERNS, 'none'),
        outfit: extractOutfit(combinedText),
        summary: buildSummary(characterMessage || userMessage),
    };
}

async function runDraftExtraction({ turnPair, draftExtractor, logger, now, startedAt }) {
    try {
        const rawDraftPatch = await draftExtractor(turnPair);

        return {
            ok: true,
            rawDraftPatch,
        };
    } catch (cause) {
        const error = createExtractionFailure({
            turnPairId: turnPair.id,
            startedAt: null,
            now,
            stage: 'extraction',
            reason: 'draft-extraction-failed',
            details: {
                message: cause instanceof Error ? cause.message : String(cause),
            },
        });
        logger.error('scene-extraction-failed', error);
        return error;
    }
}

function runDraftParse({ rawDraftPatch, turnPair, logger, now, startedAt }) {
    const parsedDraft = parseDraftPatch(rawDraftPatch);
    if (!parsedDraft.ok) {
        const error = createExtractionFailure({
            turnPairId: turnPair.id,
            startedAt,
            now,
            stage: parsedDraft.stage,
            reason: parsedDraft.reason,
        });
        logger.warn('scene-extraction-failed', error);
        return error;
    }

    return {
        ok: true,
        draftPatch: parsedDraft.value,
    };
}

function runDraftNormalization(draftPatch) {
    return normalizeScenePatch({
        ...createEmptyScenePatch(),
        ...draftPatch,
    });
}

function runPatchValidation({ patch, turnPair, validator, logger, now, startedAt }) {
    const validation = validator(patch);

    if (!validation.ok) {
        const error = createExtractionFailure({
            turnPairId: turnPair.id,
            startedAt,
            now,
            stage: 'validation',
            reason: validation.reason,
        });
        logger.warn('scene-extraction-validation-failed', error);
        return error;
    }

    return {
        ok: true,
        patch,
    };
}

export function createExtractionEngine({
    logger,
    draftExtractor = extractDeterministicDraftScenePatch,
    now = () => Date.now(),
    validator = validateScenePatch,
} = {}) {
    return {
        async extract(turnPair) {
            const startedAt = now();
            logger.debug('scene-extraction-started', { turnPairId: turnPair?.id });

            if (!turnPair || typeof turnPair !== 'object') {
                const error = {
                    ok: false,
                    stage: 'extraction',
                    reason: 'turn-pair-must-be-an-object',
                };
                logger.error('scene-extraction-failed', error);
                return error;
            }

            const draftExtraction = await runDraftExtraction({
                turnPair,
                draftExtractor,
                logger,
                now,
                startedAt,
            });
            if (!draftExtraction.ok) {
                return draftExtraction;
            }

            const draftParse = runDraftParse({
                rawDraftPatch: draftExtraction.rawDraftPatch,
                turnPair,
                logger,
                now,
                startedAt,
            });
            if (!draftParse.ok) {
                return draftParse;
            }

            const patch = runDraftNormalization(draftParse.draftPatch);
            const patchValidation = runPatchValidation({
                patch,
                turnPair,
                validator,
                logger,
                now,
                startedAt,
            });
            if (!patchValidation.ok) {
                return patchValidation;
            }

            const result = createExtractionSuccess({
                patch: patchValidation.patch,
                startedAt,
                now,
            });
            logger.info('scene-extraction-succeeded', {
                turnPairId: turnPair.id,
                latencyMs: result.latencyMs,
            });

            return result;
        },
    };
}
