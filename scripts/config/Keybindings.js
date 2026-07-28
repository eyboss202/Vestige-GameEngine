/**
 * Action -> list of KeyboardEvent.code values.
 * Rebinding writes into Settings.keybindings; this file is only the default.
 */
export const DEFAULT_BINDINGS = Object.freeze({
  up:       ['ArrowUp', 'KeyW'],
  down:     ['ArrowDown', 'KeyS'],
  left:     ['ArrowLeft', 'KeyA'],
  right:    ['ArrowRight', 'KeyD'],
  confirm:  ['KeyZ', 'Enter', 'Space'],
  cancel:   ['KeyX', 'Escape', 'Backspace'],
  interact: ['KeyE', 'KeyZ', 'Enter'],
  sprint:   ['ShiftLeft', 'ShiftRight'],
  inventory:['KeyI', 'KeyC'],
  pause:    ['Escape', 'KeyP'],
  attack:   ['KeyJ'],
  throw:    ['KeyK'],
});

/** Order + labels used by the rebinding screen. */
export const BINDABLE = Object.freeze([
  'up', 'down', 'left', 'right', 'confirm', 'cancel', 'interact', 'sprint', 'inventory', 'pause', 'attack', 'throw',
]);

/** Human-readable key names for the settings UI. */
export function keyLabel(code) {
  if (!code) return '--';
  return code
    .replace(/^Key/, '')
    .replace(/^Digit/, '')
    .replace(/^Arrow/, '')
    .replace(/^Numpad/, 'NUM')
    .replace('ShiftLeft', 'LSHIFT')
    .replace('ShiftRight', 'RSHIFT')
    .replace('ControlLeft', 'LCTRL')
    .replace('ControlRight', 'RCTRL')
    .replace('Backspace', 'BKSP')
    .replace('Escape', 'ESC')
    .toUpperCase();
}
