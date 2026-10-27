import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../src/game.js';
import { createStroke, lineCells } from '../src/stroke.js';
import { liveCells } from '../test-support/helpers.js';

function live(game) {
  const { cells, width } = game.getState();
  return liveCells(cells, width);
}

describe('lineCells', () => {
  it('lists every cell of a straight line, both ends included', () => {
    assert.deepEqual(lineCells(0, 0, 3, 0), [[0, 0], [1, 0], [2, 0], [3, 0]]);
    assert.deepEqual(lineCells(2, 2, 0, 0), [[2, 2], [1, 1], [0, 0]]);
  });

  it('returns the single cell when start and end are the same', () => {
    assert.deepEqual(lineCells(4, 7, 4, 7), [[4, 7]]);
  });

  it('leaves no gaps on steep and shallow lines in every direction', () => {
    const ends = [[0, 0, 2, 9], [0, 0, 9, 2], [5, 5, -3, 1], [5, 5, 1, -7], [-2, 4, 6, -1]];
    for (const [x0, y0, x1, y1] of ends) {
      const cells = lineCells(x0, y0, x1, y1);
      assert.deepEqual(cells[0], [x0, y0]);
      assert.deepEqual(cells.at(-1), [x1, y1]);
      assert.equal(cells.length, Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) + 1);
      for (let i = 1; i < cells.length; i++) {
        const step = Math.max(Math.abs(cells[i][0] - cells[i - 1][0]), Math.abs(cells[i][1] - cells[i - 1][1]));
        assert.equal(step, 1, `gap between ${cells[i - 1]} and ${cells[i]}`);
      }
    }
  });
});

describe('createStroke', () => {
  it('draws the first cell, then lines between the points and reports what changed', () => {
    const game = createGame({ width: 10, height: 10 });
    const stroke = createStroke(game, true);
    assert.equal(stroke.to(1, 1), 1);
    assert.equal(stroke.to(4, 1), 3);
    assert.equal(stroke.to(4, 1), 0);
    assert.deepEqual(live(game), [[1, 1], [2, 1], [3, 1], [4, 1]]);
  });

  it('erases cells and ignores the part of the path outside the grid', () => {
    const game = createGame({ width: 5, height: 5 });
    for (let x = 0; x < 5; x++) game.setCell(x, 2, true);
    const stroke = createStroke(game, false);
    stroke.to(-3, 2);
    assert.equal(stroke.to(2, 2), 3);
    assert.deepEqual(live(game), [[3, 2], [4, 2]]);
  });

  it('reverts exactly the cells it changed', () => {
    const game = createGame({ width: 10, height: 10 });
    game.setCell(2, 2, true);
    const stroke = createStroke(game, true);
    stroke.to(0, 2);
    stroke.to(5, 2);
    stroke.revert();
    assert.deepEqual(live(game), [[2, 2]]);
    assert.equal(game.getState().population, 1);
  });
});
