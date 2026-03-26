import { diffSceneState } from '../utils/diff.js';

const DEFAULT_STATE = Object.freeze({
    activeCharacter: '',
    currentScene: null,
    history: [],
    lastError: null,
    metrics: {
        commits: 0,
        noops: 0,
        rejections: 0,
    },
});

function cloneState(value) {
    return JSON.parse(JSON.stringify(value));
}

export function createSceneStateStore({ logger }) {
    let state = cloneState(DEFAULT_STATE);
    const subscribers = new Set();

    function notify() {
        subscribers.forEach((subscriber) => subscriber(state));
    }

    return {
        getSnapshot() {
            return cloneState(state);
        },

        setActiveCharacter(activeCharacter) {
            state = {
                ...state,
                activeCharacter,
            };
            notify();
        },

        commitScenePatch(patch, metadata = {}) {
            const nextScene = {
                ...(state.currentScene || {}),
                ...patch,
            };
            const delta = diffSceneState(state.currentScene, nextScene);

            if (delta.length === 0) {
                state = {
                    ...state,
                    metrics: {
                        ...state.metrics,
                        noops: state.metrics.noops + 1,
                    },
                };
                notify();
                return { ok: true, noop: true };
            }

            const historyEntry = {
                at: new Date().toISOString(),
                metadata,
                delta,
            };

            state = {
                ...state,
                currentScene: nextScene,
                history: [historyEntry, ...state.history].slice(0, 10),
                lastError: null,
                metrics: {
                    ...state.metrics,
                    commits: state.metrics.commits + 1,
                },
            };

            logger.info('scene-state-committed', {
                changedKeys: delta.map((entry) => entry.key),
            });
            notify();

            return { ok: true, noop: false, delta };
        },

        rejectUpdate(error) {
            state = {
                ...state,
                lastError: error,
                metrics: {
                    ...state.metrics,
                    rejections: state.metrics.rejections + 1,
                },
            };
            logger.warn('scene-state-rejected', error);
            notify();
        },

        subscribe(subscriber) {
            subscribers.add(subscriber);
            return () => subscribers.delete(subscriber);
        },
    };
}
