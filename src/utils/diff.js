export function diffSceneState(previousState, nextState) {
    const previous = previousState || {};
    const next = nextState || {};
    const keys = new Set([...Object.keys(previous), ...Object.keys(next)]);
    const delta = [];

    keys.forEach((key) => {
        if (previous[key] === next[key]) {
            return;
        }

        delta.push({
            key,
            previous: previous[key],
            next: next[key],
        });
    });

    return delta;
}
