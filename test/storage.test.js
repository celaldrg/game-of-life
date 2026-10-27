import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { loadSetting, saveSetting } from '../src/storage.js';

/** In-memory stand-in for window.localStorage. */
function memoryStore() {
  const data = new Map();
  return {
    data,
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => {
      data.set(key, String(value));
    },
  };
}

/** Storage that refuses every call, like a browser with site data blocked. */
const blockedStore = {
  getItem() {
    throw new Error('SecurityError');
  },
  setItem() {
    throw new Error('QuotaExceededError');
  },
};

describe('storage', () => {
  it('saves a setting under the app prefix and reads it back', () => {
    const store = memoryStore();
    assert.equal(saveSetting('language', 'tr', store), true);
    assert.equal(store.data.get('game-of-life:language'), 'tr');
    assert.equal(loadSetting('language', 'en', store), 'tr');
  });

  it('returns the fallback when nothing is saved', () => {
    const store = memoryStore();
    assert.equal(loadSetting('language', 'en', store), 'en');
    assert.equal(loadSetting('language', undefined, store), null);
  });

  it('survives storage that throws', () => {
    assert.equal(loadSetting('language', 'en', blockedStore), 'en');
    assert.equal(saveSetting('language', 'tr', blockedStore), false);
  });

  it('survives an object without the storage methods', () => {
    assert.equal(loadSetting('language', 'en', {}), 'en');
    assert.equal(saveSetting('language', 'tr', {}), false);
  });
});
