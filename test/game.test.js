import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_HEIGHT, DEFAULT_SPEED, DEFAULT_WIDTH, MAX_SPEED, MIN_SPEED, createGame,
} from '../src/game.js';
import { getPattern } from '../src/patterns.js';
import { liveCells } from '../test-support/helpers.js';

function live(game) {
  const { cells, width } = game.getState();
  return liveCells(cells, width);
}

describe('createGame', () => {
  it('starts paused on an empty default grid', () => {
    const state = createGame().getState();
    assert.equal(state.width, DEFAULT_WIDTH);
    assert.equal(state.height, DEFAULT_HEIGHT);
    assert.equal(state.cells.length, DEFAULT_WIDTH * DEFAULT_HEIGHT);
    assert.equal(state.generation, 0);
    assert.equal(state.population, 0);
    assert.equal(state.running, false);
    assert.equal(state.speed, DEFAULT_SPEED);
    assert.equal(state.wrap, true);
    assert.equal(state.rule, 'B3/S23');
  });

  it('takes size, rule, wrap and speed options', () => {
    const state = createGame({ width: 30, height: 20, rule: 's23/b36', wrap: false, speed: 25 }).getState();
    assert.deepEqual([state.width, state.height, state.rule, state.wrap, state.speed], [30, 20, 'B36/S23', false, 25]);
  });

  it('clamps the speed option and ignores a non-numeric one', () => {
    assert.equal(createGame({ speed: 0 }).getState().speed, MIN_SPEED);
    assert.equal(createGame({ speed: 500 }).getState().speed, MAX_SPEED);
    assert.equal(createGame({ speed: Number.NaN }).getState().speed, DEFAULT_SPEED);
  });

  it('rejects an invalid size or rule', () => {
    assert.throws(() => createGame({ width: 1 }), RangeError);
    assert.throws(() => createGame({ rule: 'B3S23' }), RangeError);
  });
});

describe('time and playback', () => {
  it('step() advances one generation and pauses', () => {
    const game = createGame({ width: 10, height: 10 });
    game.placePattern('blinker', 5, 5);
    game.play();
    game.step();
    const state = game.getState();
    assert.equal(state.generation, 1);
    assert.equal(state.running, false);
    assert.deepEqual(live(game), [[5, 4], [5, 5], [5, 6]]);
  });

  it('update(dt) does nothing while paused', () => {
    const game = createGame();
    assert.equal(game.update(5000), 0);
    assert.equal(game.getState().generation, 0);
  });

  it('update(dt) advances one generation per 1/speed seconds while running', () => {
    const game = createGame({ speed: 10 });
    game.play();
    assert.equal(game.update(250), 2);
    assert.equal(game.update(49), 0);
    assert.equal(game.update(1), 1);
    assert.equal(game.getState().generation, 3);
    game.setSpeed(20);
    assert.equal(game.update(100), 2);
  });

  it('update(dt, onGeneration) reports every generation it advances, not just the last', () => {
    const game = createGame({ width: 10, height: 10, speed: 10 });
    game.placePattern('blinker', 5, 5);
    game.play();
    const seen = [];
    assert.equal(game.update(250, (cells) => seen.push(liveCells(cells, 10))), 2);
    assert.deepEqual(seen, [[[5, 4], [5, 5], [5, 6]], [[4, 5], [5, 5], [6, 5]]]);
  });

  it('update(dt) ignores invalid time and drops a large backlog', () => {
    const game = createGame({ speed: 10 });
    game.play();
    for (const dt of [-50, 0, Number.NaN, undefined]) assert.equal(game.update(dt), 0);
    assert.equal(game.update(10000), 4);
    assert.equal(game.update(99), 0);
    assert.equal(game.update(1), 1);
  });

  it('pause() drops the time collected towards the next generation', () => {
    const game = createGame({ speed: 10 });
    game.play();
    assert.equal(game.update(60), 0);
    game.pause();
    game.play();
    assert.equal(game.update(60), 0);
    assert.equal(game.update(40), 1);
  });

  it('toggleRunning() switches between running and paused, even when detached', () => {
    const { toggleRunning, getState } = createGame();
    assert.equal(toggleRunning(), true);
    assert.equal(getState().running, true);
    assert.equal(toggleRunning(), false);
    assert.equal(getState().running, false);
  });

  it('setSpeed() rounds, clamps and ignores non-numeric values', () => {
    const game = createGame();
    assert.equal(game.setSpeed(12.6), 13);
    assert.equal(game.setSpeed(-3), MIN_SPEED);
    assert.equal(game.setSpeed(1000), MAX_SPEED);
    assert.equal(game.setSpeed('fast'), MAX_SPEED);
    assert.equal(game.getState().speed, MAX_SPEED);
  });
});

describe('settings', () => {
  it('setRule() switches valid rules and keeps the cells', () => {
    const game = createGame({ width: 10, height: 10 });
    game.placePattern('glider', 5, 5);
    assert.equal(game.setRule('b36/s23'), true);
    assert.equal(game.getState().rule, 'B36/S23');
    assert.equal(game.getState().population, 5);
    assert.equal(game.setRule('B3/S23/x'), false);
    assert.equal(game.getState().rule, 'B36/S23');
  });

  it('runs the selected rule', () => {
    const game = createGame({ width: 10, height: 10, rule: 'B2/S' });
    game.setCell(3, 3, true);
    game.setCell(4, 3, true);
    game.step();
    assert.deepEqual(live(game), [[3, 2], [4, 2], [3, 4], [4, 4]]);
  });

  it('setWrap() decides whether gliders cross the edges', () => {
    for (const wrap of [true, false]) {
      const game = createGame({ width: 10, height: 10, wrap: !wrap });
      game.setWrap(wrap);
      assert.equal(game.getState().wrap, wrap);
      game.placePattern('glider', 7, 7);
      for (let generation = 0; generation < 40; generation++) game.step();
      assert.equal(game.getState().population, wrap ? 5 : 4);
    }
  });
});

describe('editing', () => {
  it('draws and erases cells and ignores the outside', () => {
    const game = createGame({ width: 10, height: 10 });
    assert.equal(game.setCell(2, 3, true), true);
    assert.equal(game.getCell(2, 3), 1);
    assert.equal(game.getState().population, 1);
    assert.equal(game.setCell(10, 3, true), false);
    assert.equal(game.getCell(-1, 3), 0);
    assert.equal(game.setCell(2, 3, false), true);
    assert.equal(game.getState().population, 0);
  });

  it('clear() kills every cell, pauses and resets the generation', () => {
    const game = createGame();
    game.randomize();
    game.step();
    game.play();
    game.clear();
    const state = game.getState();
    assert.deepEqual([state.population, state.generation, state.running], [0, 0, false]);
    assert.ok(state.cells.every((alive) => alive === 0));
  });

  it('randomize() is reproducible for a seed and keeps the playback state', () => {
    const first = createGame({ seed: 7 });
    const second = createGame({ seed: 7 });
    first.step();
    first.play();
    first.randomize();
    second.randomize();
    assert.deepEqual(first.getState().cells, second.getState().cells);
    assert.equal(first.getState().generation, 0);
    assert.equal(first.getState().running, true);
    const share = first.getState().population / (DEFAULT_WIDTH * DEFAULT_HEIGHT);
    assert.ok(share > 0.27 && share < 0.33, `share ${share}`);
    const third = createGame({ seed: 8 });
    third.randomize();
    assert.notDeepEqual(third.getState().cells, first.getState().cells);
  });

  it('randomize() uses the injected random source and clamps the density', () => {
    const always = createGame({ width: 5, height: 5, rng: () => 0.5 });
    always.randomize(0.6);
    assert.equal(always.getState().population, 25);
    always.randomize(0.4);
    assert.equal(always.getState().population, 0);
    always.randomize(2);
    assert.equal(always.getState().population, 25);
    always.randomize(-1);
    assert.equal(always.getState().population, 0);
  });

  it('placePattern() centres the pattern and overwrites the cells under it', () => {
    const game = createGame({ width: 20, height: 20 });
    game.setCell(9, 9, true);
    game.setCell(8, 8, true);
    const corner = game.placePattern('glider', 10, 10);
    assert.deepEqual(corner, { left: 9, top: 9 });
    assert.deepEqual(live(game), [[8, 8], [10, 9], [11, 10], [9, 11], [10, 11], [11, 11]]);
  });

  it('placePattern() floors fractional centres and accepts parsed patterns', () => {
    const game = createGame({ width: 20, height: 20 });
    assert.deepEqual(game.placePattern(getPattern('blinker'), 10.9, 4.2), { left: 9, top: 4 });
    assert.deepEqual(live(game), [[9, 4], [10, 4], [11, 4]]);
  });

  it('placePattern() wraps across the edges with wrap on and clips with wrap off', () => {
    const wrapped = createGame({ width: 20, height: 20, wrap: true });
    wrapped.placePattern('blinker', 0, 5);
    assert.deepEqual(live(wrapped), [[0, 5], [1, 5], [19, 5]]);
    const clipped = createGame({ width: 20, height: 20, wrap: false });
    clipped.placePattern('blinker', 0, 5);
    assert.deepEqual(live(clipped), [[0, 5], [1, 5]]);
  });

  it('placePattern() rejects unknown pattern ids', () => {
    assert.throws(() => createGame().placePattern('spaceship', 5, 5), RangeError);
  });
});
