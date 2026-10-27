/**
 * Run-length encoded (RLE) patterns, the standard file format for Life patterns:
 *
 *   #N Glider
 *   x = 3, y = 3, rule = B3/S23
 *   bob$2bo$3o!
 *
 * "b" is a dead cell, "o" a live cell, "$" ends a row and "!" ends the pattern;
 * a number in front of a tag repeats it.
 */

import { formatRule, parseRule } from './rules.js';

/**
 * @typedef {object} Pattern
 * @property {string} name - from the "#N" line; '' when there is none
 * @property {number} width - bounding box width in cells
 * @property {number} height - bounding box height in cells
 * @property {string | null} rule - canonical B/S rule from the header; null when there is none
 * @property {Array<[number, number]>} cells - live cells as [x, y] offsets from the top-left corner, sorted by row, then column
 */

const MAX_SIDE = 4096;
const LINE_LENGTH = 70;

/**
 * Parses a pattern in RLE format. "#" lines before the data are comments ("#N"
 * gives the name); the header line ("x = .., y = .., rule = ..") is optional;
 * whitespace between runs and anything after "!" are ignored.
 * @param {string} text
 * @returns {Pattern}
 * @throws {SyntaxError} when the text is not valid RLE or uses a rule outside B/S notation
 */
export function parseRLE(text) {
  if (typeof text !== 'string') throw new TypeError('RLE input must be a string');
  let name = '';
  let header = null;
  const body = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line === '') continue;
    if (body.length === 0 && line.startsWith('#')) {
      if (line.startsWith('#N')) name = line.slice(2).trim();
    } else if (body.length === 0 && header === null && /^x\s*=/.test(line)) {
      header = parseHeader(line);
    } else {
      body.push(line);
    }
  }
  const data = decodeRuns(body.join(''));
  if (header === null) return { name, width: data.width, height: data.height, rule: null, cells: data.cells };
  if (data.cells.some(([x, y]) => x >= header.width || y >= header.height)) {
    throw new SyntaxError('RLE data does not fit the size given in the header');
  }
  return { name, width: header.width, height: header.height, rule: header.rule, cells: data.cells };
}

function parseHeader(line) {
  const fields = new Map();
  for (const item of line.split(',')) {
    const separator = item.indexOf('=');
    if (separator < 0) throw new SyntaxError(`Malformed RLE header: ${line}`);
    fields.set(item.slice(0, separator).trim().toLowerCase(), item.slice(separator + 1).trim());
  }
  const width = parseSide(fields.get('x'));
  const height = parseSide(fields.get('y'));
  if (width === null || height === null) throw new SyntaxError(`Malformed RLE header: ${line}`);
  if (!fields.has('rule')) return { width, height, rule: null };
  const rule = parseRule(fields.get('rule'));
  if (rule === null) throw new SyntaxError(`Unsupported rule in RLE header: ${fields.get('rule')}`);
  return { width, height, rule: formatRule(rule) };
}

function parseSide(value) {
  if (value === undefined || !/^\d+$/.test(value)) return null;
  const side = Number(value);
  return side <= MAX_SIDE ? side : null;
}

function readRuns(data) {
  const runs = [];
  let digits = '';
  for (const char of data) {
    if (char >= '0' && char <= '9') {
      digits += char;
    } else if (char === 'b' || char === 'o' || char === '$') {
      const count = digits === '' ? 1 : Number(digits);
      if (count < 1) throw new SyntaxError('RLE run count must be at least 1');
      runs.push({ count, tag: char });
      digits = '';
    } else if (char === '!' || /\s/.test(char)) {
      if (digits !== '') throw new SyntaxError('RLE run count must be followed by b, o or $');
      if (char === '!') return runs;
    } else {
      throw new SyntaxError(`Unexpected character in RLE data: ${char}`);
    }
  }
  if (digits !== '') throw new SyntaxError('RLE run count must be followed by b, o or $');
  return runs;
}

function decodeRuns(data) {
  const cells = [];
  let x = 0;
  let y = 0;
  let width = 0;
  let height = 0;
  for (const { count, tag } of readRuns(data)) {
    if (tag === '$') {
      if (y + count > MAX_SIDE) throw new SyntaxError('RLE pattern is too large');
      y += count;
      x = 0;
      continue;
    }
    if (y >= MAX_SIDE || x + count > MAX_SIDE) throw new SyntaxError('RLE pattern is too large');
    if (tag === 'o') for (let i = 0; i < count; i++) cells.push([x + i, y]);
    x += count;
    width = Math.max(width, x);
    height = y + 1;
  }
  return { cells, width, height };
}

/**
 * Writes a pattern as RLE text: a "#N" line when it has a name, the header and
 * the runs wrapped at 70 characters, ending with "!". Trailing dead cells of a
 * row are left out and empty rows are merged, as in the canonical format.
 * @param {Pattern} pattern
 * @returns {string} the RLE text, without a trailing newline
 */
export function writeRLE(pattern) {
  const lines = [];
  if (pattern.name) lines.push(`#N ${pattern.name}`);
  const rule = pattern.rule ? `, rule = ${pattern.rule}` : '';
  lines.push(`x = ${pattern.width}, y = ${pattern.height}${rule}`);
  lines.push(...wrapTokens(encodeRows(pattern.cells)));
  return lines.join('\n');
}

function encodeRows(cells) {
  const rows = new Map();
  for (const [x, y] of cells) {
    if (!rows.has(y)) rows.set(y, new Set());
    rows.get(y).add(x);
  }
  const rowNumbers = [...rows.keys()].sort((a, b) => a - b);
  const tokens = [];
  let row = 0;
  for (const y of rowNumbers) {
    if (y > row) tokens.push(runToken(y - row, '$'));
    tokens.push(...encodeRow([...rows.get(y)].sort((a, b) => a - b)));
    row = y;
  }
  tokens.push('!');
  return tokens;
}

function encodeRow(columns) {
  const tokens = [];
  let x = 0;
  let i = 0;
  while (i < columns.length) {
    const start = columns[i];
    let end = start + 1;
    while (columns[i + 1] === end) {
      i++;
      end++;
    }
    i++;
    if (start > x) tokens.push(runToken(start - x, 'b'));
    tokens.push(runToken(end - start, 'o'));
    x = end;
  }
  return tokens;
}

function runToken(count, tag) {
  return count === 1 ? tag : `${count}${tag}`;
}

function wrapTokens(tokens) {
  const lines = [];
  let line = '';
  for (const token of tokens) {
    if (line !== '' && line.length + token.length > LINE_LENGTH) {
      lines.push(line);
      line = '';
    }
    line += token;
  }
  lines.push(line);
  return lines;
}
