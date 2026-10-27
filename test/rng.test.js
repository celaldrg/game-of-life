import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createRng } from '../src/rng.js';

function take(rng, count) {
  return Array.from({ length: count }, () => rng());
}

describe('createRng', () => {
  it('repeats the same sequence for the same seed', () => {
    assert.deepEqual(take(createRng(42), 20), take(createRng(42), 20));
  });

  it('gives different sequences for different seeds', () => {
    assert.notDeepEqual(take(createRng(1), 20), take(createRng(2), 20));
  });

  it('reduces the seed to an unsigned 32-bit integer', () => {
    assert.deepEqual(take(createRng(2 ** 32 + 5), 5), take(createRng(5), 5));
  });

  it('returns floats in [0, 1) spread around one half', () => {
    const values = take(createRng(7), 10000);
    assert.ok(values.every((value) => value >= 0 && value < 1));
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    assert.ok(mean > 0.48 && mean < 0.52, `mean ${mean}`);
  });
});
