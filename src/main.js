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

/** The whole grid: the Fit button's view. */
const overview = (area) => fitView(area, FIT_MARGIN);

/** Builds the shared state of the page: game, renderer, trail, camera and redraw flag. */
function createApp(canvas, demo) {
  const game = demo ? createDemoGame() : createRandomGame();
  const renderer = createRenderer(canvas);
  const { width: cols, height: rows } = game.getState();
  const trail = createTrail(cols * rows);
  if (demo) warmUpTrail(game, trail);
  const app = {
    canvas,
    game,
    renderer,
    trail,
    // follow: computes the view from the canvas bounds while the player has not zoomed or panned.
    camera: { view: { scale: 1, x: 0, y: 0 }, follow: null, panMode: false },
    highlight: null,
    dirty: true,
    panel: null,
    bounds: () => ({ cols, rows, width: renderer.size.width, height: renderer.size.height }),
    setView(view) {
      app.camera.view = view;
      app.camera.follow = null;
      app.dirty = true;
    },
    /** Shows a view computed from the canvas size and recomputes it on resize until the player zooms or pans. */
    follow(viewFor) {
      app.camera.follow = viewFor;
      app.camera.view = viewFor(app.bounds());
      app.dirty = true;
    },
    /** Ages the trail by one generation. Runs for every generation, also when a frame advances several. */
    trace(cells) {
      advanceTrail(trail, cells);
      app.dirty = true;
    },
    wipe() {
      trail.fill(0);
      app.highlight = null;
      app.dirty = true;
    },
  };
  return app;
}

/** Returns the language toggle; it updates the panel once one is attached to the app. */
function bindLanguage(app) {
  let language = normalizeLanguage(loadSetting(LANGUAGE_KEY, DEFAULT_LANGUAGE));
  return {
    apply: () => app.panel.setLanguage(language),
    toggle() {
      language = otherLanguage(language);
      saveSetting(LANGUAGE_KEY, language);
      app.panel.setLanguage(language);
    },
  };
}

function zoomAtCentre(app, factor) {
  const { width, height } = app.renderer.size;
  app.setView(zoomView(app.camera.view, factor, width / 2, height / 2, app.bounds()));
}

function placePattern(app, id) {
  const pattern = getPattern(id);
  const centre = centreCell(app.camera.view, app.bounds());
  const { left, top } = app.game.placePattern(pattern, centre.x, centre.y);
  app.highlight = { left, top, width: pattern.width, height: pattern.height, start: performance.now() };
  app.dirty = true;
}

/** The commands shared by the panel buttons and the keyboard. */
function createActions(app, toggleLanguage) {
  const { game, camera, canvas } = app;
  return {
    toggle: () => game.toggleRunning(),
    step() {
      game.step();
      app.trace(game.getState().cells);
    },
    random() {
      game.randomize();
      app.wipe();
    },
    clear() {
      game.clear();
      app.wipe();
    },
    zoomIn: () => zoomAtCentre(app, ZOOM_STEP),
    zoomOut: () => zoomAtCentre(app, 1 / ZOOM_STEP),
    fit: () => app.follow(overview),
    togglePan() {
      camera.panMode = !camera.panMode;
      canvas.classList.toggle('is-panning', camera.panMode);
    },
    toggleLanguage,
    setSpeed: (value) => game.setSpeed(value),
    setRule: (text) => game.setRule(text),
    setWrap(on) {
      game.setWrap(on);
      app.dirty = true;
    },
    place: (id) => placePattern(app, id),
  };
}

/** Connects drawing, panning and zooming on the canvas. */
function bindPointer(app) {
  const { game, camera } = app;
  let stroke = null;
  const paint = (x, y) => {
    const cell = screenToCell(camera.view, x, y);
    if (stroke.to(cell.x, cell.y) > 0) app.dirty = true;
  };
  bindCanvas(app.canvas, {
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
      app.dirty = true;
    },
    pan: (dx, dy) => app.setView(panView(camera.view, dx, dy, app.bounds())),
    zoom: (factor, x, y) => app.setView(zoomView(camera.view, factor, x, y, app.bounds())),
  });
}

function bindKeys(app, actions) {
  bindKeyboard(document, app.canvas, {
    perform: (action) => actions[action](),
    pan: (dx, dy) => app.setView(panView(app.camera.view, dx * PAN_STEP, dy * PAN_STEP, app.bounds())),
  });
}

/** The fading outline of the last placed pattern, or null once it has faded. */
function currentHighlight(app, now, reducedMotion) {
  if (!app.highlight) return null;
  const progress = (now - app.highlight.start) / HIGHLIGHT_MS;
  if (progress >= 1) {
    app.highlight = null;
    return null;
  }
  const alpha = reducedMotion ? 0.9 : 1 - progress;
  return { ...app.highlight, alpha };
}

/** Starts the canvas resize handling and the animation loop. */
function runLoop(app) {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const { game, renderer, camera } = app;
  let lastFrame = null;

  function draw(now) {
    const highlight = currentHighlight(app, now, reducedMotion.matches);
    renderer.draw({ state: game.getState(), view: camera.view, trail: app.trail, highlight });
    app.dirty = app.highlight !== null;
  }

  function resize() {
    const previous = { ...renderer.size };
    if (!renderer.resize()) return;
    camera.view = camera.follow ? camera.follow(app.bounds()) : resizeView(camera.view, previous, app.bounds());
    draw(performance.now());
  }

  function frame(now) {
    game.update(lastFrame === null ? 0 : now - lastFrame, app.trace);
    lastFrame = now;
    if (renderer.size.ratio !== (window.devicePixelRatio || 1)) resize();
    if (app.dirty) draw(now);
    app.panel.render(game.getState(), camera.panMode);
    window.requestAnimationFrame(frame);
  }

  new ResizeObserver(resize).observe(app.canvas);
  resize();
  return () => window.requestAnimationFrame(frame);
}

function start() {
  const demo = new URLSearchParams(window.location.search).has('demo');
  const app = createApp(document.getElementById('board'), demo);
  const language = bindLanguage(app);
  const actions = createActions(app, language.toggle);
  bindPointer(app);
  bindKeys(app, actions);
  app.panel = createPanel(document, actions);
  language.apply();
  const startFrames = runLoop(app);
  // The demo scene is meant to be seen whole; a normal visit zooms in on touch screens and narrow canvases.
  const coarsePointer = window.matchMedia('(pointer: coarse)');
  app.follow(demo ? overview : (area) => startView(area, FIT_MARGIN, coarsePointer.matches));
  startFrames();
}

start();
