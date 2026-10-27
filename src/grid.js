/**
 * Finite Life grid stored in two Uint8Arrays (double buffering): a step reads the
 * current generation, writes the next one into the back buffer and swaps them.
 * Cells are row-major (index = y * width + x); 1 is alive, 0 is dead.
 */

/**
 * @typedef {object} Grid
 * @property {number} width - number of columns
 * @property {number} height - number of rows
 * @property {Uint8Array} cells - current generation; replaced by the back buffer after every step
 * @property {Uint8Array} next - back buffer that receives the next generation
 * @property {number} population - number of live cells in `cells`
 */

const MIN_SIDE = 3;
const MAX_SIDE = 2048;

/**
 * Creates an empty grid.
 * @param {number} width - whole number of columns, 3 to 2048
 * @param {number} height - whole number of rows, 3 to 2048
 * @returns {Grid}
 * @throws {RangeError} when a side is not a whole number in that range
 */
export function createGrid(width, height) {
  if (!isValidSide(width) || !isValidSide(height)) {
    throw new RangeError(`Grid sides must be whole numbers from ${MIN_SIDE} to ${MAX_SIDE}`);
  }
  const size = width * height;
  return { width, height, cells: new Uint8Array(size), next: new Uint8Array(size), population: 0 };
}

function isValidSide(value) {
  return Number.isInteger(value) && value >= MIN_SIDE && value <= MAX_SIDE;
}

function isInside(grid, x, y) {
  return Number.isInteger(x) && Number.isInteger(y)
    && x >= 0 && y >= 0 && x < grid.width && y < grid.height;
}

function mod(value, size) {
  return ((value % size) + size) % size;
}

/**
 * Reads one cell; coordinates outside the grid count as dead.
 * @param {Grid} grid
 * @param {number} x - column
 * @param {number} y - row
 * @returns {number} 1 when the cell is alive, otherwise 0
 */
export function cellAt(grid, x, y) {
  return isInside(grid, x, y) ? grid.cells[y * grid.width + x] : 0;
}

/**
 * Makes one cell alive or dead and keeps the population count in sync.
 * Coordinates outside the grid are ignored.
 * @param {Grid} grid
 * @param {number} x - column
 * @param {number} y - row
 * @param {boolean} alive
 * @returns {boolean} true when the cell changed
 */
export function setCellAt(grid, x, y, alive) {
  if (!isInside(grid, x, y)) return false;
  const index = y * grid.width + x;
  const value = alive ? 1 : 0;
  if (grid.cells[index] === value) return false;
  grid.cells[index] = value;
  grid.population += value ? 1 : -1;
  return true;
}

/**
 * Kills every cell.
 * @param {Grid} grid
 */
export function clearGrid(grid) {
  grid.cells.fill(0);
  grid.population = 0;
}

/**
 * Replaces every cell with a random one that is alive with probability `density`.
 * @param {Grid} grid
 * @param {() => number} rng - random source returning floats in [0, 1)
 * @param {number} density - share of live cells, 0 to 1
 */
export function fillRandom(grid, rng, density) {
  let population = 0;
  for (let i = 0; i < grid.cells.length; i++) {
    const alive = rng() < density ? 1 : 0;
    grid.cells[i] = alive;
    population += alive;
  }
  grid.population = population;
}

/**
 * Advances the grid by one generation.
 * @param {Grid} grid
 * @param {Uint8Array} table - lookup table from ruleTable()
 * @param {boolean} wrap - true joins opposite edges (torus); false treats cells beyond the edges as dead
 * @returns {number} population of the new generation
 */
export function stepGrid(grid, table, wrap) {
  const { width, height, cells, next } = grid;
  let population = 0;
  for (let y = 0; y < height; y++) {
    const innerRow = y > 0 && y < height - 1;
    for (let x = 0; x < width; x++) {
      const index = y * width + x;
      const neighbours = innerRow && x > 0 && x < width - 1
        ? innerNeighbours(cells, index, width)
        : edgeNeighbours(grid, x, y, wrap);
      const alive = table[cells[index] * 9 + neighbours];
      next[index] = alive;
      population += alive;
    }
  }
  grid.cells = next;
  grid.next = cells;
  grid.population = population;
  return population;
}

function innerNeighbours(cells, index, width) {
  const above = index - width;
  const below = index + width;
  return cells[above - 1] + cells[above] + cells[above + 1]
    + cells[index - 1] + cells[index + 1]
    + cells[below - 1] + cells[below] + cells[below + 1];
}

function edgeNeighbours(grid, x, y, wrap) {
  let count = 0;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx !== 0 || dy !== 0) count += neighbourAt(grid, x + dx, y + dy, wrap);
    }
  }
  return count;
}

function neighbourAt(grid, x, y, wrap) {
  if (!wrap) return cellAt(grid, x, y);
  return grid.cells[mod(y, grid.height) * grid.width + mod(x, grid.width)];
}

/**
 * Copies a pattern into the grid with its top-left corner at (left, top). Every
 * cell inside the pattern's bounding box is overwritten. With wrap the pattern
 * continues across the edges, otherwise the parts outside the grid are clipped.
 * @param {Grid} grid
 * @param {import('./rle.js').Pattern} pattern
 * @param {number} left - column of the pattern's left edge
 * @param {number} top - row of the pattern's top edge
 * @param {boolean} wrap
 */
export function stampPattern(grid, pattern, left, top, wrap) {
  for (let dy = 0; dy < pattern.height; dy++) {
    for (let dx = 0; dx < pattern.width; dx++) {
      placeCell(grid, left + dx, top + dy, false, wrap);
    }
  }
  for (const [dx, dy] of pattern.cells) placeCell(grid, left + dx, top + dy, true, wrap);
}

function placeCell(grid, x, y, alive, wrap) {
  if (wrap) setCellAt(grid, mod(x, grid.width), mod(y, grid.height), alive);
  else setCellAt(grid, x, y, alive);
}
