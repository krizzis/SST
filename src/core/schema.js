const REQUIRED_STRING_KEYS = ['location', 'emotion', 'pose', 'outfit', 'summary'];

export function validateScenePatch(patch) {
    if (!patch || typeof patch !== 'object') {
        return { ok: false, reason: 'patch-must-be-an-object' };
    }

    for (const key of REQUIRED_STRING_KEYS) {
        if (typeof patch[key] !== 'string') {
            return {
                ok: false,
                reason: `${key}-must-be-a-string`,
            };
        }
    }

    return { ok: true };
}
