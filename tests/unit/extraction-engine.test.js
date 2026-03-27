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

test('extraction engine builds a normalized scene patch from a turn pair', async () => {
    const extractionEngine = createExtractionEngine({
        logger: createLoggerStub(),
        now: (() => {
            const values = [100, 145];
            return () => values.shift();
        })(),
    });

    const result = await extractionEngine.extract({
        id: 'chat-1:0:1',
        userMessage: 'You sit beside her in the bedroom.',
        characterMessage: 'She smiles and kisses you, tugging open her robe while straddling your lap.',
    });

    assert.equal(result.ok, true);
    assert.equal(result.latencyMs, 45);
    assert.equal(result.patch.location.key, 'bedroom');
    assert.equal(result.patch.emotion.key, 'happy');
    assert.equal(result.patch.pose.key, 'sitting');
    assert.equal(result.patch.action.key, 'kissing');
    assert.equal(result.patch.interaction.key, 'kissing');
    assert.equal(result.patch.outfit.primary, 'open_clothes');
    assert.deepEqual(result.patch.outfit.details, ['robe']);
    assert.equal(result.patch.summary, 'She smiles and kisses you, tugging open her robe while straddling your lap.');
});

test('extraction engine returns a structured extraction error for malformed draft output', async () => {
    const extractionEngine = createExtractionEngine({
        logger: createLoggerStub(),
        draftExtractor: async () => '{"summary": "ok"',
        now: (() => {
            const values = [10, 12];
            return () => values.shift();
        })(),
    });

    const result = await extractionEngine.extract({
        id: 'chat-1:2:3',
        userMessage: 'Hello',
        characterMessage: 'Hi',
    });

    assert.deepEqual(result, {
        ok: false,
        stage: 'extraction',
        reason: 'malformed-draft-output',
        details: {
            turnPairId: 'chat-1:2:3',
            latencyMs: 2,
        },
    });
});

test('extraction engine returns a structured validation error when the validator rejects the patch', async () => {
    const extractionEngine = createExtractionEngine({
        logger: createLoggerStub(),
        validator: () => ({
            ok: false,
            reason: 'summary-must-be-a-string',
        }),
        now: (() => {
            const values = [20, 29];
            return () => values.shift();
        })(),
    });

    const result = await extractionEngine.extract({
        id: 'chat-1:4:5',
        userMessage: 'You wait in the tavern.',
        characterMessage: 'She watches you calmly.',
    });

    assert.deepEqual(result, {
        ok: false,
        stage: 'validation',
        reason: 'summary-must-be-a-string',
        details: {
            turnPairId: 'chat-1:4:5',
            latencyMs: 9,
        },
    });
});

test('extraction engine captures NSFW-relevant action, interaction, pose, and outfit fields', async () => {
    const extractionEngine = createExtractionEngine({
        logger: createLoggerStub(),
    });

    const result = await extractionEngine.extract({
        id: 'chat-1:6:7',
        userMessage: 'You pull her closer in the bedroom.',
        characterMessage: 'Still in lingerie, she kneels between your legs and starts giving you a blowjob.',
    });

    assert.equal(result.ok, true);
    assert.equal(result.patch.location.key, 'bedroom');
    assert.equal(result.patch.pose.key, 'kneeling');
    assert.equal(result.patch.action.key, 'oral');
    assert.equal(result.patch.interaction.key, 'oral_sex');
    assert.equal(result.patch.outfit.primary, 'lingerie');
});
