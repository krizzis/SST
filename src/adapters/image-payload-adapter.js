export function createImagePayloadAdapter({ logger }) {
    return {
        publish(sceneState) {
            logger.debug('image-payload-publish-skipped', {
                hasScene: Boolean(sceneState.currentScene),
            });
            return { ok: true, skipped: true };
        },
    };
}
