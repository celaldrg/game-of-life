/**
 * The "?demo" scene for the README screenshot: a Gosper glider gun fires a stream
 * of gliders into an eater, next to a pulsar and two pentadecathlons. From
 * generation 210 on the scene repeats every 30 generations, so it keeps looking
 * the same however long it runs.
 */

import { createGame } from './game.js';
import { parseRLE } from './rle.js';

/** Eater 1, a still life that swallows each glider arriving from the gun. */
const EATER = parseRLE(`#N Eater 1
x = 4, y = 4, rule = B3/S23
2o$obo$2bo$2b2o!`);

/** Patterns of the scene with the grid cells they are centred on. */
const LAYOUT = [
  ['gosper-gun', 21, 7],
  [EATER, 82, 68],
  ['pulsar', 98, 22],
  ['pentadecathlon', 30, 60],
  ['pentadecathlon', 104, 64],
];

/** Generations simulated before the demo is shown, so the glider stream is complete. */
export const DEMO_WARM_UP = 300;

/**
 * Builds the deterministic demo game: the scene on a 120 x 80 torus, advanced
 * DEMO_WARM_UP generations and running at 15 generations per second.
 * @returns {import('./game.js').Game}
 */
export function createDemoGame() {
  const game = createGame({ width: 120, height: 80, rule: 'B3/S23', wrap: true, speed: 15 });
  for (const [source, cx, cy] of LAYOUT) game.placePattern(source, cx, cy);
  for (let i = 0; i < DEMO_WARM_UP; i++) game.step();
  game.play();
  return game;
}
