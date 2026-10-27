import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_RULE, RULE_PRESETS, formatRule, parseRule, ruleTable } from '../src/rules.js';

describe('parseRule', () => {
  it('accepts every preset and formats it back unchanged', () => {
    const rules = RULE_PRESETS.map((preset) => preset.rule);
    assert.deepEqual(rules, ['B3/S23', 'B36/S23', 'B2/S', 'B3678/S34678']);
    for (const rule of rules) assert.equal(formatRule(parseRule(rule)), rule);
  });

  it('reads the birth and survival lists', () => {
    assert.deepEqual(parseRule('B3/S23'), { birth: [3], survive: [2, 3] });
    assert.deepEqual(parseRule('B36/S23'), { birth: [3, 6], survive: [2, 3] });
    assert.deepEqual(parseRule('B2/S'), { birth: [2], survive: [] });
    assert.deepEqual(parseRule('B3678/S34678'), { birth: [3, 6, 7, 8], survive: [3, 4, 6, 7, 8] });
  });

  it('is lenient about case, spaces, part order and digit order', () => {
    for (const text of ['b3/s23', ' B3 / S23 ', 'S23/B3', 'B3/S32', 's32/b3']) {
      assert.equal(formatRule(parseRule(text)), 'B3/S23', text);
    }
    assert.equal(formatRule(parseRule('b63/s32')), 'B36/S23');
    assert.equal(formatRule(parseRule('B/S012345678')), 'B/S012345678');
  });

  it('rejects malformed rules', () => {
    const malformed = [
      '', '/', 'B3', 'S23', 'B3S23', 'B3/S23/', 'B3/B3', 'S23/S2', 'B9/S23', 'B3/S29',
      'B3/S2a', 'X3/S23', 'B33/S23', 'B3/S223', 'B 3/S23', '3/23', 'B-3/S23', 'Life',
    ];
    for (const text of malformed) assert.equal(parseRule(text), null, JSON.stringify(text));
  });

  it('rejects values that are not strings', () => {
    for (const value of [null, undefined, 323, {}, ['B3/S23']]) assert.equal(parseRule(value), null);
  });
});

describe('rule presets', () => {
  it('have unique ids and names, and Life is the default', () => {
    assert.equal(new Set(RULE_PRESETS.map((preset) => preset.id)).size, RULE_PRESETS.length);
    assert.ok(RULE_PRESETS.every((preset) => preset.name.length > 0));
    assert.equal(RULE_PRESETS[0].rule, DEFAULT_RULE);
  });
});

describe('ruleTable', () => {
  it('maps state and neighbour count to the next state', () => {
    const table = ruleTable(parseRule('B3/S23'));
    assert.equal(table.length, 18);
    const born = [...table.slice(0, 9)].flatMap((alive, count) => (alive ? [count] : []));
    const survives = [...table.slice(9)].flatMap((alive, count) => (alive ? [count] : []));
    assert.deepEqual(born, [3]);
    assert.deepEqual(survives, [2, 3]);
  });
});
