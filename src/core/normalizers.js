const LOCATION_SYNONYMS = [
    { key: 'bedroom', label: 'Bedroom', aliases: ['bed room', 'bedroom', 'bed chamber', 'the bedroom'] },
    { key: 'kitchen', label: 'Kitchen', aliases: ['kitchen', 'the kitchen', 'cook room'] },
    { key: 'forest_path', label: 'Forest Path', aliases: ['forest path', 'forest trail', 'woodland path', 'the forest path'] },
    { key: 'tavern', label: 'Tavern', aliases: ['tavern', 'inn', 'the tavern', 'the inn'] },
];

const EMOTION_SYNONYMS = [
    { key: 'neutral', label: 'Neutral', aliases: ['neutral', 'calm', 'steady', 'blank'] },
    { key: 'happy', label: 'Happy', aliases: ['happy', 'joyful', 'cheerful', 'glad', 'smiling'] },
    { key: 'sad', label: 'Sad', aliases: ['sad', 'gloomy', 'sorrowful', 'downcast'] },
    { key: 'angry', label: 'Angry', aliases: ['angry', 'mad', 'furious', 'irritated'] },
    { key: 'afraid', label: 'Afraid', aliases: ['afraid', 'fearful', 'scared', 'terrified', 'nervous'] },
    { key: 'surprised', label: 'Surprised', aliases: ['surprised', 'startled', 'shocked'] },
];

const POSE_SYNONYMS = [
    { key: 'unspecified', label: 'Unspecified', aliases: ['unspecified', 'unknown'] },
    { key: 'standing', label: 'Standing', aliases: ['standing', 'stands', 'standing up', 'on her feet', 'on his feet'] },
    { key: 'sitting', label: 'Sitting', aliases: ['sitting', 'seated', 'sits', 'sat down'] },
    { key: 'lying', label: 'Lying', aliases: ['lying', 'lying down', 'reclining', 'laid out'] },
    { key: 'kneeling', label: 'Kneeling', aliases: ['kneeling', 'kneels', 'on their knees'] },
];

const ACTION_SYNONYMS = [
    { key: 'idle', label: 'Idle', aliases: ['idle', 'still', 'waiting', 'watching'] },
    { key: 'walking', label: 'Walking', aliases: ['walking', 'walks', 'moving forward'] },
    { key: 'running', label: 'Running', aliases: ['running', 'runs', 'sprinting'] },
    { key: 'undressing', label: 'Undressing', aliases: ['undressing', 'removing clothes', 'stripping'] },
    { key: 'kissing', label: 'Kissing', aliases: ['kissing', 'kisses'] },
    { key: 'sex', label: 'Sex', aliases: ['sex', 'fucking', 'having sex', 'intercourse'] },
    { key: 'oral', label: 'Oral', aliases: ['oral', 'oral sex', 'blowjob', 'cunnilingus'] },
];

const INTERACTION_SYNONYMS = [
    { key: 'none', label: 'None', aliases: ['none', 'solo', 'alone'] },
    { key: 'embracing', label: 'Embracing', aliases: ['embracing', 'hugging', 'holding close'] },
    { key: 'kissing', label: 'Kissing', aliases: ['kissing', 'making out'] },
    { key: 'intimate', label: 'Intimate', aliases: ['intimate', 'sensual', 'sexual'] },
    { key: 'penetrative_sex', label: 'Penetrative Sex', aliases: ['penetrative sex', 'sex', 'fucking', 'intercourse'] },
    { key: 'oral_sex', label: 'Oral Sex', aliases: ['oral sex', 'blowjob', 'cunnilingus'] },
];

const OUTFIT_TAG_SYNONYMS = [
    { key: 'nude', aliases: ['nude', 'naked', 'fully naked', 'completely naked'] },
    { key: 'topless', aliases: ['topless', 'bare breasts', 'bare chest'] },
    { key: 'bottomless', aliases: ['bottomless', 'no pants', 'without panties', 'pantless'] },
    { key: 'open_clothes', aliases: ['open clothes', 'open shirt', 'open robe', 'parted clothing'] },
    { key: 'lingerie', aliases: ['lingerie', 'underwear', 'bra and panties'] },
];

const APPEARANCE_OUTFIT_NOISE_PATTERNS = [
    /\bhair\b/i,
    /\beyes?\b/i,
    /\bface\b/i,
    /\bskin\b/i,
    /\bbody\b/i,
    /\bfigure\b/i,
    /\bbreasts?\b/i,
    /\bchest\b/i,
    /\bcurves?\b/i,
];

function normalizeWhitespace(value) {
    return String(value ?? '').trim().replace(/\s+/g, ' ');
}

function normalizeLookupText(value) {
    return normalizeWhitespace(value)
        .toLowerCase()
        .replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, '')
        .replace(/^(the|a|an)\s+/i, '');
}

function titleCase(value) {
    return value.replace(/\b\w/g, (match) => match.toUpperCase());
}

function toKey(value) {
    return normalizeLookupText(value)
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '') || 'unknown';
}

function buildAliasMap(entries) {
    const aliasMap = new Map();

    for (const entry of entries) {
        for (const alias of entry.aliases) {
            aliasMap.set(normalizeLookupText(alias), {
                key: entry.key,
                label: entry.label || titleCase(entry.key.replace(/_/g, ' ')),
            });
        }
    }

    return aliasMap;
}

const LOCATION_ALIAS_MAP = buildAliasMap(LOCATION_SYNONYMS);
const EMOTION_ALIAS_MAP = buildAliasMap(EMOTION_SYNONYMS);
const POSE_ALIAS_MAP = buildAliasMap(POSE_SYNONYMS);
const ACTION_ALIAS_MAP = buildAliasMap(ACTION_SYNONYMS);
const INTERACTION_ALIAS_MAP = buildAliasMap(INTERACTION_SYNONYMS);
const OUTFIT_TAG_ALIAS_MAP = new Map();

for (const entry of OUTFIT_TAG_SYNONYMS) {
    for (const alias of entry.aliases) {
        OUTFIT_TAG_ALIAS_MAP.set(normalizeLookupText(alias), entry.key);
    }
}

function normalizeLabeledValue(value, aliasMap, fallback) {
    const rawText = typeof value === 'object' && value !== null
        ? value.label || value.key || value.value || ''
        : value;
    const normalizedText = normalizeLookupText(rawText);
    const matchedValue = aliasMap.get(normalizedText);

    if (matchedValue) {
        return matchedValue;
    }

    if (!normalizedText) {
        return fallback;
    }

    const key = toKey(normalizedText);
    return {
        key,
        label: titleCase(normalizedText.replace(/_/g, ' ')),
    };
}

function normalizeOutfitTag(value) {
    const normalizedText = normalizeLookupText(value);
    return OUTFIT_TAG_ALIAS_MAP.get(normalizedText) || normalizedText.replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function dedupeSortedTags(values) {
    return [...new Set(values.filter(Boolean))].sort();
}

function isAppearanceNoise(part) {
    const normalizedTag = normalizeOutfitTag(part);
    if (['nude', 'topless', 'bottomless', 'open_clothes', 'lingerie'].includes(normalizedTag)) {
        return false;
    }

    return APPEARANCE_OUTFIT_NOISE_PATTERNS.some((pattern) => pattern.test(part));
}

function normalizeOutfit(outfit) {
    const rawText = typeof outfit === 'object' && outfit !== null
        ? [
            outfit.primary,
            ...(Array.isArray(outfit.details)
                ? outfit.details
                : typeof outfit.details === 'string'
                    ? [outfit.details]
                    : []),
        ].join(', ')
        : outfit;
    const parts = normalizeWhitespace(rawText)
        .split(/[,;]|\band\b/gi)
        .map((part) => normalizeWhitespace(part))
        .filter(Boolean)
        .filter((part) => !isAppearanceNoise(part));

    if (parts.length === 0) {
        return {
            primary: '',
            details: [],
        };
    }

    const normalizedParts = parts.map((part) => ({
        raw: part,
        tag: normalizeOutfitTag(part),
    }));

    const explicitStateTag = normalizedParts.find((part) => ['nude', 'topless', 'bottomless', 'open_clothes', 'lingerie'].includes(part.tag));
    const primary = explicitStateTag ? explicitStateTag.tag : normalizedParts[0].tag;
    const detailTags = dedupeSortedTags(normalizedParts.map((part) => part.tag).filter((tag) => tag !== primary));

    return {
        primary,
        details: detailTags,
    };
}

export function normalizeScenePatch(patch = {}) {
    return {
        location: normalizeLabeledValue(patch.location, LOCATION_ALIAS_MAP, {
            key: 'unknown',
            label: 'Unknown',
        }),
        emotion: normalizeLabeledValue(patch.emotion, EMOTION_ALIAS_MAP, {
            key: 'neutral',
            label: 'Neutral',
        }),
        pose: normalizeLabeledValue(patch.pose, POSE_ALIAS_MAP, {
            key: 'unspecified',
            label: 'Unspecified',
        }),
        action: normalizeLabeledValue(patch.action, ACTION_ALIAS_MAP, {
            key: 'idle',
            label: 'Idle',
        }),
        interaction: normalizeLabeledValue(patch.interaction, INTERACTION_ALIAS_MAP, {
            key: 'none',
            label: 'None',
        }),
        outfit: normalizeOutfit(patch.outfit),
        summary: normalizeWhitespace(patch.summary),
    };
}
