/**
 * Camera of the grid canvas: how many CSS pixels a cell takes (scale) and where
 * the grid's top-left corner sits on the canvas (x, y). Every function returns a
 * new view and none of them touches the DOM.
 */

/**
 * @typedef {object} View
 * @property {number} scale - CSS pixels per cell
 * @property {number} x - canvas x of the grid's left edge
 * @property {number} y - canvas y of the grid's top edge
 */

/**
 * @typedef {object} Bounds
 * @property {number} cols - grid columns
 * @property {number} rows - grid rows
 * @property {number} width - canvas width in CSS pixels
 * @property {number} height - canvas height in CSS pixels
 */

/** Largest zoom, in CSS pixels per cell. */
export const MAX_SCALE = 64;
/** Smallest zoom in any case, in CSS pixels per cell. */
export const MIN_SCALE = 0.25;
/** Smallest cell size of the first view on touch screens and narrow canvases, in CSS pixels. */
export const TOUCH_SCALE = 6;
/** Canvases narrower than this, in CSS pixels, start zoomed in like touch screens. */
export const NARROW_WIDTH = 480;

/**
 * Returns the view that shows the whole grid, as large as possible and centred.
 * @param {Bounds} bounds
 * @param {number} [margin=0] - free space kept around the grid, in CSS pixels
 * @returns {View}
 */
export function fitView(bounds, margin = 0) {
  const scale = Math.max(MIN_SCALE, Math.min(
    (bounds.width - 2 * margin) / bounds.cols,
    (bounds.height - 2 * margin) / bounds.rows,
  ));
  return clampView({ scale, x: 0, y: 0 }, bounds);
}

/**
 * Returns the first view of the grid: the fitted view, except on a touch screen
 * or a narrow canvas where fitting would make cells smaller than TOUCH_SCALE.
 * There it shows the middle of the grid at TOUCH_SCALE, so a finger can draw
 * single cells right away; fitView() still gives the overview.
 * @param {Bounds} bounds
 * @param {number} margin - free space around the fitted grid, in CSS pixels
 * @param {boolean} coarse - whether the main pointer is a finger
 * @returns {View}
 */
export function startView(bounds, margin, coarse) {
  const fitted = fitView(bounds, margin);
  const small = coarse || bounds.width < NARROW_WIDTH;
  if (!small || fitted.scale >= TOUCH_SCALE) return fitted;
  return {
    scale: TOUCH_SCALE,
    x: (bounds.width - bounds.cols * TOUCH_SCALE) / 2,
    y: (bounds.height - bounds.rows * TOUCH_SCALE) / 2,
  };
}

/**
 * Zoom range for a canvas: from half the scale that fits the grid up to MAX_SCALE.
 * @param {Bounds} bounds
 * @returns {{min: number, max: number}}
 */
export function scaleLimits(bounds) {
  const fit = fitView(bounds).scale;
  return { min: Math.max(MIN_SCALE, fit / 2), max: Math.max(MAX_SCALE, fit) };
}

/**
 * Keeps the grid in sight. On an axis where the grid fits it is centred;
 * otherwise the canvas centre has to stay over the grid.
 * @param {View} view
 * @param {Bounds} bounds
 * @returns {View}
 */
export function clampView(view, bounds) {
  return {
    scale: view.scale,
    x: clampAxis(view.x, bounds.cols * view.scale, bounds.width),
    y: clampAxis(view.y, bounds.rows * view.scale, bounds.height),
  };
}

function clampAxis(position, content, screen) {
  if (content <= screen) return (screen - content) / 2;
  return Math.min(screen / 2, Math.max(screen / 2 - content, position));
}

/**
 * Zooms by a factor around a canvas point, which stays over the same spot of
 * the grid. The scale stays within scaleLimits(bounds).
 * @param {View} view
 * @param {number} factor - above 1 zooms in, below 1 zooms out
 * @param {number} px - canvas x of the fixed point
 * @param {number} py - canvas y of the fixed point
 * @param {Bounds} bounds
 * @returns {View}
 */
export function zoomView(view, factor, px, py, bounds) {
  if (!(factor > 0)) return clampView(view, bounds);
  const { min, max } = scaleLimits(bounds);
  const scale = Math.min(max, Math.max(min, view.scale * factor));
  const ratio = scale / view.scale;
  return clampView({ scale, x: px - (px - view.x) * ratio, y: py - (py - view.y) * ratio }, bounds);
}

/**
 * Moves the grid on the canvas.
 * @param {View} view
 * @param {number} dx - CSS pixels to the right
 * @param {number} dy - CSS pixels down
 * @param {Bounds} bounds
 * @returns {View}
 */
export function panView(view, dx, dy, bounds) {
  return clampView({ scale: view.scale, x: view.x + dx, y: view.y + dy }, bounds);
}

/**
 * Adapts a view to a resized canvas, keeping the grid spot under the canvas centre.
 * @param {View} view
 * @param {{width: number, height: number}} previous - canvas size before the resize
 * @param {Bounds} bounds - new size
 * @returns {View}
 */
export function resizeView(view, previous, bounds) {
  return clampView({
    scale: view.scale,
    x: view.x + (bounds.width - previous.width) / 2,
    y: view.y + (bounds.height - previous.height) / 2,
  }, bounds);
}

/**
 * Finds the cell under a canvas point. The result can lie outside the grid.
 * @param {View} view
 * @param {number} px - canvas x in CSS pixels
 * @param {number} py - canvas y in CSS pixels
 * @returns {{x: number, y: number}} column and row
 */
export function screenToCell(view, px, py) {
  return { x: Math.floor((px - view.x) / view.scale), y: Math.floor((py - view.y) / view.scale) };
}

/**
 * Finds the grid cell nearest to the centre of the canvas.
 * @param {View} view
 * @param {Bounds} bounds
 * @returns {{x: number, y: number}} column and row inside the grid
 */
export function centreCell(view, bounds) {
  const cell = screenToCell(view, bounds.width / 2, bounds.height / 2);
  return {
    x: Math.min(bounds.cols - 1, Math.max(0, cell.x)),
    y: Math.min(bounds.rows - 1, Math.max(0, cell.y)),
  };
}
