export function createTurnPairCollector({
    chatAdapter,
    extractionEngine,
    sceneStateStore,
    backgroundAdapter,
    imagePayloadAdapter,
    logger,
}) {
    return {
        getContext() {
            return chatAdapter.getContext();
        },

        async processLatestTurnPair() {
            const turnPair = chatAdapter.getLatestTurnPair();

            if (!turnPair) {
                logger.debug('turn-pair-missing');
                return { ok: false, reason: 'no-turn-pair' };
            }

            const extractionResult = await extractionEngine.extract(turnPair);
            if (!extractionResult.ok) {
                sceneStateStore.rejectUpdate(extractionResult);
                return extractionResult;
            }

            const commitResult = sceneStateStore.commitScenePatch(extractionResult.patch, {
                turnPairId: turnPair.id,
            });

            if (commitResult.ok && !commitResult.noop) {
                backgroundAdapter.sync(sceneStateStore.getSnapshot());
                imagePayloadAdapter.publish(sceneStateStore.getSnapshot());
            }

            return commitResult;
        },
    };
}
