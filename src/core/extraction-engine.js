import { normalizeScenePatch } from './normalizers.js';
import {
    createEmptyScenePatch,
    validateExtractionPayload,
    validateScenePatch,
} from './schema.js';

const EXTRACTION_RESPONSE_SCHEMA = {
    type: 'object',
    additionalProperties: false,
    required: ['location', 'emotion', 'pose', 'action', 'interaction', 'outfit', 'summary'],
    properties: {
        location: { anyOf: [{ type: 'string' }, { type: 'object' }] },
        emotion: { anyOf: [{ type: 'string' }, { type: 'object' }] },
        pose: { anyOf: [{ type: 'string' }, { type: 'object' }] },
        action: { anyOf: [{ type: 'string' }, { type: 'object' }] },
        interaction: { anyOf: [{ type: 'string' }, { type: 'object' }] },
        outfit: { anyOf: [{ type: 'string' }, { type: 'object' }] },
        summary: { type: 'string' },
    },
};

const EXPLICIT_OUTFIT_EVIDENCE_MAP = new Map([
    ['nude', ['nude', 'naked', 'fully naked', 'completely naked']],
    ['topless', ['topless', 'bare breasts', 'bare chest', 'shirt off', 'robe open']],
    ['bottomless', ['bottomless', 'pantless', 'no pants', 'without panties', 'shorts down', 'pants down']],
    ['open_clothes', ['open clothes', 'open shirt', 'open robe', 'parted clothing', 'robe open', 'shirt open']],
    ['lingerie', ['lingerie', 'underwear', 'bra', 'panties', 'bra and panties']],
]);

const OUTFIT_EVIDENCE_KEYWORDS = [
    'robe',
    'dress',
    'shirt',
    'skirt',
    'shorts',
    'jeans',
    'pants',
    'panties',
    'underwear',
    'lingerie',
    'bra',
    'stockings',
    'heels',
    'boots',
    'gloves',
    'tank top',
    'top',
    'jacket',
    'coat',
    'sweater',
    'hoodie',
    'uniform',
    'barefoot',
    'bare feet',
];

function normalizeEvidenceText(value) {
    return String(value ?? '')
        .toLowerCase()
        .replace(/[^a-z0-9\s]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function containsEvidencePhrase(text, phrase) {
    const normalizedPhrase = normalizeEvidenceText(phrase);
    if (!normalizedPhrase) {
        return false;
    }

    return new RegExp(`(^|\\s)${escapeRegExp(normalizedPhrase)}(?=\\s|$)`, 'i').test(text);
}

function toEvidenceParts(outfitValue) {
    if (typeof outfitValue === 'string') {
        return outfitValue
            .split(/[,;]|\band\b/gi)
            .map((part) => part.trim())
            .filter(Boolean);
    }

    if (outfitValue && typeof outfitValue === 'object' && !Array.isArray(outfitValue)) {
        return [
            outfitValue.primary,
            ...(Array.isArray(outfitValue.details)
                ? outfitValue.details
                : typeof outfitValue.details === 'string'
                    ? outfitValue.details.split(/[,;]|\band\b/gi)
                    : []),
        ]
            .map((part) => String(part || '').trim())
            .filter(Boolean);
    }

    return [];
}

function hasOutfitEvidence(part, normalizedTurnText) {
    const normalizedPart = normalizeEvidenceText(part);
    if (!normalizedPart) {
        return false;
    }

    for (const [key, phrases] of EXPLICIT_OUTFIT_EVIDENCE_MAP.entries()) {
        if (normalizedPart.includes(key) || phrases.some((phrase) => normalizedPart.includes(normalizeEvidenceText(phrase)))) {
            return phrases.some((phrase) => containsEvidencePhrase(normalizedTurnText, phrase));
        }
    }

    return OUTFIT_EVIDENCE_KEYWORDS.some((keyword) => {
        const normalizedKeyword = normalizeEvidenceText(keyword);
        return normalizedPart.includes(normalizedKeyword) && containsEvidencePhrase(normalizedTurnText, normalizedKeyword);
    });
}

function applyEvidenceGuards(payload, turnPair) {
    const nextPayload = {
        ...payload,
    };
    const normalizedTurnText = normalizeEvidenceText(`${turnPair.userMessage || ''}\n${turnPair.characterMessage || ''}`);

    const outfitParts = toEvidenceParts(payload.outfit);
    if (outfitParts.length > 0) {
        const supportedOutfitParts = outfitParts.filter((part) => hasOutfitEvidence(part, normalizedTurnText));
        if (supportedOutfitParts.length === 0) {
            nextPayload.outfit = '';
        } else {
            nextPayload.outfit = supportedOutfitParts.join(', ');
        }
    }

    return nextPayload;
}

function buildExtractionPrompt(turnPair) {
    return [
        'You extract structured scene state from exactly one user message and one character reply.',
        'Return JSON only with these top-level keys: location, emotion, pose, action, interaction, outfit, summary.',
        'Use concise scene facts grounded in the text. Do not invent extra keys or commentary.',
        'Do not use character card defaults, prior chat history, or background assumptions unless the latest turn pair explicitly supports them.',
        'If a mutable scene field is not clearly established in the latest turn pair, use a conservative neutral value or an empty outfit string instead of guessing.',
        'For location/emotion/pose/action/interaction, prefer short descriptive strings.',
        'For outfit, describe only current clothing or exposure state explicitly supported by the latest turn pair. If unclear, return an empty string.',
        'For outfit, return either a concise string or an object with primary/details.',
        '',
        `User message: ${turnPair.userMessage || ''}`,
        `Character message: ${turnPair.characterMessage || ''}`,
    ].join('\n');
}

function extractJsonObject(rawText) {
    const trimmed = String(rawText ?? '').trim();
    if (!trimmed) {
        return null;
    }

    const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fencedMatch?.[1]) {
        return fencedMatch[1].trim();
    }

    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) {
        return null;
    }

    return trimmed.slice(start, end + 1);
}

function parseProviderPayload(rawText) {
    const jsonText = extractJsonObject(rawText);
    if (!jsonText) {
        return {
            ok: false,
            stage: 'parse',
            reason: 'json-object-not-found',
        };
    }

    try {
        const parsed = JSON.parse(jsonText);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            return {
                ok: false,
                stage: 'parse',
                reason: 'json-root-must-be-an-object',
            };
        }

        const payload = parsed.patch && typeof parsed.patch === 'object' && !Array.isArray(parsed.patch)
            ? parsed.patch
            : parsed;

        return { ok: true, payload };
    } catch (error) {
        return {
            ok: false,
            stage: 'parse',
            reason: 'invalid-json',
            details: {
                message: error instanceof Error ? error.message : String(error),
            },
        };
    }
}

export function createExtractionEngine({ logger, provider }) {
    return {
        async extract(turnPair, context = {}) {
            const extractionContext = {
                ...context,
                chatId: turnPair.chatId,
                turnPairId: turnPair.id,
            };
            const prompt = buildExtractionPrompt(turnPair);

            logger.debug('extract-scene-patch', {
                turnPairId: turnPair.id,
                chatId: turnPair.chatId,
            });

            const providerResult = await provider.extract({
                prompt,
                context: extractionContext,
                jsonSchema: EXTRACTION_RESPONSE_SCHEMA,
            });

            if (!providerResult.ok) {
                logger.warn('extract-scene-patch-model-call-failed', {
                    ...providerResult.details,
                    stage: 'model-call',
                    reason: providerResult.reason,
                    turnPairId: turnPair.id,
                });
                return providerResult;
            }

            logger.debug('extract-scene-patch-raw-response', {
                turnPairId: turnPair.id,
                rawText: providerResult.rawText,
            });

            const parsedResult = parseProviderPayload(providerResult.rawText);
            if (!parsedResult.ok) {
                logger.warn('extract-scene-patch-parse-failed', {
                    ...parsedResult.details,
                    stage: 'parse',
                    reason: parsedResult.reason,
                    turnPairId: turnPair.id,
                });
                return {
                    ok: false,
                    stage: 'parse',
                    reason: parsedResult.reason,
                    details: {
                        ...extractionContext,
                        ...parsedResult.details,
                    },
                };
            }

            const guardedPayload = applyEvidenceGuards(parsedResult.payload, turnPair);
            const extractionValidation = validateExtractionPayload(guardedPayload);
            if (!extractionValidation.ok) {
                logger.warn('extract-scene-patch-validation-failed', {
                    stage: 'validation',
                    reason: extractionValidation.reason,
                    turnPairId: turnPair.id,
                });
                return {
                    ok: false,
                    stage: 'validation',
                    reason: extractionValidation.reason,
                    details: extractionContext,
                };
            }

            const normalizedPatch = normalizeScenePatch({
                ...createEmptyScenePatch(),
                ...guardedPayload,
            });
            const validation = validateScenePatch(normalizedPatch);

            if (!validation.ok) {
                logger.warn('extract-scene-patch-validation-failed', {
                    stage: 'validation',
                    reason: validation.reason,
                    turnPairId: turnPair.id,
                });
                return {
                    ok: false,
                    stage: 'validation',
                    reason: validation.reason,
                    details: extractionContext,
                };
            }

            logger.info('extract-scene-patch-succeeded', {
                turnPairId: turnPair.id,
                changedKeys: Object.keys(normalizedPatch),
            });

            return {
                ok: true,
                patch: normalizedPatch,
            };
        },
    };
}
