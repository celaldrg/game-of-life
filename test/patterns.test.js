import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { stepGrid } from '../src/grid.js';
import { PATTERN_IDS, getPattern } from '../src/patterns.js';
import { LIFE, countGliders, gridWith } from '../test-support/helpers.js';

describe('pattern library', () => {
  it('lists the built-in patterns in menu order', () => {
    assert.deepEqual(PATTERN_IDS, [
      'glider', 'lwss', 'blinker', 'pulsar', 'pentadecathlon', 'gosper-gun', 'r-pentomino', 'acorn',
    ]);
  });

  it('returns a fresh copy on every call', () => {
    const first = getPattern('glider');
    first.cells.length = 0;
    assert.equal(getPattern('glider').cells.length, 5);
  });

  it('rejects unknown ids', () => {
    for (const id of ['', 'toString', 'unknown']) assert.throws(() => getPattern(id), RangeError);
  });

  it('Gosper glider gun fires one glider every 30 generations', () => {
    const grid = gridWith('gosper-gun', 80, 60, 2, 2);
    for (let shots = 1; shots <= 5; shots++) {
      for (let generation = 0; generation < 30; generation++) stepGrid(grid, LIFE, false);
      assert.equal(countGliders(grid.cells, grid.width, grid.height), shots);
      assert.equal(grid.population, 36 + 5 * shots);
    }
  });

  it('R-pentomino and acorn keep growing from a handful of cells', () => {
    for (const id of ['r-pentomino', 'acorn']) {
      const grid = gridWith(id, 80, 80, 38, 38);
      const start = grid.population;
      for (let generation = 0; generation < 100; generation++) stepGrid(grid, LIFE, false);
      assert.ok(grid.population > start * 5, `${id}: ${grid.population}`);
    }
  });
});
