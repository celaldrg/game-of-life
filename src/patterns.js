/**
 * Built-in pattern library. Every pattern is defined in canonical RLE (exactly as
 * writeRLE() prints it) and uses Conway's rule B3/S23.
 */

import { parseRLE } from './rle.js';

/** RLE source of each built-in pattern, keyed by id, in menu order. */
export const PATTERN_RLE = Object.freeze({
  glider: `#N Glider
x = 3, y = 3, rule = B3/S23
bo$2bo$3o!`,
  lwss: `#N Lightweight spaceship
x = 5, y = 4, rule = B3/S23
bo2bo$o$o3bo$4o!`,
  blinker: `#N Blinker
x = 3, y = 1, rule = B3/S23
3o!`,
  pulsar: `#N Pulsar
x = 13, y = 13, rule = B3/S23
2b3o3b3o2$o4bobo4bo$o4bobo4bo$o4bobo4bo$2b3o3b3o2$2b3o3b3o$o4bobo4bo$o
4bobo4bo$o4bobo4bo2$2b3o3b3o!`,
  pentadecathlon: `#N Pentadecathlon
x = 10, y = 3, rule = B3/S23
2bo4bo$2ob4ob2o$2bo4bo!`,
  'gosper-gun': `#N Gosper glider gun
x = 36, y = 9, rule = B3/S23
24bo$22bobo$12b2o6b2o12b2o$11bo3bo4b2o12b2o$2o8bo5bo3b2o$2o8bo3bob2o4b
obo$10bo5bo7bo$11bo3bo$12b2o!`,
  'r-pentomino': `#N R-pentomino
x = 3, y = 3, rule = B3/S23
b2o$2o$bo!`,
  acorn: `#N Acorn
x = 7, y = 3, rule = B3/S23
bo$3bo$2o2b3o!`,
});

/** Ids of the built-in patterns, in menu order. */
export const PATTERN_IDS = Object.freeze(Object.keys(PATTERN_RLE));

/**
 * Returns a freshly parsed copy of a built-in pattern.
 * @param {string} id - one of PATTERN_IDS
 * @returns {import('./rle.js').Pattern}
 * @throws {RangeError} for an unknown id
 */
export function getPattern(id) {
  if (!Object.hasOwn(PATTERN_RLE, id)) throw new RangeError(`Unknown pattern: ${id}`);
  return parseRLE(PATTERN_RLE[id]);
}
