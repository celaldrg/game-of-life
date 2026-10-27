/**
 * Life-like rules in B/S notation: "B3/S23" means a dead cell with exactly 3 live
 * neighbours is born and a live cell with 2 or 3 live neighbours survives.
 */

/**
 * @typedef {object} Rule
 * @property {readonly number[]} birth - ascending neighbour counts that bring a dead cell to life
 * @property {readonly number[]} survive - ascending neighbour counts that keep a live cell alive
 */

/** The rule of Conway's Game of Life. */
export const DEFAULT_RULE = 'B3/S23';

/** Well-known rules offered as presets, in menu order. */
export const RULE_PRESETS = Object.freeze([
  Object.freeze({ id: 'life', name: "Conway's Life", rule: 'B3/S23' }),
  Object.freeze({ id: 'highlife', name: 'HighLife', rule: 'B36/S23' }),
  Object.freeze({ id: 'seeds', name: 'Seeds', rule: 'B2/S' }),
  Object.freeze({ id: 'day-night', name: 'Day & Night', rule: 'B3678/S34678' }),
]);

const RULE_PART = /^([BS])([0-8]*)$/i;

/**
 * Parses a rule in B/S notation. Letters are case-insensitive, spaces around the
 * parts are ignored, the parts may come in either order and the digits in any
 * order, but every digit (0-8) may appear only once per part.
 * @param {string} text - e.g. "B3/S23", "b36/s23", "S23/B3" or "B2/S"
 * @returns {Rule | null} the rule with ascending digit lists, or null when the text is malformed
 */
export function parseRule(text) {
  if (typeof text !== 'string') return null;
  const parts = text.split('/');
  if (parts.length !== 2) return null;
  const lists = new Map();
  for (const part of parts) {
    const match = RULE_PART.exec(part.trim());
    if (!match) return null;
    const letter = match[1].toUpperCase();
    const digits = Array.from(match[2], Number).sort((a, b) => a - b);
    if (lists.has(letter) || hasRepeats(digits)) return null;
    lists.set(letter, Object.freeze(digits));
  }
  return Object.freeze({ birth: lists.get('B'), survive: lists.get('S') });
}

function hasRepeats(sorted) {
  return sorted.some((value, i) => i > 0 && value === sorted[i - 1]);
}

/**
 * Formats a rule in canonical B/S notation.
 * @param {Rule} rule
 * @returns {string} e.g. "B36/S23"
 */
export function formatRule(rule) {
  return `B${rule.birth.join('')}/S${rule.survive.join('')}`;
}

/**
 * Builds the lookup table used by the simulation step: the next state of a cell
 * is table[state * 9 + liveNeighbours], where state is 0 (dead) or 1 (alive).
 * @param {Rule} rule
 * @returns {Uint8Array} 18 entries, each 0 or 1
 */
export function ruleTable(rule) {
  const table = new Uint8Array(18);
  for (const count of rule.birth) table[count] = 1;
  for (const count of rule.survive) table[9 + count] = 1;
  return table;
}
