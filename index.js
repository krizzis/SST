import {
    extension_settings,
    renderExtensionTemplateAsync,
} from '../../../extensions.js';
import {
    chat,
    characters,
    chat_metadata,
    eventSource,
    event_types,
    generateQuietPrompt,
    getCurrentChatId,
    saveSettingsDebounced,
    this_chid,
} from '../../../../script.js';

import { createBackgroundAdapter } from './src/adapters/background-adapter.js';
import { createImagePayloadAdapter } from './src/adapters/image-payload-adapter.js';
import { createSillyTavernChatAdapter } from './src/adapters/sillytavern-chat.js';
import { createSillyTavernExtractionProvider } from './src/adapters/sillytavern-extraction-provider.js';
import { createExtractionEngine } from './src/core/extraction-engine.js';
import { createSceneStateStore } from './src/core/scene-state-store.js';
import { createTurnPairCollector } from './src/core/turn-pair-collector.js';
import { createDebugPanel } from './src/ui/debug-panel.js';
import {
    bindSettingsUi,
    EXTENSION_NAME,
    EXTENSION_SETTINGS_KEY,
    initializeSettings,
    syncSettingsUi,
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

function syncActiveCharacterFromChatContext() {
    const context = turnPairCollector?.getContext();
    const nextActiveCharacter = String(context?.characterName || '').trim();

    settings.activeCharacter = nextActiveCharacter;
    syncSettingsUi(settings);
    sceneStateStore.resetForChat({ activeCharacter: nextActiveCharacter });
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

async function onCharacterMessageRendered(messageId, triggerType) {
    if (!settings.enabled) {
        return;
    }

    const result = await turnPairCollector.handleCharacterMessageRendered(messageId, triggerType);
    if (!result?.ok && result.reason !== 'duplicate-turn-pair' && result.reason !== 'processing-already-in-flight') {
        logger.warn('turn-pair-processing-skipped', result || { reason: 'unknown' });
    }
}

function onChatChanged() {
    turnPairCollector.resetForChat();
    syncActiveCharacterFromChatContext();
    syncDebugPanel();
}

jQuery(async () => {
    settings = initializeSettings(extension_settings);
    logger = createLogger(EXTENSION_SETTINGS_KEY, { debugEnabled: settings.debug });
    sceneStateStore = createSceneStateStore({ logger });

    const chatAdapter = createSillyTavernChatAdapter({
        getChat: () => chat,
        getCharacters: () => characters,
        getSelectedCharacterId: () => this_chid,
        getChatMetadata: () => chat_metadata,
        getCurrentChatId,
    });
    const extractionProvider = createSillyTavernExtractionProvider({
        generateQuietPrompt,
    });
    const extractionEngine = createExtractionEngine({
        logger,
        provider: extractionProvider,
    });
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

    if (!settings.activeCharacter) {
        syncActiveCharacterFromChatContext();
    } else {
        syncSettingsToStateStore();
    }

    sceneStateStore.subscribe(() => {
        syncDebugPanel();
    });

    await renderSettings();

    eventSource.on(event_types.APP_READY, onAppReady);
    eventSource.on(event_types.CHAT_CHANGED, onChatChanged);
    eventSource.on(event_types.CHARACTER_MESSAGE_RENDERED, onCharacterMessageRendered);
});
