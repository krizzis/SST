import test from 'node:test';
import assert from 'node:assert/strict';

import { createSillyTavernExtractionProvider } from '../../src/adapters/sillytavern-extraction-provider.js';

test('sillytavern extraction provider returns model-call failure when generateQuietPrompt is unavailable', async () => {
    const provider = createSillyTavernExtractionProvider({});

    const result = await provider.extract({
        prompt: 'Extract scene state.',
        context: {
            chatId: 'chat-1',
            turnPairId: 'chat-1:0:1',
        },
    });

    assert.deepEqual(result, {
        ok: false,
        stage: 'model-call',
        reason: 'generate-quiet-prompt-unavailable',
        details: {
            chatId: 'chat-1',
            turnPairId: 'chat-1:0:1',
        },
    });
});

test('sillytavern extraction provider wraps successful quiet prompt responses', async () => {
    const provider = createSillyTavernExtractionProvider({
        generateQuietPrompt: async ({ quietPrompt, trimToSentence, jsonSchema }) => {
            assert.equal(quietPrompt, 'Extract scene state.');
            assert.equal(trimToSentence, false);
            assert.equal(jsonSchema, undefined);
            return '{"summary":"ok"}';
        },
    });

    const result = await provider.extract({
        prompt: 'Extract scene state.',
        context: {
            chatId: 'chat-1',
        },
    });

    assert.deepEqual(result, {
        ok: true,
        rawText: '{"summary":"ok"}',
    });
});

test('sillytavern extraction provider converts thrown host errors into model-call failures', async () => {
    const provider = createSillyTavernExtractionProvider({
        generateQuietPrompt: async () => {
            throw new Error('host offline');
        },
    });

    const result = await provider.extract({
        prompt: 'Extract scene state.',
        context: {
            chatId: 'chat-1',
            turnPairId: 'chat-1:0:1',
        },
    });

    assert.deepEqual(result, {
        ok: false,
        stage: 'model-call',
        reason: 'provider-call-failed',
        details: {
            chatId: 'chat-1',
            turnPairId: 'chat-1:0:1',
            message: 'host offline',
        },
    });
});
