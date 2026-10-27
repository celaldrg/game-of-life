/**
 * Fading trail behind moving patterns: a cell that dies keeps a faint glow for
 * a few generations. The trail is one byte per cell; TRAIL_LENGTH marks a cell
 * that was alive at the last generation and lower values fade towards 0.
 */

/** Generations a dead cell keeps glowing, plus one. */
export const TRAIL_LENGTH = 6;

/**
 * Creates an empty trail.
 * @param {number} size - number of cells
 * @returns {Uint8Array}
 */
export function createTrail(size) {
  return new Uint8Array(size);
}

/**
 * Ages the trail by one generation: live cells get TRAIL_LENGTH, dead cells fade by one.
 * @param {Uint8Array} trail - updated in place
 * @param {Uint8Array} cells - the new generation, same length as the trail
 */
export function advanceTrail(trail, cells) {
  for (let i = 0; i < cells.length; i++) {
    if (cells[i]) trail[i] = TRAIL_LENGTH;
    else if (trail[i] > 0) trail[i] -= 1;
  }
}
