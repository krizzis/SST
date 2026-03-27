import test from 'node:test';
import assert from 'node:assert/strict';

import { createTurnPairCollector } from '../../src/core/turn-pair-collector.js';
import { createSceneStateStore } from '../../src/core/scene-state-store.js';
import { normalizeScenePatch } from '../../src/core/normalizers.js';

function createLoggerStub() {
    return {
        info() {},
        warn() {},
        debug() {},
        error() {},
    };
}

function createCollectorHarness({
    turnPairsByMessageId,
    activeCharacter = '',
    extractDelayMs = 0,
} = {}) {
    const logger = createLoggerStub();
    const extractedTurnPairIds = [];
    const publishedSnapshots = [];
    const syncedSnapshots = [];
    const requestedPairs = [];
    const store = createSceneStateStore({ logger });

    if (activeCharacter) {
        store.setActiveCharacter(activeCharacter);
    }

    const collector = createTurnPairCollector({
        chatAdapter: {
            getContext() {
                return { chatId: 'chat-1', characterId: 0 };
            },
            getLatestTurnPair({ preferredCharacterMessageId }) {
                requestedPairs.push(preferredCharacterMessageId);
                return turnPairsByMessageId[preferredCharacterMessageId] || null;
            },
        },
        extractionEngine: {
            async extract(turnPair) {
                extractedTurnPairIds.push(turnPair.id);

                if (extractDelayMs > 0) {
                    await new Promise((resolve) => setTimeout(resolve, extractDelayMs));
                }

                return {
                    ok: true,
                    patch: normalizeScenePatch({
                        summary: turnPair.characterMessage,
                    }),
                };
            },
        },
        sceneStateStore: store,
        backgroundAdapter: {
            sync(snapshot) {
                syncedSnapshots.push(snapshot.currentScene?.summary || null);
            },
        },
        imagePayloadAdapter: {
            publish(snapshot) {
                publishedSnapshots.push(snapshot.currentScene?.summary || null);
            },
        },
        logger,
    });

    return {
        collector,
        store,
        extractedTurnPairIds,
        publishedSnapshots,
        requestedPairs,
        syncedSnapshots,
    };
}

test('collector ignores duplicate rendered events for the same turn pair', async () => {
    const turnPair = {
        id: 'chat-1:0:1',
        chatId: 'chat-1',
        userMessageId: 0,
        characterMessageId: 1,
        userMessage: 'Hi',
        characterMessage: 'Hello',
    };
    const harness = createCollectorHarness({
        turnPairsByMessageId: {
            1: turnPair,
        },
    });

    const firstResult = await harness.collector.handleCharacterMessageRendered(1);
    const secondResult = await harness.collector.handleCharacterMessageRendered(1);

    assert.equal(firstResult.ok, true);
    assert.deepEqual(secondResult, {
        ok: false,
        reason: 'duplicate-turn-pair',
        turnPairId: 'chat-1:0:1',
    });
    assert.deepEqual(harness.extractedTurnPairIds, ['chat-1:0:1']);
    assert.deepEqual(harness.syncedSnapshots, ['Hello']);
    assert.deepEqual(harness.publishedSnapshots, ['Hello']);
});

test('collector coalesces overlapping work and processes the latest queued turn pair after the current run', async () => {
    const harness = createCollectorHarness({
        extractDelayMs: 5,
        turnPairsByMessageId: {
            1: {
                id: 'chat-1:0:1',
                chatId: 'chat-1',
                userMessageId: 0,
                characterMessageId: 1,
                userMessage: 'Hi',
                characterMessage: 'First reply',
            },
            3: {
                id: 'chat-1:2:3',
                chatId: 'chat-1',
                userMessageId: 2,
                characterMessageId: 3,
                userMessage: 'Again',
                characterMessage: 'Latest reply',
            },
        },
    });

    const firstPromise = harness.collector.handleCharacterMessageRendered(1);
    const secondResult = await harness.collector.handleCharacterMessageRendered(3);
    const firstResult = await firstPromise;

    assert.equal(firstResult.ok, true);
    assert.deepEqual(secondResult, {
        ok: false,
        reason: 'processing-already-in-flight',
        turnPairId: 'chat-1:0:1',
        queued: true,
    });
    assert.deepEqual(harness.extractedTurnPairIds, ['chat-1:0:1', 'chat-1:2:3']);
    assert.deepEqual(harness.syncedSnapshots, ['First reply', 'Latest reply']);
    assert.deepEqual(harness.publishedSnapshots, ['First reply', 'Latest reply']);
    assert.equal(harness.store.getSnapshot().currentScene.summary, 'Latest reply');
});

test('collector reset clears dedupe state when the active chat changes', async () => {
    let chatId = 'chat-1';
    const logger = createLoggerStub();
    const store = createSceneStateStore({ logger });
    const turnPair = {
        id: 'chat-1:0:1',
        chatId: 'chat-1',
        userMessageId: 0,
        characterMessageId: 1,
        userMessage: 'Hi',
        characterMessage: 'Hello again',
    };

    const collector = createTurnPairCollector({
        chatAdapter: {
            getContext() {
                return { chatId, characterId: 0 };
            },
            getLatestTurnPair() {
                return {
                    ...turnPair,
                    id: `${chatId}:0:1`,
                    chatId,
                };
            },
        },
        extractionEngine: {
            async extract(currentTurnPair) {
                return {
                    ok: true,
                    patch: normalizeScenePatch({
                        summary: currentTurnPair.characterMessage,
                    }),
                };
            },
        },
        sceneStateStore: store,
        backgroundAdapter: { sync() {} },
        imagePayloadAdapter: { publish() {} },
        logger,
    });

    await collector.handleCharacterMessageRendered(1);
    chatId = 'chat-2';
    collector.resetForChat(chatId);
    const nextResult = await collector.handleCharacterMessageRendered(1);

    assert.equal(nextResult.ok, true);
    assert.equal(store.getSnapshot().metrics.commits, 1);
    assert.equal(store.getSnapshot().metrics.noops, 1);
});
