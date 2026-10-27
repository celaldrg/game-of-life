/**
 * Pointer, wheel and keyboard input. Turns raw DOM events into the app's
 * actions: one pointer draws (or pans in pan mode or with the middle mouse
 * button), two pointers pan and pinch-zoom, the wheel zooms and keys run the
 * shortcuts from shortcuts.js.
 */

import { panOffset, shortcutAction } from './shortcuts.js';

const WHEEL_ZOOM_RATE = 0.0015;
const WHEEL_MAX_DELTA = 300;
const LINE_PIXELS = 16;
const REPEATABLE = new Set(['step', 'zoomIn', 'zoomOut']);
/** Controls that react to Space themselves. */
const SPACE_CONTROLS = 'button, a[href], input[type="checkbox"], summary';

/**
 * @typedef {object} CanvasActions
 * @property {() => boolean} isPanMode - whether one pointer pans instead of drawing
 * @property {(x: number, y: number) => void} strokeStart - canvas point in CSS pixels
 * @property {(x: number, y: number) => void} strokeMove
 * @property {() => void} strokeEnd
 * @property {() => void} strokeCancel - the stroke became a two-finger gesture; undo it
 * @property {(dx: number, dy: number) => void} pan
 * @property {(factor: number, x: number, y: number) => void} zoom - around a canvas point
 */

/**
 * Listens to pointer and wheel events on the canvas.
 * @param {HTMLCanvasElement} canvas
 * @param {CanvasActions} actions
 */
export function bindCanvas(canvas, actions) {
  const pointers = new Map();
  let mode = 'idle';
  let pinch = null;

  function local(event) {
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function measurePinch() {
    const [a, b] = pointers.values();
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, distance: Math.hypot(a.x - b.x, a.y - b.y) };
  }

  function begin(event, point) {
    if (actions.isPanMode() || event.button === 1) {
      mode = 'pan';
      return;
    }
    mode = 'draw';
    actions.strokeStart(point.x, point.y);
  }

  function startPinch() {
    if (mode === 'draw') actions.strokeCancel();
    mode = 'pinch';
    pinch = measurePinch();
  }

  function movePinch() {
    const next = measurePinch();
    actions.pan(next.x - pinch.x, next.y - pinch.y);
    if (pinch.distance > 0 && next.distance > 0) actions.zoom(next.distance / pinch.distance, next.x, next.y);
    pinch = next;
  }

  function onDown(event) {
    if (event.pointerType === 'mouse' && event.button !== 0 && event.button !== 1) return;
    canvas.setPointerCapture(event.pointerId);
    const point = local(event);
    pointers.set(event.pointerId, point);
    if (pointers.size === 1) begin(event, point);
    else if (pointers.size === 2) startPinch();
  }

  function onMove(event) {
    const previous = pointers.get(event.pointerId);
    if (!previous) return;
    const point = local(event);
    pointers.set(event.pointerId, point);
    if (mode === 'draw') actions.strokeMove(point.x, point.y);
    else if (mode === 'pan') actions.pan(point.x - previous.x, point.y - previous.y);
    else if (mode === 'pinch' && pointers.size >= 2) movePinch();
  }

  function onUp(event) {
    if (!pointers.delete(event.pointerId)) return;
    if (mode === 'draw') actions.strokeEnd();
    if (pointers.size === 0) mode = 'idle';
    else if (pointers.size === 1) mode = mode === 'draw' ? 'idle' : 'pan';
    else pinch = measurePinch();
  }

  function onWheel(event) {
    event.preventDefault();
    let unit = 1;
    if (event.deltaMode === 1) unit = LINE_PIXELS;
    else if (event.deltaMode === 2) unit = canvas.clientHeight;
    const delta = Math.max(-WHEEL_MAX_DELTA, Math.min(WHEEL_MAX_DELTA, event.deltaY * unit));
    const point = local(event);
    actions.zoom(Math.exp(-delta * WHEEL_ZOOM_RATE), point.x, point.y);
  }

  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);
  canvas.addEventListener('wheel', onWheel, { passive: false });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());
  canvas.addEventListener('mousedown', (event) => {
    if (event.button === 1) event.preventDefault();
  });
}

/**
 * @typedef {object} KeyActions
 * @property {(action: string) => void} perform - runs an action named by shortcutAction()
 * @property {(dx: number, dy: number) => void} pan - arrow keys while the canvas has focus; values -1, 0 or 1
 */

/**
 * Listens to the keyboard shortcuts on the whole page. Typing in a text field
 * or a select is left alone, and Space still presses a button or checkbox that
 * was reached with the keyboard.
 * @param {Document} doc
 * @param {HTMLCanvasElement} canvas
 * @param {KeyActions} actions
 */
export function bindKeyboard(doc, canvas, actions) {
  doc.addEventListener('keydown', (event) => {
    if (event.ctrlKey || event.metaKey || event.altKey || takesTyping(event.target)) return;
    const offset = event.target === canvas ? panOffset(event.key) : null;
    if (offset) {
      event.preventDefault();
      actions.pan(offset[0], offset[1]);
      return;
    }
    const action = shortcutAction(event.key);
    if (action === null || (action === 'toggle' && pressesOnSpace(event.target))) return;
    event.preventDefault();
    if (event.repeat && !REPEATABLE.has(action)) return;
    if (action === 'toggle' && isSpaceControl(event.target)) event.target.blur();
    actions.perform(action);
  });
}

function takesTyping(target) {
  return target instanceof HTMLElement
    && (target.isContentEditable || target.matches('input:not([type="range"]):not([type="checkbox"]), textarea, select'));
}

function isSpaceControl(target) {
  return target instanceof HTMLElement && target.matches(SPACE_CONTROLS);
}

/**
 * True when Space should press the focused control: it was reached with the
 * keyboard. After a click the control is blurred instead, so Space plays or pauses.
 */
function pressesOnSpace(target) {
  return isSpaceControl(target) && target.matches(':focus-visible');
}
