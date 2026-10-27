import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  cellAt, clearGrid, createGrid, fillRandom, setCellAt, stampPattern, stepGrid,
} from '../src/grid.js';
import { getPattern } from '../src/patterns.js';
import { createRng } from '../src/rng.js';
import { parseRule, ruleTable } from '../src/rules.js';
import { LIFE, findPeriod, gridWith, liveCells, shifted } from '../test-support/helpers.js';

function gridFromCells(width, height, cells) {
  const grid = createGrid(width, height);
  for (const [x, y] of cells) setCellAt(grid, x, y, true);
  return grid;
}

function stepTimes(grid, table, wrap, generations) {
  for (let i = 0; i < generations; i++) stepGrid(grid, table, wrap);
}

describe('createGrid', () => {
  it('creates an empty grid with two buffers', () => {
    const grid = createGrid(5, 4);
    assert.equal(grid.width, 5);
    assert.equal(grid.height, 4);
    assert.equal(grid.population, 0);
    assert.ok(grid.cells instanceof Uint8Array && grid.next instanceof Uint8Array);
    assert.equal(grid.cells.length, 20);
    assert.notEqual(grid.cells, grid.next);
  });

  it('rejects sizes that are not whole numbers from 3 to 2048', () => {
    for (const [width, height] of [[2, 10], [10, 0], [2049, 10], [3.5, 10], [Number.NaN, 10], ['10', 10]]) {
      assert.throws(() => createGrid(width, height), RangeError);
    }
    assert.doesNotThrow(() => createGrid(3, 2048));
  });
});

describe('cells', () => {
  it('sets and reads cells and keeps the population in sync', () => {
    const grid = createGrid(5, 5);
    assert.equal(setCellAt(grid, 1, 2, true), true);
    assert.equal(setCellAt(grid, 1, 2, true), false);
    assert.equal(cellAt(grid, 1, 2), 1);
    assert.equal(grid.cells[2 * 5 + 1], 1);
    assert.equal(grid.population, 1);
    assert.equal(setCellAt(grid, 1, 2, false), true);
    assert.equal(grid.population, 0);
  });

  it('ignores coordinates outside the grid', () => {
    const grid = createGrid(5, 5);
    for (const [x, y] of [[-1, 0], [0, -1], [5, 0], [0, 5], [1.5, 1], [Number.NaN, 1]]) {
      assert.equal(setCellAt(grid, x, y, true), false);
      assert.equal(cellAt(grid, x, y), 0);
    }
    assert.equal(grid.population, 0);
  });

  it('clears every cell', () => {
    const grid = gridWith('glider', 6, 6, 1, 1);
    clearGrid(grid);
    assert.equal(grid.population, 0);
    assert.ok(grid.cells.every((alive) => alive === 0));
  });

  it('fills randomly and reproducibly from a seeded source', () => {
    const first = createGrid(50, 40);
    const second = createGrid(50, 40);
    fillRandom(first, createRng(9), 0.3);
    fillRandom(second, createRng(9), 0.3);
    assert.deepEqual(first.cells, second.cells);
    assert.equal(first.population, liveCells(first.cells, 50).length);
    assert.ok(first.population > 500 && first.population < 700, `population ${first.population}`);
    fillRandom(second, createRng(10), 0.3);
    assert.notDeepEqual(first.cells, second.cells);
  });

  it('fills nothing at density 0 and everything at density 1', () => {
    const grid = createGrid(10, 10);
    fillRandom(grid, createRng(1), 1);
    assert.equal(grid.population, 100);
    fillRandom(grid, createRng(1), 0);
    assert.equal(grid.population, 0);
  });
});

describe('stepGrid', () => {
  it('blinker oscillates with period 2', () => {
    const grid = gridWith('blinker', 7, 7, 2, 3);
    assert.deepEqual(liveCells(grid.cells, 7), [[2, 3], [3, 3], [4, 3]]);
    stepGrid(grid, LIFE, false);
    assert.deepEqual(liveCells(grid.cells, 7), [[3, 2], [3, 3], [3, 4]]);
    assert.equal(findPeriod(gridWith('blinker', 7, 7, 2, 3), LIFE, false, 10), 2);
  });

  it('block is a still life', () => {
    const block = [[2, 2], [3, 2], [2, 3], [3, 3]];
    const grid = gridFromCells(6, 6, block);
    for (let generation = 1; generation <= 5; generation++) {
      stepGrid(grid, LIFE, false);
      assert.deepEqual(liveCells(grid.cells, 6), block);
    }
    assert.equal(findPeriod(gridFromCells(6, 6, block), LIFE, false, 5), 1);
  });

  it('glider is the same shape shifted by (+1, +1) after 4 generations', () => {
    const grid = gridWith('glider', 12, 12, 3, 3);
    const start = liveCells(grid.cells, 12);
    stepTimes(grid, LIFE, false, 4);
    assert.deepEqual(liveCells(grid.cells, 12), shifted(start, 1, 1));
    stepTimes(grid, LIFE, false, 4);
    assert.deepEqual(liveCells(grid.cells, 12), shifted(start, 2, 2));
  });

  it('pulsar oscillates with period 3', () => {
    const grid = gridWith('pulsar', 21, 21, 4, 4);
    assert.equal(grid.population, 48);
    assert.equal(findPeriod(grid, LIFE, false, 10), 3);
  });

  it('pentadecathlon oscillates with period 15', () => {
    assert.equal(findPeriod(gridWith('pentadecathlon', 22, 15, 6, 6), LIFE, false, 20), 15);
  });

  it('lightweight spaceship moves 2 cells to the left every 4 generations', () => {
    const grid = gridWith('lwss', 20, 10, 12, 3);
    const start = liveCells(grid.cells, 20);
    stepTimes(grid, LIFE, false, 4);
    assert.deepEqual(liveCells(grid.cells, 20), shifted(start, -2, 0));
  });

  it('returns and stores the new population', () => {
    const grid = gridWith('r-pentomino', 30, 30, 13, 13);
    for (let generation = 0; generation < 20; generation++) {
      const population = stepGrid(grid, LIFE, false);
      assert.equal(population, liveCells(grid.cells, 30).length);
      assert.equal(grid.population, population);
    }
  });

  it('swaps the two buffers instead of allocating new ones', () => {
    const grid = gridWith('blinker', 5, 5, 1, 2);
    const { cells, next } = grid;
    stepGrid(grid, LIFE, false);
    assert.equal(grid.cells, next);
    assert.equal(grid.next, cells);
    stepGrid(grid, LIFE, false);
    assert.equal(grid.cells, cells);
  });

  it('applies other rules through their lookup table', () => {
    const seeds = ruleTable(parseRule('B2/S'));
    const domino = gridFromCells(8, 8, [[3, 3], [4, 3]]);
    stepGrid(domino, seeds, false);
    assert.deepEqual(liveCells(domino.cells, 8), [[3, 2], [4, 2], [3, 4], [4, 4]]);

    const sixNeighbours = [[2, 2], [3, 2], [4, 2], [2, 4], [3, 4], [4, 4]];
    const highLife = gridFromCells(7, 7, sixNeighbours);
    stepGrid(highLife, ruleTable(parseRule('B36/S23')), false);
    assert.equal(cellAt(highLife, 3, 3), 1);
    const life = gridFromCells(7, 7, sixNeighbours);
    stepGrid(life, LIFE, false);
    assert.equal(cellAt(life, 3, 3), 0);
  });
});

describe('wrap mode', () => {
  it('moves a glider across the edges of a torus', () => {
    const grid = gridWith('glider', 10, 10, 6, 6);
    const start = liveCells(grid.cells, 10);
    stepTimes(grid, LIFE, true, 8);
    const columns = new Set(liveCells(grid.cells, 10).map(([x]) => x));
    assert.ok(columns.has(9) && columns.has(0), 'the glider straddles the right edge');
    assert.equal(grid.population, 5);
    stepTimes(grid, LIFE, true, 32);
    assert.deepEqual(liveCells(grid.cells, 10), start, 'back at the start after 10 cells each way');
  });

  it('stops a glider at the edges without wrap', () => {
    const grid = gridWith('glider', 10, 10, 6, 6);
    stepTimes(grid, LIFE, false, 40);
    assert.deepEqual(liveCells(grid.cells, 10), [[8, 8], [9, 8], [8, 9], [9, 9]], 'it turns into a block in the corner');
  });

  it('stamps patterns across the edges with wrap and clips them without', () => {
    const blinker = getPattern('blinker');
    const wrapped = createGrid(6, 4);
    stampPattern(wrapped, blinker, 4, 1, true);
    assert.deepEqual(liveCells(wrapped.cells, 6), [[0, 1], [4, 1], [5, 1]]);
    const clipped = createGrid(6, 4);
    stampPattern(clipped, blinker, 4, 1, false);
    assert.deepEqual(liveCells(clipped.cells, 6), [[4, 1], [5, 1]]);
  });
});
