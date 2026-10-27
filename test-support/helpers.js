// Helpers shared by the test suites. They live outside test/ because `node --test`
// runs every file under a test/ folder as a test file.

import { createGrid, stampPattern, stepGrid } from '../src/grid.js';
import { getPattern } from '../src/patterns.js';
import { DEFAULT_RULE, parseRule, ruleTable } from '../src/rules.js';

/** Lookup table of Conway's rule B3/S23. */
export const LIFE = ruleTable(parseRule(DEFAULT_RULE));

/**
 * Creates a grid holding one built-in pattern with its top-left corner at (left, top).
 * @param {string} id - built-in pattern id
 * @param {number} width
 * @param {number} height
 * @param {number} left
 * @param {number} top
 */
export function gridWith(id, width, height, left, top) {
  const grid = createGrid(width, height);
  stampPattern(grid, getPattern(id), left, top, false);
  return grid;
}

/**
 * Lists the live cells of a row-major cell array as [x, y] pairs, by row, then column.
 * @param {Uint8Array} cells
 * @param {number} width
 */
export function liveCells(cells, width) {
  const live = [];
  cells.forEach((alive, index) => {
    if (alive) live.push([index % width, Math.floor(index / width)]);
  });
  return live;
}

/** Moves [x, y] cells by (dx, dy). */
export function shifted(cells, dx, dy) {
  return cells.map(([x, y]) => [x + dx, y + dy]);
}

/**
 * Steps the grid until it is back in its starting state.
 * @returns {number} the period, or 0 when it does not repeat within maxPeriod generations
 */
export function findPeriod(grid, table, wrap, maxPeriod) {
  const start = Uint8Array.from(grid.cells);
  for (let generation = 1; generation <= maxPeriod; generation++) {
    stepGrid(grid, table, wrap);
    if (grid.cells.every((value, index) => value === start[index])) return generation;
  }
  return 0;
}

const GLIDER_SHAPES = gliderShapes();

function gliderShapes() {
  const grid = gridWith('glider', 8, 8, 2, 2);
  const shapes = new Set();
  for (let phase = 0; phase < 4; phase++) {
    shapes.add(shapeKey(liveCells(grid.cells, grid.width)));
    stepGrid(grid, LIFE, false);
  }
  return shapes;
}

function shapeKey(cells) {
  const minX = Math.min(...cells.map(([x]) => x));
  const minY = Math.min(...cells.map(([, y]) => y));
  return cells.map(([x, y]) => `${x - minX},${y - minY}`).sort().join(' ');
}

/**
 * Counts free gliders flying south-east: separate groups of touching live cells
 * shaped like one of the glider's four phases.
 * @param {Uint8Array} cells
 * @param {number} width
 * @param {number} height
 */
export function countGliders(cells, width, height) {
  const seen = new Uint8Array(cells.length);
  let count = 0;
  for (let index = 0; index < cells.length; index++) {
    if (!cells[index] || seen[index]) continue;
    const group = collectGroup(cells, width, height, index, seen);
    if (group.length === 5 && GLIDER_SHAPES.has(shapeKey(group))) count++;
  }
  return count;
}

function collectGroup(cells, width, height, start, seen) {
  const group = [];
  const stack = [start];
  seen[start] = 1;
  while (stack.length > 0) {
    const index = stack.pop();
    const x = index % width;
    const y = Math.floor(index / width);
    group.push([x, y]);
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        const neighbour = ny * width + nx;
        if (cells[neighbour] && !seen[neighbour]) {
          seen[neighbour] = 1;
          stack.push(neighbour);
        }
      }
    }
  }
  return group;
}
