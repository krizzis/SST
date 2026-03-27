export const EXTENSION_NAME = 'third-party/SST';
export const EXTENSION_SETTINGS_KEY = 'SST';

const DEFAULT_SETTINGS = {
    enabled: true,
    debug: false,
    activeCharacter: '',
};

export function initializeSettings(extensionSettings) {
    extensionSettings[EXTENSION_SETTINGS_KEY] = extensionSettings[EXTENSION_SETTINGS_KEY] || {};

    const settings = Object.assign({}, DEFAULT_SETTINGS, extensionSettings[EXTENSION_SETTINGS_KEY]);
    extensionSettings[EXTENSION_SETTINGS_KEY] = settings;

    return settings;
}

export function bindSettingsUi({ settings, onSettingsChanged }) {
    syncSettingsUi(settings);

    $('#SST_enabled').on('change', function () {
        settings.enabled = Boolean($(this).prop('checked'));
        onSettingsChanged();
    });

    $('#SST_debug').on('change', function () {
        settings.debug = Boolean($(this).prop('checked'));
        onSettingsChanged();
    });

    $('#SST_active_character').on('input', function () {
        settings.activeCharacter = String($(this).val() || '').trim();
        onSettingsChanged();
    });
}

export function syncSettingsUi(settings) {
    $('#SST_enabled').prop('checked', settings.enabled);
    $('#SST_debug').prop('checked', settings.debug);
    $('#SST_active_character').val(settings.activeCharacter);
}
