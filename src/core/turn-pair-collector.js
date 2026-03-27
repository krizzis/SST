export function createTurnPairCollector({
    chatAdapter,
    extractionEngine,
    sceneStateStore,
    backgroundAdapter,
    imagePayloadAdapter,
    logger,
}) {
    let activeChatId = chatAdapter.getContext().chatId;
    let lastProcessedTurnPairId = null;
    let inFlightTurnPairId = null;
    let queuedTrigger = null;

    async function processTurnPair(turnPair, triggerDetails = {}) {
        inFlightTurnPairId = turnPair.id;

        try {
            const extractionResult = await extractionEngine.extract(turnPair);
            if (!extractionResult.ok) {
                sceneStateStore.rejectUpdate(extractionResult);
                return extractionResult;
            }

            const commitResult = sceneStateStore.commitScenePatch(extractionResult.patch, {
                trigger: triggerDetails.trigger,
                turnPairId: turnPair.id,
                userMessageId: turnPair.userMessageId,
                characterMessageId: turnPair.characterMessageId,
            });

            if (commitResult.ok && !commitResult.noop) {
                backgroundAdapter.sync(sceneStateStore.getSnapshot());
                imagePayloadAdapter.publish(sceneStateStore.getSnapshot());
            }

            if (commitResult.ok) {
                lastProcessedTurnPairId = turnPair.id;
            }

            return commitResult;
        } finally {
            inFlightTurnPairId = null;

            if (queuedTrigger) {
                const nextTrigger = queuedTrigger;
                queuedTrigger = null;
                await processLatestTurnPair(nextTrigger);
            }
        }
    }

    async function processLatestTurnPair({
        preferredCharacterMessageId = null,
        trigger = 'manual',
    } = {}) {
        const context = chatAdapter.getContext();
        if (context.chatId !== activeChatId) {
            activeChatId = context.chatId;
            lastProcessedTurnPairId = null;
            inFlightTurnPairId = null;
            queuedTrigger = null;
        }

        const snapshot = sceneStateStore.getSnapshot();
        const turnPair = chatAdapter.getLatestTurnPair({
            activeCharacter: snapshot.activeCharacter,
            preferredCharacterMessageId,
        });

        if (!turnPair) {
            logger.debug('turn-pair-missing', { trigger, preferredCharacterMessageId });
            return { ok: false, reason: 'no-turn-pair' };
        }

        if (turnPair.id === lastProcessedTurnPairId) {
            logger.debug('turn-pair-duplicate', { trigger, turnPairId: turnPair.id });
            return { ok: false, reason: 'duplicate-turn-pair', turnPairId: turnPair.id };
        }

        if (turnPair.id === inFlightTurnPairId) {
            logger.debug('turn-pair-already-processing', { trigger, turnPairId: turnPair.id });
            return { ok: false, reason: 'duplicate-turn-pair', turnPairId: turnPair.id };
        }

        if (inFlightTurnPairId) {
            queuedTrigger = {
                preferredCharacterMessageId,
                trigger,
            };
            logger.info('turn-pair-processing-coalesced', {
                activeTurnPairId: inFlightTurnPairId,
                queuedTurnPairId: turnPair.id,
            });
            return {
                ok: false,
                reason: 'processing-already-in-flight',
                turnPairId: inFlightTurnPairId,
                queued: true,
            };
        }

        return processTurnPair(turnPair, { trigger });
    }

    return {
        getContext() {
            return chatAdapter.getContext();
        },

        resetForChat(nextChatId = chatAdapter.getContext().chatId) {
            activeChatId = nextChatId;
            lastProcessedTurnPairId = null;
            inFlightTurnPairId = null;
            queuedTrigger = null;

            logger.info('turn-pair-collector-reset', { chatId: activeChatId });
            return { ok: true, chatId: activeChatId };
        },

        async processLatestTurnPair(options = {}) {
            return processLatestTurnPair(options);
        },

        async handleCharacterMessageRendered(messageId, triggerType = 'character_message_rendered') {
            return processLatestTurnPair({
                preferredCharacterMessageId: Number.isInteger(messageId) ? messageId : null,
                trigger: triggerType,
            });
        },
    };
}
