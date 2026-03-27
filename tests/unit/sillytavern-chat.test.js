import test from 'node:test';
import assert from 'node:assert/strict';

import { createSillyTavernChatAdapter } from '../../src/adapters/sillytavern-chat.js';

function createAdapter({
    chat,
    characters = [{ name: 'Luna' }],
    selectedCharacterId = 0,
    chatId = 'chat-1',
} = {}) {
    return createSillyTavernChatAdapter({
        getChat: () => chat || [],
        getCharacters: () => characters,
        getSelectedCharacterId: () => selectedCharacterId,
        getChatMetadata: () => ({ source: 'test' }),
        getCurrentChatId: () => chatId,
    });
}

test('chat adapter derives the latest valid user and character turn pair from chat snapshot', () => {
    const adapter = createAdapter({
        chat: [
            { is_user: true, mes: 'Hello there', name: 'User' },
            { is_user: false, mes: 'Hi back', name: 'Luna' },
            { is_user: true, mes: 'Where are we?', name: 'User' },
            { is_user: false, mes: 'We are in the tavern.', name: 'Luna' },
        ],
    });

    assert.deepEqual(adapter.getContext(), {
        chatId: 'chat-1',
        characterId: 0,
        characterName: 'Luna',
        chatMetadata: { source: 'test' },
    });

    assert.deepEqual(adapter.getLatestTurnPair(), {
        id: 'chat-1:2:3',
        chatId: 'chat-1',
        characterId: 0,
        trackedCharacter: 'Luna',
        userMessageId: 2,
        characterMessageId: 3,
        userMessage: 'Where are we?',
        characterMessage: 'We are in the tavern.',
        userMessageName: 'User',
        characterMessageName: 'Luna',
    });
});

test('chat adapter skips non-matching character replies when an active character is configured', () => {
    const adapter = createAdapter({
        characters: [{ name: 'Luna' }],
        chat: [
            { is_user: true, mes: 'Hello Luna', name: 'User' },
            { is_user: false, mes: 'Narrator note', is_system: true, name: 'System' },
            { is_user: false, mes: 'Mara cuts in', name: 'Mara' },
            { is_user: false, mes: 'Luna answers last', name: 'Luna' },
        ],
    });

    assert.deepEqual(adapter.getLatestTurnPair({ activeCharacter: 'Luna' }), {
        id: 'chat-1:0:3',
        chatId: 'chat-1',
        characterId: 0,
        trackedCharacter: 'Luna',
        userMessageId: 0,
        characterMessageId: 3,
        userMessage: 'Hello Luna',
        characterMessage: 'Luna answers last',
        userMessageName: 'User',
        characterMessageName: 'Luna',
    });
});

test('chat adapter returns null when no valid preceding user message exists', () => {
    const adapter = createAdapter({
        chat: [
            { is_user: false, mes: 'Opening line', name: 'Luna' },
        ],
    });

    assert.equal(adapter.getLatestTurnPair(), null);
});
