import test from 'node:test';
import assert from 'node:assert/strict';

import { normalizeScenePatch } from '../../src/core/normalizers.js';
import { createSceneStateStore } from '../../src/core/scene-state-store.js';

function createLoggerStub() {
    return {
        info() {},
        warn() {},
        debug() {},
        error() {},
    };
}

test('scene-state store rejects invalid patches without overwriting the previous scene', () => {
    const store = createSceneStateStore({ logger: createLoggerStub() });
    const validPatch = normalizeScenePatch({
        location: 'tavern',
        emotion: 'calm',
        pose: 'seated',
        outfit: 'traveler coat, boots',
        summary: 'Waiting by the hearth.',
    });

    const firstCommit = store.commitScenePatch(validPatch, { turnPairId: 'tp-1' });
    assert.equal(firstCommit.ok, true);
    assert.equal(firstCommit.noop, false);

    const snapshotAfterValidCommit = store.getSnapshot();
    const invalidCommit = store.commitScenePatch({ summary: 'broken patch' }, { turnPairId: 'tp-2' });
    const snapshotAfterInvalidCommit = store.getSnapshot();

    assert.equal(invalidCommit.ok, false);
    assert.equal(invalidCommit.stage, 'validation');
    assert.deepEqual(snapshotAfterInvalidCommit.currentScene, snapshotAfterValidCommit.currentScene);
    assert.equal(snapshotAfterInvalidCommit.metrics.commits, 1);
    assert.equal(snapshotAfterInvalidCommit.metrics.rejections, 1);
});

test('scene-state store treats semantically identical canonical patches as a noop', () => {
    const store = createSceneStateStore({ logger: createLoggerStub() });
    const firstPatch = normalizeScenePatch({
        location: 'the bedroom',
        emotion: 'joyful',
        pose: 'standing up',
        outfit: 'silk robe, slippers',
        summary: 'She waits near the window.',
    });
    const secondPatch = normalizeScenePatch({
        location: 'bed room',
        emotion: 'happy',
        pose: 'on her feet',
        outfit: 'silk robe and slippers',
        summary: 'She waits near the window.',
    });

    const firstCommit = store.commitScenePatch(firstPatch, { turnPairId: 'tp-1' });
    const secondCommit = store.commitScenePatch(secondPatch, { turnPairId: 'tp-2' });
    const snapshot = store.getSnapshot();

    assert.equal(firstCommit.ok, true);
    assert.equal(secondCommit.ok, true);
    assert.equal(secondCommit.noop, true);
    assert.equal(snapshot.metrics.commits, 1);
    assert.equal(snapshot.metrics.noops, 1);
});

test('scene-state store updates active character, exposes subscriber notifications, and allows unsubscribe', () => {
    const store = createSceneStateStore({ logger: createLoggerStub() });
    const snapshots = [];
    const unsubscribe = store.subscribe((snapshot) => {
        snapshots.push(snapshot.activeCharacter);
    });

    store.setActiveCharacter('Luna');
    unsubscribe();
    store.setActiveCharacter('Mara');

    assert.equal(store.getSnapshot().activeCharacter, 'Mara');
    assert.deepEqual(snapshots, ['Luna']);
});

test('scene-state store rejectUpdate records the provided error payload', () => {
    const store = createSceneStateStore({ logger: createLoggerStub() });
    const error = {
        ok: false,
        stage: 'extraction',
        reason: 'mock-failure',
    };

    store.rejectUpdate(error);

    const snapshot = store.getSnapshot();
    assert.deepEqual(snapshot.lastError, error);
    assert.equal(snapshot.metrics.rejections, 1);
});
