import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PATTERN_IDS, PATTERN_RLE } from '../src/patterns.js';
import { parseRLE, writeRLE } from '../src/rle.js';

const EXPECTED = {
  glider: { width: 3, height: 3, live: 5 },
  lwss: { width: 5, height: 4, live: 9 },
  blinker: { width: 3, height: 1, live: 3 },
  pulsar: { width: 13, height: 13, live: 48 },
  pentadecathlon: { width: 10, height: 3, live: 12 },
  'gosper-gun': { width: 36, height: 9, live: 36 },
  'r-pentomino': { width: 3, height: 3, live: 5 },
  acorn: { width: 7, height: 3, live: 7 },
};

describe('parseRLE', () => {
  it('reads every built-in pattern', () => {
    assert.deepEqual([...PATTERN_IDS].sort(), Object.keys(EXPECTED).sort());
    for (const id of PATTERN_IDS) {
      const pattern = parseRLE(PATTERN_RLE[id]);
      const { width, height, live } = EXPECTED[id];
      assert.equal(pattern.width, width, id);
      assert.equal(pattern.height, height, id);
      assert.equal(pattern.cells.length, live, id);
      assert.equal(pattern.rule, 'B3/S23', id);
      assert.ok(pattern.name.length > 0, id);
      assert.ok(pattern.cells.every(([x, y]) => x >= 0 && y >= 0 && x < width && y < height), id);
    }
  });

  it('decodes runs, row ends and blank rows', () => {
    const glider = parseRLE('#N Glider\nx = 3, y = 3, rule = B3/S23\nbo$2bo$3o!');
    assert.equal(glider.name, 'Glider');
    assert.deepEqual(glider.cells, [[1, 0], [2, 1], [0, 2], [1, 2], [2, 2]]);
    assert.deepEqual(parseRLE('x = 3, y = 4\no2$2bo$!').cells, [[0, 0], [2, 2]]);
  });

  it('skips comments, whitespace, line breaks and text after "!"', () => {
    const text = '#C a comment\r\n#O someone\r\nx = 5, y = 2\r\n2o 3b$\r\n  b4o! this is ignored\r\n#C more';
    const pattern = parseRLE(text);
    assert.equal(pattern.name, '');
    assert.equal(pattern.rule, null);
    assert.deepEqual(pattern.cells, [[0, 0], [1, 0], [1, 1], [2, 1], [3, 1], [4, 1]]);
  });

  it('works without a header or a final "!"', () => {
    const pattern = parseRLE('bo$2bo$3o');
    assert.equal(pattern.width, 3);
    assert.equal(pattern.height, 3);
    assert.equal(pattern.cells.length, 5);
  });

  it('normalises the rule in the header', () => {
    assert.equal(parseRLE('x = 1, y = 1, rule = b36/s23\no!').rule, 'B36/S23');
  });

  it('rejects malformed input', () => {
    const malformed = [
      'x = 3, y = 3\nbqo!',
      'x = 3, y = 3\n3!',
      'x = 3, y = 3\n2 o!',
      'x = 3, y = 3\n0o!',
      'x = 3, y = 3\nbo$2bo$3',
      'x = 3\n3o!',
      'x = a, y = 1\no!',
      'x = 3, y = 1, rule\n3o!',
      'x = 3, y = 1, rule = 23/3\n3o!',
      'x = 2, y = 1\n3o!',
      'x = 3, y = 1\n$3o!',
      '99999o!',
    ];
    for (const text of malformed) assert.throws(() => parseRLE(text), SyntaxError, JSON.stringify(text));
    assert.throws(() => parseRLE(null), TypeError);
  });
});

describe('writeRLE', () => {
  it('writes every built-in pattern back to its exact source text', () => {
    for (const id of PATTERN_IDS) assert.equal(writeRLE(parseRLE(PATTERN_RLE[id])), PATTERN_RLE[id], id);
  });

  it('round-trips every built-in pattern through text', () => {
    for (const id of PATTERN_IDS) {
      const pattern = parseRLE(PATTERN_RLE[id]);
      assert.deepEqual(parseRLE(writeRLE(pattern)), pattern, id);
    }
  });

  it('wraps lines at 70 characters without splitting runs', () => {
    const lines = PATTERN_RLE['gosper-gun'].split('\n');
    assert.ok(lines.every((line) => line.length <= 70));
    assert.ok(lines.some((line) => line.length === 70));
  });

  it('sorts cells, drops duplicates and merges blank rows', () => {
    const pattern = { name: '', width: 4, height: 4, rule: null, cells: [[3, 3], [0, 0], [3, 3], [1, 0]] };
    assert.equal(writeRLE(pattern), 'x = 4, y = 4\n2o3$3bo!');
    assert.deepEqual(parseRLE(writeRLE(pattern)).cells, [[0, 0], [1, 0], [3, 3]]);
  });

  it('writes an empty pattern', () => {
    const empty = { name: 'Nothing', width: 0, height: 0, rule: 'B3/S23', cells: [] };
    assert.equal(writeRLE(empty), '#N Nothing\nx = 0, y = 0, rule = B3/S23\n!');
    assert.deepEqual(parseRLE(writeRLE(empty)), empty);
  });
});
