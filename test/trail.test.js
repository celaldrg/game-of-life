import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { TRAIL_LENGTH, advanceTrail, createTrail } from '../src/trail.js';

describe('trail', () => {
  it('starts empty', () => {
    assert.deepEqual(createTrail(4), new Uint8Array(4));
  });

  it('marks live cells and fades dead ones by one step, down to zero', () => {
    const trail = Uint8Array.from([0, 3, 1, 0]);
    advanceTrail(trail, Uint8Array.from([1, 0, 0, 0]));
    assert.deepEqual(trail, Uint8Array.from([TRAIL_LENGTH, 2, 0, 0]));
  });

  it('lets a cell that dies glow for TRAIL_LENGTH - 1 generations', () => {
    const trail = createTrail(1);
    advanceTrail(trail, Uint8Array.of(1));
    let glowing = 0;
    for (let generation = 0; generation < TRAIL_LENGTH + 2; generation++) {
      advanceTrail(trail, Uint8Array.of(0));
      if (trail[0] > 0) glowing++;
    }
    assert.equal(glowing, TRAIL_LENGTH - 1);
  });
});
