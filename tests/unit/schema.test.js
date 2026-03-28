import test from 'node:test';
import assert from 'node:assert/strict';

import { createEmptyScenePatch, validateExtractionPayload, validateScenePatch } from '../../src/core/schema.js';

test('validateScenePatch accepts the canonical empty scene patch', () => {
    assert.deepEqual(validateScenePatch(createEmptyScenePatch()), { ok: true });
});

test('validateScenePatch rejects missing or unknown fields', () => {
    const missingSummary = createEmptyScenePatch();
    delete missingSummary.summary;

    assert.deepEqual(validateScenePatch(missingSummary), {
        ok: false,
        reason: 'missing-summary',
    });

    assert.deepEqual(validateScenePatch({
        ...createEmptyScenePatch(),
        extra: true,
    }), {
        ok: false,
        reason: 'patch-contains-unknown-top-level-keys',
    });
});

test('validateScenePatch rejects non-object top-level patch values', () => {
    assert.deepEqual(validateScenePatch(null), {
        ok: false,
        reason: 'patch-must-be-an-object',
    });
    assert.deepEqual(validateScenePatch([]), {
        ok: false,
        reason: 'patch-must-be-an-object',
    });
});

test('validateScenePatch rejects malformed labeled scene values', () => {
    const nonObjectLocation = createEmptyScenePatch();
    nonObjectLocation.location = 'bedroom';
    assert.deepEqual(validateScenePatch(nonObjectLocation), {
        ok: false,
        reason: 'location-must-be-an-object',
    });

    const blankEmotionKey = createEmptyScenePatch();
    blankEmotionKey.emotion = {
        key: '',
        label: 'Happy',
    };
    assert.deepEqual(validateScenePatch(blankEmotionKey), {
        ok: false,
        reason: 'emotion.key-must-be-a-non-empty-string',
    });

    const blankPoseLabel = createEmptyScenePatch();
    blankPoseLabel.pose = {
        key: 'standing',
        label: '   ',
    };
    assert.deepEqual(validateScenePatch(blankPoseLabel), {
        ok: false,
        reason: 'pose.label-must-be-a-non-empty-string',
    });

    const blankActionLabel = createEmptyScenePatch();
    blankActionLabel.action = {
        key: 'kissing',
        label: '',
    };
    assert.deepEqual(validateScenePatch(blankActionLabel), {
        ok: false,
        reason: 'action.label-must-be-a-non-empty-string',
    });

    const blankInteractionKey = createEmptyScenePatch();
    blankInteractionKey.interaction = {
        key: '  ',
        label: 'Intimate',
    };
    assert.deepEqual(validateScenePatch(blankInteractionKey), {
        ok: false,
        reason: 'interaction.key-must-be-a-non-empty-string',
    });
});

test('validateScenePatch rejects malformed outfit values and summary types', () => {
    const missingPrimary = createEmptyScenePatch();
    missingPrimary.outfit = {
        details: [],
    };
    assert.deepEqual(validateScenePatch(missingPrimary), {
        ok: false,
        reason: 'outfit.primary-must-be-a-string',
    });

    const invalidDetailsArray = createEmptyScenePatch();
    invalidDetailsArray.outfit = {
        primary: 'robe',
        details: 'boots',
    };
    assert.deepEqual(validateScenePatch(invalidDetailsArray), {
        ok: false,
        reason: 'outfit.details-must-be-an-array',
    });

    const blankOutfitDetail = createEmptyScenePatch();
    blankOutfitDetail.outfit = {
        primary: 'robe',
        details: ['boots', '   '],
    };
    assert.deepEqual(validateScenePatch(blankOutfitDetail), {
        ok: false,
        reason: 'outfit.details-must-contain-non-empty-strings',
    });

    const invalidSummary = createEmptyScenePatch();
    invalidSummary.summary = 42;
    assert.deepEqual(validateScenePatch(invalidSummary), {
        ok: false,
        reason: 'summary-must-be-a-string',
    });
});

test('validateExtractionPayload accepts partial outfit objects from the extractor', () => {
    assert.deepEqual(validateExtractionPayload({
        location: 'living room',
        emotion: 'overwhelmed',
        pose: 'kneeling',
        action: 'oral sex',
        interaction: 'oral sex',
        outfit: {
            primary: 'pink tank top, denim shorts',
        },
        summary: 'Abby kneels in front of Chris.',
    }), {
        ok: true,
    });
});

test('validateExtractionPayload still rejects malformed outfit object details', () => {
    assert.deepEqual(validateExtractionPayload({
        location: 'living room',
        emotion: 'overwhelmed',
        pose: 'kneeling',
        action: 'oral sex',
        interaction: 'oral sex',
        outfit: {
            primary: 'pink tank top',
            details: 'denim shorts',
        },
        summary: 'Abby kneels in front of Chris.',
    }), {
        ok: false,
        reason: 'outfit.details-must-be-an-array',
    });
});
