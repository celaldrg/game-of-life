import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DEMO_WARM_UP, createDemoGame } from '../src/demo.js';
import { countGliders } from '../test-support/helpers.js';

function gliders(game) {
  const { cells, width, height } = game.getState();
  return countGliders(cells, width, height);
}

describe('demo', () => {
  it('builds the same running mid-game state every time', () => {
    const first = createDemoGame().getState();
    const second = createDemoGame().getState();
    assert.deepEqual(first.cells, second.cells);
    assert.equal(first.generation, DEMO_WARM_UP);
    assert.equal(first.population, second.population);
    assert.deepEqual(
      [first.width, first.height, first.rule, first.wrap, first.running, first.speed],
      [120, 80, 'B3/S23', true, true, 15],
    );
  });

  it('has a Gosper glider gun with several gliders in flight', () => {
    const game = createDemoGame();
    for (let generation = 0; generation < 30; generation++) {
      assert.ok(gliders(game) >= 6, `generation ${game.getState().generation}`);
      game.step();
    }
  });

  it('repeats every 30 generations because the eater swallows each glider', () => {
    const game = createDemoGame();
    const start = Uint8Array.from(game.getState().cells);
    for (let period = 1; period <= 20; period++) {
      for (let generation = 0; generation < 30; generation++) game.step();
      assert.deepEqual(game.getState().cells, start, `after ${period * 30} more generations`);
    }
  });
});
