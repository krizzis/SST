function normalizeCharacterName(value) {
    return String(value || '')
        .trim()
        .toLowerCase();
}

function isUserMessage(message) {
    return Boolean(message?.is_user) && !message?.is_system;
}

function isCharacterMessage(message) {
    return Boolean(message) && !message.is_user && !message.is_system;
}

function getMessageText(message) {
    return String(message?.mes || '').trim();
}

function buildTurnPairId(chatId, userMessageId, characterMessageId) {
    return `${chatId ?? 'no-chat'}:${userMessageId}:${characterMessageId}`;
}

function matchesTrackedCharacter(message, trackedCharacterName, fallbackCharacterName) {
    if (!trackedCharacterName) {
        return true;
    }

    const messageCharacterName = normalizeCharacterName(message?.name);
    const fallbackName = normalizeCharacterName(fallbackCharacterName);

    if (messageCharacterName) {
        return messageCharacterName === trackedCharacterName;
    }

    return fallbackName === trackedCharacterName;
}

function findLatestCharacterMessageIndex(messages, preferredCharacterMessageId, trackedCharacterName, fallbackCharacterName) {
    const startIndex = Number.isInteger(preferredCharacterMessageId)
        ? Math.min(preferredCharacterMessageId, messages.length - 1)
        : messages.length - 1;

    for (let index = startIndex; index >= 0; index -= 1) {
        const message = messages[index];
        if (!isCharacterMessage(message)) {
            continue;
        }

        if (!getMessageText(message)) {
            continue;
        }

        if (!matchesTrackedCharacter(message, trackedCharacterName, fallbackCharacterName)) {
            continue;
        }

        return index;
    }

    return -1;
}

function findPreviousUserMessageIndex(messages, characterMessageIndex) {
    for (let index = characterMessageIndex - 1; index >= 0; index -= 1) {
        const message = messages[index];
        if (!isUserMessage(message)) {
            continue;
        }

        if (!getMessageText(message)) {
            continue;
        }

        return index;
    }

    return -1;
}

export function createSillyTavernChatAdapter({
    getChat = () => [],
    getCharacters = () => [],
    getSelectedCharacterId = () => null,
    getChatMetadata = () => ({}),
    getCurrentChatId = () => null,
} = {}) {
    function getContext() {
        const selectedCharacterId = getSelectedCharacterId();
        const characters = getCharacters();
        const selectedCharacter = selectedCharacterId === undefined || selectedCharacterId === null
            ? null
            : characters[selectedCharacterId] || null;

        return {
            chatId: getCurrentChatId() ?? null,
            characterId: selectedCharacterId ?? null,
            characterName: selectedCharacter?.name || '',
            chatMetadata: getChatMetadata() || {},
        };
    }

    return {
        getContext,

        getLatestTurnPair({ activeCharacter = '', preferredCharacterMessageId = null } = {}) {
            const messages = getChat();
            if (!Array.isArray(messages) || messages.length < 2) {
                return null;
            }

            const context = getContext();
            const trackedCharacterName = normalizeCharacterName(activeCharacter || context.characterName);
            const characterMessageIndex = findLatestCharacterMessageIndex(
                messages,
                preferredCharacterMessageId,
                trackedCharacterName,
                context.characterName,
            );

            if (characterMessageIndex === -1) {
                return null;
            }

            const userMessageIndex = findPreviousUserMessageIndex(messages, characterMessageIndex);
            if (userMessageIndex === -1) {
                return null;
            }

            const userMessage = messages[userMessageIndex];
            const characterMessage = messages[characterMessageIndex];
            const trackedCharacter = activeCharacter || context.characterName || characterMessage?.name || '';

            return {
                id: buildTurnPairId(context.chatId, userMessageIndex, characterMessageIndex),
                chatId: context.chatId,
                characterId: context.characterId,
                trackedCharacter,
                userMessageId: userMessageIndex,
                characterMessageId: characterMessageIndex,
                userMessage: getMessageText(userMessage),
                characterMessage: getMessageText(characterMessage),
                userMessageName: userMessage?.name || '',
                characterMessageName: characterMessage?.name || context.characterName || '',
            };
        },
    };
}
