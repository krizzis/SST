const ALLOWED_PATCH_KEYS = ['action', 'emotion', 'interaction', 'location', 'outfit', 'pose', 'summary'];
const REQUIRED_TOP_LEVEL_KEYS = ['action', 'emotion', 'interaction', 'location', 'outfit', 'pose', 'summary'];
const REQUIRED_LABELED_VALUE_KEYS = ['key', 'label'];

/**
 * Canonical scene state stores only turn-variant scene facts.
 * Stable character-card appearance and LoRA metadata are intentionally excluded
 * and will be merged later by prompt-generation adapters.
 */
export function createEmptyScenePatch() {
    return {
        location: {
            key: 'unknown',
            label: 'Unknown',
        },
        emotion: {
            key: 'neutral',
            label: 'Neutral',
        },
        pose: {
            key: 'unspecified',
            label: 'Unspecified',
        },
        action: {
            key: 'idle',
            label: 'Idle',
        },
        interaction: {
            key: 'none',
            label: 'None',
        },
        outfit: {
            primary: '',
            details: [],
        },
        summary: '',
    };
}

function hasOnlyAllowedKeys(patch) {
    return Object.keys(patch).every((key) => ALLOWED_PATCH_KEYS.includes(key));
}

function validateLabeledValue(name, value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return { ok: false, reason: `${name}-must-be-an-object` };
    }

    for (const key of REQUIRED_LABELED_VALUE_KEYS) {
        if (typeof value[key] !== 'string' || value[key].trim().length === 0) {
            return { ok: false, reason: `${name}.${key}-must-be-a-non-empty-string` };
        }
    }

    return { ok: true };
}

function validateOutfit(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return { ok: false, reason: 'outfit-must-be-an-object' };
    }

    if (typeof value.primary !== 'string') {
        return { ok: false, reason: 'outfit.primary-must-be-a-string' };
    }

    if (!Array.isArray(value.details)) {
        return { ok: false, reason: 'outfit.details-must-be-an-array' };
    }

    if (value.details.some((entry) => typeof entry !== 'string' || entry.trim().length === 0)) {
        return { ok: false, reason: 'outfit.details-must-contain-non-empty-strings' };
    }

    return { ok: true };
}

export function validateScenePatch(patch) {
    if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
        return { ok: false, reason: 'patch-must-be-an-object' };
    }

    if (!hasOnlyAllowedKeys(patch)) {
        return { ok: false, reason: 'patch-contains-unknown-top-level-keys' };
    }

    for (const key of REQUIRED_TOP_LEVEL_KEYS) {
        if (!(key in patch)) {
            return { ok: false, reason: `missing-${key}` };
        }
    }

    const locationValidation = validateLabeledValue('location', patch.location);
    if (!locationValidation.ok) {
        return locationValidation;
    }

    const emotionValidation = validateLabeledValue('emotion', patch.emotion);
    if (!emotionValidation.ok) {
        return emotionValidation;
    }

    const poseValidation = validateLabeledValue('pose', patch.pose);
    if (!poseValidation.ok) {
        return poseValidation;
    }

    const actionValidation = validateLabeledValue('action', patch.action);
    if (!actionValidation.ok) {
        return actionValidation;
    }

    const interactionValidation = validateLabeledValue('interaction', patch.interaction);
    if (!interactionValidation.ok) {
        return interactionValidation;
    }

    const outfitValidation = validateOutfit(patch.outfit);
    if (!outfitValidation.ok) {
        return outfitValidation;
    }

    if (typeof patch.summary !== 'string') {
        return { ok: false, reason: 'summary-must-be-a-string' };
    }

    return { ok: true };
}
