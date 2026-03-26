import test from 'node:test';
import assert from 'node:assert/strict';

import { normalizeScenePatch } from '../../src/core/normalizers.js';

test('normalizeScenePatch canonicalizes semantic equivalents', () => {
    const bedroomPatch = normalizeScenePatch({
        location: 'The bed room',
        emotion: 'joyful',
        pose: 'standing up',
        action: 'kisses',
        interaction: 'making out',
        outfit: 'red dress, black boots',
        summary: '  She smiles in the doorway.  ',
    });
    const alternateBedroomPatch = normalizeScenePatch({
        location: 'bedroom',
        emotion: 'happy',
        pose: 'on her feet',
        action: 'kissing',
        interaction: 'kissing',
        outfit: 'red dress and black boots',
        summary: 'She smiles in the doorway.',
    });

    assert.deepEqual(bedroomPatch, alternateBedroomPatch);
    assert.equal(bedroomPatch.location.key, 'bedroom');
    assert.equal(bedroomPatch.emotion.key, 'happy');
    assert.equal(bedroomPatch.pose.key, 'standing');
    assert.equal(bedroomPatch.action.key, 'kissing');
    assert.equal(bedroomPatch.interaction.key, 'kissing');
});

test('normalizeScenePatch preserves deterministic outfit ordering and fallback keys', () => {
    const patch = normalizeScenePatch({
        location: 'Moonlit Balcony',
        emotion: 'quietly curious',
        pose: 'leaning over the rail',
        action: 'watching',
        interaction: 'solo',
        outfit: 'silver cloak, leather gloves, Leather Gloves',
        summary: ' Watching the garden below ',
    });

    assert.deepEqual(patch.location, {
        key: 'moonlit_balcony',
        label: 'Moonlit Balcony',
    });
    assert.deepEqual(patch.emotion, {
        key: 'quietly_curious',
        label: 'Quietly Curious',
    });
    assert.deepEqual(patch.pose, {
        key: 'leaning_over_the_rail',
        label: 'Leaning Over The Rail',
    });
    assert.deepEqual(patch.action, {
        key: 'idle',
        label: 'Idle',
    });
    assert.deepEqual(patch.interaction, {
        key: 'none',
        label: 'None',
    });
    assert.deepEqual(patch.outfit, {
        primary: 'silver_cloak',
        details: ['leather_gloves'],
    });
    assert.equal(patch.summary, 'Watching the garden below');
});

test('normalizeScenePatch canonicalizes nsfw outfit and interaction states for prompt generation', () => {
    const patch = normalizeScenePatch({
        location: 'forest trail',
        emotion: 'nervous',
        pose: 'kneels',
        action: 'having sex',
        interaction: 'sexual',
        outfit: 'fully naked, bare breasts, leather gloves',
        summary: 'They are pressed together in the woods.',
    });

    assert.deepEqual(patch.action, {
        key: 'sex',
        label: 'Sex',
    });
    assert.deepEqual(patch.interaction, {
        key: 'intimate',
        label: 'Intimate',
    });
    assert.deepEqual(patch.outfit, {
        primary: 'nude',
        details: ['leather_gloves', 'topless'],
    });
});
