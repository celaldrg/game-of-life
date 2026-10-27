/**
 * Game controller: owns the grid, the rule, the generation counter and the
 * play/pause clock. The UI calls update(dt) from its animation frame, sends the
 * player's actions to the other methods and draws what getState() returns.
 */

import { cellAt, clearGrid, createGrid, fillRandom, setCellAt, stampPattern, stepGrid } from './grid.js';
import { getPattern } from './patterns.js';
import { createRng } from './rng.js';
import { DEFAULT_RULE, formatRule, parseRule, ruleTable } from './rules.js';

/** Default grid width in cells. */
export const DEFAULT_WIDTH = 120;
/** Default grid height in cells. */
export const DEFAULT_HEIGHT = 80;
/** Slowest simulation speed, in generations per second. */
export const MIN_SPEED = 1;
/** Fastest simulation speed, in generations per second. */
export const MAX_SPEED = 60;
/** Starting simulation speed, in generations per second. */
export const DEFAULT_SPEED = 10;
/** Share of live cells that randomize() uses by default. */
export const DEFAULT_DENSITY = 0.3;

const MAX_STEPS_PER_UPDATE = 4;

/**
 * @typedef {object} GameOptions
 * @property {number} [width=120] - columns, 3 to 2048
 * @property {number} [height=80] - rows, 3 to 2048
 * @property {string} [rule='B3/S23'] - rule in B/S notation
 * @property {boolean} [wrap=true] - join opposite edges (torus)
 * @property {number} [speed=10] - generations per second, clamped to 1-60
 * @property {number} [seed=1] - seed of the built-in random source
 * @property {() => number} [rng] - random source returning floats in [0, 1); replaces the seeded one
 */

/**
 * @typedef {object} GameState
 * @property {number} width - columns
 * @property {number} height - rows
 * @property {Uint8Array} cells - current generation, row-major (index = y * width + x), 1 = alive.
 *   It is the live buffer: treat it as read-only and fetch it again after every update or step.
 * @property {number} generation - generations since the last clear or randomize
 * @property {number} population - live cells
 * @property {boolean} running - whether update(dt) advances the simulation
 * @property {number} speed - generations per second
 * @property {boolean} wrap - whether opposite edges are joined
 * @property {string} rule - canonical B/S rule, e.g. "B3/S23"
 */

/**
 * @typedef {object} Game
 * @property {() => GameState} getState
 * @property {(dt: number, onGeneration?: (cells: Uint8Array) => void) => number} update
 * @property {() => void} step
 * @property {() => void} play
 * @property {() => void} pause
 * @property {() => boolean} toggleRunning
 * @property {(value: number) => number} setSpeed
 * @property {(on: boolean) => void} setWrap
 * @property {(text: string) => boolean} setRule
 * @property {(x: number, y: number) => number} getCell
 * @property {(x: number, y: number, alive: boolean) => boolean} setCell
 * @property {() => void} clear
 * @property {(density?: number) => void} randomize
 * @property {(source: string | import('./rle.js').Pattern, cx: number, cy: number) => {left: number, top: number}} placePattern
 */

/**
 * Creates a paused game on an empty grid. The returned methods do not use
 * `this`, so they can be passed around as event handlers.
 * @param {GameOptions} [options]
 * @returns {Game}
 * @throws {RangeError} when the size or the rule is invalid
 */
export function createGame(options = {}) {
  const grid = createGrid(options.width ?? DEFAULT_WIDTH, options.height ?? DEFAULT_HEIGHT);
  const rng = options.rng ?? createRng(options.seed ?? 1);
  let wrap = options.wrap ?? true;
  let speed = toSpeed(options.speed, DEFAULT_SPEED);
  let running = false;
  let generation = 0;
  let elapsed = 0;
  let ruleText = '';
  let table = null;

  /**
   * Returns a snapshot of the game for drawing and for the stats display.
   * @returns {GameState}
   */
  function getState() {
    return {
      width: grid.width,
      height: grid.height,
      cells: grid.cells,
      generation,
      population: grid.population,
      running,
      speed,
      wrap,
      rule: ruleText,
    };
  }

  function advance() {
    stepGrid(grid, table, wrap);
    generation += 1;
  }

  /**
   * Lets time pass. While running, advances one generation per 1/speed seconds
   * (at most 4 per call; a larger backlog, e.g. after a hidden tab, is dropped).
   * @param {number} dt - milliseconds since the previous call
   * @param {(cells: Uint8Array) => void} [onGeneration] - called after each generation
   *   with its cells (the live buffer, valid until the next generation)
   * @returns {number} generations advanced
   */
  function update(dt, onGeneration) {
    if (!running || !(dt > 0)) return 0;
    elapsed += dt;
    const interval = 1000 / speed;
    let steps = 0;
    while (elapsed >= interval && steps < MAX_STEPS_PER_UPDATE) {
      advance();
      onGeneration?.(grid.cells);
      elapsed -= interval;
      steps += 1;
    }
    if (elapsed >= interval) elapsed = 0;
    return steps;
  }

  /** Starts advancing generations on update(dt). */
  function play() {
    running = true;
  }

  /** Stops advancing generations. */
  function pause() {
    running = false;
    elapsed = 0;
  }

  /** Pauses the game and advances exactly one generation. */
  function step() {
    pause();
    advance();
  }

  /**
   * Switches between running and paused.
   * @returns {boolean} true when the game is now running
   */
  function toggleRunning() {
    if (running) pause();
    else play();
    return running;
  }

  /**
   * Sets the speed, rounded and clamped to 1-60 generations per second.
   * Non-numeric values are ignored.
   * @param {number} value - generations per second
   * @returns {number} the speed now in use
   */
  function setSpeed(value) {
    speed = toSpeed(value, speed);
    return speed;
  }

  /**
   * Joins (true) or separates (false) opposite edges of the grid.
   * @param {boolean} on
   */
  function setWrap(on) {
    wrap = Boolean(on);
  }

  /**
   * Switches to another rule; the cells are kept.
   * @param {string} text - rule in B/S notation
   * @returns {boolean} false when the text is malformed (the current rule stays)
   */
  function setRule(text) {
    const rule = parseRule(text);
    if (rule === null) return false;
    ruleText = formatRule(rule);
    table = ruleTable(rule);
    return true;
  }

  /**
   * Reads one cell; coordinates outside the grid count as dead.
   * @param {number} x - column
   * @param {number} y - row
   * @returns {number} 1 when alive, otherwise 0
   */
  function getCell(x, y) {
    return cellAt(grid, x, y);
  }

  /**
   * Draws or erases one cell; coordinates outside the grid are ignored.
   * @param {number} x - column
   * @param {number} y - row
   * @param {boolean} alive
   * @returns {boolean} true when the cell changed
   */
  function setCell(x, y, alive) {
    return setCellAt(grid, x, y, alive);
  }

  /** Kills every cell, pauses and resets the generation counter. */
  function clear() {
    clearGrid(grid);
    generation = 0;
    pause();
  }

  /**
   * Fills the grid with random cells from the game's random source and resets
   * the generation counter. Running or paused stays as it was.
   * @param {number} [density=0.3] - share of live cells, clamped to 0-1
   */
  function randomize(density = DEFAULT_DENSITY) {
    const share = Number.isFinite(density) ? Math.min(1, Math.max(0, density)) : DEFAULT_DENSITY;
    fillRandom(grid, rng, share);
    generation = 0;
  }

  /**
   * Places a pattern centred on (cx, cy), overwriting the cells under its bounding
   * box. With wrap on it continues across the edges, otherwise it is clipped.
   * @param {string | import('./rle.js').Pattern} source - built-in pattern id or a parsed pattern
   * @param {number} cx - column of the centre (fractions are floored)
   * @param {number} cy - row of the centre (fractions are floored)
   * @returns {{left: number, top: number}} grid position of the pattern's top-left corner
   * @throws {RangeError} for an unknown pattern id
   */
  function placePattern(source, cx, cy) {
    const pattern = typeof source === 'string' ? getPattern(source) : source;
    const left = Math.floor(cx) - Math.floor(pattern.width / 2);
    const top = Math.floor(cy) - Math.floor(pattern.height / 2);
    stampPattern(grid, pattern, left, top, wrap);
    return { left, top };
  }

  if (!setRule(options.rule ?? DEFAULT_RULE)) throw new RangeError(`Invalid rule: ${options.rule}`);

  return {
    getState,
    update,
    step,
    play,
    pause,
    toggleRunning,
    setSpeed,
    setWrap,
    setRule,
    getCell,
    setCell,
    clear,
    randomize,
    placePattern,
  };
}

function toSpeed(value, fallback) {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(MAX_SPEED, Math.max(MIN_SPEED, Math.round(value)));
}
