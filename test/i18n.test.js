import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  DEFAULT_LANGUAGE, LANGUAGES, STRINGS, normalizeLanguage, otherLanguage, translate,
} from '../src/i18n.js';
import { PATTERN_IDS } from '../src/patterns.js';
import { RULE_PRESETS } from '../src/rules.js';

const HTML = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

/** Keys that panel.js passes to translate() as expressions rather than through the markup. */
const SCRIPT_KEYS = ['title', 'play', 'pause', 'speedValue', 'ruleHelp', 'ruleInvalid'];

function placeholders(text) {
  return [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
}

/** Every opening tag of the page with its attributes. */
function tags(html) {
  return [...html.matchAll(/<([a-z][\w-]*)\b([^>]*)>([^<]*)/g)].map(([, name, attributes, text]) => ({
    name,
    text,
    attributes: Object.fromEntries([...attributes.matchAll(/([\w-]+)="([^"]*)"/g)].map(([, key, value]) => [key, value])),
  }));
}

describe('strings', () => {
  it('has the same keys in English and Turkish, none of them empty', () => {
    assert.deepEqual(LANGUAGES, ['en', 'tr']);
    assert.deepEqual(Object.keys(STRINGS.tr).sort(), Object.keys(STRINGS.en).sort());
    for (const language of LANGUAGES) {
      for (const [key, text] of Object.entries(STRINGS[language])) {
        assert.ok(typeof text === 'string' && text.trim().length > 0, `${language}.${key} is empty`);
      }
    }
  });

  it('uses the same placeholders in both languages', () => {
    for (const key of Object.keys(STRINGS.en)) {
      assert.deepEqual(placeholders(STRINGS.tr[key]), placeholders(STRINGS.en[key]), key);
    }
  });

  it('names every rule preset, the custom rule and every built-in pattern', () => {
    const keys = [
      ...RULE_PRESETS.map((preset) => `preset.${preset.id}`),
      'preset.custom',
      ...PATTERN_IDS.map((id) => `pattern.${id}`),
      ...SCRIPT_KEYS,
    ];
    for (const key of keys) assert.ok(Object.hasOwn(STRINGS.en, key), `missing ${key}`);
  });

  it('offers a toggle label for the other language', () => {
    assert.equal(translate('en', 'switchLanguage'), 'TR: switch to Turkish');
    assert.equal(translate('tr', 'switchLanguage'), 'EN: İngilizceye geç');
  });
});

describe('translate', () => {
  it('fills placeholders', () => {
    assert.equal(translate('en', 'speedValue', { speed: 12 }), '12 gen/s');
    assert.equal(translate('tr', 'speedValue', { speed: 12 }), '12 nesil/sn');
  });

  it('keeps placeholders without a value', () => {
    assert.equal(translate('en', 'speedValue'), '{speed} gen/s');
  });

  it('treats an unknown language as English and returns an unknown key as is', () => {
    assert.equal(translate('de', 'play'), 'Play');
    assert.equal(translate('tr', 'no.such.key'), 'no.such.key');
  });
});

describe('language codes', () => {
  it('normalizes saved values to a supported language', () => {
    assert.equal(normalizeLanguage('tr'), 'tr');
    assert.equal(normalizeLanguage('en'), 'en');
    for (const value of ['TR', 'de', '', null, undefined, 1]) assert.equal(normalizeLanguage(value), DEFAULT_LANGUAGE);
  });

  it('switches between the two languages', () => {
    assert.equal(otherLanguage('en'), 'tr');
    assert.equal(otherLanguage('tr'), 'en');
    assert.equal(otherLanguage('xx'), 'tr');
  });
});

describe('index.html', () => {
  const marked = tags(HTML).filter(({ attributes }) => Object.keys(attributes).some((key) => key.startsWith('data-i18n')));

  it('marks its texts with keys that exist', () => {
    assert.ok(marked.length > 20);
    for (const { attributes } of marked) {
      for (const name of ['data-i18n', 'data-i18n-label', 'data-i18n-tooltip']) {
        if (name in attributes) assert.ok(Object.hasOwn(STRINGS.en, attributes[name]), `${name}="${attributes[name]}"`);
      }
    }
  });

  it('starts with the English texts, so the first paint matches the default language', () => {
    for (const { text, attributes } of marked) {
      if ('data-i18n' in attributes) assert.equal(text, STRINGS.en[attributes['data-i18n']]);
      const label = attributes['data-i18n-label'] ?? attributes['data-i18n-tooltip'];
      if (label) assert.equal(attributes['aria-label'], STRINGS.en[label]);
      if (attributes['data-i18n-tooltip']) assert.equal(attributes.title, STRINGS.en[label]);
    }
  });

  it('starts with the English page title and the toggle offering Turkish', () => {
    assert.match(HTML, /<html lang="en">/);
    assert.match(HTML, new RegExp(`<title>${STRINGS.en.title}</title>`));
    assert.match(HTML, /id="language"[^>]*>TR</);
  });
});
