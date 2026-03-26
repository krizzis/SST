export const EXTENSION_NAME = 'scene-state-tracker';

const DEFAULT_SETTINGS = {
    enabled: true,
    debug: false,
    activeCharacter: '',
};

export function initializeSettings(extensionSettings) {
    extensionSettings[EXTENSION_NAME] = extensionSettings[EXTENSION_NAME] || {};

    const settings = Object.assign({}, DEFAULT_SETTINGS, extensionSettings[EXTENSION_NAME]);
    extensionSettings[EXTENSION_NAME] = settings;

    return settings;
}

export function bindSettingsUi({ settings, onSettingsChanged }) {
    $('#scene-state-tracker_enabled').prop('checked', settings.enabled);
    $('#scene-state-tracker_debug').prop('checked', settings.debug);
    $('#scene-state-tracker_active_character').val(settings.activeCharacter);

    $('#scene-state-tracker_enabled').on('change', function () {
        settings.enabled = Boolean($(this).prop('checked'));
        onSettingsChanged();
    });

    $('#scene-state-tracker_debug').on('change', function () {
        settings.debug = Boolean($(this).prop('checked'));
        onSettingsChanged();
    });

    $('#scene-state-tracker_active_character').on('input', function () {
        settings.activeCharacter = String($(this).val() || '').trim();
        onSettingsChanged();
    });
}
