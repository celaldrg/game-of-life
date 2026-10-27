/**
 * Freehand drawing on the grid. A stroke draws (or erases) every cell the
 * pointer passes over and remembers what it changed, so a touch that turns into
 * a two-finger gesture can be taken back.
 */

/**
 * Lists the cells on the straight line between two cells, both ends included
 * (Bresenham), so a fast drag leaves no gaps.
 * @param {number} x0 - start column
 * @param {number} y0 - start row
 * @param {number} x1 - end column
 * @param {number} y1 - end row
 * @returns {Array<[number, number]>} [x, y] pairs from start to end, each touching the previous one
 */
export function lineCells(x0, y0, x1, y1) {
  const cells = [];
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const stepX = x0 < x1 ? 1 : -1;
  const stepY = y0 < y1 ? 1 : -1;
  let error = dx + dy;
  let x = x0;
  let y = y0;
  for (;;) {
    cells.push([x, y]);
    if (x === x1 && y === y1) return cells;
    const doubled = 2 * error;
    if (doubled >= dy) {
      error += dy;
      x += stepX;
    }
    if (doubled <= dx) {
      error += dx;
      y += stepY;
    }
  }
}

/**
 * @typedef {object} Stroke
 * @property {(x: number, y: number) => number} to - paints up to cell (x, y) and returns how many cells changed
 * @property {() => void} revert - restores every cell the stroke changed
 */

/**
 * Starts a stroke. The methods do not use `this`.
 * @param {{setCell: (x: number, y: number, alive: boolean) => boolean}} game
 * @param {boolean} alive - true draws live cells, false erases
 * @returns {Stroke}
 */
export function createStroke(game, alive) {
  const changed = [];
  let last = null;

  function to(x, y) {
    const path = last === null ? [[x, y]] : lineCells(last.x, last.y, x, y);
    const before = changed.length;
    for (const [cx, cy] of path) {
      if (game.setCell(cx, cy, alive)) changed.push([cx, cy]);
    }
    last = { x, y };
    return changed.length - before;
  }

  function revert() {
    for (const [x, y] of changed) game.setCell(x, y, !alive);
    changed.length = 0;
  }

  return { to, revert };
}
