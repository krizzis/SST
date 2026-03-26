export function createSillyTavernChatAdapter() {
    return {
        getContext() {
            return {
                chatId: null,
                characterId: null,
            };
        },

        getLatestTurnPair() {
            return null;
        },
    };
}
