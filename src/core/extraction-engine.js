import { normalizeScenePatch } from './normalizers.js';
import { createEmptyScenePatch, validateScenePatch } from './schema.js';

export function createExtractionEngine({ logger }) {
    return {
        async extract(turnPair) {
            logger.debug('extract-scene-patch', { turnPairId: turnPair.id });

            const draftPatch = normalizeScenePatch({
                ...createEmptyScenePatch(),
                summary: turnPair.characterMessage?.slice(0, 160) || '',
            });
            const validation = validateScenePatch(draftPatch);

            if (!validation.ok) {
                return {
                    ok: false,
                    stage: 'validation',
                    reason: validation.reason,
                };
            }

            return {
                ok: true,
                patch: draftPatch,
            };
        },
    };
}
