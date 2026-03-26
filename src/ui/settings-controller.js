export const EXTENSION_NAME = 'SST';

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
    $('#SST_enabled').prop('checked', settings.enabled);
    $('#SST_debug').prop('checked', settings.debug);
    $('#SST_active_character').val(settings.activeCharacter);

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
