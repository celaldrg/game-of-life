import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_SCALE, MIN_SCALE, NARROW_WIDTH, TOUCH_SCALE,
  centreCell, clampView, fitView, panView, resizeView, scaleLimits, screenToCell, startView, zoomView,
} from '../src/view.js';

/** A 100 x 100 grid on a 400 x 400 canvas: it fits at 4 pixels per cell. */
const SQUARE = { cols: 100, rows: 100, width: 400, height: 400 };

/** Grid coordinates (in cells, not rounded) under a canvas point. */
function gridPoint(view, px, py) {
  return { x: (px - view.x) / view.scale, y: (py - view.y) / view.scale };
}

describe('fitView', () => {
  it('shows the whole grid as large as possible, centred, inside the margin', () => {
    const bounds = { cols: 100, rows: 50, width: 820, height: 600 };
    assert.deepEqual(fitView(bounds, 10), { scale: 8, x: 10, y: 100 });
  });

  it('uses the whole canvas without a margin', () => {
    assert.deepEqual(fitView(SQUARE), { scale: 4, x: 0, y: 0 });
  });

  it('never goes below the smallest scale, even on a canvas that is not laid out yet', () => {
    assert.equal(fitView({ cols: 100, rows: 100, width: 0, height: 0 }, 10).scale, MIN_SCALE);
  });
});

describe('startView', () => {
  /** The app's 120 x 80 grid. */
  const GRID = { cols: 120, rows: 80 };

  it('fits the grid on a canvas that is wide enough for a mouse', () => {
    const bounds = { ...GRID, width: 700, height: 420 };
    assert.deepEqual(startView(bounds, 10, false), fitView(bounds, 10));
  });

  it('shows the middle of the grid at TOUCH_SCALE on a narrow canvas (a phone)', () => {
    const bounds = { ...GRID, width: 343, height: 229 };
    assert.ok(fitView(bounds, 10).scale < 3);
    const view = startView(bounds, 10, false);
    assert.deepEqual(view, { scale: TOUCH_SCALE, x: -188.5, y: -125.5 });
    assert.deepEqual(gridPoint(view, 171.5, 114.5), { x: 60, y: 40 });
  });

  it('counts canvases narrower than NARROW_WIDTH as narrow', () => {
    const narrow = { ...GRID, width: NARROW_WIDTH - 1, height: 400 };
    const wide = { ...GRID, width: NARROW_WIDTH, height: 400 };
    assert.equal(startView(narrow, 10, false).scale, TOUCH_SCALE);
    assert.deepEqual(startView(wide, 10, false), fitView(wide, 10));
  });

  it('zooms in on a touch screen where fitting would make cells smaller than TOUCH_SCALE', () => {
    const bounds = { ...GRID, width: 700, height: 420 };
    assert.equal(fitView(bounds, 10).scale, 5);
    assert.deepEqual(startView(bounds, 10, true), { scale: TOUCH_SCALE, x: -10, y: -30 });
  });

  it('keeps the fitted view when its cells are already large enough', () => {
    const tablet = { ...GRID, width: 1000, height: 800 };
    assert.deepEqual(startView(tablet, 10, true), fitView(tablet, 10));
    const small = { cols: 20, rows: 20, width: 300, height: 300 };
    assert.deepEqual(startView(small, 10, false), fitView(small, 10));
  });
});

describe('scaleLimits', () => {
  it('allows zooming out to half the fitting scale and in to MAX_SCALE', () => {
    assert.deepEqual(scaleLimits(SQUARE), { min: 2, max: MAX_SCALE });
  });

  it('raises the maximum when the fitting scale is larger', () => {
    assert.deepEqual(scaleLimits({ cols: 10, rows: 10, width: 1000, height: 1000 }), { min: 50, max: 100 });
  });
});

describe('zoomView', () => {
  it('keeps the grid spot under the zoom point in place', () => {
    const start = { scale: 4, x: 0, y: 0 };
    const zoomed = zoomView(start, 2, 100, 300, SQUARE);
    assert.equal(zoomed.scale, 8);
    assert.deepEqual(gridPoint(zoomed, 100, 300), gridPoint(start, 100, 300));
  });

  it('stays within the scale limits', () => {
    const start = { scale: 4, x: 0, y: 0 };
    assert.equal(zoomView(start, 1000, 200, 200, SQUARE).scale, MAX_SCALE);
    assert.equal(zoomView(start, 0.001, 200, 200, SQUARE).scale, 2);
  });

  it('ignores a factor that is zero, negative or not a number', () => {
    const start = { scale: 8, x: -100, y: -100 };
    for (const factor of [0, -2, Number.NaN]) assert.deepEqual(zoomView(start, factor, 50, 50, SQUARE), start);
  });

  it('centres the grid again when zooming out below the canvas size', () => {
    assert.deepEqual(zoomView({ scale: 8, x: -300, y: -50 }, 0.25, 0, 0, SQUARE), { scale: 2, x: 100, y: 100 });
  });
});

describe('panView', () => {
  it('moves a grid that is larger than the canvas', () => {
    assert.deepEqual(panView({ scale: 8, x: -100, y: -100 }, 30, -20, SQUARE), { scale: 8, x: -70, y: -120 });
  });

  it('keeps the canvas centre over the grid', () => {
    const view = { scale: 8, x: -100, y: -100 };
    assert.deepEqual(panView(view, 10000, 10000, SQUARE), { scale: 8, x: 200, y: 200 });
    assert.deepEqual(panView(view, -10000, -10000, SQUARE), { scale: 8, x: -600, y: -600 });
  });

  it('keeps a grid that fits the canvas centred', () => {
    assert.deepEqual(panView({ scale: 2, x: 100, y: 100 }, 40, -40, SQUARE), { scale: 2, x: 100, y: 100 });
  });
});

describe('clampView', () => {
  it('leaves a view alone when the grid covers the canvas centre', () => {
    const view = { scale: 8, x: -250, y: 120 };
    assert.deepEqual(clampView(view, SQUARE), view);
  });
});

describe('resizeView', () => {
  it('keeps the grid spot under the canvas centre', () => {
    const view = { scale: 8, x: -100, y: -100 };
    const bounds = { cols: 100, rows: 100, width: 600, height: 500 };
    const resized = resizeView(view, { width: 400, height: 400 }, bounds);
    assert.deepEqual(resized, { scale: 8, x: 0, y: -50 });
    assert.deepEqual(gridPoint(resized, 300, 250), gridPoint(view, 200, 200));
  });
});

describe('screenToCell', () => {
  it('rounds canvas points down to whole cells', () => {
    const view = { scale: 10, x: 5, y: 5 };
    assert.deepEqual(screenToCell(view, 5, 5), { x: 0, y: 0 });
    assert.deepEqual(screenToCell(view, 14.9, 15), { x: 0, y: 1 });
    assert.deepEqual(screenToCell(view, 4, 4), { x: -1, y: -1 });
  });
});

describe('centreCell', () => {
  it('finds the cell under the canvas centre', () => {
    assert.deepEqual(centreCell({ scale: 4, x: 0, y: 0 }, SQUARE), { x: 50, y: 50 });
  });

  it('returns the nearest grid cell when the centre is off the grid', () => {
    const bounds = { cols: 10, rows: 10, width: 400, height: 400 };
    assert.deepEqual(centreCell({ scale: 10, x: 300, y: 300 }, bounds), { x: 0, y: 0 });
    assert.deepEqual(centreCell({ scale: 10, x: -300, y: -300 }, bounds), { x: 9, y: 9 });
  });
});
