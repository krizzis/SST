export function createBackgroundAdapter({ logger }) {
    return {
        sync(sceneState) {
            logger.debug('background-sync-skipped', {
                location: sceneState.currentScene?.location || '',
            });
            return { ok: true, skipped: true };
        },
    };
}
