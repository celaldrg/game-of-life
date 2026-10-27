/**
 * Entry point: builds the game (the ?demo scene or a random soup), connects the
 * canvas, the controls and the keyboard, and runs the animation loop.
 */

import { createDemoGame } from './demo.js';
import { createGame } from './game.js';
import { DEFAULT_LANGUAGE, normalizeLanguage, otherLanguage } from './i18n.js';
import { bindCanvas, bindKeyboard } from './input.js';
import { createPanel } from './panel.js';
import { getPattern } from './patterns.js';
import { createRenderer } from './renderer.js';
import { loadSetting, saveSetting } from './storage.js';
import { createStroke } from './stroke.js';
import { TRAIL_LENGTH, advanceTrail, createTrail } from './trail.js';
import { centreCell, fitView, panView, resizeView, screenToCell, startView, zoomView } from './view.js';

const LANGUAGE_KEY = 'language';
/** Free space around the grid when it is fitted to the canvas, in CSS pixels. */
const FIT_MARGIN = 10;
const ZOOM_STEP = 1.5;
/** CSS pixels the view moves per arrow key press. */
const PAN_STEP = 48;
/** How long the outline of a newly placed pattern stays visible, in milliseconds. */
const HIGHLIGHT_MS = 900;

function createRandomGame() {
  const game = createGame({ seed: Date.now() });
  game.randomize();
  return game;
}

/** Runs the demo a few generations ahead so its gliders already leave trails, then lets it play on. */
function warmUpTrail(game, trail) {
  for (let i = 0; i < TRAIL_LENGTH; i++) {
    game.step();
    advanceTrail(trail, game.getState().cells);
  }
  game.play();
}

function start() {
  const canvas = document.getElementById('board');
  const demo = new URLSearchParams(window.location.search).has('demo');
  const game = demo ? createDemoGame() : createRandomGame();
  const renderer = createRenderer(canvas);
  const { width: cols, height: rows } = game.getState();
  const trail = createTrail(cols * rows);
  if (demo) warmUpTrail(game, trail);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const coarsePointer = window.matchMedia('(pointer: coarse)');
  // follow: computes the view from the canvas bounds while the player has not zoomed or panned.
  const camera = { view: { scale: 1, x: 0, y: 0 }, follow: null, panMode: false };
  let language = normalizeLanguage(loadSetting(LANGUAGE_KEY, DEFAULT_LANGUAGE));
  let stroke = null;
  let highlight = null;
  let dirty = true;
  let lastFrame = null;

  const bounds = () => ({ cols, rows, width: renderer.size.width, height: renderer.size.height });
  /** The whole grid: the Fit button's view. */
  const overview = (area) => fitView(area, FIT_MARGIN);
  /** The first view of a normal visit, zoomed in on touch screens and narrow canvases. */
  const firstView = (area) => startView(area, FIT_MARGIN, coarsePointer.matches);

  function setView(view) {
    camera.view = view;
    camera.follow = null;
    dirty = true;
  }

  /** Shows a view computed from the canvas size and recomputes it on resize until the player zooms or pans. */
  function follow(viewFor) {
    camera.follow = viewFor;
    camera.view = viewFor(bounds());
    dirty = true;
  }

  function zoomAtCentre(factor) {
    const { width, height } = renderer.size;
    setView(zoomView(camera.view, factor, width / 2, height / 2, bounds()));
  }

  /** Ages the trail by one generation. Runs for every generation, also when a frame advances several. */
  function trace(cells) {
    advanceTrail(trail, cells);
    dirty = true;
  }

  function wipe() {
    trail.fill(0);
    highlight = null;
    dirty = true;
  }

  function place(id) {
    const pattern = getPattern(id);
    const centre = centreCell(camera.view, bounds());
    const { left, top } = game.placePattern(pattern, centre.x, centre.y);
    highlight = { left, top, width: pattern.width, height: pattern.height, start: performance.now() };
    dirty = true;
  }

  function toggleLanguage() {
    language = otherLanguage(language);
    saveSetting(LANGUAGE_KEY, language);
    panel.setLanguage(language);
  }

  const actions = {
    toggle: () => game.toggleRunning(),
    step() {
      game.step();
      trace(game.getState().cells);
    },
    random() {
      game.randomize();
      wipe();
    },
    clear() {
      game.clear();
      wipe();
    },
    zoomIn: () => zoomAtCentre(ZOOM_STEP),
    zoomOut: () => zoomAtCentre(1 / ZOOM_STEP),
    fit: () => follow(overview),
    togglePan() {
      camera.panMode = !camera.panMode;
      canvas.classList.toggle('is-panning', camera.panMode);
    },
    toggleLanguage,
    setSpeed: (value) => game.setSpeed(value),
    setRule: (text) => game.setRule(text),
    setWrap(on) {
      game.setWrap(on);
      dirty = true;
    },
    place,
  };

  function paint(x, y) {
    const cell = screenToCell(camera.view, x, y);
    if (stroke.to(cell.x, cell.y) > 0) dirty = true;
  }

  bindCanvas(canvas, {
    isPanMode: () => camera.panMode,
    strokeStart(x, y) {
      const cell = screenToCell(camera.view, x, y);
      stroke = createStroke(game, game.getCell(cell.x, cell.y) === 0);
      paint(x, y);
    },
    strokeMove(x, y) {
      if (stroke) paint(x, y);
    },
    strokeEnd() {
      stroke = null;
    },
    strokeCancel() {
      stroke?.revert();
      stroke = null;
      dirty = true;
    },
    pan: (dx, dy) => setView(panView(camera.view, dx, dy, bounds())),
    zoom: (factor, x, y) => setView(zoomView(camera.view, factor, x, y, bounds())),
  });

  bindKeyboard(document, canvas, {
    perform: (action) => actions[action](),
    pan: (dx, dy) => setView(panView(camera.view, dx * PAN_STEP, dy * PAN_STEP, bounds())),
  });

  const panel = createPanel(document, actions);
  panel.setLanguage(language);

  function currentHighlight(now) {
    if (!highlight) return null;
    const progress = (now - highlight.start) / HIGHLIGHT_MS;
    if (progress >= 1) {
      highlight = null;
      return null;
    }
    const alpha = reducedMotion.matches ? 0.9 : 1 - progress;
    return { ...highlight, alpha };
  }

  function draw(now) {
    renderer.draw({ state: game.getState(), view: camera.view, trail, highlight: currentHighlight(now) });
    dirty = highlight !== null;
  }

  function resize() {
    const previous = { ...renderer.size };
    if (!renderer.resize()) return;
    camera.view = camera.follow ? camera.follow(bounds()) : resizeView(camera.view, previous, bounds());
    draw(performance.now());
  }

  function frame(now) {
    game.update(lastFrame === null ? 0 : now - lastFrame, trace);
    lastFrame = now;
    if (renderer.size.ratio !== (window.devicePixelRatio || 1)) resize();
    if (dirty) draw(now);
    panel.render(game.getState(), camera.panMode);
    window.requestAnimationFrame(frame);
  }

  new ResizeObserver(resize).observe(canvas);
  resize();
  // The demo scene is meant to be seen whole.
  follow(demo ? overview : firstView);
  window.requestAnimationFrame(frame);
}

start();
