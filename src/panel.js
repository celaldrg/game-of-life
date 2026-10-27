/**
 * The controls around the canvas: the header buttons, the stage bar (stats and
 * view tools) and the side panel. Connects them to the app's actions and keeps
 * their labels, values and language in step with the game.
 */

import { MAX_SPEED, MIN_SPEED } from './game.js';
import { otherLanguage, translate } from './i18n.js';
import { PATTERN_IDS } from './patterns.js';
import { RULE_PRESETS, parseRule } from './rules.js';

const CUSTOM_RULE = 'custom';
/** Rendered values whose text depends on the language. */
const LOCALIZED = ['running', 'generation', 'population', 'speed'];

/**
 * @typedef {object} PanelActions
 * @property {() => void} toggle - play or pause
 * @property {() => void} step
 * @property {() => void} random
 * @property {() => void} clear
 * @property {() => void} zoomIn
 * @property {() => void} zoomOut
 * @property {() => void} fit
 * @property {() => void} togglePan
 * @property {() => void} toggleLanguage
 * @property {(value: number) => void} setSpeed - generations per second
 * @property {(text: string) => boolean} setRule - false when the rule is malformed
 * @property {(on: boolean) => void} setWrap
 * @property {(id: string) => void} place - built-in pattern id
 */

/**
 * @typedef {object} Panel
 * @property {(state: import('./game.js').GameState, panMode: boolean) => void} render - updates what changed
 * @property {(language: string) => void} setLanguage - translates the page
 */

/**
 * Connects the page's controls to the actions.
 * @param {Document} doc
 * @param {PanelActions} actions
 * @returns {Panel}
 */
export function createPanel(doc, actions) {
  const ui = findControls(doc);
  const shown = {};
  let language = 'en';
  let numbers = new Intl.NumberFormat('en-US');
  let ruleError = false;
  const t = (key, params) => translate(language, key, params);

  function update(key, value, show) {
    if (shown[key] === value) return;
    shown[key] = value;
    show(value);
  }

  function showRuleHelp() {
    ui.rule.setAttribute('aria-invalid', String(ruleError));
    ui.ruleHelp.classList.toggle('is-error', ruleError);
    ui.ruleHelp.textContent = t(ruleError ? 'ruleInvalid' : 'ruleHelp');
  }

  function setRuleError(on) {
    ruleError = on;
    showRuleHelp();
  }

  function applyRule(text) {
    const ok = actions.setRule(text);
    setRuleError(!ok);
    if (ok) delete shown.rule;
  }

  function showRule(rule) {
    ui.rule.value = rule;
    ui.preset.value = RULE_PRESETS.find((preset) => preset.rule === rule)?.id ?? CUSTOM_RULE;
    setRuleError(false);
  }

  function showRunning(running) {
    ui.playLabel.textContent = t(running ? 'pause' : 'play');
    ui.playIcon.toggleAttribute('hidden', running);
    ui.pauseIcon.toggleAttribute('hidden', !running);
  }

  function showSpeed(speed) {
    ui.speed.value = String(speed);
    ui.speed.style.setProperty('--fill', `${((speed - MIN_SPEED) / (MAX_SPEED - MIN_SPEED)) * 100}%`);
    ui.speedValue.textContent = t('speedValue', { speed: numbers.format(speed) });
  }

  function render(state, panMode) {
    update('running', state.running, showRunning);
    update('generation', state.generation, (value) => { ui.generation.textContent = numbers.format(value); });
    update('population', state.population, (value) => { ui.population.textContent = numbers.format(value); });
    update('speed', state.speed, showSpeed);
    update('wrap', state.wrap, (on) => { ui.wrap.checked = on; });
    update('rule', state.rule, showRule);
    update('panMode', panMode, (on) => ui.pan.setAttribute('aria-pressed', String(on)));
  }

  function setLanguage(next) {
    language = next;
    numbers = new Intl.NumberFormat(language === 'tr' ? 'tr-TR' : 'en-US');
    doc.documentElement.lang = language;
    doc.title = t('title');
    translateMarkedText(doc, t);
    labelOptions(ui.preset, 'preset.', t);
    labelOptions(ui.pattern, 'pattern.', t);
    ui.language.textContent = otherLanguage(language).toUpperCase();
    showRuleHelp();
    for (const key of LOCALIZED) delete shown[key];
  }

  addOptions(doc, ui.preset, [...RULE_PRESETS.map((preset) => preset.id), CUSTOM_RULE]);
  ui.preset.querySelector(`option[value="${CUSTOM_RULE}"]`).disabled = true;
  addOptions(doc, ui.pattern, PATTERN_IDS);
  ui.speed.min = String(MIN_SPEED);
  ui.speed.max = String(MAX_SPEED);
  bindButtons(ui, actions);
  ui.speed.addEventListener('input', () => actions.setSpeed(Number(ui.speed.value)));
  ui.wrap.addEventListener('change', () => actions.setWrap(ui.wrap.checked));
  ui.preset.addEventListener('change', () => {
    const preset = RULE_PRESETS.find((item) => item.id === ui.preset.value);
    if (preset) applyRule(preset.rule);
  });
  ui.rule.addEventListener('input', () => {
    if (ruleError && parseRule(ui.rule.value) !== null) setRuleError(false);
  });
  ui.rule.addEventListener('change', () => applyRule(ui.rule.value));

  return { render, setLanguage };
}

function findControls(doc) {
  const byId = (id) => doc.getElementById(id);
  return {
    play: byId('play'),
    playLabel: byId('play-label'),
    playIcon: byId('play-icon'),
    pauseIcon: byId('pause-icon'),
    step: byId('step'),
    random: byId('random'),
    clear: byId('clear'),
    language: byId('language'),
    pan: byId('pan'),
    zoomIn: byId('zoom-in'),
    zoomOut: byId('zoom-out'),
    fit: byId('fit'),
    generation: byId('generation'),
    population: byId('population'),
    speed: byId('speed'),
    speedValue: byId('speed-value'),
    rule: byId('rule'),
    ruleHelp: byId('rule-help'),
    preset: byId('preset'),
    wrap: byId('wrap'),
    pattern: byId('pattern'),
    place: byId('place'),
  };
}

function bindButtons(ui, actions) {
  const clicks = [
    [ui.play, actions.toggle],
    [ui.step, actions.step],
    [ui.random, actions.random],
    [ui.clear, actions.clear],
    [ui.language, actions.toggleLanguage],
    [ui.pan, actions.togglePan],
    [ui.zoomIn, actions.zoomIn],
    [ui.zoomOut, actions.zoomOut],
    [ui.fit, actions.fit],
  ];
  for (const [button, action] of clicks) button.addEventListener('click', () => action());
  ui.place.addEventListener('click', () => actions.place(ui.pattern.value));
}

function addOptions(doc, select, values) {
  for (const value of values) {
    const option = doc.createElement('option');
    option.value = value;
    select.append(option);
  }
}

function labelOptions(select, prefix, t) {
  for (const option of select.options) option.textContent = t(prefix + option.value);
}

/** Fills elements marked with data-i18n (text), data-i18n-label (aria-label) and data-i18n-tooltip (aria-label and title). */
function translateMarkedText(doc, t) {
  for (const element of doc.querySelectorAll('[data-i18n]')) element.textContent = t(element.dataset.i18n);
  for (const element of doc.querySelectorAll('[data-i18n-label]')) {
    element.setAttribute('aria-label', t(element.dataset.i18nLabel));
  }
  for (const element of doc.querySelectorAll('[data-i18n-tooltip]')) {
    const text = t(element.dataset.i18nTooltip);
    element.setAttribute('aria-label', text);
    element.title = text;
  }
}
