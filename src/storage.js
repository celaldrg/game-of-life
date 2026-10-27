/**
 * The only door to localStorage. Every read and write is wrapped in try/catch,
 * so blocked storage (private mode, disabled cookies) never breaks the app:
 * reads fall back to a default and writes are skipped.
 */

const PREFIX = 'game-of-life:';

function backend(store) {
  return store ?? globalThis.localStorage;
}

/**
 * Reads a saved setting.
 * @param {string} key
 * @param {string | null} [fallback=null] - returned when nothing is saved or storage is unavailable
 * @param {Storage} [store] - storage to use instead of window.localStorage (for tests)
 * @returns {string | null}
 */
export function loadSetting(key, fallback = null, store = undefined) {
  try {
    const value = backend(store).getItem(PREFIX + key);
    return value === null ? fallback : value;
  } catch {
    return fallback;
  }
}

/**
 * Saves a setting.
 * @param {string} key
 * @param {string} value
 * @param {Storage} [store] - storage to use instead of window.localStorage (for tests)
 * @returns {boolean} false when storage is unavailable
 */
export function saveSetting(key, value, store = undefined) {
  try {
    backend(store).setItem(PREFIX + key, String(value));
    return true;
  } catch {
    return false;
  }
}
