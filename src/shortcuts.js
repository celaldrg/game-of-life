/**
 * Keyboard shortcuts, as a mapping from KeyboardEvent.key to an action name.
 * Letters work in either case.
 */

const ACTIONS = new Map([
  [' ', 'toggle'],
  ['n', 'step'],
  ['r', 'random'],
  ['c', 'clear'],
  ['f', 'fit'],
  ['+', 'zoomIn'],
  ['=', 'zoomIn'],
  ['-', 'zoomOut'],
  ['_', 'zoomOut'],
]);

const PAN_OFFSETS = new Map([
  ['ArrowLeft', Object.freeze([1, 0])],
  ['ArrowRight', Object.freeze([-1, 0])],
  ['ArrowUp', Object.freeze([0, 1])],
  ['ArrowDown', Object.freeze([0, -1])],
]);

/**
 * Finds the action of a key.
 * @param {string} key - KeyboardEvent.key
 * @returns {'toggle' | 'step' | 'random' | 'clear' | 'fit' | 'zoomIn' | 'zoomOut' | null}
 */
export function shortcutAction(key) {
  if (typeof key !== 'string') return null;
  return ACTIONS.get(key.length === 1 ? key.toLowerCase() : key) ?? null;
}

/**
 * Direction in which an arrow key moves the grid on the canvas: the view looks
 * left on ArrowLeft, so the grid moves right.
 * @param {string} key - KeyboardEvent.key
 * @returns {readonly [number, number] | null} [dx, dy] with values -1, 0 or 1, or null for other keys
 */
export function panOffset(key) {
  return PAN_OFFSETS.get(key) ?? null;
}
