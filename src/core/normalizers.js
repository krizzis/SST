function normalizeString(value) {
    return String(value || '').trim().replace(/\s+/g, ' ');
}

export function normalizeScenePatch(patch) {
    return {
        location: normalizeString(patch.location).toLowerCase(),
        emotion: normalizeString(patch.emotion).toLowerCase(),
        pose: normalizeString(patch.pose).toLowerCase(),
        outfit: normalizeString(patch.outfit),
        summary: normalizeString(patch.summary),
    };
}
