import test from 'node:test';
import assert from 'node:assert/strict';

import { createExtractionEngine } from '../../src/core/extraction-engine.js';

function createLoggerStub() {
    return {
        info() {},
        warn() {},
        debug() {},
        error() {},
    };
}

function createTurnPair(overrides = {}) {
    return {
        id: 'chat-1:0:1',
        chatId: 'chat-1',
        userMessageId: 0,
        characterMessageId: 1,
        userMessage: 'You tug the robe open and pull her into a kiss on the bed.',
        characterMessage: 'She smiles, kisses you back, and lets the silk robe slide from her shoulders.',
        ...overrides,
    };
}

test('extraction engine normalizes a valid provider response into the canonical scene patch', async () => {
    const engine = createExtractionEngine({
        logger: createLoggerStub(),
        provider: {
            async extract() {
                return {
                    ok: true,
                    rawText: JSON.stringify({
                        location: 'the bedroom',
                        emotion: 'joyful',
                        pose: 'standing up',
                        action: 'kissing',
                        interaction: 'making out',
                        outfit: 'silk robe, topless',
                        summary: 'She kisses back while her robe slips open.',
                    }),
                };
            },
        },
    });

    const result = await engine.extract(createTurnPair());

    assert.equal(result.ok, true);
    assert.deepEqual(result.patch.location, {
        key: 'bedroom',
        label: 'Bedroom',
    });
    assert.deepEqual(result.patch.emotion, {
        key: 'happy',
        label: 'Happy',
    });
    assert.deepEqual(result.patch.pose, {
        key: 'standing',
        label: 'Standing',
    });
    assert.deepEqual(result.patch.action, {
        key: 'kissing',
        label: 'Kissing',
    });
    assert.deepEqual(result.patch.interaction, {
        key: 'kissing',
        label: 'Kissing',
    });
    assert.deepEqual(result.patch.outfit, {
        primary: 'topless',
        details: ['silk_robe'],
    });
});

test('extraction engine returns a parse-stage rejection for malformed JSON', async () => {
    const engine = createExtractionEngine({
        logger: createLoggerStub(),
        provider: {
            async extract() {
                return {
                    ok: true,
                    rawText: '{"location":"bedroom"',
                };
            },
        },
    });

    const result = await engine.extract(createTurnPair());

    assert.deepEqual(result, {
        ok: false,
        stage: 'parse',
        reason: 'json-object-not-found',
        details: {
            chatId: 'chat-1',
            turnPairId: 'chat-1:0:1',
        },
    });
});

test('extraction engine returns a validation-stage rejection when required fields are missing', async () => {
    const engine = createExtractionEngine({
        logger: createLoggerStub(),
        provider: {
            async extract() {
                return {
                    ok: true,
                    rawText: JSON.stringify({
                        location: 'bedroom',
                        emotion: 'happy',
                        pose: 'standing',
                        action: 'kissing',
                        summary: 'Missing interaction and outfit.',
                    }),
                };
            },
        },
    });

    const result = await engine.extract(createTurnPair());

    assert.deepEqual(result, {
        ok: false,
        stage: 'validation',
        reason: 'missing-interaction',
        details: {
            chatId: 'chat-1',
            turnPairId: 'chat-1:0:1',
        },
    });
});

test('extraction engine propagates provider model-call failures', async () => {
    const engine = createExtractionEngine({
        logger: createLoggerStub(),
        provider: {
            async extract() {
                return {
                    ok: false,
                    stage: 'model-call',
                    reason: 'provider-call-failed',
                    details: {
                        chatId: 'chat-1',
                        turnPairId: 'chat-1:0:1',
                        message: 'model offline',
                    },
                };
            },
        },
    });

    const result = await engine.extract(createTurnPair());

    assert.deepEqual(result, {
        ok: false,
        stage: 'model-call',
        reason: 'provider-call-failed',
        details: {
            chatId: 'chat-1',
            turnPairId: 'chat-1:0:1',
            message: 'model offline',
        },
    });
});
