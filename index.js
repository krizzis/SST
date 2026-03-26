import {
    extension_settings,
    renderExtensionTemplateAsync,
} from '../../../extensions.js';
import { eventSource, event_types, saveSettingsDebounced } from '../../../../script.js';

import { createBackgroundAdapter } from './src/adapters/background-adapter.js';
import { createImagePayloadAdapter } from './src/adapters/image-payload-adapter.js';
import { createSillyTavernChatAdapter } from './src/adapters/sillytavern-chat.js';
import { createExtractionEngine } from './src/core/extraction-engine.js';
import { createSceneStateStore } from './src/core/scene-state-store.js';
import { createTurnPairCollector } from './src/core/turn-pair-collector.js';
import { createDebugPanel } from './src/ui/debug-panel.js';
import {
    bindSettingsUi,
    EXTENSION_NAME,
    EXTENSION_SETTINGS_KEY,
    initializeSettings,
} from './src/ui/settings-controller.js';
import { createLogger } from './src/utils/logger.js';

let settings;
let logger;
let sceneStateStore;
let debugPanel;
let turnPairCollector;

function saveSettings() {
    saveSettingsDebounced();
}

function syncDebugPanel() {
    if (!debugPanel || !sceneStateStore) {
        return;
    }

    debugPanel.render(sceneStateStore.getSnapshot());
}

function syncSettingsToStateStore() {
    if (!sceneStateStore) {
        return;
    }

    sceneStateStore.setActiveCharacter(settings.activeCharacter);
}

async function renderSettings() {
    const html = await renderExtensionTemplateAsync(EXTENSION_NAME, 'settings');
    $('#extensions_settings2').append(html);

    bindSettingsUi({
        settings,
        onSettingsChanged: () => {
            saveSettings();
            logger.setDebugEnabled(settings.debug);
            syncSettingsToStateStore();
            syncDebugPanel();
        },
    });

    debugPanel = createDebugPanel({
        rootSelector: `#${EXTENSION_SETTINGS_KEY}_debug_panel`,
        statusSelector: `#${EXTENSION_SETTINGS_KEY}_status`,
        stateSelector: `#${EXTENSION_SETTINGS_KEY}_state`,
        settings,
    });

    syncDebugPanel();
}

function onAppReady() {
    logger.info('app-ready', { enabled: settings.enabled });
    syncDebugPanel();
}

async function onGenerationAfterCommands() {
    if (!settings.enabled) {
        return;
    }

    const result = await turnPairCollector.processLatestTurnPair();
    if (!result?.ok) {
        logger.warn('turn-pair-processing-skipped', result || { reason: 'unknown' });
    }
}

jQuery(async () => {
    settings = initializeSettings(extension_settings);
    logger = createLogger(EXTENSION_SETTINGS_KEY, { debugEnabled: settings.debug });
    sceneStateStore = createSceneStateStore({ logger });

    const chatAdapter = createSillyTavernChatAdapter();
    const extractionEngine = createExtractionEngine({ logger });
    const backgroundAdapter = createBackgroundAdapter({ logger });
    const imagePayloadAdapter = createImagePayloadAdapter({ logger });

    turnPairCollector = createTurnPairCollector({
        chatAdapter,
        extractionEngine,
        sceneStateStore,
        backgroundAdapter,
        imagePayloadAdapter,
        logger,
    });

    syncSettingsToStateStore();

    sceneStateStore.subscribe(() => {
        syncDebugPanel();
    });

    await renderSettings();

    eventSource.on(event_types.APP_READY, onAppReady);
    eventSource.on(event_types.GENERATION_AFTER_COMMANDS, onGenerationAfterCommands);
});
