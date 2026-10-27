/**
 * Interface text in English and Turkish. Both tables have the same keys (the
 * tests check this); translate() fills "{name}" placeholders.
 */

/** Supported languages, the default first. */
export const LANGUAGES = Object.freeze(['en', 'tr']);

/** Language used until the player picks another one. */
export const DEFAULT_LANGUAGE = 'en';

/** Interface strings by language and key. */
export const STRINGS = Object.freeze({
  en: Object.freeze({
    title: 'Game of Life',
    clear: 'Clear',
    switchLanguage: 'TR: switch to Turkish',
    board: 'Life grid. Click or drag to draw cells.',
    viewTools: 'View controls',
    panMode: 'Pan mode',
    zoomIn: 'Zoom in',
    zoomOut: 'Zoom out',
    fit: 'Fit the grid to the view',
    generation: 'Generation',
    population: 'Population',
    controls: 'Simulation controls',
    play: 'Play',
    pause: 'Pause',
    step: 'Step',
    random: 'Random',
    speed: 'Speed',
    speedValue: '{speed} gen/s',
    rule: 'Rule',
    rulePresets: 'Rule presets',
    ruleHelp: 'B: birth, S: survival (neighbour counts)',
    ruleInvalid: 'Not a valid rule. Use B/S notation, e.g. B3/S23.',
    wrap: 'Wrap edges',
    wrapHelp: 'Opposite edges are joined (torus)',
    pattern: 'Pattern',
    place: 'Place',
    placeHelp: 'Places the pattern at the centre of the view',
    helpTitle: 'Controls',
    keySpace: 'Space',
    helpPlay: 'Play / pause',
    helpZoom: 'Zoom in / out',
    helpFit: 'Fit to view',
    helpArrows: 'Move the view (grid focused)',
    helpDraw: 'Click or drag: draw or erase',
    helpWheel: 'Wheel or pinch: zoom',
    helpPan: 'Pan mode, middle button or two fingers: move',
    source: 'Source on GitHub',
    'preset.life': "Conway's Life",
    'preset.highlife': 'HighLife',
    'preset.seeds': 'Seeds',
    'preset.day-night': 'Day & Night',
    'preset.custom': 'Custom',
    'pattern.glider': 'Glider',
    'pattern.lwss': 'Lightweight spaceship',
    'pattern.blinker': 'Blinker',
    'pattern.pulsar': 'Pulsar',
    'pattern.pentadecathlon': 'Pentadecathlon',
    'pattern.gosper-gun': 'Gosper glider gun',
    'pattern.r-pentomino': 'R-pentomino',
    'pattern.acorn': 'Acorn',
  }),
  tr: Object.freeze({
    title: 'Hayat Oyunu',
    clear: 'Temizle',
    switchLanguage: 'EN: İngilizceye geç',
    board: 'Hayat ızgarası. Hücre çizmek için tıklayın veya sürükleyin.',
    viewTools: 'Görünüm kontrolleri',
    panMode: 'Kaydırma modu',
    zoomIn: 'Yakınlaştır',
    zoomOut: 'Uzaklaştır',
    fit: 'Izgarayı görünüme sığdır',
    generation: 'Nesil',
    population: 'Nüfus',
    controls: 'Simülasyon kontrolleri',
    play: 'Oynat',
    pause: 'Duraklat',
    step: 'Adım',
    random: 'Rastgele',
    speed: 'Hız',
    speedValue: '{speed} nesil/sn',
    rule: 'Kural',
    rulePresets: 'Hazır kurallar',
    ruleHelp: 'B: doğum, S: hayatta kalma (komşu sayıları)',
    ruleInvalid: 'Geçersiz kural. B/S gösterimini kullanın, ör. B3/S23.',
    wrap: 'Kenarları birleştir',
    wrapHelp: 'Karşı kenarlar birleşir (torus)',
    pattern: 'Desen',
    place: 'Yerleştir',
    placeHelp: 'Deseni görünümün ortasına yerleştirir',
    helpTitle: 'Kontroller',
    keySpace: 'Boşluk',
    helpPlay: 'Oynat / duraklat',
    helpZoom: 'Yakınlaştır / uzaklaştır',
    helpFit: 'Görünüme sığdır',
    helpArrows: 'Görünümü kaydır (ızgara seçiliyken)',
    helpDraw: 'Tıkla veya sürükle: çiz ya da sil',
    helpWheel: 'Tekerlek veya iki parmak: yakınlaştır',
    helpPan: 'Kaydırma modu, orta tuş veya iki parmak: kaydır',
    source: "Kaynak kod GitHub'da",
    'preset.life': 'Hayat (Conway)',
    'preset.highlife': 'HighLife',
    'preset.seeds': 'Tohumlar',
    'preset.day-night': 'Gündüz ve Gece',
    'preset.custom': 'Özel',
    'pattern.glider': 'Planör',
    'pattern.lwss': 'Hafif uzay gemisi',
    'pattern.blinker': 'Yanıp sönen',
    'pattern.pulsar': 'Pulsar',
    'pattern.pentadecathlon': 'Pentadekatlon',
    'pattern.gosper-gun': 'Gosper tabancası',
    'pattern.r-pentomino': 'R-pentomino',
    'pattern.acorn': 'Meşe palamudu',
  }),
});

/**
 * Turns any value into a supported language code.
 * @param {unknown} code - e.g. a saved setting
 * @returns {'en' | 'tr'} the code itself when supported, otherwise the default
 */
export function normalizeLanguage(code) {
  return LANGUAGES.includes(code) ? code : DEFAULT_LANGUAGE;
}

/**
 * Returns the language the toggle button switches to.
 * @param {string} language - current language
 * @returns {'en' | 'tr'}
 */
export function otherLanguage(language) {
  return normalizeLanguage(language) === 'en' ? 'tr' : 'en';
}

/**
 * Looks up a string and fills its "{name}" placeholders.
 * @param {string} language - 'en' or 'tr'; anything else means English
 * @param {string} key
 * @param {Record<string, string | number>} [params] - placeholder values; unknown placeholders stay as they are
 * @returns {string} the text, or the key itself when it is unknown
 */
export function translate(language, key, params = {}) {
  const table = STRINGS[normalizeLanguage(language)];
  const text = Object.hasOwn(table, key) ? table[key] : key;
  return text.replace(/\{(\w+)\}/g, (match, name) => (Object.hasOwn(params, name) ? String(params[name]) : match));
}
