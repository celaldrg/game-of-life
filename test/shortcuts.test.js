import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { panOffset, shortcutAction } from '../src/shortcuts.js';

describe('shortcutAction', () => {
  it('maps the documented keys, letters in either case', () => {
    const expected = {
      ' ': 'toggle',
      n: 'step',
      N: 'step',
      r: 'random',
      R: 'random',
      c: 'clear',
      C: 'clear',
      f: 'fit',
      F: 'fit',
      '+': 'zoomIn',
      '=': 'zoomIn',
      '-': 'zoomOut',
      _: 'zoomOut',
    };
    for (const [key, action] of Object.entries(expected)) assert.equal(shortcutAction(key), action, key);
  });

  it('returns null for other keys and for non-strings', () => {
    for (const key of ['x', 'Enter', 'Shift', 'ArrowLeft', '', undefined, null, 42]) {
      assert.equal(shortcutAction(key), null, String(key));
    }
  });
});

describe('panOffset', () => {
  it('moves the grid against the arrow, so the view looks that way', () => {
    assert.deepEqual(panOffset('ArrowLeft'), [1, 0]);
    assert.deepEqual(panOffset('ArrowRight'), [-1, 0]);
    assert.deepEqual(panOffset('ArrowUp'), [0, 1]);
    assert.deepEqual(panOffset('ArrowDown'), [0, -1]);
  });

  it('returns null for other keys and frozen offsets for arrows', () => {
    assert.equal(panOffset('a'), null);
    assert.equal(panOffset(' '), null);
    assert.ok(Object.isFrozen(panOffset('ArrowUp')));
  });
});
