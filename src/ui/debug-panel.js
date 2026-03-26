function buildStatusText(snapshot, settings) {
    const enabledState = settings.enabled ? 'Enabled' : 'Disabled';
    const activeCharacter = snapshot.activeCharacter || settings.activeCharacter || 'not set';
    const metrics = snapshot.metrics;

    return [
        `Status: ${enabledState}`,
        `Active character: ${activeCharacter}`,
        `Commits: ${metrics.commits}`,
        `No-ops: ${metrics.noops}`,
        `Rejections: ${metrics.rejections}`,
    ].join(' | ');
}

export function createDebugPanel({ rootSelector, statusSelector, stateSelector, settings }) {
    const $root = $(rootSelector);
    const $status = $(statusSelector);
    const $state = $(stateSelector);

    return {
        render(snapshot) {
            $root.toggle(Boolean(settings.debug || settings.enabled));
            $status.text(buildStatusText(snapshot, settings));
            $state.text(JSON.stringify(snapshot, null, 2));
        },
    };
}
