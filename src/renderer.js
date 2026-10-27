/**
 * Draws the grid on the canvas: the field, grid lines when zoomed in, the
 * fading trail of recently dead cells, the live cells, the grid edge (dashed
 * when the edges wrap) and the outline of a newly placed pattern. It works in
 * device pixels, so cells stay crisp on high-density screens.
 */

import { TRAIL_LENGTH } from './trail.js';

const COLORS = Object.freeze({
  frame: '#1e293b',
  field: '#0b1222',
  line: 'rgba(148, 163, 184, 0.08)',
  cell: '#84cc16',
  edge: 'rgba(148, 163, 184, 0.38)',
});
const TRAIL_RGB = '132, 204, 22';
const TRAIL_ALPHA = 0.34;
const HIGHLIGHT_RGB = '217, 249, 157';
/** CSS pixels per cell from which grid lines are drawn. */
const LINE_MIN_SCALE = 10;
/** CSS pixels per cell from which live cells are drawn with a gap. */
const GAP_MIN_SCALE = 5;

/**
 * @typedef {object} Highlight
 * @property {number} left - grid column of the outlined area
 * @property {number} top - grid row of the outlined area
 * @property {number} width - columns
 * @property {number} height - rows
 * @property {number} alpha - opacity, 0 to 1
 */

/**
 * @typedef {object} Scene
 * @property {import('./game.js').GameState} state
 * @property {import('./view.js').View} view
 * @property {Uint8Array} trail - from trail.js
 * @property {Highlight | null} highlight
 */

/**
 * Creates the renderer of a canvas.
 * @param {HTMLCanvasElement} canvas
 * @returns {{size: {width: number, height: number, ratio: number}, resize: () => boolean, draw: (scene: Scene) => void}}
 *   size is the canvas size in CSS pixels and the device pixel ratio
 */
export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const size = { width: 0, height: 0, ratio: 1 };

  /**
   * Matches the backing store to the canvas's CSS size and the device pixel ratio.
   * @returns {boolean} true when the size changed (the canvas is then blank)
   */
  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (width === size.width && height === size.height && ratio === size.ratio) return false;
    Object.assign(size, { width, height, ratio });
    canvas.width = Math.max(1, Math.round(width * ratio));
    canvas.height = Math.max(1, Math.round(height * ratio));
    return true;
  }

  /**
   * Draws one frame.
   * @param {Scene} scene
   */
  function draw({ state, view, trail, highlight }) {
    const box = layout(state, view, size.ratio, canvas);
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = COLORS.frame;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = COLORS.field;
    context.fillRect(box.x(0), box.y(0), box.x(box.cols) - box.x(0), box.y(box.rows) - box.y(0));
    if (view.scale >= LINE_MIN_SCALE) drawLines(context, box);
    drawCells(context, box, state.cells, trail, view.scale >= GAP_MIN_SCALE);
    drawEdge(context, box, state.wrap, size.ratio);
    if (highlight) drawHighlight(context, box, highlight, size.ratio);
  }

  return { size, resize, draw };
}

/** Device-pixel geometry of the grid and the range of cells on screen. */
function layout(state, view, ratio, canvas) {
  const unit = view.scale * ratio;
  const left = view.x * ratio;
  const top = view.y * ratio;
  return {
    cols: state.width,
    rows: state.height,
    x: (col) => Math.round(left + col * unit),
    y: (row) => Math.round(top + row * unit),
    firstCol: Math.max(0, Math.floor(-left / unit)),
    lastCol: Math.min(state.width, Math.ceil((canvas.width - left) / unit)),
    firstRow: Math.max(0, Math.floor(-top / unit)),
    lastRow: Math.min(state.height, Math.ceil((canvas.height - top) / unit)),
  };
}

function drawLines(context, box) {
  const top = box.y(box.firstRow);
  const bottom = box.y(box.lastRow);
  const left = box.x(box.firstCol);
  const right = box.x(box.lastCol);
  context.fillStyle = COLORS.line;
  for (let col = box.firstCol; col <= box.lastCol; col++) context.fillRect(box.x(col), top, 1, bottom - top);
  for (let row = box.firstRow; row <= box.lastRow; row++) context.fillRect(left, box.y(row), right - left, 1);
}

function drawCells(context, box, cells, trail, gapped) {
  const gap = gapped ? 1 : 0;
  const live = new Path2D();
  const fading = Array.from({ length: TRAIL_LENGTH + 1 }, () => new Path2D());
  for (let row = box.firstRow; row < box.lastRow; row++) {
    const top = box.y(row);
    const height = box.y(row + 1) - top - gap;
    for (let col = box.firstCol; col < box.lastCol; col++) {
      const index = row * box.cols + col;
      if (!cells[index] && (trail[index] === 0 || trail[index] === TRAIL_LENGTH)) continue;
      const left = box.x(col);
      const path = cells[index] ? live : fading[trail[index]];
      path.rect(left + gap, top + gap, box.x(col + 1) - left - gap, height);
    }
  }
  for (let level = 1; level < TRAIL_LENGTH; level++) {
    context.fillStyle = `rgba(${TRAIL_RGB}, ${((TRAIL_ALPHA * level) / TRAIL_LENGTH).toFixed(3)})`;
    context.fill(fading[level]);
  }
  context.fillStyle = COLORS.cell;
  context.fill(live);
}

function drawEdge(context, box, wrap, ratio) {
  const line = Math.max(1, Math.round(ratio));
  context.strokeStyle = COLORS.edge;
  context.lineWidth = line;
  context.setLineDash(wrap ? [4 * line, 4 * line] : []);
  context.strokeRect(
    box.x(0) - line / 2,
    box.y(0) - line / 2,
    box.x(box.cols) - box.x(0) + line,
    box.y(box.rows) - box.y(0) + line,
  );
  context.setLineDash([]);
}

function drawHighlight(context, box, { left, top, width, height, alpha }, ratio) {
  const line = Math.max(2, Math.round(2 * ratio));
  const pad = 2 * line;
  context.strokeStyle = `rgba(${HIGHLIGHT_RGB}, ${alpha.toFixed(3)})`;
  context.lineWidth = line;
  context.strokeRect(
    box.x(left) - pad,
    box.y(top) - pad,
    box.x(left + width) - box.x(left) + 2 * pad,
    box.y(top + height) - box.y(top) + 2 * pad,
  );
}
