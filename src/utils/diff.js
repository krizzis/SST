function serializeValue(value) {
    if (Array.isArray(value)) {
        return `[${value.map((entry) => serializeValue(entry)).join(',')}]`;
    }

    if (value && typeof value === 'object') {
        return `{${Object.keys(value)
            .sort()
            .map((key) => `${key}:${serializeValue(value[key])}`)
            .join(',')}}`;
    }

    return JSON.stringify(value);
}

export function diffSceneState(previousState, nextState) {
    const previous = previousState || {};
    const next = nextState || {};
    const keys = new Set([...Object.keys(previous), ...Object.keys(next)]);
    const delta = [];

    keys.forEach((key) => {
        if (serializeValue(previous[key]) === serializeValue(next[key])) {
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
