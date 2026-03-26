import { normalizeScenePatch } from './normalizers.js';
import { validateScenePatch } from './schema.js';

export function createExtractionEngine({ logger }) {
    return {
        async extract(turnPair) {
            logger.debug('extract-scene-patch', { turnPairId: turnPair.id });

            const draftPatch = {
                location: '',
                emotion: '',
                pose: '',
                outfit: '',
                summary: turnPair.characterMessage?.slice(0, 160) || '',
            };

            const patch = normalizeScenePatch(draftPatch);
            const validation = validateScenePatch(patch);

            if (!validation.ok) {
                return {
                    ok: false,
                    stage: 'validation',
                    reason: validation.reason,
                };
            }

            return {
                ok: true,
                patch,
            };
        },
    };
}
