export const LOCATION_PATTERNS = [
    { value: 'bedroom', patterns: [/\bbed\s?room\b/i, /\bbedchamber\b/i] },
    { value: 'kitchen', patterns: [/\bkitchen\b/i, /\bcook room\b/i] },
    { value: 'forest path', patterns: [/\bforest (?:path|trail)\b/i, /\bwoodland path\b/i] },
    { value: 'tavern', patterns: [/\btavern\b/i, /\binn\b/i] },
];

export const EMOTION_PATTERNS = [
    { value: 'happy', patterns: [/\bhappy\b/i, /\bjoyful\b/i, /\bcheerful\b/i, /\bglad\b/i, /\bsmil(?:e|es|ing)\b/i] },
    { value: 'sad', patterns: [/\bsad\b/i, /\bgloomy\b/i, /\bsorrowful\b/i, /\bdowncast\b/i] },
    { value: 'angry', patterns: [/\bangry\b/i, /\bfurious\b/i, /\birritated\b/i] },
    { value: 'afraid', patterns: [/\bafraid\b/i, /\bfearful\b/i, /\bscared\b/i, /\bnervous\b/i, /\btrembl(?:e|es|ing)\b/i] },
    { value: 'surprised', patterns: [/\bsurprised\b/i, /\bstartled\b/i, /\bshocked\b/i] },
    { value: 'neutral', patterns: [/\bcalm\b/i, /\bsteady\b/i, /\bneutral\b/i] },
];

export const POSE_PATTERNS = [
    { value: 'kneeling', patterns: [/\bkneel(?:s|ing)?\b/i, /\bon (?:their|her|his) knees\b/i] },
    { value: 'lying', patterns: [/\blying\b/i, /\breclin(?:e|es|ing)\b/i, /\blaid out\b/i] },
    { value: 'sitting', patterns: [/\bsitt(?:ing|s)\b/i, /\bseated\b/i, /\bstraddl(?:e|es|ing)\b/i] },
    { value: 'standing', patterns: [/\bstand(?:ing|s)?\b/i, /\bon (?:their|her|his) feet\b/i] },
];

export const ACTION_PATTERNS = [
    { value: 'oral sex', patterns: [/\boral sex\b/i, /\bblowjob\b/i, /\bcunnilingus\b/i] },
    { value: 'sex', patterns: [/\bhaving sex\b/i, /\bintercourse\b/i, /\bfuck(?:ing|s)?\b/i] },
    { value: 'kissing', patterns: [/\bkiss(?:es|ing)?\b/i, /\bmake(?:s| )out\b/i] },
    { value: 'undressing', patterns: [/\bundress(?:es|ing)?\b/i, /\bstrip(?:s|ping)?\b/i, /\bremove(?:s|ing)? clothes\b/i, /\bopen(?:ing)? (?:her|his|their)? ?(?:robe|shirt|clothes)\b/i] },
    { value: 'running', patterns: [/\brunn(?:ing|s)\b/i, /\bsprint(?:ing|s)?\b/i] },
    { value: 'walking', patterns: [/\bwalk(?:ing|s)?\b/i, /\bmoving forward\b/i] },
    { value: 'idle', patterns: [/\bwait(?:s|ing)?\b/i, /\bwatch(?:es|ing)?\b/i, /\bstill\b/i] },
];

export const INTERACTION_PATTERNS = [
    { value: 'oral sex', patterns: [/\boral sex\b/i, /\bblowjob\b/i, /\bcunnilingus\b/i] },
    { value: 'penetrative sex', patterns: [/\bintercourse\b/i, /\bfuck(?:ing|s)?\b/i, /\bsex\b/i] },
    { value: 'kissing', patterns: [/\bkiss(?:es|ing)?\b/i, /\bmake(?:s| )out\b/i] },
    { value: 'embracing', patterns: [/\bhug(?:s|ging)?\b/i, /\bembrac(?:e|es|ing)\b/i, /\bholding close\b/i] },
    { value: 'intimate', patterns: [/\bintimate\b/i, /\bsensual\b/i, /\bcaress(?:es|ing)?\b/i, /\bstraddl(?:e|es|ing)\b/i] },
];

export const OUTFIT_PATTERNS = [
    { value: 'nude', patterns: [/\bnude\b/i, /\bnaked\b/i, /\bfully naked\b/i, /\bcompletely naked\b/i] },
    { value: 'topless', patterns: [/\btopless\b/i, /\bbare breasts\b/i, /\bbare chest\b/i] },
    { value: 'bottomless', patterns: [/\bbottomless\b/i, /\bpantless\b/i, /\bwithout panties\b/i, /\bno pants\b/i] },
    { value: 'open clothes', patterns: [/\bopen robe\b/i, /\bopen shirt\b/i, /\bopen clothes\b/i, /\bparted clothing\b/i, /\btugs? open\b/i, /\btugg?ing open\b/i] },
    { value: 'lingerie', patterns: [/\blingerie\b/i, /\bunderwear\b/i, /\bbra and panties\b/i] },
];

export const GARMENT_PATTERNS = [
    { value: 'robe', patterns: [/\brobe\b/i] },
    { value: 'dress', patterns: [/\bdress\b/i] },
    { value: 'coat', patterns: [/\bcoat\b/i] },
    { value: 'boots', patterns: [/\bboots?\b/i] },
    { value: 'shirt', patterns: [/\bshirt\b/i] },
    { value: 'skirt', patterns: [/\bskirt\b/i] },
    { value: 'pants', patterns: [/\bpants\b/i, /\btrousers\b/i] },
    { value: 'panties', patterns: [/\bpanties\b/i] },
    { value: 'bra', patterns: [/\bbra\b/i] },
];
